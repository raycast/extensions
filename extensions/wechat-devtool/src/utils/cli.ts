import { exec } from "child_process";
import { promisify } from "util";
import { showToast, Toast } from "@raycast/api";

const execAsync = promisify(exec);

interface OperationResult {
  success: boolean;
  error?: string;
}

export async function openProject(cliPath: string, projectPath: string): Promise<OperationResult> {
  try {
    const command = `"${cliPath}" open --project "${projectPath}"`;
    const { stderr } = await execAsync(command);
    if (stderr && stderr.trim()) {
      console.warn("CLI stderr:", stderr);
    }
    await showToast({
      style: Toast.Style.Success,
      title: "✅ Success",
      message: `Opened project: ${projectPath}`,
    });
    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Failed to open project:", errorMessage);
    await showToast({
      style: Toast.Style.Failure,
      title: "❌ Failed",
      message: errorMessage,
    });
    return {
      success: false,
      error: errorMessage,
    };
  }
}
