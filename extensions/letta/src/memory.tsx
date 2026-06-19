/**
 * View Agent Memory Component
 *
 * Inspect the memory blocks of a specific Letta agent.
 * Used as an action from the chat view.
 */

import { Action, ActionPanel, Detail, Icon, List, showToast, Toast, Color } from "@raycast/api";
import { useEffect, useState, useCallback } from "react";
import { useLettaClient } from "./hooks";

type MemoryBlock = {
  id: string;
  label: string;
  value: string;
};

interface MemoryCommandProps {
  agentId: string;
  agentName: string;
  accountId?: string; // Optional - defaults to project1 for backwards compatibility
}

export default function MemoryCommand({ agentId, agentName, accountId = "project1" }: MemoryCommandProps) {
  const { getClientForAccount } = useLettaClient();
  const client = getClientForAccount(accountId);

  const [blocks, setBlocks] = useState<MemoryBlock[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const fetchMemory = useCallback(async () => {
    if (!agentId || !client) return;

    setIsLoading(true);
    setError(null);

    try {
      // Use client.agents.blocks.list(agentId) per SDK docs
      const result = await client.agents.blocks.list(agentId);

      // Handle the response - could be array or paginated
      let memoryBlocks: Array<{ id?: string; label: string; value?: string }> = [];

      if (Array.isArray(result)) {
        memoryBlocks = result;
      } else if (result && typeof result === "object") {
        // Could be paginated or have a data property
        const resultObj = result as unknown as Record<string, unknown>;
        if (Array.isArray(resultObj.data)) {
          memoryBlocks = resultObj.data;
        } else if (Symbol.asyncIterator in result) {
          // Handle async iterable
          for await (const block of result as AsyncIterable<{ id?: string; label: string; value?: string }>) {
            memoryBlocks.push(block);
          }
        }
      }

      const seen = new Set<string>();
      const uniqueBlocks = memoryBlocks
        .map((b) => ({
          id: b.id || b.label,
          label: b.label,
          value: b.value || "",
        }))
        .filter((block) => {
          if (seen.has(block.id)) {
            return false;
          }
          seen.add(block.id);
          return true;
        });

      setBlocks(uniqueBlocks);
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : "Unknown error";
      setError(errorMessage);
      showToast({
        style: Toast.Style.Failure,
        title: "Error loading memory",
        message: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  }, [agentId, client]);

  useEffect(() => {
    fetchMemory();
  }, [fetchMemory, refreshKey]);

  const handleRetry = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  // No client error state
  if (!client) {
    return (
      <Detail
        markdown={`# Error Loading Memory

No client found for account. Please check your configuration.`}
        actions={
          <ActionPanel>
            <Action icon={Icon.ArrowClockwise} title="Retry" onAction={handleRetry} />
          </ActionPanel>
        }
      />
    );
  }

  // Error state
  if (error) {
    return (
      <Detail
        markdown={`# Error Loading Memory

${error}

Try refreshing.`}
        actions={
          <ActionPanel>
            <Action icon={Icon.ArrowClockwise} title="Retry" onAction={handleRetry} />
          </ActionPanel>
        }
      />
    );
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search memory blocks..."
      navigationTitle={`${agentName} - Memory`}
    >
      {!isLoading && blocks.length === 0 && (
        <List.EmptyView
          icon={Icon.MemoryChip}
          title="No Memory Blocks"
          description="This agent doesn't have any memory blocks yet"
        />
      )}

      {blocks.map((block, index) => {
        const preview = block.value.length > 100 ? block.value.slice(0, 100) + "…" : block.value;

        return (
          <List.Item
            key={`${block.id}-${index}`}
            icon={{ source: Icon.MemoryChip, tintColor: getBlockColor(block.label) }}
            title={block.label}
            subtitle={preview}
            accessories={[{ text: `${block.value.length} chars` }]}
            actions={
              <ActionPanel>
                <Action.Push
                  icon={Icon.Eye}
                  title="View Block"
                  target={<MemoryBlockDetail block={block} agentName={agentName} />}
                />
                <Action.CopyToClipboard
                  icon={Icon.Clipboard}
                  title="Copy Content"
                  content={block.value}
                  shortcut={{ modifiers: ["cmd"], key: "c" }}
                />
                <Action.CopyToClipboard
                  icon={Icon.Clipboard}
                  title="Copy as Markdown"
                  content={`## ${block.label}\n\n${block.value}`}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                />
                <Action
                  icon={Icon.ArrowClockwise}
                  title="Refresh Memory"
                  shortcut={{ modifiers: ["cmd"], key: "r" }}
                  onAction={handleRetry}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}

/**
 * Detail view for a single memory block
 * Displays the block content that was already fetched
 */
function MemoryBlockDetail({ block, agentName }: { block: MemoryBlock; agentName: string }) {
  const markdown = `# ${block.label}

\`\`\`
${block.value}
\`\`\``;

  return (
    <Detail
      navigationTitle={`${agentName} - ${block.label}`}
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Block Label" text={block.label} />
          <Detail.Metadata.Label title="Character Count" text={String(block.value.length)} />
          <Detail.Metadata.Label title="Word Count" text={String(block.value.split(/\s+/).length)} />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action.CopyToClipboard icon={Icon.Clipboard} title="Copy Content" content={block.value} />
          <Action.CopyToClipboard
            icon={Icon.Clipboard}
            title="Copy as Markdown"
            content={`## ${block.label}\n\n${block.value}`}
          />
        </ActionPanel>
      }
    />
  );
}

/**
 * Get a color for different block types
 */
function getBlockColor(label: string): Color {
  const colors: Record<string, Color> = {
    persona: Color.Blue,
    human: Color.Green,
    working_context: Color.Orange,
    working_theories: Color.Orange,
    tech_context: Color.Purple,
  };
  return colors[label.toLowerCase()] ?? Color.SecondaryText;
}
