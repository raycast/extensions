import {
  Action,
  ActionPanel,
  Color,
  Icon,
  Keyboard,
  List,
  Toast,
  getPreferenceValues,
  showToast,
  useNavigation,
} from "@raycast/api";
import { useCachedState, usePromise } from "@raycast/utils";
import { useRef } from "react";
import { Bitwarden } from "~/api/bitwarden";
import { DebuggingBugReportingActionSection } from "~/components/actions";
import { ListLoadingView } from "~/components/ListLoadingView";
import RootErrorBoundary from "~/components/RootErrorBoundary";
import { CACHE_KEYS } from "~/constants/general";
import { MODIFIER_TO_LABEL } from "~/constants/labels";
import { SendTypeOptions } from "~/constants/send";
import { BitwardenProvider, useBitwarden } from "~/context/bitwarden";
import { SessionProvider } from "~/context/session";
import CreateSendCommand from "~/create-send";
import { Send, SendType } from "~/types/send";
import { getFormattedDate } from "~/utils/dates";
import { captureException } from "~/utils/development";
import useFrontmostApplicationName from "~/utils/hooks/useFrontmostApplicationName";
import { useInterval } from "~/utils/hooks/useInterval";

const searchBarPlaceholder = "Search sends";
const LoadingFallback = () => <List searchBarPlaceholder={searchBarPlaceholder} isLoading />;

const { syncOnLaunch } = getPreferenceValues<AllPreferences>();

const SearchSendsCommand = () => (
  <RootErrorBoundary>
    <BitwardenProvider loadingFallback={<LoadingFallback />}>
      <SessionProvider loadingFallback={<LoadingFallback />} unlock>
        <SearchSendsCommandContent />
      </SessionProvider>
    </BitwardenProvider>
  </RootErrorBoundary>
);

const getItemIcon = (send: Send): NonNullable<List.Item.Props["icon"]> => {
  if (send.type === SendType.File) return { source: Icon.Document, tintColor: Color.Blue };
  return { source: Icon.Text, tintColor: Color.SecondaryText };
};

const getDateAccessoryDetails = (dateString: string) => {
  const date = new Date(dateString);
  const isPastDate = date < new Date();

  return {
    date,
    isPastDate,
    color: isPastDate ? Color.Red : undefined,
    textDate: getFormattedDate(date, { abbreviate: true, second: undefined }),
    tooltipDate: getFormattedDate(date),
  };
};

const getItemAccessories = (send: Send): List.Item.Props["accessories"] => {
  const accessories: List.Item.Props["accessories"] = [];
  if (send.passwordSet) {
    accessories.push({ icon: Icon.Key, tooltip: "Password protected" });
  }

  if (send.disabled) {
    accessories.push({ icon: { source: Icon.Warning, tintColor: Color.Orange }, tooltip: "Disabled" });
  }

  const { accessCount, maxAccessCount } = send;
  if (accessCount > 0 || maxAccessCount) {
    const wasMaxAccessReached = maxAccessCount && accessCount >= maxAccessCount;

    accessories.push({
      tag: { value: `${accessCount}`, color: wasMaxAccessReached ? Color.Red : undefined },
      icon: { source: Icon.Person, tintColor: wasMaxAccessReached ? Color.Red : undefined },
      tooltip: maxAccessCount
        ? `Max access count reached: ${accessCount}/${maxAccessCount}`
        : `Access Count: ${accessCount}`,
    });
  }

  if (send.expirationDate) {
    const { color, textDate, tooltipDate, isPastDate } = getDateAccessoryDetails(send.expirationDate);
    accessories.push({
      text: { value: textDate, color },
      icon: { source: Icon.Clock, tintColor: color },
      tooltip: isPastDate ? `Expired on ${tooltipDate}` : `Will expire on ${tooltipDate}`,
    });
  }
  if (send.deletionDate) {
    const { color, textDate: textDate, tooltipDate, isPastDate } = getDateAccessoryDetails(send.deletionDate);
    accessories.push({
      text: { value: textDate, color },
      icon: { source: Icon.Trash, tintColor: color },
      tooltip: isPastDate ? `Deleted on ${tooltipDate}` : `Will be deleted on ${tooltipDate}`,
    });
  }

  return accessories;
};

const usePasteActionTitle = () => {
  const currentApplication = useFrontmostApplicationName();
  return currentApplication ? `Paste URL into ${currentApplication}` : "Paste URL";
};

type Operation = { id: string; execute: () => Promise<any> };

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

const sortSendsByName = (sendA: Send, sendB: Send) => sendA.name.localeCompare(sendB.name);

const useListSends = (bitwarden: Bitwarden) => {
  const isFirstLoadRef = useRef(true);
  const [type, setType] = useCachedState<SendType>(CACHE_KEYS.SEND_TYPE_FILTER);

  const listSends = async () => {
    const toast = isFirstLoadRef.current
      ? await showToast({ title: "Loading Sends...", style: Toast.Style.Animated })
      : undefined;
    try {
      const listSends = await bitwarden.listSends();
      if (listSends.result) listSends.result.sort(sortSendsByName);
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

  return {
    isLoading,
    refresh,
    error,
    called: !!data,
    filterByType: setType,
    sends: type != null ? sends.filter((send) => send.type === type) : sends,
    isFirstLoading: isLoading && isFirstLoadRef.current,
  };
};

const syncAction = {
  title: "Sync Vault",
  get shortcut(): Keyboard.Shortcut {
    return { key: "r", modifiers: ["opt"] };
  },
  get modifierToLabelMap(): Record<Keyboard.KeyModifier, string> {
    return { cmd: "⌘", shift: "⇧", opt: "⌥", ctrl: "⌃" };
  },
  get shortcutLabel(): string {
    return (
      this.shortcut.modifiers.map((mod) => MODIFIER_TO_LABEL[mod] ?? "").join("") + this.shortcut.key.toUpperCase()
    );
  },
};

function SearchSendsCommandContent() {
  const { pop } = useNavigation();
  const bitwarden = useBitwarden();
  const queueOperation = useOperationQueue();
  const { sends, isFirstLoading, called, refresh: refreshSends, filterByType } = useListSends(bitwarden);

  const pasteActionTitle = usePasteActionTitle();
  const selectedItemIdRef = useRef<string>();

  useInterval(() => onSync(true), { skip: !called || !syncOnLaunch });

  function onSync(isPeriodic: boolean) {
    return queueOperation("sync", async () => {
      const toast = await showToast({
        title: "Syncing Vault...",
        message: isPeriodic ? "Background Task" : undefined,
        style: Toast.Style.Animated,
      });
      try {
        await bitwarden.sync();
        await refreshSends();

        if (isPeriodic) {
          await toast?.hide();
        } else {
          toast.style = Toast.Style.Success;
          toast.title = "Vault synced";
        }
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Failed to sync Vault";
        captureException(["Failed to sync Vault", isPeriodic && "periodically"], error);
      }
    });
  }

  const onDelete = (id: string) => {
    return queueOperation(id, async () => {
      const toast = await showToast({ title: "Deleting Send...", style: Toast.Style.Animated });
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
      const toast = await showToast({ title: "Removing Send password...", style: Toast.Style.Animated });
      try {
        await bitwarden.removeSendPassword(id);
        await refreshSends();
        toast.style = Toast.Style.Success;
        toast.title = "Send password removed";
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Failed to remove Send password";
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
        await showToast({ title: "Failed to refresh Sends", style: Toast.Style.Failure });
        captureException("Failed to refresh Sends", error);
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

  const onSendTypeChange = (value: string) => filterByType(value !== "" ? parseInt(value) : undefined);

  const searchBarAccessory = (
    <List.Dropdown tooltip="Filter by Send type" onChange={onSendTypeChange}>
      <List.Dropdown.Item title="All" value="" />
      {Object.entries(SendTypeOptions).map(([value, title]) => (
        <List.Dropdown.Item key={value} value={value} title={title} />
      ))}
    </List.Dropdown>
  );

  if (isFirstLoading) {
    return (
      <List searchBarPlaceholder={searchBarPlaceholder} searchBarAccessory={searchBarAccessory}>
        <ListLoadingView title="Loading Sends..." description="Please wait." />
      </List>
    );
  }

  const sendManagementActionSection = (
    <ActionPanel.Section title="Send Management">
      <Action.Push
        title="Create New Send"
        target={<CreateSendCommand onSuccess={onCreateSuccess} />}
        icon={Icon.NewDocument}
        shortcut={{ key: "n", modifiers: ["opt"] }}
      />
      <Action
        title={syncAction.title}
        onAction={() => onSync(false)}
        icon={Icon.ArrowClockwise}
        shortcut={syncAction.shortcut}
      />
    </ActionPanel.Section>
  );

  if (sends.length === 0) {
    return (
      <List searchBarPlaceholder={searchBarPlaceholder} searchBarAccessory={searchBarAccessory}>
        <List.EmptyView
          title="There are no items to list."
          icon="sends-empty-list.svg"
          actions={
            <ActionPanel>
              {sendManagementActionSection}
              <DebuggingBugReportingActionSection />
            </ActionPanel>
          }
          description={`Try syncing your vault with the ${syncAction.title} (${syncAction.shortcutLabel}) action.`}
        />
      </List>
    );
  }

  return (
    <List
      searchBarPlaceholder={searchBarPlaceholder}
      selectedItemId={selectedItemIdRef.current}
      searchBarAccessory={searchBarAccessory}
    >
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
              {send.passwordSet && (
                <Action
                  title="Remove Password"
                  onAction={() => onRemovePassword(send.id)}
                  icon={Icon.LockUnlocked}
                  shortcut={{ key: "p", modifiers: ["opt"] }}
                />
              )}
              <Action.Push
                title="Edit Send"
                target={<CreateSendCommand send={send} onSuccess={onEditSuccess} />}
                icon={Icon.Pencil}
                shortcut={{ key: "e", modifiers: ["opt"] }}
              />
              <Action
                title="Delete Send"
                style={Action.Style.Destructive}
                onAction={() => onDelete(send.id)}
                icon={Icon.Trash}
                shortcut={{ key: "d", modifiers: ["opt"] }}
              />
              {sendManagementActionSection}
              <DebuggingBugReportingActionSection />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

export default SearchSendsCommand;
