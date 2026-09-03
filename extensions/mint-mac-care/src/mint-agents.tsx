import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { useExec } from "@raycast/utils";
import { MintActions } from "./mint-actions";
import { canRevalidateMintCLI, formatBytes, parseMintAgentsJSON } from "./mint-cli";
import { MissingMint } from "./missing-mint";
import { useMintCLI } from "./use-mint-cli";

type AgentAgeBucket = {
  label?: string;
  count?: number;
  bytes?: number;
};

type AgentConversations = {
  count?: number;
  active?: number;
  archived?: number;
  archivedBytes?: number;
  subagentTranscripts?: number;
  byAge?: AgentAgeBucket[];
};

type AgentTool = {
  tool?: string;
  name?: string;
  totalBytes?: number;
  totalHuman?: string;
  fileCount?: number;
  mintReclaimableBytes?: number;
  conversations?: AgentConversations;
};

type CodexArchive = {
  archivedConversations?: number;
  archivedBytes?: number;
  measuredConversations?: number;
  compressibleMediaBytes?: number;
  measureComplete?: boolean;
};

type MintAgents = {
  available: boolean;
  reason?: string;
  scannedAt?: string;
  totalBytes?: number;
  mintReclaimableBytes?: number;
  tools?: AgentTool[];
  codexArchive?: CodexArchive;
  note?: string;
};

export default function Command() {
  const { resolution, recheck } = useMintCLI();
  const cli = resolution.status === "ready" ? resolution.path : undefined;
  const { data, error, isLoading, revalidate } = useExec(cli ?? "/usr/bin/false", ["agents", "--json"], {
    execute: Boolean(cli),
    timeout: 30_000,
  });

  if (resolution.status !== "ready") return <MissingMint resolution={resolution} onRetry={recheck} />;

  const agents = parseMintAgentsJSON<MintAgents>(data);
  const refresh = () => {
    const nextResolution = recheck();
    if (canRevalidateMintCLI(cli, nextResolution)) revalidate();
  };
  const errorText = error
    ? `Mint 1.0.25 or later is required. ${error.message}`
    : data && !agents
      ? "Mint returned AI-agent storage data that this extension could not verify. Update Mint and try again."
      : undefined;

  if (errorText) {
    return (
      <List searchBarPlaceholder="Search AI agent storage">
        <List.EmptyView
          title="AI Agent Storage is unavailable"
          description={errorText}
          icon={Icon.Warning}
          actions={
            <ActionPanel>
              <Action title="Retry" icon={Icon.ArrowClockwise} onAction={refresh} />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  if (!isLoading && agents && !agents.available) {
    return (
      <List searchBarPlaceholder="Search AI agent storage">
        <List.EmptyView
          title="Run an AI Agents scan in Mint"
          description={agents.reason ?? "Open Mint → Disk, enable AI Agents in Advanced Options, and run a scan."}
          icon={Icon.Terminal}
          actions={
            <ActionPanel>
              <Action title="Retry" icon={Icon.ArrowClockwise} onAction={refresh} />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  const tools = agents?.tools ?? [];
  const scannedAt = formatScanDate(agents?.scannedAt);
  const codex = agents?.codexArchive;

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search Codex, Claude, Cursor…">
      {agents?.available ? (
        <List.Section title="Overview" subtitle={scannedAt ? `Scanned ${scannedAt}` : undefined}>
          <List.Item
            icon={{ source: Icon.Terminal, tintColor: Color.Purple }}
            title={`${formatBytes(agents.totalBytes)} across AI tools`}
            subtitle={`${tools.length} ${tools.length === 1 ? "tool" : "tools"} found on this Mac`}
            accessories={
              agents.mintReclaimableBytes
                ? [{ text: `${formatBytes(agents.mintReclaimableBytes)} Mint can reclaim` }]
                : []
            }
            actions={<MintActions output={data} onRefresh={refresh} />}
          />
        </List.Section>
      ) : null}

      {tools.length ? (
        <List.Section title="AI Tools" subtitle={`${tools.length} detected`}>
          {tools.map((tool, index) => (
            <List.Item
              key={`${tool.tool ?? tool.name ?? "tool"}-${index}`}
              icon={Icon.Terminal}
              title={tool.name ?? tool.tool ?? "AI tool"}
              subtitle={conversationSummary(tool)}
              accessories={[
                ...(tool.mintReclaimableBytes
                  ? [{ text: `${formatBytes(tool.mintReclaimableBytes)} reclaimable` }]
                  : []),
                { text: tool.totalHuman ?? formatBytes(tool.totalBytes) },
              ]}
              actions={<MintActions output={data} onRefresh={refresh} />}
            />
          ))}
        </List.Section>
      ) : null}

      {codex ? (
        <List.Section title="Codex Archive" subtitle="Actions stay in Mint">
          <List.Item
            icon={{ source: Icon.Archive, tintColor: Color.Green }}
            title={`${codex.archivedConversations ?? 0} archived conversations`}
            subtitle={
              codex.measuredConversations
                ? `${codex.measuredConversations} measured for compressible media`
                : "Select conversations in Mint to measure their media"
            }
            accessories={[
              { text: formatBytes(codex.archivedBytes) },
              ...(codex.compressibleMediaBytes
                ? [{ text: `~${formatBytes(codex.compressibleMediaBytes)} compressible` }]
                : []),
            ]}
            actions={<MintActions output={data} onRefresh={refresh} />}
          />
        </List.Section>
      ) : null}
    </List>
  );
}

function conversationSummary(tool: AgentTool): string | undefined {
  const conversations = tool.conversations;
  if (conversations) {
    const parts: string[] = [];
    if (typeof conversations.active === "number") parts.push(`${conversations.active} active`);
    if (typeof conversations.archived === "number") parts.push(`${conversations.archived} archived`);
    if (!parts.length && typeof conversations.count === "number") {
      parts.push(`${conversations.count} conversations`);
    }
    if (typeof conversations.subagentTranscripts === "number" && conversations.subagentTranscripts > 0) {
      parts.push(`${conversations.subagentTranscripts} subagent transcripts`);
    }
    if (parts.length) return parts.join(" · ");
  }
  return typeof tool.fileCount === "number" ? `${tool.fileCount} files` : undefined;
}

function formatScanDate(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date);
}
