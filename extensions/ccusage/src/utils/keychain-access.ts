import { exec } from "child_process";
import { promisify } from "util";
import { readFile } from "fs/promises";
import { homedir } from "os";
import { join } from "path";

const execAsync = promisify(exec);

type ClaudeCredentials = {
  claudeAiOauth?: {
    accessToken?: string;
  };
};

const readCredentialsFile = async (): Promise<ClaudeCredentials | null> => {
  try {
    const filePath = join(homedir(), ".claude", ".credentials.json");
    const content = await readFile(filePath, "utf-8");
    return JSON.parse(content) as ClaudeCredentials;
  } catch {
    return null;
  }
};

const readCredentialsKeychain = async (): Promise<ClaudeCredentials | null> => {
  try {
    const { stdout } = await execAsync('security find-generic-password -s "Claude Code-credentials" -w');
    return JSON.parse(stdout.trim()) as ClaudeCredentials;
  } catch {
    return null;
  }
};

export const getClaudeCredentials = async (): Promise<ClaudeCredentials | null> => {
  const fromFile = await readCredentialsFile();
  if (fromFile?.claudeAiOauth?.accessToken) return fromFile;
  return readCredentialsKeychain();
};

export const getClaudeAccessToken = async (): Promise<string | null> => {
  const credentials = await getClaudeCredentials();
  return credentials?.claudeAiOauth?.accessToken ?? null;
};
