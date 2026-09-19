import {
  Action,
  ActionPanel,
  Color,
  Icon,
  List,
  closeMainWindow,
  showToast,
  Toast,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import {
  focusThread,
  getShell,
  launchApp,
  liveProjects,
  T3Error,
  Thread,
  threadTimestamp,
} from "./t3";

type Props = {
  /** Which threads the command shows, applied to the shell snapshot. */
  select: (
    threads: Thread[],
    snapshot: Awaited<ReturnType<typeof getShell>>,
  ) => Thread[];
  searchBarPlaceholder: string;
  emptyTitle: string;
  emptyDescription: string;
};

function statusAccessory(thread: Thread): List.Item.Accessory {
  const state = thread.latestTurn?.state;
  if (state === "running") {
    return {
      icon: { source: Icon.CircleProgress, tintColor: Color.Blue },
      tooltip: "Agent is running",
    };
  }
  if (state === "error" || thread.session?.lastError) {
    return {
      icon: { source: Icon.ExclamationMark, tintColor: Color.Red },
      tooltip: "Last turn failed",
    };
  }
  if (state === "interrupted") {
    return {
      icon: { source: Icon.Pause, tintColor: Color.Orange },
      tooltip: "Interrupted",
    };
  }
  return {
    icon: { source: Icon.CheckCircle, tintColor: Color.Green },
    tooltip: "Waiting on you",
  };
}

export default function ThreadList({
  select,
  searchBarPlaceholder,
  emptyTitle,
  emptyDescription,
}: Props) {
  const { data, isLoading, error, revalidate } = usePromise(async () => ({
    snapshot: await getShell(),
  }));

  if (error) {
    return <ErrorView error={error} onRetry={revalidate} />;
  }

  const snapshot = data?.snapshot;
  const projectTitles = new Map(
    (snapshot ? liveProjects(snapshot) : []).map((p) => [p.id, p.title]),
  );
  const threads = snapshot
    ? select(snapshot.threads, snapshot).sort(
        (a, b) => threadTimestamp(b) - threadTimestamp(a),
      )
    : [];

  return (
    <List isLoading={isLoading} searchBarPlaceholder={searchBarPlaceholder}>
      <List.EmptyView
        title={emptyTitle}
        description={emptyDescription}
        icon={Icon.Message}
      />
      {threads.map((thread) => (
        <List.Item
          key={thread.id}
          title={thread.title}
          subtitle={projectTitles.get(thread.projectId) ?? ""}
          keywords={[
            projectTitles.get(thread.projectId) ?? "",
            thread.branch ?? "",
          ]}
          accessories={[
            ...(thread.branch ? [{ tag: thread.branch }] : []),
            { date: new Date(thread.updatedAt) },
            statusAccessory(thread),
          ]}
          actions={
            <ActionPanel>
              <Action
                title="Open in T3 Code"
                icon={Icon.ArrowRight}
                onAction={async () => {
                  await closeMainWindow();
                  await focusThread(thread.title);
                }}
              />
              <Action.CopyToClipboard
                title="Copy Thread ID"
                content={thread.id}
              />
              <Action
                title="Refresh"
                icon={Icon.ArrowClockwise}
                onAction={revalidate}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

export function ErrorView({
  error,
  onRetry,
}: {
  error: Error;
  onRetry: () => void;
}) {
  const unreachable = error instanceof T3Error && error.kind === "unreachable";
  return (
    <List>
      <List.EmptyView
        icon={{ source: Icon.Plug, tintColor: Color.Red }}
        title={
          unreachable ? "T3 Code is not running" : "T3 Code request failed"
        }
        description={error.message}
        actions={
          <ActionPanel>
            {unreachable ? (
              <Action
                title="Launch T3 Code"
                icon={Icon.AppWindow}
                onAction={async () => {
                  await launchApp();
                  await showToast({
                    style: Toast.Style.Success,
                    title: "Launching T3 Code",
                  });
                }}
              />
            ) : null}
            <Action
              title="Retry"
              icon={Icon.ArrowClockwise}
              onAction={onRetry}
            />
          </ActionPanel>
        }
      />
    </List>
  );
}
