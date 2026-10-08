import { ReactNode } from "react";
import {
  Action,
  ActionPanel,
  Alert,
  Clipboard,
  confirmAlert,
  Icon,
  open,
  showInFinder,
  showToast,
  Toast,
  Keyboard,
  getPreferenceValues,
} from "@raycast/api";
import { showError } from "../lib/errors";
import { handleSignedOut, isSignedOut } from "../lib/session";
import { createPublicLink, DriveNode, existingPublicLink } from "../lib/cli";
import { downloadToDownloads, localCopyForOpening } from "../lib/files";
import { FolderView } from "./FolderView";

export function NodeActions(props: { node: DriveNode; extraActions?: ReactNode }) {
  const { node, extraActions } = props;
  const isFolder = node.type === "folder";
  const { primaryAction } = getPreferenceValues<Preferences>();

  const openAction = <Action title="Open" icon={Icon.ArrowNe} onAction={() => openFile(node)} />;
  const downloadAction = (
    <Action
      title="Download"
      icon={Icon.Download}
      shortcut={{ modifiers: ["cmd"], key: "d" }}
      onAction={() => downloadNode(node)}
    />
  );

  return (
    <ActionPanel title={node.name}>
      <ActionPanel.Section>
        {isFolder ? (
          <Action.Push
            title="Open Folder"
            icon={Icon.Folder}
            target={<FolderView path={node.path} title={node.name} />}
          />
        ) : primaryAction === "download" ? (
          <>
            {downloadAction}
            {openAction}
          </>
        ) : (
          <>
            {openAction}
            {downloadAction}
          </>
        )}
        {isFolder && downloadAction}
        {!isFolder && (
          <Action.Push
            title="Show Enclosing Folder"
            icon={Icon.ArrowUp}
            shortcut={Keyboard.Shortcut.Common.OpenWith}
            target={<FolderView path={node.parentPath} title={displayPath(node.parentPath)} />}
          />
        )}
      </ActionPanel.Section>
      <ActionPanel.Section>
        <Action
          title="Copy Public Link"
          icon={Icon.Link}
          shortcut={{ modifiers: ["cmd", "shift"], key: "l" }}
          onAction={() => copyPublicLink(node)}
        />
        <Action.CopyToClipboard title="Copy Drive Path" content={node.path} shortcut={Keyboard.Shortcut.Common.Copy} />
        <Action.CopyToClipboard
          title="Copy Name"
          content={node.name}
          shortcut={{ modifiers: ["cmd", "shift"], key: "n" }}
        />
      </ActionPanel.Section>
      {extraActions}
    </ActionPanel>
  );
}

export function displayPath(path: string): string {
  return path.replace(/^\/my-files/, "") || "/";
}

async function openFile(node: DriveNode) {
  const toast = await showToast({ style: Toast.Style.Animated, title: `Downloading ${node.name}…` });
  try {
    const path = await localCopyForOpening(node);
    await open(path);
    await toast.hide();
  } catch (error) {
    await reportError(error, `Could not open ${node.name}`, toast);
  }
}

async function downloadNode(node: DriveNode) {
  const toast = await showToast({ style: Toast.Style.Animated, title: `Downloading ${node.name}…` });
  try {
    const path = await downloadToDownloads(node);
    toast.style = Toast.Style.Success;
    toast.title = "Downloaded";
    toast.message = path;
    toast.primaryAction = { title: "Show in Finder", onAction: () => showInFinder(path) };
    toast.secondaryAction = { title: "Open", onAction: () => open(path) };
  } catch (error) {
    await reportError(error, `Could not download ${node.name}`, toast);
  }
}

async function copyPublicLink(node: DriveNode) {
  const toast = await showToast({ style: Toast.Style.Animated, title: "Looking for a public link…" });
  try {
    let url = await existingPublicLink(node.path);
    if (!url) {
      await toast.hide();
      const confirmed = await confirmAlert({
        title: "Create a public link?",
        message: `Anyone with the link will be able to view “${node.name}”.`,
        icon: Icon.Link,
        primaryAction: { title: "Create Link", style: Alert.ActionStyle.Default },
      });
      if (!confirmed) return;
      toast.show();
      toast.title = "Creating public link…";
      url = await createPublicLink(node.path);
    }
    await Clipboard.copy(url);
    toast.style = Toast.Style.Success;
    toast.title = "Public link copied";
    toast.message = url;
  } catch (error) {
    await reportError(error, "Could not get a public link", toast);
  }
}

/**
 * A lost session hides Drive content in every view; anything else is shown as an error, which replaces
 * the operation's progress toast. The signed-out path shows no toast of its own, so hide it there.
 */
async function reportError(error: unknown, title: string, progress: Toast) {
  if (isSignedOut(error)) {
    await progress.hide();
    await handleSignedOut();
  } else {
    await showError(error, title);
  }
}
