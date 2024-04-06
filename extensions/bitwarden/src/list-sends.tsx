import { Action, ActionPanel, Color, Icon, Keyboard, List, Toast, showToast, useNavigation } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useRef } from "react";
import { Bitwarden } from "~/api/bitwarden";
import { ListLoadingView } from "~/components/ListLoadingView";
import RootErrorBoundary from "~/components/RootErrorBoundary";
import { BitwardenProvider, useBitwarden } from "~/context/bitwarden";
import { SessionProvider } from "~/context/session";
import CreateEditSendCommand from "~/create-send";
import { Send, SendType } from "~/types/send";
import { captureException } from "~/utils/development";
import useFrontmostApplicationName from "~/utils/hooks/useFrontmostApplicationName";

const LoadingFallback = () => <List searchBarPlaceholder="Search sends" isLoading />;

const ListSendsCommand = () => (
  <RootErrorBoundary>
    <BitwardenProvider loadingFallback={<LoadingFallback />}>
      <SessionProvider loadingFallback={<LoadingFallback />} unlock>
        <ListSendsCommandContent />
      </SessionProvider>
    </BitwardenProvider>
  </RootErrorBoundary>
);

const getItemIcon = (send: Send): NonNullable<List.Item.Props["icon"]> => {
  if (send.type === SendType.File) {
    return { source: Icon.Document, tintColor: Color.Orange };
  }
  return { source: Icon.Text, tintColor: Color.Blue };
};

const getItemAccessories = (send: Send): NonNullable<List.Item.Props["accessories"]> => {
  const accessories: NonNullable<List.Item.Props["accessories"]> = [];
  if (send.passwordSet) {
    accessories.push({ icon: Icon.Key, tooltip: "Password protected." });
  }
  if (send.maxAccessCount) {
    accessories.push({ icon: Icon.Person, tooltip: `Has a max Access Count of ${send.maxAccessCount}.` });
  }
  if (send.disabled) {
    accessories.push({ icon: Icon.Warning, tooltip: "Deactivated and no one can access it." });
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

type Operation = {
  id: string;
  execute: () => Promise<any>;
};

const useOperationQueue = () => {
  const operationQueueRef = useRef<Operation[]>([]);
  const currentOperationTimeoutRef = useRef<NodeJS.Timeout>();

  const processOperations = () => {
    const [operation] = operationQueueRef.current;
    if (!operation) return;

    currentOperationTimeoutRef.current = setTimeout(async () => {
      try {
        await operation.execute();
      } finally {
        operationQueueRef.current.shift();
        clearTimeout(currentOperationTimeoutRef.current);
        currentOperationTimeoutRef.current = undefined;
        if (operationQueueRef.current.length > 0) {
          processOperations();
        }
      }
    }, 1);
  };

  const queueOperation = (id: string, execute: () => Promise<any>) => {
    if (!operationQueueRef.current.some((op) => op.id === id)) {
      operationQueueRef.current.push({ id, execute });
      if (!currentOperationTimeoutRef.current) {
        processOperations();
      }
    }
  };

  return queueOperation;
};

const sortSendsByName = (send1: Send, send2: Send) => send1.name.localeCompare(send2.name);

const useListSends = (bitwarden: Bitwarden) => {
  const isFirstLoadRef = useRef(true);

  const listSends = async () => {
    const toast = isFirstLoadRef.current
      ? await showToast({ title: "Loading Sends....", style: Toast.Style.Animated })
      : undefined;
    try {
      const listSends = await bitwarden.listSends();
      if (listSends.result) {
        listSends.result.sort(sortSendsByName);
      }
      return listSends;
    } finally {
      isFirstLoadRef.current = false;
      await toast?.hide();
    }
  };

  const { data, isLoading, revalidate, mutate, error } = usePromise(listSends);
  const { result: sends = [] } = data ?? {};

  const refresh = (options?: Parameters<typeof mutate>[1]) => {
    if (options) return mutate(listSends(), options);
    return revalidate();
  };

  return { sends, isLoading, isFirstLoading: isLoading && isFirstLoadRef.current, refresh, error };
};

const syncSendsTitle = "Sync Sends";
const syncSendsShortcut: Keyboard.Shortcut = { key: "r", modifiers: ["opt"] };
const syncSendsShortcutLabel = (() => {
  const modifierToLabelMap: Record<Keyboard.KeyModifier, string> = { cmd: "⌘", shift: "⇧", opt: "⌥", ctrl: "⌃" };
  return (
    syncSendsShortcut.modifiers.map((mod) => modifierToLabelMap[mod] ?? "").join("") +
    syncSendsShortcut.key.toUpperCase()
  );
})();

function ListSendsCommandContent() {
  const { pop } = useNavigation();
  const bitwarden = useBitwarden();
  const queueOperation = useOperationQueue();
  const { sends, isFirstLoading, refresh: refreshSends } = useListSends(bitwarden);

  const pasteActionTitle = usePasteActionTitle();
  const selectedItemIdRef = useRef<string>();

  const onSync = () => {
    return queueOperation("sync", async () => {
      const toast = await showToast({ title: "Syncing Sends....", style: Toast.Style.Animated });
      try {
        await bitwarden.sync();
        await refreshSends();
        toast.style = Toast.Style.Success;
        toast.title = "Sends synced";
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Failed to sync Sends";
        captureException("Failed to sync Sends", error);
      }
    });
  };

  const onDelete = (id: string) => {
    return queueOperation(id, async () => {
      const toast = await showToast({ title: "Deleting Send....", style: Toast.Style.Animated });
      try {
        await bitwarden.deleteSend(id);
        await refreshSends();
        toast.style = Toast.Style.Success;
        toast.title = "Send deleted";
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Failed to delete Send";
        captureException("Failed to delete Send", error);
      }
    });
  };

  const onRemovePassword = (id: string) => {
    return queueOperation(id, async () => {
      const toast = await showToast({ title: "Removing Send Password....", style: Toast.Style.Animated });
      try {
        await bitwarden.removeSendPassword(id);
        await refreshSends();
        toast.style = Toast.Style.Success;
        toast.title = "Send Password removed";
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Failed to remove Send Password";
        captureException("Failed to remove Send Password", error);
      }
    });
  };

  const onCreateSuccess = (newSend: Send) => {
    pop();
    return queueOperation(newSend.id, async () => {
      selectedItemIdRef.current = newSend.id;
      try {
        await refreshSends({
          optimisticUpdate: (currentData) => {
            if (!currentData?.result) return { result: [newSend] };

            const result = [...currentData.result, newSend];
            result.sort(sortSendsByName);
            setTimeout(() => (selectedItemIdRef.current = undefined), 1);

            return { result };
          },
          rollbackOnError: true,
          shouldRevalidateAfter: true,
        });
      } catch (error) {
        await showToast({ title: "Failed to sync Sends", style: Toast.Style.Failure });
        captureException("Failed to sync Sends", error);
      }
    });
  };

  const onEditSuccess = (updatedSend: Send) => {
    pop();
    return queueOperation(updatedSend.id, async () => {
      try {
        await refreshSends({
          optimisticUpdate: (currentData) => {
            if (!currentData?.result) return { result: [updatedSend] };

            const index = currentData?.result.findIndex((send) => send.id === updatedSend.id);
            const result = [...currentData.result];
            if (index === -1) {
              result.push(updatedSend);
            } else {
              result[index] = updatedSend;
            }
            result.sort(sortSendsByName);

            return { result };
          },
          rollbackOnError: true,
          shouldRevalidateAfter: true,
        });
      } catch (error) {
        await showToast({ title: "Failed to sync Sends", style: Toast.Style.Failure });
        captureException("Failed to sync Sends", error);
      }
    });
  };

  if (isFirstLoading) {
    return (
      <List searchBarPlaceholder="Search sends">
        <ListLoadingView title="Loading Sends..." description="Please wait." />
      </List>
    );
  }

  const sendManagementActionSection = (
    <ActionPanel.Section title="Send Management">
      <Action.Push
        target={<CreateEditSendCommand onSuccess={onCreateSuccess} />}
        title="Create New Send"
        icon={Icon.NewDocument}
        shortcut={{ key: "n", modifiers: ["opt"] }}
      />
      <Action onAction={onSync} title={syncSendsTitle} icon={Icon.ArrowClockwise} shortcut={syncSendsShortcut} />
    </ActionPanel.Section>
  );

  if (sends.length === 0) {
    return (
      <List searchBarPlaceholder="Search sends">
        <List.EmptyView
          title="There are no items to list."
          icon="sends-empty-list.svg"
          actions={<ActionPanel>{sendManagementActionSection}</ActionPanel>}
          description={`Try syncing your sends with the ${syncSendsTitle} (${syncSendsShortcutLabel}) action.`}
        />
      </List>
    );
  }

  return (
    <List searchBarPlaceholder="Search sends" selectedItemId={selectedItemIdRef.current}>
      {sends.map((send) => (
        <List.Item
          id={send.id}
          key={send.id}
          title={send.name}
          icon={getItemIcon(send)}
          accessories={getItemAccessories(send)}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard title="Copy URL" content={send.accessUrl} />
              <Action.Paste title={pasteActionTitle} content={send.accessUrl} />
              <Action.Push
                target={<CreateEditSendCommand send={send} onSuccess={onEditSuccess} />}
                title="Edit Send"
                icon={Icon.Pencil}
                shortcut={{ key: "e", modifiers: ["opt"] }}
              />
              <Action
                onAction={() => onDelete(send.id)}
                title="Delete Send"
                icon={Icon.Trash}
                shortcut={{ key: "d", modifiers: ["opt"] }}
              />
              {send.passwordSet && (
                <Action
                  onAction={() => onRemovePassword(send.id)}
                  title="Remove Password"
                  icon={Icon.LockUnlocked}
                  shortcut={{ key: "p", modifiers: ["opt"] }}
                />
              )}
              {sendManagementActionSection}
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

export default ListSendsCommand;
