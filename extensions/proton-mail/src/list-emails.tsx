import { useCallback, useEffect, useRef, useState } from "react";
import { LaunchProps, List, showToast, Toast, getPreferenceValues, useNavigation } from "@raycast/api";
import { bridgeErrorReason, BridgeStatus, checkBridge, holdConnections } from "./imap-client";
import { FolderListItem, groupFolders, useFolders } from "./folders";
import { EmailList } from "./email-list";
import { BridgeErrorView } from "./bridge-error";
import { EmailFilter, Folder, ViewTarget } from "./types";

export default function Command(props: LaunchProps<{ launchContext?: ViewTarget }>) {
  // Quicklinks pass the folder and filter as launch context; older ones passed them as arguments
  const target = props.launchContext ?? (props.arguments as ViewTarget | undefined);
  return <Mailboxes initialFolder={target?.folder} initialFilter={target?.filter} />;
}

// Mailboxes first, like Mail: the command opens the inbox (or a quicklink's folder) on top right away, unless
// "Open On" is set to Mailboxes, and Esc comes back here to switch folders
function Mailboxes({ initialFolder, initialFilter }: { initialFolder?: string; initialFilter?: EmailFilter }) {
  const { push } = useNavigation();
  const { data: folders, isLoading, error, revalidate } = useFolders();

  // Refresh counts when coming back from a folder
  const openFolder = useCallback(
    (path: string, filter?: EmailFilter) => push(<EmailList folder={path} initialFilter={filter} />, revalidate),
    [push, revalidate],
  );

  // The connections are shared by every view and close once the command closes
  useEffect(() => holdConnections(), []);

  // Check Bridge before opening the first folder. When it's down, the error shows here alone, so Esc closes the
  // command instead of coming back to the same error one level up.
  const [bridgeStatus, setBridgeStatus] = useState<BridgeStatus>();
  useEffect(() => {
    checkBridge().then(setBridgeStatus);
  }, []);
  const blockedBy = bridgeStatus === "unreachable" || bridgeStatus === "authentication" ? bridgeStatus : undefined;

  const { openOn } = getPreferenceValues<Preferences.ListEmails>();
  const startFolder = initialFolder || (openOn === "mailboxes" ? undefined : "INBOX");
  const openingStartFolder = useRef(false);
  const [openedStartFolder, setOpenedStartFolder] = useState(false);
  useEffect(() => {
    if (!startFolder || !bridgeStatus || blockedBy || openingStartFolder.current) return;
    openingStartFolder.current = true;
    openFolder(startFolder, initialFilter);
    setOpenedStartFolder(true);
  }, [startFolder, bridgeStatus, blockedBy, openFolder, initialFilter]);
  // Blank until Bridge answers and the first folder opens on top, so the mailboxes don't flash by
  const showMailboxes = !!bridgeStatus && (!startFolder || openedStartFolder);

  const bridgeError = blockedBy ?? bridgeErrorReason(error);
  useEffect(() => {
    if (error && !bridgeErrorReason(error)) {
      showToast({
        style: Toast.Style.Failure,
        title: "Connection Error",
        message: error.message || "Failed to connect to Proton Mail Bridge",
      });
    }
  }, [error]);

  const { mailboxes, userFolders, labels } = groupFolders(folders || []);
  const renderFolder = (folder: Folder) => (
    <FolderListItem key={folder.path} folder={folder} onOpen={() => openFolder(folder.path)} onRefresh={revalidate} />
  );

  return (
    <List
      // Raycast hides the empty view while loading, so the error screen would blink on each reload
      isLoading={(isLoading || !showMailboxes) && !bridgeError}
      navigationTitle="Mailboxes"
      searchBarPlaceholder="Filter mailboxes..."
    >
      {bridgeError ? (
        <BridgeErrorView
          reason={bridgeError}
          // Once Bridge is back, reload the counts and open the first folder if it isn't open yet
          onRetry={() => {
            revalidate();
            setBridgeStatus("ready");
          }}
        />
      ) : (
        showMailboxes && (
          <>
            <List.Section title="Mailboxes">{mailboxes.map(renderFolder)}</List.Section>
            <List.Section title="Folders">{userFolders.map(renderFolder)}</List.Section>
            <List.Section title="Labels">{labels.map(renderFolder)}</List.Section>
          </>
        )
      )}
    </List>
  );
}
