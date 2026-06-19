import {
  Action,
  ActionPanel,
  Clipboard,
  Detail,
  Icon,
  List,
  showToast,
  Toast,
  getPreferenceValues,
} from "@raycast/api";
import { execFile } from "node:child_process";
import { homedir } from "node:os";
import { promisify } from "node:util";
import { useEffect, useState } from "react";

const execFileAsync = promisify(execFile);
const TITLE_COLUMN_CHARS = 84;

type ThreadlensSnippet = {
  role: string;
  timestamp: string;
  snippet: string;
  match_type?: string;
};

type ThreadlensResult = {
  result_id: string;
  source: string;
  session_id: string;
  cwd: string;
  title: string;
  last_timestamp: string;
  score: number;
  matched_terms: string[];
  best_snippets: ThreadlensSnippet[];
  source_path: string;
  source_line: number;
  actions?: {
    resume_command?: string;
    open_source?: string;
  };
};

export default function Command() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ThreadlensResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      setIsLoading(false);
      return;
    }

    let isCurrent = true;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const nextResults = await searchThreadlens(query, controller.signal);
        if (isCurrent) {
          setResults(nextResults);
        }
      } catch (error) {
        if (!isCurrent || isAbortError(error)) {
          return;
        }
        setResults([]);
        await showToast({
          style: Toast.Style.Failure,
          title: "Threadlens search failed",
          message: error instanceof Error ? error.message : String(error),
        });
      } finally {
        if (isCurrent) {
          setIsLoading(false);
        }
      }
    }, 180);

    return () => {
      isCurrent = false;
      controller.abort();
      clearTimeout(timer);
    };
  }, [query]);

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setQuery}
      searchBarPlaceholder="Search local coding-agent sessions..."
      throttle
    >
      {results.map((result) => (
        <List.Item
          key={result.result_id}
          title={{
            value: listTitle(result),
            tooltip: displayTitle(result),
          }}
          accessories={[
            {
              text: sourceLabel(result.source),
              icon: sourceIcon(result.source),
              tooltip: "Agent",
            },
            {
              text: formatDate(result.last_timestamp),
              icon: Icon.Calendar,
              tooltip: result.last_timestamp || "No timestamp",
            },
          ]}
          actions={<ThreadlensActions result={result} />}
        />
      ))}
    </List>
  );
}

function ThreadlensActions({
  result,
  includeDetails = true,
}: {
  result: ThreadlensResult;
  includeDetails?: boolean;
}) {
  return (
    <ActionPanel>
      {result.actions?.resume_command ? (
        <Action.CopyToClipboard
          title="Copy Resume Command"
          icon={Icon.Terminal}
          content={result.actions.resume_command}
        />
      ) : null}
      {includeDetails ? (
        <Action.Push
          title="Open Details"
          icon={Icon.Eye}
          target={<SessionDetail result={result} />}
        />
      ) : null}
      <Action
        title="Copy Session Brief"
        icon={Icon.Clipboard}
        onAction={() => copyBrief(result.result_id)}
      />
      <Action.CopyToClipboard
        title="Copy Result ID"
        icon={Icon.Text}
        content={result.result_id}
      />
      <Action.CopyToClipboard
        title="Copy Source Path"
        icon={Icon.Folder}
        content={result.actions?.open_source || result.source_path}
      />
      <Action.Open
        title="Open Source File"
        icon={Icon.Document}
        target={result.source_path}
      />
    </ActionPanel>
  );
}

function SessionDetail({ result }: { result: ThreadlensResult }) {
  return (
    <Detail
      markdown={detailMarkdown(result)}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label
            title="Title"
            text={displayTitle(result)}
            icon={Icon.Text}
          />
          <Detail.Metadata.Label
            title="Directory"
            text={result.cwd || "-"}
            icon={Icon.Folder}
          />
          <Detail.Metadata.Label
            title="Agent"
            text={sourceLabel(result.source)}
            icon={sourceIcon(result.source)}
          />
          <Detail.Metadata.Label
            title="Last Activity"
            text={formatDateTime(result.last_timestamp)}
            icon={Icon.Calendar}
          />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="Result ID" text={result.result_id} />
          <Detail.Metadata.Label title="Session ID" text={result.session_id} />
          <Detail.Metadata.Label
            title="Source"
            text={
              result.actions?.open_source ||
              `${result.source_path}:${result.source_line}`
            }
            icon={Icon.Document}
          />
        </Detail.Metadata>
      }
      actions={<ThreadlensActions result={result} includeDetails={false} />}
    />
  );
}

function detailMarkdown(result: ThreadlensResult): string {
  const snippets = result.best_snippets.length
    ? result.best_snippets
        .map(
          (snippet) =>
            `### ${markdownInline(roleLabel(snippet.role))} - ${markdownInline(formatDateTime(snippet.timestamp))}\n\n${codeBlock(cleanSnippet(snippet.snippet))}`,
        )
        .join("\n\n---\n\n")
    : "_No snippets returned._";

  const terms = result.matched_terms.length
    ? result.matched_terms.map((term) => `\`${markdownCode(term)}\``).join(", ")
    : "-";

  return `## Match Context

**Title:** ${markdownInline(displayTitle(result))}  
**Directory:** ${markdownInline(compactPath(result.cwd))}  
**Agent:** ${markdownInline(sourceLabel(result.source))}  
**Last activity:** ${markdownInline(formatDateTime(result.last_timestamp))}  
**Matched terms:** ${terms}

---

${snippets}`;
}

function displayTitle(result: ThreadlensResult): string {
  const title = (result.title || "").trim();
  const directory = lastPathPart(result.cwd);

  if (title && title !== result.session_id && title !== directory) {
    return title;
  }

  const headline = snippetHeadline(result);
  if (headline) {
    return headline;
  }

  if (directory) {
    return directory;
  }

  return result.session_id;
}

function snippetHeadline(result: ThreadlensResult): string {
  for (const snippet of result.best_snippets) {
    const text = cleanSnippet(snippet.snippet);
    if (!text || isLowSignalSnippet(text)) {
      continue;
    }
    return truncateMiddle(text, 88);
  }
  return "";
}

function cleanSnippet(value: string): string {
  return value
    .replace(/\[`([^`]+)`\]\([^)]+\)/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/\[[^\]]+\]/g, (match) => match.slice(1, -1))
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .replace(/^\.{3}/, "")
    .replace(/\.{3}$/, "")
    .trim();
}

function isLowSignalSnippet(value: string): boolean {
  const lower = value.toLowerCase();
  if (lower.includes("environment_context") || lower.includes("/cwd")) {
    return true;
  }
  return lower.length < 4;
}

function truncateMiddle(value: string, maxLength: number): string {
  if (value.length <= maxLength) {
    return value;
  }
  const head = Math.ceil((maxLength - 3) * 0.7);
  const tail = maxLength - 3 - head;
  return `${value.slice(0, head)}...${value.slice(-tail)}`;
}

function compactPath(value: string): string {
  if (!value) {
    return "-";
  }

  const home = homedir();
  const normalized = value.startsWith(home)
    ? `~${value.slice(home.length)}`
    : value;
  const parts = normalized.split("/").filter(Boolean);

  if (parts.length > 4) {
    const prefix = normalized.startsWith("/") ? "/" : "";
    const head = parts.slice(0, 2).join("/");
    const tail = parts.slice(-2).join("/");
    return `${prefix}${head}/.../${tail}`;
  }

  return normalized;
}

function listTitle(result: ThreadlensResult): string {
  return truncateMiddle(displayTitle(result), TITLE_COLUMN_CHARS);
}

function lastPathPart(value: string): string {
  if (!value) {
    return "";
  }
  return value.split("/").filter(Boolean).at(-1) || "";
}

function sourceLabel(source: string): string {
  const labels: Record<string, string> = {
    codex: "Codex",
    claude: "Claude",
    cursor: "Cursor",
    pi: "Pi",
    omp: "OMP",
    amp: "Amp",
    droid: "Droid",
    opencode: "OpenCode",
  };
  return labels[source] || source;
}

function sourceIcon(source: string) {
  const icons: Record<string, string | { light: string; dark: string }> = {
    codex: "agents/codex-badge.png",
    claude: "agents/claude.svg",
    cursor: {
      light: "agents/cursor.svg",
      dark: "agents/cursor-dark.svg",
    },
    pi: "agents/pi.svg",
    amp: "agents/amp.svg",
    omp: "agents/omp.svg",
    droid: "agents/droid.svg",
    opencode: {
      light: "agents/opencode.svg",
      dark: "agents/opencode-dark.svg",
    },
  };
  const icon = icons[source];

  if (!icon) {
    return Icon.Terminal;
  }

  return {
    source: icon,
    fallback: Icon.Terminal,
  };
}

function formatDate(value: string): string {
  const date = parseDate(value);
  if (!date) {
    return "-";
  }

  const currentYear = new Date().getFullYear();
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    ...(date.getFullYear() === currentYear ? {} : { year: "numeric" }),
  }).format(date);
}

function formatDateTime(value: string): string {
  const date = parseDate(value);
  if (!date) {
    return "-";
  }

  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function parseDate(value: string): Date | null {
  if (!value) {
    return null;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function roleLabel(role: string): string {
  if (!role) {
    return "Message";
  }
  return role.charAt(0).toUpperCase() + role.slice(1);
}

async function searchThreadlens(
  query: string,
  signal: AbortSignal,
): Promise<ThreadlensResult[]> {
  const { stdout } = await runThreadlens(
    ["search", query, "--json", "--no-bootstrap"],
    signal,
  );
  return parseThreadlensResults(stdout);
}

async function copyBrief(resultId: string) {
  try {
    const { stdout } = await runThreadlens(["brief", resultId, "--json"]);
    await Clipboard.copy(stdout.trim());
    await showToast({
      style: Toast.Style.Success,
      title: "Copied session brief",
    });
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Could not copy brief",
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

async function runThreadlens(args: string[], signal?: AbortSignal) {
  const preferences = getPreferenceValues<Preferences>();
  const override = preferences.threadlensCommand?.trim();
  const command = override || "threadlens";
  const baseArgs = splitArgs(preferences.threadlensArgs || "");
  try {
    return await execFileAsync(command, [...baseArgs, ...args], {
      cwd: preferences.threadlensCwd || undefined,
      env: {
        ...process.env,
        PATH: commandSearchPath(),
      },
      signal,
      timeout: 10_000,
      maxBuffer: 1024 * 1024 * 4,
    });
  } catch (error) {
    if (isExecutableMissing(error)) {
      throw new Error(
        `Threadlens CLI not found. Install it (no Python needed):\n` +
          `  npm install -g threadlens\n` +
          `  uvx threadlens   (or: uv tool install threadlens)\n\n` +
          `Already installed? Set its full path in the "Threadlens Command" preference.`,
      );
    }
    throw error;
  }
}

function commandSearchPath(): string {
  return [
    `${homedir()}/.local/bin`,
    `${homedir()}/bin`,
    `${homedir()}/.cargo/bin`,
    "/opt/homebrew/bin",
    "/usr/local/bin",
    process.env.PATH || "",
  ]
    .filter(Boolean)
    .join(":");
}

function isExecutableMissing(error: unknown): boolean {
  return (
    error instanceof Error &&
    "code" in error &&
    (error as NodeJS.ErrnoException).code === "ENOENT"
  );
}

function splitArgs(value: string): string[] {
  const matches = value.match(/(?:[^\s"]+|"[^"]*")+/g) || [];
  return matches.map((part) => part.replace(/^"|"$/g, ""));
}

function parseThreadlensResults(stdout: string): ThreadlensResult[] {
  const results: ThreadlensResult[] = [];
  let malformedLines = 0;

  for (const line of stdout.split("\n")) {
    const trimmedLine = line.trim();
    if (!trimmedLine) {
      continue;
    }

    try {
      results.push(JSON.parse(trimmedLine) as ThreadlensResult);
    } catch {
      malformedLines += 1;
    }
  }

  if (malformedLines > 0 && results.length === 0) {
    throw new Error("Threadlens returned malformed JSONL");
  }

  return results;
}

function markdownInline(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/([`*_{}[\]()#|])/g, "\\$1");
}

function markdownCode(value: string): string {
  return value.replace(/`/g, "\\`");
}

function codeBlock(value: string): string {
  const fence = value.includes("```") ? "````" : "```";
  return `${fence}text\n${value}\n${fence}`;
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}
