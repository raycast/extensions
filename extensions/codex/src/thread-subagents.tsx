import { Action, ActionPanel, Icon, List, Keyboard } from "@raycast/api";
import { showFailureToast, usePromise } from "@raycast/utils";
import { type CodexThread, listThreadDescendants } from "./utils/app-server";
import {
  agentColor,
  getCodexSourceDescriptor,
  getThreadIconAccessory,
  getUpdatedAtAccessory,
  subagentIcon,
} from "./utils/display";
import {
  formatCount,
  getThreadAgentLabel,
  getThreadDisplayTitle,
  tildeifyPath,
} from "./utils/format";
import { revalidateWithToast } from "./utils/raycast";
import { type CodexChildThreadKind, getChildThreadKind } from "./utils/threads";
import { ThreadRowActions } from "./thread-actions";

export function ThreadSubagentsList({
  parent,
  archived,
}: {
  parent: CodexThread;
  archived: boolean;
}) {
  const { data, error, isLoading, revalidate } = usePromise(
    listThreadDescendants,
    [parent.id, archived],
    {
      onError: async (loadError) => {
        await showFailureToast(loadError, {
          title: "Couldn't load child threads",
        });
      },
    },
  );

  const direct = partitionChildThreads(data?.direct ?? []);
  const nested = partitionChildThreads(data?.nested ?? []);
  const sections = [
    { title: "Subagents", noun: "subagent", threads: direct.subagent },
    { title: "Nested Subagents", noun: "subagent", threads: nested.subagent },
    {
      title: "Automations",
      noun: "automation",
      threads: [...direct.automation, ...nested.automation],
    },
    {
      title: "Maintenance Threads",
      noun: "thread",
      threads: [...direct.maintenance, ...nested.maintenance],
    },
  ].filter((section) => section.threads.length > 0);

  return (
    <List
      isLoading={isLoading}
      navigationTitle={getThreadDisplayTitle(parent)}
      searchBarPlaceholder="Search child threads"
    >
      {sections.map((section) => (
        <List.Section
          key={section.title}
          title={section.title}
          subtitle={formatCount(section.threads.length, section.noun)}
        >
          {section.threads.map((thread) => (
            <SubagentListItem
              key={thread.id}
              thread={thread}
              onRefresh={revalidate}
            />
          ))}
        </List.Section>
      ))}

      {!isLoading && sections.length === 0 ? (
        <List.EmptyView
          title={error ? "Couldn't Load Child Threads" : "No Child Threads"}
          description={
            error ? error.message : "Nothing has been started from this thread."
          }
          icon={error ? Icon.Warning : subagentIcon}
          actions={
            <ActionPanel>
              <Action
                title={error ? "Retry" : "Refresh Child Threads"}
                icon={Icon.ArrowClockwise}
                shortcut={Keyboard.Shortcut.Common.Refresh}
                onAction={revalidate}
              />
            </ActionPanel>
          }
        />
      ) : null}
    </List>
  );
}

function partitionChildThreads(
  threads: CodexThread[],
): Record<CodexChildThreadKind, CodexThread[]> {
  const partitioned: Record<CodexChildThreadKind, CodexThread[]> = {
    subagent: [],
    automation: [],
    maintenance: [],
  };

  for (const thread of threads) {
    partitioned[getChildThreadKind(thread.source)].push(thread);
  }

  return partitioned;
}

function SubagentListItem({
  thread,
  onRefresh,
}: {
  thread: CodexThread;
  onRefresh: () => Promise<unknown>;
}) {
  const displayTitle = getThreadDisplayTitle(thread);
  const sourceDescriptor = getCodexSourceDescriptor(thread.source);
  const agentLabel = getThreadAgentLabel(thread);

  // The source tag only earns its place when the thread has no name of its own.
  const identityTag = agentLabel
    ? { tag: { value: agentLabel, color: agentColor }, tooltip: agentLabel }
    : {
        tag: { value: sourceDescriptor.label, color: sourceDescriptor.color },
        tooltip: sourceDescriptor.tooltip,
      };

  return (
    <List.Item
      id={thread.id}
      title={{ value: displayTitle, tooltip: displayTitle }}
      subtitle={{ value: tildeifyPath(thread.cwd), tooltip: thread.cwd }}
      icon={getThreadIconAccessory(thread)}
      keywords={[thread.id, thread.cwd, ...sourceDescriptor.keywords]}
      accessories={[identityTag, getUpdatedAtAccessory(thread)]}
      actions={
        <ThreadRowActions
          thread={thread}
          refreshTitle="Refresh Child Threads"
          onRefresh={() =>
            revalidateWithToast(onRefresh, {
              successTitle: "Child Threads Refreshed",
              failureTitle: "Couldn't refresh child threads",
            })
          }
        />
      }
    />
  );
}
