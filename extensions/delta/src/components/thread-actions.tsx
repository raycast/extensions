import { Action, ActionPanel, Alert, confirmAlert, Icon, Keyboard, launchCommand, LaunchType } from "@raycast/api";
import { ThreadsState } from "../hooks/use-threads";
import { deleteThread, forkThread, setThreadArchived, shareThreadWithOrganization, unshareThread } from "../lib/delta";
import { openThreadInDelta, runWithToast } from "../lib/feedback";
import { getThreadTitle, getThreadWebUrl } from "../lib/threads";
import { Thread } from "../lib/types";
import { AskAboutThreads } from "./ask-about-threads";
import { ChangeModelAction } from "./change-model-action";
import { DemoDataAction } from "./demo-data-action";
import { InviteForm } from "./invite-form";

interface ThreadActionsProps {
  thread: Thread;
  /** From `useThreads()`, so actions update the list optimistically. */
  threads: Pick<ThreadsState, "mutate" | "revalidate">;
  /** Pass to show the Show/Hide Details action in lists that support a detail pane. */
  detail?: { isShowing: boolean; onToggle: () => void };
}

/** The standard action panel for a thread; reuse it in any view that lists threads. */
export function ThreadActions({ thread, threads, detail }: ThreadActionsProps) {
  const { mutate, revalidate } = threads;
  const webUrl = getThreadWebUrl(thread);
  const title = getThreadTitle(thread);

  async function toggleArchived() {
    const archived = !thread.archived;
    await runWithToast(
      archived
        ? { progress: "Archiving thread", success: "Thread archived", failure: "Couldn't archive thread" }
        : { progress: "Unarchiving thread", success: "Thread unarchived", failure: "Couldn't unarchive thread" },
      () =>
        mutate(setThreadArchived(thread, archived), {
          optimisticUpdate: (current) => current?.map((t) => (t.id === thread.id ? { ...t, archived } : t)),
        }),
    );
  }

  async function share() {
    const confirmed = await confirmAlert({
      title: "Share with Everyone in the Organization?",
      message: `Everyone in the Delta organization that owns “${title}” will be able to open it and its files.`,
      primaryAction: { title: "Share", style: Alert.ActionStyle.Default },
    });
    if (confirmed) {
      await runWithToast(
        { progress: "Sharing thread", success: "Thread shared with organization", failure: "Couldn't share thread" },
        () => mutate(shareThreadWithOrganization(thread)),
      );
    }
  }

  async function makePrivate() {
    await runWithToast(
      {
        progress: "Making thread private",
        success: "Only invited people can open the thread",
        failure: "Couldn't make thread private",
      },
      () => mutate(unshareThread(thread)),
    );
  }

  async function fork() {
    await runWithToast(
      { progress: "Forking thread", success: "Thread forked", failure: "Couldn't fork thread" },
      async () => {
        const forkId = await forkThread(thread);
        await revalidate();
        // Delta doesn't promise to report the fork's ID; without it the fork just appears in the list.
        if (forkId) {
          await openThreadInDelta({ id: forkId });
        }
      },
    );
  }

  async function remove() {
    const confirmed = await confirmAlert({
      title: "Delete Thread?",
      message: `Deletes “${title}”, its local files that no other thread uses, and its Cloud Runner. This can't be undone.`,
      primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
    });
    if (confirmed) {
      await runWithToast(
        { progress: "Deleting thread", success: "Thread deleted", failure: "Couldn't delete thread" },
        () =>
          mutate(deleteThread(thread), {
            optimisticUpdate: (current) => current?.filter((t) => t.id !== thread.id),
          }),
      );
    }
  }

  return (
    <ActionPanel>
      <ActionPanel.Section>
        <Action title="Open in Delta" icon={Icon.AppWindow} onAction={() => openThreadInDelta(thread)} />
        {webUrl && <Action.OpenInBrowser url={webUrl} shortcut={Keyboard.Shortcut.Common.Open} />}
        <Action.Push
          title="Ask About Thread"
          icon={Icon.Stars}
          shortcut={{ modifiers: ["cmd", "shift"], key: "i" }}
          target={<AskAboutThreads threads={[{ id: thread.id, name: title }]} />}
        />
        {detail && (
          <Action
            title={detail.isShowing ? "Hide Details" : "Show Details"}
            icon={Icon.Sidebar}
            shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
            onAction={detail.onToggle}
          />
        )}
      </ActionPanel.Section>
      <ActionPanel.Section>
        {webUrl && (
          <Action.CopyToClipboard title="Copy Thread Link" content={webUrl} shortcut={Keyboard.Shortcut.Common.Copy} />
        )}
        <Action.CopyToClipboard
          title="Copy Thread Title"
          content={title}
          shortcut={Keyboard.Shortcut.Common.CopyName}
        />
      </ActionPanel.Section>
      <ActionPanel.Section>
        <ActionPanel.Submenu title="Share" icon={Icon.TwoPeople} shortcut={{ modifiers: ["cmd", "shift"], key: "u" }}>
          <Action.Push
            title="Invite People"
            icon={Icon.AddPerson}
            shortcut={{ modifiers: ["cmd", "shift"], key: "e" }}
            target={<InviteForm thread={thread} onInvited={revalidate} />}
          />
          <ActionPanel.Section title="General Access">
            <Action title="Only People Invited" icon={Icon.Lock} onAction={makePrivate} />
            <Action title="Everyone in the Organization" icon={Icon.Building} onAction={share} />
          </ActionPanel.Section>
        </ActionPanel.Submenu>
        <Action
          title="Fork Thread"
          icon={Icon.Shuffle}
          shortcut={{ modifiers: ["cmd", "shift"], key: "f" }}
          onAction={fork}
        />
        <Action
          title={thread.archived ? "Unarchive Thread" : "Archive Thread"}
          icon={thread.archived ? Icon.Tray : Icon.Box}
          shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
          onAction={toggleArchived}
        />
        <Action
          title="Delete Thread"
          icon={Icon.Trash}
          style={Action.Style.Destructive}
          shortcut={Keyboard.Shortcut.Common.Remove}
          onAction={remove}
        />
      </ActionPanel.Section>
      <ActionPanel.Section>
        <CreateThreadAction />
        <Action
          title="Refresh Threads"
          icon={Icon.ArrowClockwise}
          shortcut={Keyboard.Shortcut.Common.Refresh}
          onAction={revalidate}
        />
        <ChangeModelAction />
        <DemoDataAction onChange={revalidate} />
      </ActionPanel.Section>
    </ActionPanel>
  );
}

/** Opens the Create Thread command; shared by every panel in Search Threads. */
export function CreateThreadAction() {
  return (
    <Action
      title="Create Thread"
      icon={Icon.Plus}
      shortcut={Keyboard.Shortcut.Common.New}
      onAction={() => launchCommand({ name: "create-thread", type: LaunchType.UserInitiated })}
    />
  );
}
