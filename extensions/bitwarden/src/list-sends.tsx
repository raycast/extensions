import { Action, ActionPanel, Color, Icon, List, Toast, showToast } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { MutableRefObject, useRef } from "react";
import { Bitwarden } from "~/api/bitwarden";
import RootErrorBoundary from "~/components/RootErrorBoundary";
import { BitwardenProvider, useBitwarden } from "~/context/bitwarden";
import { SessionProvider } from "~/context/session";
import CreateSendCommand from "~/create-send";
import { Send, SendType } from "~/types/send";
import { captureException } from "~/utils/development";
import useFrontmostApplicationName from "~/utils/hooks/useFrontmostApplicationName";

const LoadingFallback = () => <List isLoading />;

const ListSendCommand = () => (
  <RootErrorBoundary>
    <BitwardenProvider loadingFallback={<LoadingFallback />}>
      <SessionProvider unlock>
        <ListSendCommandContent />
      </SessionProvider>
    </BitwardenProvider>
  </RootErrorBoundary>
);

const getItemIcon = (send: Send): NonNullable<List.Item.Props["icon"]> => {
  if (send.type === SendType.File) {
    return { source: Icon.Document, tintColor: Color.Orange, tooltip: "File Send" };
  }
  return { source: Icon.Text, tintColor: Color.Blue, tooltip: "Text Send" };
};

const getItemAccessories = (send: Send): NonNullable<List.Item.Props["accessories"]> => {
  const accessories: NonNullable<List.Item.Props["accessories"]> = [];
  if (send.passwordSet) {
    accessories.push({ icon: Icon.Lock, tooltip: "Password protected." });
  }
  if (send.maxAccessCount) {
    accessories.push({ icon: Icon.Person, tooltip: `Has a max Access Count of ${send.maxAccessCount}.` });
  }
  if (send.disabled) {
    accessories.push({ icon: Icon.EyeDisabled, tooltip: "Deactivated and no one can access it." });
  }
  if (send.expirationDate) {
    accessories.push({
      icon: Icon.Clock,
      date: { value: new Date(send.expirationDate) },
      tooltip: `Will expire on ${new Date(send.expirationDate).toLocaleString()}.`,
    });
  }
  if (send.deletionDate) {
    accessories.push({
      icon: Icon.Trash,
      date: { value: new Date(send.deletionDate) },
      tooltip: `Will be deleted on ${new Date(send.deletionDate).toLocaleString()}.`,
    });
  }
  return accessories;
};

const usePasteActionTitle = () => {
  const currentApplication = useFrontmostApplicationName();
  return currentApplication ? `Paste URL into ${currentApplication}` : "Paste URL";
};

const loadSends = async (bitwarden: Bitwarden, isFirstLoadRef: MutableRefObject<boolean>) => {
  const toast = isFirstLoadRef.current
    ? await showToast({ title: "Loading Sends....", style: Toast.Style.Animated })
    : undefined;
  try {
    return await bitwarden.listSends();
  } finally {
    isFirstLoadRef.current = false;
    await toast?.hide();
  }
};

function ListSendCommandContent() {
  const bitwarden = useBitwarden();
  const isFirstLoadRef = useRef(true);
  const { data, isLoading, revalidate: refresh } = usePromise(() => loadSends(bitwarden, isFirstLoadRef));
  const pasteActionTitle = usePasteActionTitle();

  const { result: sends = [] } = data ?? {};

  if (isLoading && sends.length === 0) {
    return (
      <List>
        <List.EmptyView title="Loading Sends...." icon={Icon.ArrowClockwise} description="Please wait." />
      </List>
    );
  }

  if (sends.length === 0) {
    return (
      <List>
        <List.EmptyView
          title="There are no items to list."
          icon="sends-empty-list.svg"
          actions={
            <ActionPanel>
              <Action.Push target={<CreateSendCommand />} title="Create New Send" icon={Icon.NewDocument} />
              <Action onAction={refresh} title="Sync Sends" icon={Icon.ArrowClockwise} />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  const getDeleteHandler = (sendId: string) => async () => {
    const toast = await showToast({ title: "Deleting Send....", style: Toast.Style.Animated });
    try {
      await bitwarden.deleteSend(sendId);
      await refresh();
      toast.style = Toast.Style.Success;
      toast.title = "Send deleted";
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to delete Send";
      captureException("Failed to delete Send", error);
    }
  };

  const onSync = async () => {
    const toast = await showToast({ title: "Syncing Sends....", style: Toast.Style.Animated });
    try {
      await refresh();
      toast.style = Toast.Style.Success;
      toast.title = "Sends synced";
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to sync Sends";
      captureException("Failed to sync Sends", error);
    }
  };

  return (
    <List>
      {sends.map((send) => (
        <List.Item
          key={send.id}
          title={send.name}
          icon={getItemIcon(send)}
          accessories={getItemAccessories(send)}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard title="Copy URL" content={send.accessUrl} />
              <Action.Paste title={pasteActionTitle} content={send.accessUrl} />
              <Action onAction={getDeleteHandler(send.id)} title="Delete Send" icon={Icon.Trash} />
              <ActionPanel.Section title="Send Management">
                <Action.Push target={<CreateSendCommand />} title="Create New Send" icon={Icon.NewDocument} />
                <Action
                  onAction={onSync}
                  title="Sync Sends"
                  icon={Icon.ArrowClockwise}
                  shortcut={{ key: "r", modifiers: ["cmd"] }}
                />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

export default ListSendCommand;
