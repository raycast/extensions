import {
  Action,
  ActionPanel,
  Color,
  Icon,
  List,
  closeMainWindow,
  showHUD,
  showToast,
  Toast,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import {
  allServers,
  errorMessage,
  focusThread,
  getShell,
  launchApp,
  liveProjects,
  Server,
  serverEnvironment,
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
  const { data, isLoading, error, revalidate } = usePromise(() =>
    loadThreads(select),
  );

  if (error) {
    return <ErrorView error={error} onRetry={revalidate} />;
  }

  const items = data?.items ?? [];
  const showMachine = (data?.serverCount ?? 0) > 1;

  return (
    <List isLoading={isLoading} searchBarPlaceholder={searchBarPlaceholder}>
      {isLoading ? null : (
        <List.EmptyView
          title={emptyTitle}
          description={emptyDescription}
          icon={Icon.Message}
        />
      )}
      {items.map(({ thread, server, projectTitle, machine }) => (
        <List.Item
          key={`${server.origin} ${thread.id}`}
          title={thread.title}
          subtitle={projectTitle ?? ""}
          keywords={[projectTitle ?? "", thread.branch ?? "", machine ?? ""]}
          accessories={[
            ...(showMachine && machine
              ? [{ text: machine, tooltip: server.origin }]
              : []),
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
                  try {
                    const outcome = await focusThread(
                      {
                        id: thread.id,
                        title: thread.title,
                        projectTitle,
                        branch: thread.branch,
                      },
                      server,
                    );
                    if (outcome === "ambiguous") {
                      await showHUD(
                        "Several threads match - pick one in the T3 Code palette",
                      );
                    } else if (outcome === "unfocused") {
                      await showHUD(
                        "T3 Code lost focus - pick the thread in its palette",
                      );
                    }
                  } catch (focusError) {
                    // The Raycast window is already closed, so a toast would go
                    // unseen.
                    await showHUD(
                      `Could not open T3 Code: ${errorMessage(focusError)}`,
                    );
                  }
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

type Item = {
  thread: Thread;
  server: Server;
  projectTitle: string | undefined;
  machine: string | undefined;
};

/** Reads every configured server at once. A server that fails is reported in a toast
 * and the others still show; the error view appears only when none of them answer. */
async function loadThreads(
  select: Props["select"],
): Promise<{ items: Item[]; serverCount: number }> {
  const servers = await allServers();
  const results = await Promise.allSettled(
    servers.map(async (server) => {
      const snapshot = await getShell(server);
      const { label } = await serverEnvironment(server).catch(() => ({
        label: undefined,
      }));
      const projectTitles = new Map(
        liveProjects(snapshot).map((p) => [p.id, p.title]),
      );
      return select(snapshot.threads, snapshot).map((thread): Item => ({
        thread,
        server,
        projectTitle: projectTitles.get(thread.projectId),
        machine: label ?? new URL(server.origin).hostname,
      }));
    }),
  );
  const failures = results.flatMap((result, index) =>
    result.status === "rejected"
      ? [{ server: servers[index], reason: result.reason as unknown }]
      : [],
  );
  if (failures.length === servers.length) {
    throw failures[0].reason;
  }
  if (failures.length > 0) {
    await showToast({
      style: Toast.Style.Failure,
      title: `Could not read ${failures.map((f) => f.server.origin).join(", ")}`,
      message: failures.map((f) => errorMessage(f.reason)).join("\n"),
    });
  }
  const items = results
    .flatMap((result) => (result.status === "fulfilled" ? result.value : []))
    .sort((a, b) => threadTimestamp(b.thread) - threadTimestamp(a.thread));
  return { items, serverCount: servers.length - failures.length };
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
