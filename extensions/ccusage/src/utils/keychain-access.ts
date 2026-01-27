import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export const getClaudeAccessToken = async (): Promise<string | null> => {
  try {
    const { stdout } = await execAsync('security find-generic-password -s "Claude Code-credentials" -w');
    const credentials = JSON.parse(stdout.trim());
    return credentials.claudeAiOauth?.accessToken ?? null;
  } catch {
    return null;
  }
};
