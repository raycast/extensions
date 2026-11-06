import { execFile } from "node:child_process";
import { access, constants } from "node:fs/promises";
import { isAbsolute } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
export const CLI_DOCS = "https://spokenly.app/docs/macos/cli";
export const SETUP_MESSAGE =
  "Install the official CLI from Spokenly → Settings → Install CLI, then keep Spokenly running. Update Spokenly if Install CLI is missing.";

export type Timing = "before-ai" | "after-ai" | "both";
export interface Replacement {
  original: string;
  replacement: string;
  [key: string]: unknown;
}
export interface NewReplacement {
  original: string;
  replacement: string;
  regex: boolean;
  timing: Timing;
}

export function parseReplacements(output: string): Replacement[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(output);
  } catch {
    throw new Error(
      "Spokenly did not return valid replacement JSON. Update the app and CLI, then try again.",
    );
  }
  if (
    !Array.isArray(parsed) ||
    parsed.some(
      (item) =>
        !item ||
        typeof item !== "object" ||
        typeof item.original !== "string" ||
        typeof item.replacement !== "string",
    )
  ) {
    throw new Error(
      "Spokenly returned an unsupported replacement format. No rules were changed.",
    );
  }
  return parsed;
}

export function sameOriginal(a: string, b: string): boolean {
  return a.toLowerCase() === b.toLowerCase();
}

export function validateReplacement(value: NewReplacement): void {
  if (!value.original.trim())
    throw new Error("Enter the original text or pattern.");
  if (value.original.startsWith("-") || value.replacement.startsWith("-")) {
    throw new Error(
      "The CLI cannot safely receive text beginning with a dash from this extension.",
    );
  }
  if (!["before-ai", "after-ai", "both"].includes(value.timing))
    throw new Error("Choose a valid replacement timing.");
}

export async function findCLI(configuredPath?: string): Promise<string> {
  const paths = configuredPath?.trim()
    ? [configuredPath.trim()]
    : ["/usr/local/bin/spokenly", "/opt/homebrew/bin/spokenly"];
  for (const path of paths) {
    if (!isAbsolute(path))
      throw new Error("The Spokenly CLI path must be an absolute path.");
    try {
      await access(path, constants.X_OK);
      return path;
    } catch {
      // The app's supported installer creates the CLI at /usr/local/bin/spokenly.
    }
  }
  throw new Error(SETUP_MESSAGE);
}

export class SpokenlyCLI {
  constructor(private readonly executable: string) {}

  private async run(args: string[]): Promise<string> {
    try {
      const { stdout } = await execFileAsync(this.executable, args, {
        timeout: 20_000,
        maxBuffer: 8 * 1024 * 1024,
        encoding: "utf8",
      });
      return stdout;
    } catch (error) {
      const failure = error as {
        code?: string | number;
        killed?: boolean;
        stderr?: string;
      };
      if (failure.code === "ENOENT") throw new Error(SETUP_MESSAGE);
      if (failure.killed)
        throw new Error(
          "Spokenly did not respond within 20 seconds. Keep the app running and try again.",
        );
      const message = failure.stderr?.trim();
      throw new Error(
        message ||
          "Spokenly CLI failed. Keep the app running and check that its CLI is up to date.",
      );
    }
  }

  async list(): Promise<Replacement[]> {
    return parseReplacements(await this.run(["replacements", "list"]));
  }

  async add(value: NewReplacement): Promise<{ settingsVerified: boolean }> {
    validateReplacement(value);
    const before = await this.list();
    if (before.some((entry) => sameOriginal(entry.original, value.original))) {
      throw new Error(
        "A rule with that original already exists. Remove it explicitly before adding a replacement.",
      );
    }
    const args = ["replacements", "add", value.original, value.replacement];
    if (value.regex) args.push("--regex");
    args.push("--timing", value.timing);
    await this.run(args);
    const after = await this.list();
    const saved = after.find(
      (entry) =>
        sameOriginal(entry.original, value.original) &&
        entry.replacement === value.replacement,
    );
    if (!saved) {
      throw new Error(
        "Spokenly accepted the command, but the replacement was not found on read-back. Refresh before retrying.",
      );
    }
    if (saved.disabled === true)
      throw new Error(
        "The saved rule is disabled in Spokenly. Check its editor.",
      );
    if (typeof saved.isRegex === "boolean" && saved.isRegex !== value.regex) {
      throw new Error(
        "Spokenly saved the text with different matching settings. Check its editor before retrying.",
      );
    }
    const timingValue = {
      "before-ai": "beforeAI",
      "after-ai": "afterAI",
      both: "both",
    }[value.timing];
    if (
      typeof saved.timing === "string" &&
      saved.timing !== timingValue &&
      saved.timing !== value.timing
    ) {
      throw new Error(
        "Spokenly saved the text with different timing. Check its editor before retrying.",
      );
    }
    return {
      settingsVerified:
        typeof saved.isRegex === "boolean" && typeof saved.timing === "string",
    };
  }

  async remove(original: string): Promise<number> {
    const before = await this.list();
    const count = before.filter((entry) =>
      sameOriginal(entry.original, original),
    ).length;
    if (!count)
      throw new Error("This rule no longer exists. Refresh the list.");
    if (original.startsWith("-"))
      throw new Error(
        "Remove originals beginning with a dash in Spokenly's editor.",
      );
    await this.run(["replacements", "remove", original]);
    const after = await this.list();
    if (after.some((entry) => sameOriginal(entry.original, original))) {
      throw new Error(
        "The rule is still present after removal. Refresh before retrying.",
      );
    }
    return count;
  }
}
