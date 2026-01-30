import { AI, environment, getPreferenceValues } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";
import { findBuiltInScript } from "./scripts";

export interface Preferences {
  aiProvider: "raycast" | "openai" | "gemini" | "claude";
  openaiApiKey?: string;
  geminiApiKey?: string;
  claudeApiKey?: string;
}

/**
 * Check if Excel is running
 */
export async function checkExcel(): Promise<boolean> {
  try {
    const result = await runAppleScript(
      `tell application "System Events" to return (name of processes) contains "Microsoft Excel"`,
    );
    return result.trim() === "true";
  } catch {
    return false;
  }
}

/**
 * Get simple context from Excel
 * Optimized for speed - only gets essential info
 */
export async function getExcelContext(): Promise<string> {
  try {
    const script = `
tell application "Microsoft Excel"
  if not (exists active workbook) then return "No workbook"
  tell active sheet
    set sel to selection
    return "Sheet: " & name & ", Selection: " & (get address of sel)
  end tell
end tell`;

    // Set a short timeout since we want this to be fast
    const result = await runAppleScript(script, { timeout: 2000 });
    return result || "Sheet: Unknown";
  } catch {
    return "Context unavailable (Excel busy)";
  }
}

/**
 * Build a focused prompt with working AppleScript examples
 */
function buildPrompt(instruction: string, context: string): string {
  return `Generate AppleScript for Excel on Mac.

CONTEXT: ${context}
TASK: ${instruction}

RULES:
1. Output ONLY the AppleScript code - no markdown, no explanation
2. Always start with: tell application "Microsoft Excel"
3. Always use "activate" after tell
4. Perform ALL actions inside specific "tell active sheet" block
5. Return a success message at the end using "return"

WORKING EXAMPLES:

Example 1 - Set multiple values:
tell application "Microsoft Excel"
  activate
  tell active sheet
    set value of range "A1" to "Revenue"
    set value of range "B1" to 1000
    set value of range "A2" to "Cost"
    set value of range "B2" to 800
    return "Set A1:B2 values"
  end tell
end tell

Example 2 - Format and Style:
tell application "Microsoft Excel"
  activate
  tell active sheet
    set bold of font object of range "A1:Z1" to true
    set color of font object of range "A1:Z1" to {255, 255, 255} -- White
    set color of interior object of range "A1:Z1" to {0, 0, 255} -- Blue
    autofit column of range "A:Z"
    return "Formatted header row"
  end tell
end tell

Example 3 - Formulas:
tell application "Microsoft Excel"
  activate
  tell active sheet
    set formula of range "C2" to "=A2+B2"
    set number format of range "C2" to "0.00%"
    return "Set formula in C2"
  end tell
end tell

Example 4 - Loop through cells (Advanced):
tell application "Microsoft Excel"
  activate
  tell active sheet
    set rng to used range
    set rowCount to count rows of rng
    set colCount to count columns of rng
    repeat with r from 1 to rowCount
      repeat with c from 1 to colCount
        set theCell to cell r of column c of rng
        -- Only format non-empty cells
        if value of theCell is not missing value then
           set color of font object of theCell to {0, 0, 0}
        end if
      end repeat
    end repeat
    return "Processed all cells"
  end tell
end tell

Example 5 - COMPLEX BATCH TASK (Create Table + Format):
tell application "Microsoft Excel"
  activate
  tell active sheet
    -- 1. Setup Data
    set value of range "A1" to "Month"
    set value of range "B1" to "Sales"
    set value of range "A2" to "Jan"
    set value of range "B2" to 100
    set value of range "A3" to "Feb"
    set value of range "B3" to 150
    
    -- 2. Format Header
    set bold of font object of range "A1:B1" to true
    set color of interior object of range "A1:B1" to {200, 200, 200}
    
    -- 3. Format Data
    set number format of range "B2:B3" to "$#,##0"
    autofit column of range "A:B"
    
    return "Created sales table with formatting"
  end tell
end tell

NOW GENERATE CODE:`;
}

async function callAI(prompt: string): Promise<string> {
  const prefs = getPreferenceValues<Preferences>();

  switch (prefs.aiProvider) {
    case "raycast":
      if (!environment.canAccess(AI))
        throw new Error("Raycast AI requires Pro subscription");
      return await AI.ask(prompt, { creativity: "low" });

    case "openai":
      if (!prefs.openaiApiKey)
        throw new Error("Add OpenAI API key in preferences");
      const openaiRes = await fetch(
        "https://api.openai.com/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${prefs.openaiApiKey}`,
          },
          body: JSON.stringify({
            model: "gpt-4o",
            messages: [{ role: "user", content: prompt }],
            temperature: 0,
          }),
        },
      );
      if (!openaiRes.ok) throw new Error(`OpenAI error: ${openaiRes.status}`);
      const openaiData = await openaiRes.json();
      return openaiData.choices[0].message.content;

    case "gemini":
      if (!prefs.geminiApiKey)
        throw new Error("Add Gemini API key in preferences");
      const geminiRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${prefs.geminiApiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0 },
          }),
        },
      );
      if (!geminiRes.ok) throw new Error(`Gemini error: ${geminiRes.status}`);
      const geminiData = await geminiRes.json();
      return geminiData.candidates[0].content.parts[0].text;

    case "claude":
      if (!prefs.claudeApiKey)
        throw new Error("Add Claude API key in preferences");
      const claudeRes = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": prefs.claudeApiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 2000,
          messages: [{ role: "user", content: prompt }],
        }),
      });
      if (!claudeRes.ok) throw new Error(`Claude error: ${claudeRes.status}`);
      const claudeData = await claudeRes.json();
      return claudeData.content[0].text;

    default:
      throw new Error("Unknown AI provider");
  }
}

/**
 * Clean up AI response to get just the AppleScript
 */
function cleanScript(raw: string): string {
  let script = raw.trim();

  // Remove markdown code fences
  script = script.replace(/```applescript\n?/gi, "");
  script = script.replace(/```osascript\n?/gi, "");
  script = script.replace(/```\n?/g, "");

  // Find the tell application block
  const start = script.indexOf("tell application");
  const end = script.lastIndexOf("end tell");

  if (start >= 0 && end > start) {
    script = script.substring(start, end + 8);
  }

  return script.trim();
}

/**
 * Generate AppleScript from instruction
 * First checks for built-in scripts, then falls back to AI
 */
export async function generateScript(instruction: string): Promise<string> {
  // Try built-in script first (faster and more reliable)
  const builtIn = findBuiltInScript(instruction);
  if (builtIn) {
    return builtIn;
  }

  // Fall back to AI
  const context = await getExcelContext();
  const prompt = buildPrompt(instruction, context);

  const raw = await callAI(prompt);
  const script = cleanScript(raw);

  // Basic validation
  if (!script.includes("tell application") || !script.includes("end tell")) {
    throw new Error("AI did not generate valid AppleScript");
  }

  return script;
}

/**
 * Execute AppleScript with proper activation and verification
 */
export async function executeScript(script: string): Promise<string> {
  // Log script for debugging
  console.log("=== EXECUTING SCRIPT ===");
  console.log(script);
  console.log("========================");

  // Step 1: Bring Excel to front and ensure it's ready
  try {
    await runAppleScript(`
      tell application "Microsoft Excel"
        activate
      end tell
    `);
    await new Promise((r) => setTimeout(r, 100));
  } catch {
    // Activation error can sometimes be ignored
  }

  // Step 2: Execute the actual script
  try {
    const result = await runAppleScript(script);
    console.log("Script result:", result);
    return result || "Executed successfully";
  } catch (error) {
    // If the script failed, try to get more info
    const errMsg = error instanceof Error ? error.message : String(error);
    console.log("Script error:", errMsg);

    // Common issues:
    if (errMsg.includes("not allowed to send keystrokes")) {
      throw new Error(
        "Excel needs Accessibility permissions. Go to System Preferences > Privacy & Security > Accessibility and add Raycast.",
      );
    }
    if (errMsg.includes("not allowed assistive access")) {
      throw new Error(
        "Enable Accessibility for Raycast in System Preferences > Privacy & Security > Accessibility.",
      );
    }
    if (errMsg.includes("missing value")) {
      // This often means the range doesn't exist
      throw new Error(
        "Range or cell not found. Check that the sheet has data and ranges exist.",
      );
    }

    throw new Error(`AppleScript error: ${errMsg}`);
  }
}

/**
 * Test if Excel automation is working
 */
export async function testExcelConnection(): Promise<string> {
  try {
    const result = await runAppleScript(`
      tell application "Microsoft Excel"
        activate
        if exists active workbook then
          set sheetName to name of active sheet
          set testCell to value of range "A1" of active sheet
          return "Connected: Sheet '" & sheetName & "', A1=" & (testCell as text)
        else
          return "Excel open but no workbook"
        end if
      end tell
    `);
    return result;
  } catch {
    return "Error: Connection failed";
  }
}
