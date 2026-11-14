import { resolveCliExecutable } from "./cli-executable";
import { resolveCodexExecutable } from "./executable";
import { resolveAgyExecutable } from "./provider-antigravity";
import type { ProviderId } from "./provider";

export const CLI_DEFINITIONS = [
  {
    id: "codex",
    label: "Codex",
    preference: "codexPath",
    pathLabel: "Codex Path",
  },
  {
    id: "antigravity",
    label: "Antigravity",
    preference: "agyPath",
    pathLabel: "Antigravity CLI Path",
  },
  {
    id: "qoder",
    label: "Qoder",
    preference: "qoderPath",
    pathLabel: "Qoder CLI Path",
  },
  {
    id: "qoder-cn",
    label: "Qoder CN",
    preference: "qoderCnPath",
    pathLabel: "Qoder CN CLI Path",
  },
  {
    id: "workbuddy",
    label: "WorkBuddy",
    preference: "workbuddyPath",
    pathLabel: "WorkBuddy CLI Path",
  },
  {
    id: "gemini",
    label: "Gemini",
    preference: "geminiPath",
    pathLabel: "Gemini CLI Path",
  },
] as const;

type PathPreference = (typeof CLI_DEFINITIONS)[number]["preference"];
export type CliDetectionPreferences = Partial<
  Record<PathPreference, string>
> & {
  autoDetectCli?: boolean;
};
export type CliDetectionResult = {
  provider: ProviderId;
  status: "found" | "not-found" | "manual-required";
  source: "manual" | "automatic";
  configuredPath: string;
  path?: string;
  runtime?: string;
  error?: string;
  checkedAt: number;
};

export type CliResolver = (
  provider: ProviderId,
  explicit?: string,
) => Promise<{ command: string; prefix?: string[] }>;

const resolveExecutable: CliResolver = (provider, explicit) => {
  if (provider === "codex") return resolveCodexExecutable(explicit);
  if (provider === "antigravity") return resolveAgyExecutable(explicit);
  return resolveCliExecutable(provider, explicit);
};

/** File discovery only: never runs a prompt or treats a catalog as authentication. */
export async function detectCli(
  provider: ProviderId,
  preferences: CliDetectionPreferences,
  resolve: CliResolver = resolveExecutable,
): Promise<CliDetectionResult> {
  const definition = CLI_DEFINITIONS.find((entry) => entry.id === provider)!;
  const configuredPath = preferences[definition.preference]?.trim() || "";
  const source = configuredPath ? "manual" : "automatic";
  const base = { provider, source, configuredPath } as const;
  if (!configuredPath && preferences.autoDetectCli === false)
    return { ...base, status: "manual-required", checkedAt: Date.now() };
  try {
    const executable = await resolve(provider, configuredPath || undefined);
    return {
      ...base,
      status: "found",
      // npm wrappers are resolved to their actual Node entrypoint. This is the
      // path to copy into preferences; the Node runtime is shown separately.
      path:
        executable.prefix?.[0] || executable.command.replace(/^"(.*)"$/, "$1"),
      ...(executable.prefix?.length ? { runtime: executable.command } : {}),
      checkedAt: Date.now(),
    };
  } catch (reason) {
    return {
      ...base,
      status: "not-found",
      error: reason instanceof Error ? reason.message : String(reason),
      checkedAt: Date.now(),
    };
  }
}

/** A new refresh supersedes pending results; disposal prevents late UI updates. */
export class CliDetectionController {
  private revision = 0;
  constructor(private readonly resolve?: CliResolver) {}

  cancel() {
    this.revision++;
  }

  async scan(
    preferences: CliDetectionPreferences,
    onResult: (result: CliDetectionResult) => void,
  ): Promise<CliDetectionResult[] | undefined> {
    const revision = ++this.revision;
    const snapshot = { ...preferences };
    const results = await Promise.all(
      CLI_DEFINITIONS.map(async ({ id }) => {
        const result = await detectCli(id, snapshot, this.resolve);
        if (revision === this.revision) onResult(result);
        return result;
      }),
    );
    return revision === this.revision ? results : undefined;
  }
}
