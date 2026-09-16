import { execFile } from "node:child_process";
import { readFile, unlink } from "node:fs/promises";
import { join } from "node:path";
import { promisify } from "node:util";

import { environment } from "@raycast/api";
import { createDeeplink } from "@raycast/utils";

const execFileAsync = promisify(execFile);
const REVEAL_GRANT_NAME = "candidate-rules-reveal-grant";
const REVEAL_GRANT_TTL_MS = 60_000;

type AuthenticationProcessError = Error & {
  code?: string | number;
  stderr?: string;
};

export async function authenticateToRevealRules(): Promise<boolean> {
  const helperPath = join(environment.assetsPath, "rime-manager-auth");
  const grantPath = join(environment.supportPath, REVEAL_GRANT_NAME);
  const commandDeeplink = createDeeplink({ command: environment.commandName });
  try {
    const { stdout } = await execFileAsync(helperPath, ["--grant-path", grantPath, "--deeplink", commandDeeplink], {
      timeout: 60_000,
    });
    return stdout.trim() === "AUTHENTICATED";
  } catch (error) {
    const processError = error as AuthenticationProcessError;
    const stderr = processError.stderr?.trim() ?? "";
    if (stderr.startsWith("AUTH_CANCELED")) return false;
    if (processError.code === "ENOENT")
      throw new Error("The local authentication helper is missing. Rebuild the extension.");
    if (stderr.startsWith("AUTH_UNAVAILABLE:")) throw new Error(stderr.slice("AUTH_UNAVAILABLE:".length));
    if (stderr.startsWith("AUTH_FAILED:")) throw new Error(stderr.slice("AUTH_FAILED:".length));
    throw new Error("Authentication failed.");
  }
}

export async function consumeRevealGrant(): Promise<boolean> {
  const grantPath = join(environment.supportPath, REVEAL_GRANT_NAME);
  try {
    const timestamp = Number((await readFile(grantPath, "utf8")).trim());
    await unlink(grantPath).catch(() => undefined);
    const age = Date.now() - timestamp;
    return Number.isFinite(timestamp) && age >= 0 && age <= REVEAL_GRANT_TTL_MS;
  } catch {
    return false;
  }
}
