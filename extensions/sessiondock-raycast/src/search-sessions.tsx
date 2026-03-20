import {
  Action,
  ActionPanel,
  Clipboard,
  List,
  showHUD,
  showToast,
  Toast,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useMemo, useState } from "react";
import {
  focusSession,
  getSessionNotes,
  listSessions,
  openSessionProject,
} from "./api";
import type { Session } from "./types";

function formatLastOpened(value?: string) {
  if (!value) {
    return "Never";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString();
}

export default function Command() {
  const [searchText, setSearchText] = useState("");

  const { data, isLoading, revalidate } = useCachedPromise(
    async (query: string) => {
      return listSessions({ query, limit: 100 });
    },
    [searchText],
    {
      keepPreviousData: true,
      initialData: [],
    },
  );

  const sessions = useMemo(() => data ?? [], [data]);

  async function runAction(
    action: () => Promise<void>,
    loadingTitle: string,
    successMessage: string,
  ) {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: loadingTitle,
    });

    try {
      await action();
      toast.style = Toast.Style.Success;
      toast.title = successMessage;
      await revalidate();
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title =
        error instanceof Error ? error.message : "SessionDock request failed.";
    }
  }

  async function openInSessionDock(session: Session) {
    await runAction(
      async () => {
        try {
          await focusSession(session.id);
        } catch {
          await openSessionProject(session.id);
        }
      },
      `Opening ${session.title}`,
      `Opened ${session.title}`,
    );
  }

  async function copyNotes(session: Session) {
    try {
      const notes = session.notes ?? (await getSessionNotes(session.id));
      await Clipboard.copy(notes ?? "");
      await showHUD(
        notes
          ? `Copied notes for ${session.title}`
          : `No notes found for ${session.title}`,
      );
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: error instanceof Error ? error.message : "Failed to copy notes",
      });
    }
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search SessionDock sessions"
      onSearchTextChange={setSearchText}
      throttle
    >
      {sessions.map((session) => (
        <List.Item
          key={session.id}
          title={session.title}
          subtitle={session.kind ?? "Unknown kind"}
          accessories={[
            ...(session.status ? [{ text: session.status }] : []),
            {
              text: formatLastOpened(session.lastOpened),
              tooltip: "Last Opened",
            },
          ]}
          actions={
            <ActionPanel>
              <Action
                title="Open Session"
                onAction={() => openInSessionDock(session)}
              />
              <Action
                title="Open Session Project"
                onAction={() => openSessionProject(session.id)}
              />
              <Action title="Copy Notes" onAction={() => copyNotes(session)} />
              <Action.CopyToClipboard
                title="Copy Session Id"
                content={session.id}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
