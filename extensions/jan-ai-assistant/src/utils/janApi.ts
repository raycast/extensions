import { getPreferenceValues } from "@raycast/api";
import fetch from "node-fetch";
import {
  Message,
  JanApiResponse,
  JanApiError,
  ParsedTask,
  MessageContentText,
  MessageContentImageUrl,
} from "./types";
import { pdfToBase64, getPDFSize } from "./pdfUtils";

/**
 * Send a message to Jan.ai API for general text processing
 */
export async function sendToJanAi(
  messages: Message[],
  model?: string,
): Promise<string> {
  const preferences = getPreferenceValues<Preferences>();

  const apiUrl =
    preferences.apiUrl || "http://localhost:1337/v1/chat/completions";
  const { apiKey } = preferences;
  const temperature = parseFloat(preferences.temperature || "0.7");
  const maxTokens = parseInt(preferences.maxTokens || "2000", 10);
  const selectedModel = model || preferences.defaultModel;

  const requestBody = {
    messages,
    temperature,
    max_tokens: maxTokens,
    model: selectedModel,
    stream: false,
  };

  try {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      const error = new Error(
        `Jan.ai API error: ${response.status} ${response.statusText}\n${errorText}`,
      ) as JanApiError;
      error.status = response.status;
      throw error;
    }

    const data = (await response.json()) as JanApiResponse;

    if (!data.choices || data.choices.length === 0) {
      throw new Error("No response from Jan.ai");
    }

    return data.choices[0].message.content;
  } catch (error) {
    if (error instanceof Error) {
      if (
        error.message.includes("ECONNREFUSED") ||
        error.message.includes("fetch failed")
      ) {
        throw new Error(
          "Cannot connect to Jan.ai. Please ensure Jan.ai is running and the API server is enabled.",
        );
      }
      throw error;
    }
    throw new Error("Unknown error occurred");
  }
}

/**
 * Send a PDF directly to Jan.ai API with multimodal support
 * This allows the AI to read the PDF natively without OCR/text extraction
 */
export async function sendToJanAiWithPDF(
  pdfPath: string,
  userPrompt: string,
  systemPrompt?: string,
  model?: string,
): Promise<string> {
  const preferences = getPreferenceValues<Preferences>();

  const apiUrl =
    preferences.apiUrl || "http://localhost:1337/v1/chat/completions";
  const { apiKey } = preferences;
  const temperature = parseFloat(preferences.temperature || "0.7");
  const maxTokens = parseInt(preferences.maxTokens || "2000", 10);
  const selectedModel = model || preferences.defaultModel;

  console.log(`[sendToJanAiWithPDF] Processing PDF: ${pdfPath}`);

  // Check file size (warn if > 10MB)
  const fileSize = await getPDFSize(pdfPath);
  if (fileSize > 10 * 1024 * 1024) {
    console.warn(
      `[sendToJanAiWithPDF] Large PDF detected: ${(fileSize / 1024 / 1024).toFixed(2)}MB`,
    );
  }

  // Convert PDF to base64
  const base64Pdf = await pdfToBase64(pdfPath);
  const dataUrl = `data:application/pdf;base64,${base64Pdf}`;

  // Build multimodal message
  const userContent: Array<MessageContentText | MessageContentImageUrl> = [
    {
      type: "text",
      text: userPrompt,
    },
    {
      type: "image_url",
      image_url: {
        url: dataUrl,
      },
    },
  ];

  const messages: Message[] = [];

  if (systemPrompt) {
    messages.push({
      role: "system",
      content: systemPrompt,
    });
  }

  messages.push({
    role: "user",
    content: userContent,
  });

  const requestBody = {
    messages,
    temperature,
    max_tokens: maxTokens,
    model: selectedModel,
    stream: false,
  };

  try {
    console.log(`[sendToJanAiWithPDF] Sending to Jan.ai API...`);
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      const error = new Error(
        `Jan.ai API error: ${response.status} ${response.statusText}\n${errorText}`,
      ) as JanApiError;
      error.status = response.status;
      throw error;
    }

    const data = (await response.json()) as JanApiResponse;

    if (!data.choices || data.choices.length === 0) {
      throw new Error("No response from Jan.ai");
    }

    console.log(`[sendToJanAiWithPDF] ✓ Success`);
    return data.choices[0].message.content;
  } catch (error) {
    if (error instanceof Error) {
      if (
        error.message.includes("ECONNREFUSED") ||
        error.message.includes("fetch failed")
      ) {
        throw new Error(
          "Cannot connect to Jan.ai. Please ensure Jan.ai is running and the API server is enabled.",
        );
      }
      throw error;
    }
    throw new Error("Unknown error occurred");
  }
}

/**
 * Get list of available models from Jan.ai
 */
export async function getAvailableModels(): Promise<string[]> {
  const preferences = getPreferenceValues<Preferences>();
  const { apiKey } = preferences;
  const baseUrl = preferences.apiUrl.replace("/chat/completions", "");
  const modelsUrl = `${baseUrl}/models`;

  try {
    const response = await fetch(modelsUrl, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });

    if (!response.ok) {
      return [];
    }

    const data = (await response.json()) as { data: Array<{ id: string }> };
    return data.data.map((model) => model.id);
  } catch (error) {
    return [];
  }
}

/**
 * Get current date info for the model
 */
function getCurrentDateInfo() {
  const now = new Date();
  const today = now.toISOString().split("T")[0]; // YYYY-MM-DD
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split("T")[0];

  return {
    today,
    tomorrow: tomorrowStr,
    currentYear: now.getFullYear(),
    currentMonth: now.getMonth() + 1,
    currentDay: now.getDate(),
  };
}

/**
 * Calculate NET 30/60/90 date from today
 */
function calculateNetDate(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().split("T")[0];
}

/**
 * Build prompt based on input type
 */
function buildReminderPrompt(input: string): string {
  const dateInfo = getCurrentDateInfo();

  // Simple reminder detection: no dollar signs, no invoice numbers, no NET terms
  const isSimpleReminder =
    !input.includes("$") &&
    !input.toLowerCase().includes("invoice") &&
    !input.toLowerCase().includes("net ");

  if (isSimpleReminder) {
    return `Extract task and output JSON. Today is ${dateInfo.today}.

Date Rules:
- "tomorrow" → "${dateInfo.tomorrow}"
- "today" → "${dateInfo.today}"
- "next week" → add 7 days from today
- No date specified → use today

Time Rules:
- "noon" → "12:00"
- "midnight" → "00:00"
- "3pm" or "3 pm" → "15:00"
- "9:30am" or "9:30 am" → "09:30"
- "5" or "5pm" → "17:00"
- No time specified → omit dueTime field

Output format:
[{"title":"task description","dueDate":"YYYY-MM-DD","dueTime":"HH:MM"}]

Examples:
"reserve table at Tom & Jerry noon tomorrow" → [{"title":"Reserve table at Tom & Jerry","dueDate":"${dateInfo.tomorrow}","dueTime":"12:00"}]
"call dentist" → [{"title":"Call dentist","dueDate":"${dateInfo.today}"}]
"meeting at 3pm today" → [{"title":"Meeting","dueDate":"${dateInfo.today}","dueTime":"15:00"}]

Output ONLY the JSON array.`;
  }

  // Complex invoice parsing prompt
  return `Extract tasks and output a JSON array. Today is ${dateInfo.today}.

For invoices with multiple payment terms, create SEPARATE tasks for each payment.

Date Parsing Rules (PRIORITY ORDER - USE THE FIRST MATCHING RULE):
1. EXPLICIT DATES (highest priority - always use these if present):
   - "9-Jan-26" or "9/Jan/26" or "Jan-9-26" → "2026-01-09"
   - "23-Jan-26" → "2026-01-23"
   - "12.26.25" or "12/26/25" → "2025-12-26"
   - "Jan 15" or "January 15" → "${dateInfo.currentYear}-01-15"

2. RELATIVE DATES:
   - "TODAY" or "DUE TODAY" → "${dateInfo.today}"
   - "tomorrow" → "${dateInfo.tomorrow}"

3. NET TERMS (lowest priority - only use if NO explicit date):
   - "NET 30" alone → ${calculateNetDate(30)}
   - "NET 60" alone → ${calculateNetDate(60)}

IMPORTANT: If you see BOTH an explicit date AND "NET 30", use the explicit date!

Amount Parsing:
- "$46,518.71" → 46518.71 (remove $, commas)
- "$-15,187.59" → -15187.59 (preserve negative sign)
- "$-750" → -750 (preserve negative)

Title and Notes Rules:
- ONLY include invoice/reference numbers if explicitly mentioned in the input
- DO NOT hallucinate or make up invoice numbers
- Keep title descriptive but concise
- Only add info that's actually in the input text

Example 1 (WITH invoice number in input):
Input: "payment terms 50% DOWN $60,470.15 DUE TODAY 50% NET 30 $60,470.15 DUE 12.26.25 Invoice #185"
Output:
[
  {"title":"50% Down Payment - Invoice #185","dueDate":"${dateInfo.today}","amount":60470.15,"notes":"Invoice #185"},
  {"title":"50% NET 30 Payment - Invoice #185","dueDate":"2025-12-26","amount":60470.15,"notes":"Invoice #185"}
]

Example 2 (NO invoice number in input):
Input: "$46,518.71 Insurance Package 9-Jan-26"
Output:
[
  {"title":"Insurance Package","dueDate":"2026-01-09","amount":46518.71,"notes":""}
]

Example 3 (Negative amount):
Input: "Insurance Package $-15,187.59 23-Jan-26"
Output:
[
  {"title":"Insurance Package","dueDate":"2026-01-23","amount":-15187.59,"notes":""}
]

Rules:
- Each payment = separate task
- Use explicit dates over NET calculations
- Use YYYY-MM-DD format for ALL dates
- ONLY include invoice/reference numbers if they appear in the input
- DO NOT make up or hallucinate invoice numbers
- Keep notes empty if no additional info provided

Output ONLY the JSON array.`;
}

/**
 * Extract tasks from a PDF file using Jan.ai with text extraction fallback
 */
export async function extractTaskFromPDF(
  pdfPath: string,
): Promise<ParsedTask[]> {
  const preferences = getPreferenceValues<Preferences>();
  const { defaultModel } = preferences;

  console.log(`[extractTaskFromPDF] Processing: ${pdfPath}`);
  console.log(`[extractTaskFromPDF] Model: ${defaultModel}`);

  const dateInfo = getCurrentDateInfo();

  const systemPrompt = `Extract INVOICE PAYMENT information from the document and output a JSON array. Today is ${dateInfo.today}.

CRITICAL INSTRUCTIONS:
- You are creating PAYMENT REMINDERS for invoices/bills
- Create ONE task per PAYMENT (not per line item)
- If payment terms split the payment (e.g., "50% down, 50% NET 30"), create SEPARATE tasks for each payment
- DO NOT create multiple tasks for the same payment
- DO NOT create tasks for processing, tracking, or verification

Title Format:
- Single payment: "Invoice #[NUMBER] - [Customer Name]"
- Multiple payments: "Invoice #[NUMBER] - [Payment Description] - [Customer Name]"
- Example: "Invoice #236 - Eaton Processing"
- Example: "Invoice #185 - 50% Down - Customer Name"

Date Parsing Rules (PRIORITY ORDER):
1. EXPLICIT DATES (highest priority):
   - "9-Jan-26" or "9/Jan/26" → "2026-01-09"
   - "12.26.25" or "12/26/25" → "2025-12-26"
   - "Jan 15" or "January 15" → "${dateInfo.currentYear}-01-15"

2. RELATIVE DATES:
   - "TODAY" or "DUE TODAY" → "${dateInfo.today}"
   - "tomorrow" → "${dateInfo.tomorrow}"

3. NET TERMS (only if NO explicit date):
   - "NET 30" → ${calculateNetDate(30)}
   - "NET 60" → ${calculateNetDate(60)}

Amount Parsing with Sign Convention:
- ACCOUNTS RECEIVABLE (you are RECEIVING money) = POSITIVE amount
  * Look for: "Origin:", "From:", "Sold to:", invoice TO someone else
  * You are the seller/sender
  * Example: Invoice from you to Eaton Processing → +46028.64

- ACCOUNTS PAYABLE (you are PAYING money) = NEGATIVE amount
  * Look for: "Bill from", "Due to:", "Payment to:", invoice FROM someone else
  * You are the buyer/recipient
  * Example: Bill from vendor to you → -46028.64

Amount format:
- Remove $ and commas: "$46,518.71" → 46518.71
- Apply sign based on payment direction
- If unclear, default to NEGATIVE (payable)

Notes Field:
- Include customer/destination name
- Include invoice number if present
- Include payment terms if relevant
- Indicate if receivable or payable
- Keep concise

Examples:

ACCOUNTS RECEIVABLE (receiving money):
Input: "Invoice #236, Origin: Your Company, Destination: Eaton Processing LLC, Due: 2026-01-08, Total: $46,028.64"
Output:
[
  {
    "title": "Invoice #236 - Eaton Processing",
    "dueDate": "2026-01-08",
    "amount": 46028.64,
    "notes": "Receivable - Eaton Processing LLC"
  }
]

ACCOUNTS PAYABLE (paying money):
Input: "Invoice #789 from ABC Supplies, Due: 2026-01-15, Amount Due: $5,200.00"
Output:
[
  {
    "title": "Invoice #789 - ABC Supplies",
    "dueDate": "2026-01-15",
    "amount": -5200.00,
    "notes": "Payable - ABC Supplies"
  }
]

Split payment receivable:
Input: "Invoice #185, 50% DOWN $60,470 DUE TODAY, 50% NET 30 $60,470 DUE 12.26.25, To: Customer XYZ"
Output:
[
  {
    "title": "Invoice #185 - 50% Down Payment - Customer XYZ",
    "dueDate": "${dateInfo.today}",
    "amount": 60470.00,
    "notes": "Receivable - 50% down payment"
  },
  {
    "title": "Invoice #185 - 50% NET 30 - Customer XYZ",
    "dueDate": "2025-12-26",
    "amount": 60470.00,
    "notes": "Receivable - 50% NET 30 payment"
  }
]

Output ONLY the JSON array, no other text.`;

  try {
    // First, try native PDF support for vision-capable models
    console.log(`[extractTaskFromPDF] Attempting native PDF processing...`);
    try {
      const userPrompt =
        "Extract the invoice payment information. Create ONE payment reminder with invoice number, customer name, due date, and total amount. If there are split payment terms, create one task per payment.";

      const response = await sendToJanAiWithPDF(
        pdfPath,
        userPrompt,
        systemPrompt,
      );

      // If we got here, native PDF worked - parse and return
      return await parseTaskResponse(response, "extractTaskFromPDF");
    } catch (pdfError) {
      // Check if it's a vision/multimodal error
      const errorMsg =
        pdfError instanceof Error ? pdfError.message : String(pdfError);
      if (
        errorMsg.includes("image input is not supported") ||
        errorMsg.includes("mmproj") ||
        errorMsg.includes("multimodal")
      ) {
        console.log(
          `[extractTaskFromPDF] Model doesn't support vision, falling back to text extraction...`,
        );

        // Import text extraction utility
        const { extractTextFromPDF } = await import("./pdfUtils");

        // Extract text from PDF
        const pdfText = await extractTextFromPDF(pdfPath);
        console.log(
          `[extractTaskFromPDF] Extracted ${pdfText.length} chars of text`,
        );

        // Send extracted text to Jan.ai
        const messages: Message[] = [
          {
            role: "system",
            content: systemPrompt,
          },
          {
            role: "user",
            content: `Extract the invoice payment information from this text. Create ONE payment reminder with invoice number, customer name, due date, and total amount:\n\n${pdfText}`,
          },
        ];

        const response = await sendToJanAi(messages);
        return await parseTaskResponse(response, "extractTaskFromPDF");
      }

      // If it's a different error, throw it
      throw pdfError;
    }
  } catch (error) {
    if (error instanceof Error) {
      console.error(`[extractTaskFromPDF] Error: ${error.message}`);

      if (
        error.message.includes("ECONNREFUSED") ||
        error.message.includes("fetch failed")
      ) {
        throw new Error(
          "Cannot connect to Jan.ai. Ensure it's running with API enabled.",
        );
      }

      throw error;
    }
    throw new Error("Unknown error occurred");
  }
}

/**
 * Parse task response from Jan.ai (extracted to avoid duplication)
 */
async function parseTaskResponse(
  response: string,
  context: string,
): Promise<ParsedTask[]> {
  // Parse the response
  let jsonStr = response.trim();

  // Remove markdown code blocks
  const codeBlockMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    jsonStr = codeBlockMatch[1].trim();
    console.log(`[${context}] Extracted from code block`);
  }

  // Find JSON array or object
  const arrayMatch = jsonStr.match(/\[\s*\{[\s\S]*?\}\s*\]/);
  if (arrayMatch) {
    jsonStr = arrayMatch[0];
    console.log(`[${context}] Found JSON array`);
  } else {
    const objectMatch = jsonStr.match(/\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/);
    if (objectMatch) {
      jsonStr = `[${objectMatch[0]}]`;
      console.log(`[${context}] Wrapped single object in array`);
    }
  }

  console.log(`[${context}] Parsing JSON: ${jsonStr.substring(0, 300)}...`);

  let parsed: ParsedTask[];
  try {
    const result = JSON.parse(jsonStr);
    parsed = Array.isArray(result) ? result : [result];
  } catch (jsonError) {
    console.error(`[${context}] JSON parse failed`);
    console.error(`[${context}] Attempted: ${jsonStr.substring(0, 500)}`);
    throw new Error(`Couldn't parse JSON from model response.`);
  }

  // Validate and sanitize dates
  const validTasks = parsed.filter((task) => {
    if (!task.title || task.title.trim() === "") {
      return false;
    }

    // Validate date format if present
    if (task.dueDate) {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(task.dueDate)) {
        console.warn(
          `[${context}] Invalid date format: ${task.dueDate}, removing`,
        );
        task.dueDate = undefined;
      } else {
        const year = parseInt(task.dueDate.split("-")[0]);
        if (year < 2020 || year > 2100) {
          console.warn(
            `[${context}] Unreasonable year: ${year}, removing date`,
          );
          task.dueDate = undefined;
        }
      }
    }

    return true;
  });

  if (validTasks.length === 0) {
    throw new Error("No valid tasks found in response");
  }

  console.log(`[${context}] ✓ Success: ${validTasks.length} task(s) extracted`);
  validTasks.forEach((task, i) => {
    console.log(
      `[${context}]   ${i + 1}. "${task.title}" due:${task.dueDate || "none"} amount:${task.amount ? `$${task.amount}` : "none"}`,
    );
  });

  return validTasks;
}

export async function extractTaskFromJan(input: string): Promise<ParsedTask[]> {
  const preferences = getPreferenceValues<Preferences>();
  const apiUrl =
    preferences.apiUrl || "http://localhost:1337/v1/chat/completions";
  const { apiKey, defaultModel } = preferences;

  console.log(`[extractTaskFromJan] Input: "${input}"`);
  console.log(`[extractTaskFromJan] Model: ${defaultModel}`);
  console.log(`[extractTaskFromJan] Today: ${getCurrentDateInfo().today}`);

  try {
    const systemPrompt = buildReminderPrompt(input);

    const requestBody = {
      model: defaultModel,
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: `Extract tasks: "${input}"`,
        },
      ],
      temperature: 0.1,
      max_tokens: 1500,
      stream: false,
    };

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Jan.ai API error: ${response.status} - ${errorText}`);
    }

    const rawResponse = await response.text();
    let data: JanApiResponse;

    try {
      data = JSON.parse(rawResponse) as JanApiResponse;
    } catch (parseError) {
      throw new Error("Invalid JSON response from Jan.ai API");
    }

    if (!data.choices || data.choices.length === 0) {
      throw new Error("No response from Jan.ai");
    }

    const choice = data.choices[0];
    console.log(`[extractTaskFromJan] Finish reason: ${choice.finish_reason}`);

    // For reasoning models, content is in reasoning_content
    let rawContent = "";
    const hasReasoningContent =
      "reasoning_content" in choice.message && choice.message.reasoning_content;

    if (hasReasoningContent) {
      rawContent = (choice.message as { reasoning_content: string })
        .reasoning_content;
      console.log(
        `[extractTaskFromJan] Using reasoning_content (${rawContent.length} chars)`,
      );
    } else {
      rawContent = choice.message.content || "";
      console.log(
        `[extractTaskFromJan] Using content (${rawContent.length} chars)`,
      );
    }

    if (!rawContent || rawContent.trim() === "") {
      console.error("[extractTaskFromJan] Empty response from model");
      throw new Error("Model returned empty response");
    }

    if (choice.finish_reason === "length") {
      console.warn("[extractTaskFromJan] WARNING: Response truncated");
    }

    // Extract JSON array
    let jsonStr = rawContent.trim();

    // Remove markdown code blocks
    const codeBlockMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlockMatch) {
      jsonStr = codeBlockMatch[1].trim();
      console.log("[extractTaskFromJan] Extracted from code block");
    }

    // Find JSON array or object
    const arrayMatch = jsonStr.match(/\[\s*\{[\s\S]*?\}\s*\]/);
    if (arrayMatch) {
      jsonStr = arrayMatch[0];
      console.log("[extractTaskFromJan] Found JSON array");
    } else {
      const objectMatch = jsonStr.match(/\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/);
      if (objectMatch) {
        jsonStr = `[${objectMatch[0]}]`;
        console.log("[extractTaskFromJan] Wrapped single object in array");
      }
    }

    console.log(
      `[extractTaskFromJan] Parsing JSON: ${jsonStr.substring(0, 300)}...`,
    );

    let parsed: ParsedTask[];
    try {
      const result = JSON.parse(jsonStr);
      parsed = Array.isArray(result) ? result : [result];
    } catch (jsonError) {
      console.error("[extractTaskFromJan] JSON parse failed");
      console.error(
        `[extractTaskFromJan] Attempted: ${jsonStr.substring(0, 500)}`,
      );
      throw new Error(`Couldn't parse JSON from model response.`);
    }

    // Validate and sanitize dates
    const validTasks = parsed.filter((task) => {
      if (!task.title || task.title.trim() === "") {
        return false;
      }

      // Validate date format if present
      if (task.dueDate) {
        // Check if date is in valid YYYY-MM-DD format
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(task.dueDate)) {
          console.warn(
            `[extractTaskFromJan] Invalid date format: ${task.dueDate}, removing`,
          );
          task.dueDate = undefined;
        } else {
          // Check if date is reasonable (not year 4000!)
          const year = parseInt(task.dueDate.split("-")[0]);
          if (year < 2020 || year > 2100) {
            console.warn(
              `[extractTaskFromJan] Unreasonable year: ${year}, removing date`,
            );
            task.dueDate = undefined;
          }
        }
      }

      return true;
    });

    if (validTasks.length === 0) {
      throw new Error("No valid tasks found in response");
    }

    console.log(
      `[extractTaskFromJan] ✓ Success: ${validTasks.length} task(s) extracted`,
    );
    validTasks.forEach((task, i) => {
      console.log(
        `[extractTaskFromJan]   ${i + 1}. "${task.title}" due:${task.dueDate || "none"} amount:${task.amount ? `$${task.amount}` : "none"}`,
      );
    });

    return validTasks;
  } catch (error) {
    if (error instanceof Error) {
      console.error(`[extractTaskFromJan] Error: ${error.message}`);

      if (
        error.message.includes("ECONNREFUSED") ||
        error.message.includes("fetch failed")
      ) {
        throw new Error(
          "Cannot connect to Jan.ai. Ensure it's running with API enabled.",
        );
      }

      throw error;
    }
    throw new Error("Unknown error occurred");
  }
}
