import { generateScript, executeScript, checkExcel } from "../ai-utils";

interface ToolInput {
  instruction: string;
}

export default async function tool(input: ToolInput): Promise<string> {
  const { instruction } = input;

  try {
    // Check Excel first
    const excelRunning = await checkExcel();
    if (!excelRunning) {
      return "Error: Microsoft Excel is not running. Please open Excel first.";
    }

    // Generate and execute
    const script = await generateScript(instruction);
    const result = await executeScript(script);

    if (result && result.startsWith("ERROR")) {
      return `❌ Failed: ${result}`;
    }

    if (result && result !== "missing value" && result.trim()) {
      return `✓ Done. Result: ${result}`;
    }
    return `✓ Executed: "${instruction}"`;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);

    // Helpful error messages
    if (
      msg.includes("not allowed to send keystrokes") ||
      msg.includes("Accessibility")
    ) {
      return "Error: Excel automation requires Accessibility permissions. Please grant Raycast access in System Settings > Privacy & Security > Accessibility.";
    }

    return `Error: ${msg}`;
  }
}
