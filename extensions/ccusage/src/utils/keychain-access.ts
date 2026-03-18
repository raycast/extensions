import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

type ClaudeCredentials = {
  claudeAiOauth?: {
    accessToken?: string;
  };
};

export const getClaudeCredentials = async (): Promise<ClaudeCredentials | null> => {
  try {
    const { stdout } = await execAsync('security find-generic-password -s "Claude Code-credentials" -w');
    return JSON.parse(stdout.trim()) as ClaudeCredentials;
  } catch {
    return null;
  }
};

export const getClaudeAccessToken = async (): Promise<string | null> => {
  const credentials = await getClaudeCredentials();
  return credentials?.claudeAiOauth?.accessToken ?? null;
};
