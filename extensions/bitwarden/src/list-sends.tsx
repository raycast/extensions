import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import RootErrorBoundary from "~/components/RootErrorBoundary";
import { BitwardenProvider, useBitwarden } from "~/context/bitwarden";
import { SessionProvider } from "~/context/session";
import { Send, SendType } from "~/types/send";
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

function ListSendCommandContent() {
  const bitwarden = useBitwarden();
  const { data, isLoading } = usePromise(() => bitwarden.listSends());
  const pasteActionTitle = usePasteActionTitle();

  const { result: sends = [] } = data ?? {};

  return (
    <List isLoading={isLoading}>
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
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

export default ListSendCommand;
