import {
  Action,
  ActionPanel,
  Color,
  Icon,
  List,
  showToast,
  Toast,
} from "@raycast/api";
import { execFile } from "node:child_process";
import { useEffect, useMemo, useState } from "react";

type Provider =
  | "all"
  | "codex"
  | "claude"
  | "opencode"
  | "hermes"
  | "cursor"
  | "copilot";
type Scope = "all" | "metadata";

type SearchResult = {
  provider: Exclude<Provider, "all">;
  id: string;
  title: string;
  cwd?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  message_count?: number | null;
  resume_command: string;
  score: number;
  matched_in: string;
  snippets: string[];
  latest_messages: string[];
};

const FAINDER_PATHS = [
  "fainder",
  "/opt/homebrew/bin/fainder",
  "/usr/local/bin/fainder",
];

export default function Command() {
  const [query, setQuery] = useState("");
  const [provider, setProvider] = useState<Provider>("all");
  const [scope, setScope] = useState<Scope>("all");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showDetail, setShowDetail] = useState(false);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setResults([]);
      setErrorMessage(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    searchFainder(trimmed, provider, scope)
      .then((nextResults) => {
        setResults(nextResults);
        setErrorMessage(null);
      })
      .catch(async (error) => {
        setResults([]);
        setErrorMessage(error instanceof Error ? error.message : String(error));
        await showToast({
          style: Toast.Style.Failure,
          title: "Fainder search failed",
          message: error instanceof Error ? error.message : String(error),
        });
      })
      .finally(() => setIsLoading(false));
  }, [query, provider, scope]);

  const accessory = useMemo(
    () => (
      <List.Dropdown
        tooltip="Search Scope"
        value={`${provider}:${scope}`}
        onChange={(value) => {
          const [nextProvider, nextScope] = value.split(":") as [
            Provider,
            Scope,
          ];
          setProvider(nextProvider);
          setScope(nextScope);
        }}
      >
        <List.Dropdown.Section title="All Providers">
          <List.Dropdown.Item title="All - Full Text" value="all:all" />
          <List.Dropdown.Item title="All - Metadata" value="all:metadata" />
        </List.Dropdown.Section>
        <List.Dropdown.Section title="Providers">
          {providers().map((item) => (
            <List.Dropdown.Item
              key={item}
              title={`${labelProvider(item)} - Full Text`}
              value={`${item}:all`}
            />
          ))}
          {providers().map((item) => (
            <List.Dropdown.Item
              key={`${item}-metadata`}
              title={`${labelProvider(item)} - Metadata`}
              value={`${item}:metadata`}
            />
          ))}
        </List.Dropdown.Section>
      </List.Dropdown>
    ),
    [provider, scope],
  );

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={showDetail && results.length > 0}
      onSearchTextChange={setQuery}
      searchBarAccessory={accessory}
      searchBarPlaceholder="Search local agent conversations..."
      throttle
    >
      {errorMessage ? (
        <List.EmptyView
          icon={Icon.Warning}
          title="Fainder is not ready"
          description={errorMessage}
          actions={<SetupActions />}
        />
      ) : query.trim().length < 2 ? (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="Search Fainder"
          description="Type a project, repo, bug, client, or topic."
          actions={<SetupActions />}
        />
      ) : (
        results.map((result) => (
          <List.Item
            key={`${result.provider}:${result.id}`}
            icon={{
              source: Icon.Message,
              tintColor: providerColor(result.provider),
            }}
            title={displayTitle(result)}
            subtitle={contextLine(result)}
            accessories={[
              {
                text: compactMessages(result.message_count),
                tooltip: `Messages: ${fullMessages(result.message_count)}`,
              },
              {
                text: lastShort(result.updated_at),
                tooltip: `Last used: ${lastLong(result.updated_at)}`,
              },
            ]}
            detail={
              showDetail ? (
                <List.Item.Detail markdown={detailMarkdown(result)} />
              ) : undefined
            }
            actions={
              <ConversationActions
                result={result}
                showDetail={showDetail}
                setShowDetail={setShowDetail}
              />
            }
          />
        ))
      )}
    </List>
  );
}

function SetupActions() {
  return (
    <ActionPanel>
      <Action
        title="Install Fainder with Homebrew"
        icon={Icon.Download}
        onAction={() => openInTerminal("brew install satelerd/tap/fainder")}
      />
      <Action
        title="Update Fainder with Homebrew"
        icon={Icon.ArrowClockwise}
        onAction={() => openInTerminal("brew update && brew upgrade fainder")}
      />
      <Action.CopyToClipboard
        title="Copy Install Command"
        content="brew install satelerd/tap/fainder"
      />
    </ActionPanel>
  );
}

function ConversationActions({
  result,
  showDetail,
  setShowDetail,
}: {
  result: SearchResult;
  showDetail: boolean;
  setShowDetail: (value: boolean) => void;
}) {
  return (
    <ActionPanel title={result.title}>
      <Action.CopyToClipboard
        title="Copy Resume Command"
        content={result.resume_command}
      />
      <Action
        title={showDetail ? "Hide Preview" : "Show Preview"}
        icon={showDetail ? Icon.Sidebar : Icon.AppWindowSidebarLeft}
        shortcut={{ modifiers: ["cmd"], key: "y" }}
        onAction={() => setShowDetail(!showDetail)}
      />
      <Action
        title="Open in Terminal"
        icon={Icon.Terminal}
        onAction={() => openInTerminal(result.resume_command)}
      />
      <Action.CopyToClipboard
        title="Copy Conversation ID"
        content={result.id}
        shortcut={{ modifiers: ["cmd"], key: "i" }}
      />
      {result.cwd ? (
        <Action.CopyToClipboard
          title="Copy Project Path"
          content={result.cwd}
          shortcut={{ modifiers: ["cmd"], key: "p" }}
        />
      ) : null}
    </ActionPanel>
  );
}

async function searchFainder(
  query: string,
  provider: Provider,
  scope: Scope,
): Promise<SearchResult[]> {
  const args = ["search", query, "--json", "--limit", "50", "--scope", scope];
  if (provider !== "all") {
    args.push("--provider", provider);
  }
  const output = await runFainder(args);
  return JSON.parse(output) as SearchResult[];
}

async function openInTerminal(command: string) {
  await exec("osascript", [
    "-e",
    `tell application "Terminal" to do script "${escapeAppleScript(command)}"`,
    "-e",
    `tell application "Terminal" to activate`,
  ]);
  await showToast({ style: Toast.Style.Success, title: "Opened in Terminal" });
}

async function runFainder(args: string[]): Promise<string> {
  let lastError: unknown;
  for (const binary of FAINDER_PATHS) {
    try {
      return await exec(binary, args);
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
}

function exec(file: string, args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(
      file,
      args,
      {
        env: {
          ...process.env,
          PATH: `/opt/homebrew/bin:/usr/local/bin:${process.env.PATH ?? ""}`,
        },
        maxBuffer: 1024 * 1024 * 20,
      },
      (error, stdout, stderr) => {
        if (error) {
          reject(new Error(stderr.trim() || error.message));
          return;
        }
        resolve(stdout);
      },
    );
  });
}

function escapeAppleScript(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\r/g, " ")
    .replace(/\n/g, " ")
    .replace(/"/g, '\\"');
}

function detailMarkdown(result: SearchResult): string {
  const project = result.cwd ? `\`${escapeMarkdown(result.cwd)}\`` : "-";
  const parts = [
    `# ${escapeMarkdown(result.title)}`,
    "",
    `**${labelProvider(result.provider)}**`,
    "",
    `- Project: ${project}`,
    `- Messages: ${fullMessages(result.message_count)}`,
    `- Started: ${startedDate(result.created_at)}`,
    `- Last used: ${relativeDate(result.updated_at)}`,
    `- Matched in: ${result.matched_in}`,
    "",
    "## Resume Command",
    "```bash",
    result.resume_command,
    "```",
  ];

  if (result.snippets.length > 0) {
    parts.push(
      "",
      "## Snippets",
      ...result.snippets.map(
        (snippet) => `- ${escapeMarkdown(oneLine(snippet))}`,
      ),
    );
  }

  if (result.latest_messages.length > 0) {
    const latest = latestUserMessages(result.latest_messages);
    parts.push(
      "",
      "## Recent User Messages",
      ...latest.map((message) => `- ${escapeMarkdown(oneLine(message))}`),
    );
  }

  return parts.join("\n");
}

function labelProvider(provider: Exclude<Provider, "all">): string {
  const labels = {
    codex: "Codex",
    claude: "Claude",
    opencode: "OpenCode",
    hermes: "Hermes",
    cursor: "Cursor",
    copilot: "Copilot",
  };
  return labels[provider];
}

function providerColor(provider: Exclude<Provider, "all">): Color {
  const colors = {
    codex: Color.Blue,
    claude: Color.Orange,
    opencode: Color.Green,
    hermes: Color.Purple,
    cursor: Color.Yellow,
    copilot: Color.PrimaryText,
  };
  return colors[provider];
}

function providers(): Exclude<Provider, "all">[] {
  return ["codex", "claude", "opencode", "hermes", "cursor", "copilot"];
}

function basename(path: string): string {
  return path.split("/").filter(Boolean).pop() ?? path;
}

function oneLine(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function escapeMarkdown(value: string): string {
  return value.replace(/[\\`*_{}[\]()#+\-.!|>]/g, "\\$&");
}

function relativeDate(value?: string | null): string {
  if (!value) return "-";
  const time = new Date(value).getTime();
  if (Number.isNaN(time)) return value;
  const seconds = Math.floor((Date.now() - time) / 1000);
  if (seconds < 60) return "now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "yesterday";
  if (days < 7) return `${days}d ago`;
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
  }).format(new Date(time));
}

function startedDate(value?: string | null): string {
  if (!value) return "-";
  const time = new Date(value).getTime();
  if (Number.isNaN(time)) return value;
  const deltaHours = Math.floor((Date.now() - time) / 3_600_000);
  if (deltaHours < 24) {
    return new Intl.DateTimeFormat(undefined, {
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(time));
  }
  return relativeDate(value);
}

function displayTitle(result: SearchResult): string {
  return truncate(result.title, 56);
}

function contextLine(result: SearchResult): string {
  const parts: string[] = [];
  const project = result.cwd ? basename(result.cwd) : null;
  if (project && project !== result.title) {
    parts.push(project);
  }
  parts.push(labelProvider(result.provider));
  if (parts.length > 0) return parts.join("  ·  ");
  return result.matched_in === "title"
    ? "Conversation title match"
    : `matched in ${result.matched_in}`;
}

function compactMessages(value?: number | null): string {
  if (value == null) return "msgs -";
  if (value >= 1000) return `${Math.round(value / 100) / 10}k msgs`;
  return `${value} msgs`;
}

function lastShort(value?: string | null): string {
  if (!value) return "-";
  return relativeDate(value);
}

function lastLong(value?: string | null): string {
  if (!value) return "-";
  const time = new Date(value).getTime();
  if (Number.isNaN(time)) return value;
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(time));
}

function fullMessages(value?: number | null): string {
  if (value == null) return "unknown";
  return `${value} msgs`;
}

function latestUserMessages(messages: string[]): string[] {
  return messages.slice(-3);
}

function truncate(value: string, max: number): string {
  if (value.length <= max) return value;
  return `${value.slice(0, Math.max(0, max - 1))}…`;
}
