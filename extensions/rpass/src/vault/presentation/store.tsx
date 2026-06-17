import {
  Action,
  ActionPanel,
  Alert,
  confirmAlert,
  Icon,
  List,
  showToast,
  Toast,
} from "@raycast/api";
import { getFavicon } from "@raycast/utils";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  doctor,
  listEntries,
  removeEntry,
  RpassError,
} from "../../rpass/application/rpass-client";
import {
  filterVaultItemsByFolder,
  getVaultFolders,
} from "../application/filter-vault-items";
import SyncVault from "../../sync-vault";
import { loadVaultItems } from "../application/load-vault-items";
import { ALL_FOLDERS, type VaultItem } from "../domain/vault-item";
import Content from "./content";
import EditEntry from "./edit-entry";
import SetupPasswordStore, {
  type PasswordStoreSetupReason,
} from "./setup-password-store";

const FOLDER_TAG_COLOR = "#8E8E93";

interface Props {
  storepath: string;
}

function getVaultItemIcon(item: VaultItem) {
  return item.faviconUrl ? getFavicon(item.faviconUrl) : Icon.Lock;
}

function getVaultItemAccessories(item: VaultItem) {
  return item.folder
    ? [{ tag: { value: item.folder, color: FOLDER_TAG_COLOR } }]
    : undefined;
}

interface FolderFilterProps {
  folders: string[];
  selectedFolder: string;
  onChange(folder: string): void;
}

function formatError(error: unknown): string {
  if (error instanceof RpassError) {
    return `${error.code}: ${error.message}${error.details ? `\n\n${error.details}` : ""}`;
  }

  if (error instanceof Error) return error.message;
  return String(error);
}

function getSetupReason(error: unknown): PasswordStoreSetupReason | undefined {
  if (!(error instanceof RpassError)) return undefined;
  if (error.code === "store_not_found") return "store_missing";
  if (error.code === "gpg_id_not_found") return "gpg_id_missing";
  return undefined;
}

function getSetupReasonFromDoctor(
  report: Awaited<ReturnType<typeof doctor>>,
): PasswordStoreSetupReason | undefined {
  if (
    report.checks.some((check) => check.name === "store_directory" && !check.ok)
  ) {
    return "store_missing";
  }

  if (report.checks.some((check) => check.name === "gpg_id" && !check.ok)) {
    return "gpg_id_missing";
  }

  return undefined;
}

function FolderFilter({
  folders,
  selectedFolder,
  onChange,
}: FolderFilterProps) {
  if (folders.length === 0) return null;

  return (
    <List.Dropdown
      tooltip="Filter by Folder"
      value={selectedFolder}
      onChange={onChange}
    >
      <List.Dropdown.Item icon={Icon.Folder} title="All" value={ALL_FOLDERS} />
      {folders.map((folder) => (
        <List.Dropdown.Item
          key={folder}
          icon={Icon.Folder}
          title={folder}
          value={folder}
        />
      ))}
    </List.Dropdown>
  );
}

export default function Store({ storepath }: Props) {
  const [items, setItems] = useState<VaultItem[]>([]);
  const [selectedFolder, setSelectedFolder] = useState(ALL_FOLDERS);
  const [lastError, setLastError] = useState<string>();
  const [setupReason, setSetupReason] = useState<PasswordStoreSetupReason>();
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    setIsLoading(true);
    setLastError(undefined);
    try {
      const loadedItems = await loadVaultItems(storepath, { listEntries });
      setItems(loadedItems);
      try {
        const report = await doctor(storepath);
        setSetupReason(getSetupReasonFromDoctor(report));
      } catch {
        setSetupReason(undefined);
      }
    } catch (error) {
      const reason = getSetupReason(error);
      if (reason) {
        setSetupReason(reason);
        setItems([]);
      } else {
        setLastError(formatError(error));
      }
    } finally {
      setIsLoading(false);
    }
  }, [storepath]);

  useEffect(() => {
    load();
  }, [load]);

  const deleteEntry = useCallback(
    async (item: VaultItem) => {
      const confirmed = await confirmAlert({
        title: "Delete Entry?",
        message: `Delete '${item.entry}' from the password store? This cannot be undone.`,
        primaryAction: {
          title: "Delete Entry",
          style: Alert.ActionStyle.Destructive,
        },
        dismissAction: {
          title: "Cancel",
        },
      });

      if (!confirmed) return;

      setIsLoading(true);
      setLastError(undefined);
      try {
        await removeEntry(item.entry, storepath);
        setItems((currentItems) =>
          currentItems.filter(
            (currentItem) => currentItem.entry !== item.entry,
          ),
        );
        await showToast(Toast.Style.Success, "Entry Deleted", item.entry);
      } catch (error) {
        const message = formatError(error);
        setLastError(message);
        await showToast(Toast.Style.Failure, "Failed to Delete Entry", message);
      } finally {
        setIsLoading(false);
      }
    },
    [storepath],
  );

  const folders = useMemo(() => getVaultFolders(items), [items]);
  const filteredItems = useMemo(
    () => filterVaultItemsByFolder(items, selectedFolder),
    [items, selectedFolder],
  );

  if (setupReason) {
    return (
      <SetupPasswordStore
        storepath={storepath}
        reason={setupReason}
        onDone={load}
      />
    );
  }

  if (lastError) {
    return (
      <List isLoading={isLoading}>
        <List.Item
          icon={Icon.ExclamationMark}
          title="Failed to Load Vault"
          subtitle={lastError}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard title="Copy Error" content={lastError} />
              <Action
                title="Retry"
                icon={Icon.ArrowClockwise}
                onAction={load}
              />
              <Action.Push
                icon={Icon.Hammer}
                title="Initialize Password Store"
                target={
                  <SetupPasswordStore
                    storepath={storepath}
                    onDone={load}
                    popOnDone
                  />
                }
              />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search vault..."
      searchBarAccessory={
        <FolderFilter
          folders={folders}
          selectedFolder={selectedFolder}
          onChange={setSelectedFolder}
        />
      }
    >
      {filteredItems.map((item) => (
        <List.Item
          key={item.entry}
          icon={getVaultItemIcon(item)}
          title={item.name}
          subtitle={item.label}
          accessories={getVaultItemAccessories(item)}
          actions={
            <ActionPanel>
              <Action.Push
                icon={Icon.Eye}
                title="Show Entry"
                target={<Content storepath={storepath} entry={item.entry} />}
              />
              <Action.Push
                icon={Icon.Pencil}
                title="Edit Entry"
                target={<EditEntry storepath={storepath} entry={item.entry} />}
              />
              <Action.Push
                icon={Icon.ArrowClockwise}
                title="Sync Vault"
                target={<SyncVault />}
              />
              <Action
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                title="Delete Entry"
                onAction={() => deleteEntry(item)}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
