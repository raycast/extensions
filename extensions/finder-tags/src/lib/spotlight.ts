import { execFile } from "node:child_process";
import { stat } from "node:fs/promises";
import { promisify } from "node:util";
import { getPreferenceValues } from "@raycast/api";
import { searchScopes, SearchInput, spotlightQuery } from "./query";
import { volumePath } from "./native";

const exec = promisify(execFile);

export function scopes(): string[] {
  const preferences = getPreferenceValues<Preferences>();
  return searchScopes(preferences.searchScope, preferences.extraFolders ?? "");
}

export async function findPaths(input: SearchInput): Promise<{ paths: string[]; warnings: string[] }> {
  const query = spotlightQuery(input);
  const paths = new Set<string>();
  const warnings: string[] = [];
  for (const scope of scopes()) {
    const info = await stat(scope).catch(() => {
      throw new Error(`Cannot read search folder: ${scope}. Check extension preferences and macOS permissions.`);
    });
    if (!info.isDirectory()) throw new Error(`Search scope must be a folder: ${scope}`);
    const { stdout } = await exec("/usr/bin/mdfind", ["-0", "-onlyin", scope, query], {
      encoding: "utf8",
      maxBuffer: 32 * 1024 * 1024,
      timeout: 30_000,
    });
    const found = stdout.split("\0").filter(Boolean);
    found.forEach((path) => paths.add(path));
    if (!found.length) {
      try {
        const mount = await volumePath(scope);
        const { stdout: status } = await exec("/usr/bin/mdutil", ["-s", mount], { encoding: "utf8", timeout: 5_000 });
        if (/disabled|No index|not supported/i.test(status))
          warnings.push(`Spotlight indexing is off for ${scope}. Searches can miss tagged files.`);
        else if (/unknown|error/i.test(status))
          warnings.push(
            `Spotlight indexing could not be verified for ${scope}. Check Spotlight settings if files are missing.`,
          );
      } catch (error) {
        const reason = error instanceof Error ? error.message : String(error);
        warnings.push(
          `No indexed results in ${scope}. Check Spotlight Search Privacy and folder access if files are missing. Index status: ${reason}`,
        );
      }
    }
  }
  return { paths: [...paths], warnings };
}
