import { homedir } from "node:os";
import { isAbsolute, join, resolve } from "node:path";

export function configHome(
  setting: string | undefined,
  environment: string | undefined,
  fallback: string,
): string {
  const value = setting?.trim() || environment?.trim() || join(homedir(), fallback);
  const expanded =
    value === "~" ? homedir() : value.startsWith("~/") ? join(homedir(), value.slice(2)) : value;
  if (!isAbsolute(expanded)) throw new Error("Choose an absolute path for the account directory.");
  return resolve(expanded);
}
