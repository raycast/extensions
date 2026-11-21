import fs from "fs";
import os from "os";
import path from "path";
import { execFile } from "child_process";
import { promisify } from "util";
import { getPreferenceValues } from "@raycast/api";
import {
  ClaudeOAuthCredentialError,
  parseClaudeOAuthCredential,
} from "./claude-oauth-credential-core";
import { getClaudeConfigDirectory, isWindows } from "./platform";

const execFilePromise = promisify(execFile);
const MAX_CREDENTIAL_BYTES = 128 * 1024;
const CLAUDE_KEYCHAIN_SERVICE = "Claude Code-credentials";

export async function loadClaudeSubscriptionCredential(options?: {
  allowKeychainPrompt?: boolean;
}): Promise<string | undefined> {
  const preferences = getPreferenceValues<Preferences>();
  const configDirectory = getClaudeConfigDirectory(
    os.homedir(),
    process.env,
    preferences.claudeConfigPath,
  );
  const fileCredential = await readCredentialFile(
    path.join(configDirectory, ".credentials.json"),
  );
  if (fileCredential) return fileCredential;

  if (isWindows() || process.platform !== "darwin") return undefined;
  if (options?.allowKeychainPrompt === false) return undefined;
  return readMacKeychainCredential();
}

async function readCredentialFile(
  filePath: string,
): Promise<string | undefined> {
  let stat: fs.Stats;
  try {
    stat = await fs.promises.lstat(filePath);
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException)?.code === "ENOENT") return undefined;
    throw new ClaudeOAuthCredentialError(
      "Claude Code Credentials Could Not Be Read",
    );
  }
  if (
    !stat.isFile() ||
    stat.isSymbolicLink() ||
    stat.size <= 0 ||
    stat.size > MAX_CREDENTIAL_BYTES
  ) {
    throw new ClaudeOAuthCredentialError(
      "Claude Code Credentials File Is Invalid",
    );
  }
  try {
    return parseClaudeOAuthCredential(
      await fs.promises.readFile(filePath, "utf8"),
    ).accessToken;
  } catch (error) {
    if (error instanceof ClaudeOAuthCredentialError) throw error;
    throw new ClaudeOAuthCredentialError(
      "Claude Code Credentials Could Not Be Read",
    );
  }
}

async function readMacKeychainCredential(): Promise<string | undefined> {
  let stdout: string;
  try {
    ({ stdout } = await execFilePromise(
      "/usr/bin/security",
      ["find-generic-password", "-s", CLAUDE_KEYCHAIN_SERVICE, "-w"],
      { timeout: 15_000, maxBuffer: MAX_CREDENTIAL_BYTES },
    ));
  } catch {
    throw new ClaudeOAuthCredentialError(
      "Claude Code Keychain Access Was Denied. Allow Access or Run 'claude auth login'",
    );
  }
  return parseClaudeOAuthCredential(stdout).accessToken;
}
