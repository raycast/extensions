import {
  ActionPanel,
  Action,
  Form,
  showToast,
  Toast,
  Clipboard,
} from "@raycast/api";
import { useState } from "react";
import { sendToJanAi } from "./utils/janApi";

export default function Command() {
  const [isLoading, setIsLoading] = useState(false);
  const [remindersText, setRemindersText] = useState("");

  async function handleSubmit() {
    if (!remindersText || remindersText.trim() === "") {
      await showToast({
        style: Toast.Style.Failure,
        title: "No reminders provided",
        message: "Please paste your reminders text",
      });
      return;
    }

    setIsLoading(true);

    try {
      await showToast({
        style: Toast.Style.Animated,
        title: "Processing reminders with Jan.ai...",
      });

      const systemPrompt = buildCSVPrompt();

      const response = await sendToJanAi([
        { role: "system", content: systemPrompt },
        { role: "user", content: `Parse these reminders:\n\n${remindersText}` },
      ]);

      // Clean up the response
      let csvOutput = response.trim();

      // Remove markdown code blocks if present
      csvOutput = csvOutput.replace(/```csv\n?/g, "").replace(/```\n?/g, "");

      await Clipboard.copy(csvOutput);

      await showToast({
        style: Toast.Style.Success,
        title: "CSV table created",
        message: "Copied to clipboard - paste into Excel/Sheets",
      });

      console.log("[reminders-to-csv] Output:", csvOutput);
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to create CSV",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Convert to Csv" onSubmit={handleSubmit} />
          <Action
            title="Paste from Clipboard"
            shortcut={{ modifiers: ["cmd"], key: "v" }}
            onAction={async () => {
              const text = await Clipboard.readText();
              if (text) {
                setRemindersText(text);
              }
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="reminders"
        title="Reminders"
        placeholder={`Paste your reminders here, e.g.:
- Electric bill $150 due Jan 15
- Client invoice $5000 received Jan 10  
- Rent payment $2000 due Jan 20
- Freelance work $1200 due Jan 25

Output: Two CSV tables (EXPENSES and INCOME) ready for Excel/Sheets`}
        value={remindersText}
        onChange={setRemindersText}
      />
    </Form>
  );
}

function buildCSVPrompt(): string {
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();

  return `You are a financial data parser. Convert reminders into CSV tables.

TASK: Parse reminders and create TWO CSV tables - one for EXPENSES, one for INCOME.

INPUT FORMAT: Natural language reminders like:
- "Electric bill $150 due Jan 15"
- "Client payment $5000 received on Jan 10"
- "Rent $2000 due next month"

OUTPUT REQUIREMENTS:

1. TWO SEPARATE TABLES with headers:
   - EXPENSES: (bills, costs, payments you make)
   - INCOME: (money received, payments to you)

2. CSV FORMAT with three columns:
   - Date: YYYY-MM-DD format
   - Subject: Brief description
   - Amount: Positive numbers for income, negative for expenses

3. DATE PARSING:
   - "Jan 15" → ${currentYear}-01-15
   - "January 15" → ${currentYear}-01-15  
   - "next month" → estimate based on context
   - If no year specified, use ${currentYear}

4. AMOUNT PARSING:
   - "$150" or "150 dollars" → 150.00
   - If no amount specified → 0.00
   - Bills/expenses: negative numbers (-150.00)
   - Income/received: positive numbers (5000.00)

5. CLASSIFICATION:
   - Keywords for EXPENSES: bill, payment, rent, due, expense, cost, fee
   - Keywords for INCOME: invoice, payment received, income, earned, paid to me

EXAMPLE INPUT:
- Electric bill $150 due Jan 15
- Client invoice $5000 received Jan 10
- Rent payment $2000 due Jan 20
- Freelance work $1200 completed Jan 25

EXPECTED OUTPUT:

EXPENSES:
Date,Subject,Amount
${currentYear}-01-15,Electric bill,-150.00
${currentYear}-01-20,Rent payment,-2000.00

INCOME:
Date,Subject,Amount
${currentYear}-01-10,Client invoice,5000.00
${currentYear}-01-25,Freelance work,1200.00

IMPORTANT:
- Output ONLY the CSV tables
- Do NOT include markdown code blocks
- Do NOT include explanatory text
- Use exactly this format with section headers
- Sort by date within each section
- Use 2 decimal places for all amounts`;
}
