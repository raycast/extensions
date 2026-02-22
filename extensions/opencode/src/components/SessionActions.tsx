import {
  Action,
  ActionPanel,
  Clipboard,
  Icon,
  Keyboard,
  Toast,
  confirmAlert,
  open,
  showToast,
  useNavigation,
} from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { existsSync } from "fs";

import { deleteAllProjectSessions, deleteSession as deleteSessionFromDisk, loadTranscript } from "../lib/storage";
import { Project, Session } from "../types";
import { buildTranscriptMarkdown, repoName, shellEscape } from "../utils";
import { SessionDetail } from "./SessionDetail";
import { SessionSummary } from "./SessionSummary";

interface SessionActionsProps {
  session: Session;
  project: Project | undefined;
  mutate: () => Promise<void>;
  isDetail?: boolean;
  isSummary?: boolean;
  children?: React.ReactNode;
}

export function SessionActions({ session, project, mutate, isDetail, isSummary, children }: SessionActionsProps) {
  const { pop } = useNavigation();

  const dir = shellEscape(session.directory);
  const sid = shellEscape(session.id);
  const resumeCommand = `cd ${dir} && opencode -s ${sid}`;

  async function handleCopyTranscript() {
    const toast = await showToast({ style: Toast.Style.Animated, title: "Loading transcript..." });

    try {
      const transcript = await loadTranscript(session.id);
      const markdown = buildTranscriptMarkdown(transcript);

      await Clipboard.copy(markdown);

      toast.style = Toast.Style.Success;
      toast.title = "Transcript copied";
    } catch (error) {
      await showFailureToast(error, { title: "Failed to copy transcript" });
    }
  }

  async function handleDelete() {
    const confirmed = await confirmAlert({
      title: "Delete Session",
      message: `Are you sure you want to delete "${session.title || session.slug}"? This cannot be undone.`,
      icon: { source: Icon.Trash, tintColor: "#FF0000" },
    });

    if (!confirmed) {
      return;
    }

    const toast = await showToast({ style: Toast.Style.Animated, title: "Deleting session..." });

    try {
      await deleteSessionFromDisk(session);
      toast.style = Toast.Style.Success;
      toast.title = "Session deleted";

      if (isDetail) {
        pop();
      }

      await mutate();
    } catch (error) {
      await showFailureToast(error, { title: "Failed to delete session" });
    }
  }

  async function handleDeleteAllProjectSessions() {
    const projectName = project ? repoName(project.worktree) : session.projectID;
    const confirmed = await confirmAlert({
      title: `Delete All Sessions in "${projectName}"`,
      message: `This will permanently delete all sessions for this project. The project will no longer appear in the list.`,
      icon: { source: Icon.Trash, tintColor: "#FF0000" },
    });

    if (!confirmed) {
      return;
    }

    const toast = await showToast({ style: Toast.Style.Animated, title: "Deleting all project sessions..." });

    try {
      await deleteAllProjectSessions(session.projectID);

      toast.style = Toast.Style.Success;
      toast.title = `All sessions in "${projectName}" deleted`;

      if (isDetail) {
        pop();
      }

      await mutate();
    } catch (error) {
      await showFailureToast(error, { title: "Failed to delete project sessions" });
    }
  }

  return (
    <ActionPanel>
      <ActionPanel.Section>
        {!isDetail && (
          <Action.Push
            title="View Transcript"
            icon={Icon.Eye}
            target={<SessionDetail session={session} project={project} mutate={mutate} />}
          />
        )}
        {!isSummary && (
          <Action.Push
            title="Summarize"
            icon={Icon.Stars}
            shortcut={{ modifiers: ["cmd"], key: "s" }}
            target={<SessionSummary session={session} project={project} mutate={mutate} />}
          />
        )}
        {children}
      </ActionPanel.Section>

      <ActionPanel.Section>
        <Action
          title="Copy Transcript"
          icon={Icon.Clipboard}
          shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
          onAction={handleCopyTranscript}
        />
        <Action.CopyToClipboard
          title="Copy Resume Command"
          content={resumeCommand}
          shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
        />
        <Action.CopyToClipboard
          title="Copy Session ID"
          content={session.id}
          shortcut={{ modifiers: ["cmd"], key: "." }}
        />
        <Action.CopyToClipboard title="Copy Slug" content={session.slug} />
        <Action.CopyToClipboard title="Copy Project Directory" content={session.directory} />
      </ActionPanel.Section>

      <ActionPanel.Section>
        {session.share?.url && (
          <Action.OpenInBrowser
            title="Open Share Link"
            url={session.share.url}
            icon={Icon.Link}
            shortcut={{ modifiers: ["cmd", "shift"], key: "o" }}
          />
        )}
        <Action
          title="Open Project Directory"
          icon={Icon.Folder}
          shortcut={{ modifiers: ["cmd", "shift"], key: "f" }}
          onAction={async () => {
            if (!existsSync(session.directory)) {
              await showToast({ style: Toast.Style.Failure, title: "Directory not found", message: session.directory });
              return;
            }
            await open(session.directory);
          }}
        />
      </ActionPanel.Section>

      <ActionPanel.Section>
        <Action
          title="Delete Session"
          icon={Icon.Trash}
          style={Action.Style.Destructive}
          shortcut={Keyboard.Shortcut.Common.Remove}
          onAction={handleDelete}
        />
        <Action
          title="Delete All Project Sessions"
          icon={Icon.Trash}
          style={Action.Style.Destructive}
          onAction={handleDeleteAllProjectSessions}
        />
      </ActionPanel.Section>

      <ActionPanel.Section>
        <Action
          title="Refresh"
          icon={Icon.ArrowClockwise}
          shortcut={Keyboard.Shortcut.Common.Refresh}
          onAction={mutate}
        />
      </ActionPanel.Section>
    </ActionPanel>
  );
}
