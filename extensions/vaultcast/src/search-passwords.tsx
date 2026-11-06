import {
  Action,
  ActionPanel,
  Detail,
  Icon,
  Keyboard,
  List,
  closeMainWindow,
  getPreferenceValues,
  open,
  showToast,
  Toast,
  type Image,
} from "@raycast/api";
import { showFailureToast, useCachedPromise, usePromise } from "@raycast/utils";
import { useEffect, useMemo, useRef, useState } from "react";

import {
  cancelScheduledDispose,
  disposeSession,
  isBiometricUnlockInProgress,
  scheduleDisposeAllSessions,
} from "./adapters/external-session";
import { getExternalAdaptersDirectoryForDisplay } from "./registry/load-external-adapters";
import {
  adapterNeedsAuth,
  getAvailableAdapters,
  isAdapterSelectable,
  loadAdapters,
  resolveManagerId,
} from "./registry";
import type { AdapterStatus, ItemAvailability, PasswordManagerAdapter, VaultItem } from "./types";
import { UnlockForm } from "./unlock-form";
import {
  getExtensionSessionState,
  hasRememberedCredentials,
  hydrateCredentialVault,
  isExtensionSessionEnabled,
  lockExtensionSession,
  lockExtensionSessionIfExpired,
  markSessionActivity,
  parseSessionTimeoutMinutes,
  rememberCredentials,
  subscribeToExtensionSession,
} from "./utils/credential-vault";
import { CLIPBOARD_CLEAR_DELAY_SECONDS, copySecret, pasteSecret } from "./utils/clipboard";
import { filterVaultItems, sortVaultItems } from "./utils/items";
import { loadLastManagerId, saveLastManagerId } from "./utils/last-manager-selection";
import { ALL_MANAGERS_ID, ALL_MANAGERS_TITLE } from "./utils/manager-selection";

const TOTP_DELAY_MS = 5000;
const CLIPBOARD_CLEAR_MESSAGE = `Clipboard clears in ${CLIPBOARD_CLEAR_DELAY_SECONDS / 60} minutes`;
const SESSION_DISPOSE_REMOUNT_GRACE_MS = 250;

let pendingTotpCopies = 0;

function beginPendingTotpCopy(): void {
  pendingTotpCopies += 1;
}

function endPendingTotpCopy(): void {
  pendingTotpCopies = Math.max(0, pendingTotpCopies - 1);
}

function pendingSessionDisposeDelayMs(): number {
  return pendingTotpCopies > 0 ? TOTP_DELAY_MS + 500 : 0;
}

const SHORTCUTS: Record<string, Keyboard.Shortcut> = {
  pastePassword: {
    macOS: { modifiers: ["cmd", "shift"], key: "return" },
    Windows: { modifiers: ["ctrl", "shift"], key: "enter" },
  },
  copyEmail: {
    macOS: { modifiers: ["cmd"], key: "c" },
    Windows: { modifiers: ["ctrl"], key: "c" },
  },
  copyPassword: {
    macOS: { modifiers: ["cmd", "shift"], key: "c" },
    Windows: { modifiers: ["ctrl", "shift"], key: "c" },
  },
  copyTotp: {
    macOS: { modifiers: ["cmd"], key: "t" },
    Windows: { modifiers: ["ctrl"], key: "t" },
  },
};

interface CredentialActionOptions {
  scheduleTotp?: boolean;
  autoCopyTotpAfterPassword?: boolean;
  hasTotp?: boolean;
  adapter?: PasswordManagerAdapter;
  item?: VaultItem;
}

function defaultAvailability(item: VaultItem): ItemAvailability {
  return {
    hasUrl: Boolean(item.url),
    url: item.url,
    hasEmail: Boolean(item.email),
    hasUsername: Boolean(item.username),
    hasTotp: item.hasTotp === true,
    hasPassword: true,
  };
}

async function resolveItemAvailability(adapter: PasswordManagerAdapter, item: VaultItem): Promise<ItemAvailability> {
  if (adapter.getItemAvailability) {
    return adapter.getItemAvailability(item);
  }

  const [url, email, username, totpResult] = await Promise.all([
    adapter.getUrl?.(item),
    adapter.getEmail(item).catch(() => undefined),
    adapter.getUsername(item).catch(() => undefined),
    adapter.getTotp(item).catch(() => undefined),
  ]);

  let hasPassword = true;
  try {
    const password = await adapter.getPassword(item);
    hasPassword = Boolean(password);
  } catch {
    hasPassword = false;
  }

  return {
    hasUrl: Boolean(url),
    url,
    hasEmail: Boolean(email),
    hasUsername: Boolean(username),
    hasTotp: Boolean(totpResult),
    hasPassword,
  };
}

function ItemAction({
  title,
  icon,
  shortcut,
  onAction,
  onActivity,
}: {
  title: string;
  icon: Image.ImageLike;
  shortcut?: Keyboard.Shortcut;
  onAction: () => Promise<void>;
  onActivity?: () => void;
}) {
  return (
    <Action
      title={title}
      icon={icon}
      shortcut={shortcut}
      onAction={async () => {
        onActivity?.();
        await onAction();
      }}
    />
  );
}

async function showActionError(title: string): Promise<void> {
  await showToast({ style: Toast.Style.Failure, title });
}

function actionErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

async function collectItems(
  managerIds: string[],
  load: (adapter: PasswordManagerAdapter) => Promise<VaultItem[]>,
): Promise<VaultItem[]> {
  const adapters = (await loadAdapters()).filter((adapter) => managerIds.includes(adapter.id));
  const results = await Promise.allSettled(adapters.map(load));
  const failures = adapters.flatMap((adapter, index) => {
    const result = results[index];
    return result.status === "rejected" ? [`${adapter.name}: ${actionErrorMessage(result.reason)}`] : [];
  });

  if (failures.length > 0 && failures.length === results.length) {
    const firstFailure = results.find((result) => result.status === "rejected");
    throw firstFailure?.reason;
  }

  if (failures.length > 0) {
    void showToast({
      style: Toast.Style.Failure,
      title: "Some password managers failed to load",
      message: failures.join("\n"),
    });
  }

  return results.flatMap((result) => (result.status === "fulfilled" ? result.value : []));
}

function shouldScheduleTotpCopy(options?: CredentialActionOptions): boolean {
  if (!options?.scheduleTotp || !options.autoCopyTotpAfterPassword || !options.adapter || !options.item) {
    return false;
  }

  return options.hasTotp === true;
}

async function scheduleTotpCopy(adapter: PasswordManagerAdapter, item: VaultItem): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, TOTP_DELAY_MS));

  try {
    const totp = await adapter.getTotp(item);
    if (!totp) {
      return;
    }

    await copySecret(totp);
    await showToast({ style: Toast.Style.Success, title: "TOTP copied", message: CLIPBOARD_CLEAR_MESSAGE });
  } catch (error) {
    await showFailureToast(error, { title: "Failed to copy TOTP" });
  }
}

async function closeThenToast(
  toast: { style: Toast.Style; title: string; message?: string },
  shouldClose: boolean,
): Promise<void> {
  if (shouldClose) {
    await closeMainWindow();
  }

  await showToast(toast);
}

function startScheduledTotpCopy(options?: CredentialActionOptions): boolean {
  if (!shouldScheduleTotpCopy(options) || !options?.adapter || !options.item) {
    return false;
  }

  beginPendingTotpCopy();
  return true;
}

function finishScheduledTotpCopy(adapter: PasswordManagerAdapter, item: VaultItem): void {
  void scheduleTotpCopy(adapter, item).finally(endPendingTotpCopy);
}

async function copyCredential(
  label: string,
  value: string,
  closeAfterCopy: boolean,
  options?: CredentialActionOptions,
): Promise<void> {
  await copySecret(value);

  const scheduleTotp = startScheduledTotpCopy(options);

  await closeThenToast(
    {
      style: Toast.Style.Success,
      title: `${label} copied`,
      message: scheduleTotp ? "TOTP in 5 seconds" : CLIPBOARD_CLEAR_MESSAGE,
    },
    closeAfterCopy,
  );

  if (scheduleTotp && options?.adapter && options.item) {
    finishScheduledTotpCopy(options.adapter, options.item);
  } else if (scheduleTotp) {
    endPendingTotpCopy();
  }
}

async function pasteCredential(label: string, value: string, options?: CredentialActionOptions): Promise<void> {
  await pasteSecret(value);

  const scheduleTotp = startScheduledTotpCopy(options);

  await closeThenToast(
    {
      style: Toast.Style.Success,
      title: `${label} pasted`,
      message: scheduleTotp ? "TOTP in 5 seconds" : CLIPBOARD_CLEAR_MESSAGE,
    },
    true,
  );

  if (scheduleTotp && options?.adapter && options.item) {
    finishScheduledTotpCopy(options.adapter, options.item);
  } else if (scheduleTotp) {
    endPendingTotpCopy();
  }
}

function ItemActions({
  item,
  adapter,
  closeAfterCopy,
  autoCopyTotpAfterPassword,
  onActivity,
  onLock,
}: {
  item: VaultItem;
  adapter: PasswordManagerAdapter;
  closeAfterCopy: boolean;
  autoCopyTotpAfterPassword: boolean;
  onActivity: () => void;
  onLock: () => void;
}) {
  const { data: availabilityData } = useCachedPromise(
    (vaultItem: VaultItem, pwdAdapter: PasswordManagerAdapter) => resolveItemAvailability(pwdAdapter, vaultItem),
    [item, adapter],
    {
      initialData: defaultAvailability(item),
    },
  );

  const availability = availabilityData ?? defaultAvailability(item);

  const passwordTotpOptions: CredentialActionOptions = {
    scheduleTotp: true,
    autoCopyTotpAfterPassword,
    hasTotp: availability.hasTotp,
    adapter,
    item,
  };

  return (
    <ActionPanel>
      <ItemAction
        title="Open in Browser"
        icon={Icon.Globe}
        onActivity={onActivity}
        onAction={async () => {
          if (!adapter.getUrl) {
            await showActionError("Not supported");
            return;
          }

          if (!availability.hasUrl) {
            await showActionError("No URL available");
            return;
          }

          try {
            const url = availability.url ?? (await adapter.getUrl(item));
            if (!url) {
              await showActionError("No URL available");
              return;
            }

            await open(url);
            await closeMainWindow();
          } catch (error) {
            await showFailureToast(error, { title: "Failed to open in browser" });
          }
        }}
      />
      <ItemAction
        title="Paste Email"
        icon={Icon.Envelope}
        onActivity={onActivity}
        onAction={async () => {
          if (!availability.hasEmail) {
            await showActionError("No email available");
            return;
          }

          try {
            const email = await adapter.getEmail(item);
            if (!email) {
              await showActionError("No email available");
              return;
            }

            await pasteCredential("Email", email);
          } catch (error) {
            await showFailureToast(error, { title: "Failed to paste email" });
          }
        }}
      />
      <ItemAction
        title="Paste Password"
        icon={Icon.Key}
        shortcut={SHORTCUTS.pastePassword}
        onActivity={onActivity}
        onAction={async () => {
          if (!availability.hasPassword) {
            await showActionError("No password available");
            return;
          }

          try {
            const password = await adapter.getPassword(item);
            if (!password) {
              await showActionError("No password available");
              return;
            }

            await pasteCredential("Password", password, passwordTotpOptions);
          } catch (error) {
            await showFailureToast(error, { title: "Failed to paste password" });
          }
        }}
      />
      <ItemAction
        title="Copy Email"
        icon={Icon.Envelope}
        shortcut={SHORTCUTS.copyEmail}
        onActivity={onActivity}
        onAction={async () => {
          if (!availability.hasEmail) {
            await showActionError("No email available");
            return;
          }

          try {
            const email = await adapter.getEmail(item);
            if (!email) {
              await showActionError("No email available");
              return;
            }

            await copyCredential("Email", email, closeAfterCopy);
          } catch (error) {
            await showFailureToast(error, { title: "Failed to copy email" });
          }
        }}
      />
      <ItemAction
        title="Copy Password"
        icon={Icon.Key}
        shortcut={SHORTCUTS.copyPassword}
        onActivity={onActivity}
        onAction={async () => {
          if (!availability.hasPassword) {
            await showActionError("No password available");
            return;
          }

          try {
            const password = await adapter.getPassword(item);
            if (!password) {
              await showActionError("No password available");
              return;
            }

            await copyCredential("Password", password, closeAfterCopy, passwordTotpOptions);
          } catch (error) {
            await showFailureToast(error, { title: "Failed to copy password" });
          }
        }}
      />
      <ItemAction
        title="Copy TOTP"
        icon={Icon.Clock}
        shortcut={SHORTCUTS.copyTotp}
        onActivity={onActivity}
        onAction={async () => {
          if (!availability.hasTotp) {
            await showActionError("No TOTP available");
            return;
          }

          try {
            const totp = await adapter.getTotp(item);
            if (!totp) {
              await showActionError("No TOTP available");
              return;
            }

            await copyCredential("TOTP", totp, closeAfterCopy);
          } catch (error) {
            await showFailureToast(error, { title: "Failed to copy TOTP" });
          }
        }}
      />
      <ItemAction
        title="Copy Username"
        icon={Icon.Person}
        onActivity={onActivity}
        onAction={async () => {
          if (!availability.hasUsername) {
            await showActionError("No username available");
            return;
          }

          try {
            const username = await adapter.getUsername(item);
            if (!username) {
              await showActionError("No username available");
              return;
            }

            await copyCredential("Username", username, closeAfterCopy);
          } catch (error) {
            await showFailureToast(error, { title: "Failed to copy username" });
          }
        }}
      />
      {adapter.openInManager && (
        <ItemAction
          title="Open in Password Manager"
          icon={Icon.AppWindow}
          onActivity={onActivity}
          onAction={async () => {
            try {
              await adapter.openInManager!(item);
              await closeMainWindow();
            } catch (error) {
              await showFailureToast(error, { title: "Failed to open in password manager" });
            }
          }}
        />
      )}
      <ItemAction title="Lock Session" icon={Icon.Lock} onActivity={onActivity} onAction={async () => onLock()} />
    </ActionPanel>
  );
}

export default function SearchPasswords() {
  const preferences = getPreferenceValues<Preferences>();
  const closeAfterCopy = preferences.closeAfterCopy ?? true;
  const autoCopyTotpAfterPassword = preferences.autoCopyTotpAfterPassword ?? false;

  const {
    data: adapterStatuses,
    isLoading: isLoadingAdapters,
    revalidate: revalidateAdapterStatuses,
  } = usePromise(getAvailableAdapters);

  const { isLoading: isLoadingVault } = usePromise(hydrateCredentialVault);
  const { data: lastManagerId, isLoading: isLoadingLastManager } = usePromise(loadLastManagerId);

  const allAdapters = useMemo(() => adapterStatuses?.map((entry) => entry.adapter) ?? [], [adapterStatuses]);

  const [sessionManagerId, setSessionManagerId] = useState<string | undefined>(undefined);
  const [unlockedIds, setUnlockedIds] = useState<string[]>([]);
  const [, setSessionEpoch] = useState(0);
  const [searchText, setSearchText] = useState("");
  const dropdownChangeCountRef = useRef(0);
  const initialSelectionAppliedRef = useRef(false);
  const activeManagerIdRef = useRef<string | undefined>(undefined);
  const lastActivityRef = useRef(Date.now());
  const previousManagerIdRef = useRef<string | undefined>(undefined);

  const availableAdapters = useMemo(
    () =>
      adapterStatuses
        ?.filter((entry) => entry.status.ok || unlockedIds.includes(entry.adapter.id))
        .map((entry) => entry.adapter) ?? [],
    [adapterStatuses, unlockedIds],
  );

  const lockedAdapters = useMemo(
    () =>
      adapterStatuses?.filter((entry) => adapterNeedsAuth(entry.status) && !unlockedIds.includes(entry.adapter.id)) ??
      [],
    [adapterStatuses, unlockedIds],
  );

  const unavailableAdapters = useMemo(
    () => adapterStatuses?.filter((entry) => !entry.status.ok && !adapterNeedsAuth(entry.status)) ?? [],
    [adapterStatuses],
  );

  const selectableAdapters = useMemo(
    () => adapterStatuses?.filter((entry) => isAdapterSelectable(entry.status)).map((entry) => entry.adapter) ?? [],
    [adapterStatuses],
  );

  const preferredManagerId = useMemo(() => {
    const override = preferences.defaultManagerOverride?.trim();
    const preferred = override || preferences.defaultManagerId;
    return resolveManagerId(preferred, selectableAdapters, allAdapters);
  }, [allAdapters, selectableAdapters, preferences.defaultManagerId, preferences.defaultManagerOverride]);

  const resolvedInitialManagerId = useMemo(() => {
    if (
      lastManagerId &&
      (lastManagerId === ALL_MANAGERS_ID || allAdapters.some((adapter) => adapter.id === lastManagerId))
    ) {
      return lastManagerId;
    }
    return preferredManagerId;
  }, [allAdapters, lastManagerId, preferredManagerId]);

  function markActivity(): void {
    if (getExtensionSessionState() === "locked") {
      return;
    }

    lastActivityRef.current = Date.now();
    markSessionActivity();
  }

  function bumpSessionEpoch(): void {
    setSessionEpoch((value) => value + 1);
  }

  useEffect(() => {
    dropdownChangeCountRef.current = 0;
    setSessionManagerId(undefined);
    initialSelectionAppliedRef.current = false;
  }, [preferences.defaultManagerId, preferences.defaultManagerOverride]);

  useEffect(() => {
    if (initialSelectionAppliedRef.current || isLoadingAdapters || isLoadingLastManager) {
      return;
    }

    if (resolvedInitialManagerId) {
      setSessionManagerId(resolvedInitialManagerId);
    }

    dropdownChangeCountRef.current = 0;
    initialSelectionAppliedRef.current = true;
  }, [isLoadingAdapters, isLoadingLastManager, resolvedInitialManagerId]);

  const activeManagerId = sessionManagerId ?? resolvedInitialManagerId;

  activeManagerIdRef.current = activeManagerId;

  useEffect(() => {
    return () => {
      const managerId = activeManagerIdRef.current;
      if (managerId) {
        void saveLastManagerId(managerId);
      }
    };
  }, []);

  useEffect(() => {
    return subscribeToExtensionSession(() => {
      setSessionEpoch((value) => value + 1);
    });
  }, []);

  useEffect(() => {
    cancelScheduledDispose();
    return () => {
      if (isBiometricUnlockInProgress()) {
        return;
      }

      scheduleDisposeAllSessions(SESSION_DISPOSE_REMOUNT_GRACE_MS + pendingSessionDisposeDelayMs());
    };
  }, []);

  function managerIdsInSelection(managerId: string): string[] {
    return managerId === ALL_MANAGERS_ID ? allAdapters.map((adapter) => adapter.id) : [managerId];
  }

  async function releaseManagers(managerIds: string[]): Promise<void> {
    if (!isExtensionSessionEnabled()) {
      setUnlockedIds((ids) => ids.filter((id) => !managerIds.includes(id)));
    }
    await Promise.all(managerIds.map((id) => disposeSession(id)));
  }

  /** Locks the managers' own sessions (e.g. pass-cli) before treating them as locked, then refreshes their status. */
  async function lockManagers(managerIds: string[]): Promise<void> {
    const results = await Promise.allSettled(
      allAdapters.filter((adapter) => managerIds.includes(adapter.id)).map((adapter) => adapter.lockSession?.()),
    );
    await releaseManagers(managerIds);
    void revalidateAdapterStatuses();

    const failure = results.find((result): result is PromiseRejectedResult => result.status === "rejected");
    if (failure) {
      throw failure.reason;
    }
  }

  function lockManagersInBackground(managerIds: string[]): void {
    void lockManagers(managerIds).catch((error) => showFailureToast(error, { title: "Failed to lock session" }));
  }

  useEffect(() => {
    const previous = previousManagerIdRef.current;
    previousManagerIdRef.current = activeManagerId;
    if (!previous || previous === activeManagerId || activeManagerId === ALL_MANAGERS_ID) {
      return;
    }

    void releaseManagers(managerIdsInSelection(previous).filter((id) => id !== activeManagerId));
  }, [activeManagerId]);

  useEffect(() => {
    if (!activeManagerId) {
      return;
    }

    const timeoutMs = parseSessionTimeoutMinutes(preferences.sessionTimeoutMinutes) * 60_000;
    const tick = (): void => {
      if (isExtensionSessionEnabled()) {
        if (lockExtensionSessionIfExpired()) {
          lockManagersInBackground(managerIdsInSelection(activeManagerId));
          bumpSessionEpoch();
        }
        return;
      }

      if (Date.now() - lastActivityRef.current < timeoutMs) {
        return;
      }

      lastActivityRef.current = Date.now();
      lockManagersInBackground(managerIdsInSelection(activeManagerId));
    };

    tick();
    const handle = setInterval(tick, 1000);

    return () => clearInterval(handle);
  }, [activeManagerId, allAdapters, preferences.sessionTimeoutMinutes]);

  const isAllSelected = activeManagerId === ALL_MANAGERS_ID;
  const selectedEntry = adapterStatuses?.find((entry) => entry.adapter.id === activeManagerId);
  const selectedAdapter = selectedEntry?.adapter;
  const extensionSessionState = getExtensionSessionState();

  function canAutoBootstrapExtensionSession(adapter: PasswordManagerAdapter, status: AdapterStatus): boolean {
    return Boolean(
      status.ok &&
      isExtensionSessionEnabled() &&
      adapter.authenticate &&
      extensionSessionState === "empty" &&
      !unlockedIds.includes(adapter.id),
    );
  }

  function needsUnlock(adapter: PasswordManagerAdapter, status: AdapterStatus): boolean {
    const needsExtensionUnlock =
      isExtensionSessionEnabled() &&
      Boolean(adapter.authenticate) &&
      (extensionSessionState === "empty" || extensionSessionState === "locked") &&
      !canAutoBootstrapExtensionSession(adapter, status);
    return needsExtensionUnlock || (adapterNeedsAuth(status) && !unlockedIds.includes(adapter.id));
  }

  function canLoadItemsFrom(adapter: PasswordManagerAdapter, status: AdapterStatus): boolean {
    return (status.ok || unlockedIds.includes(adapter.id)) && !needsUnlock(adapter, status);
  }

  const showUnlockForm = Boolean(selectedEntry && needsUnlock(selectedEntry.adapter, selectedEntry.status));
  const scopeEntries = (adapterStatuses ?? []).filter(
    (entry) => (isAllSelected || entry.adapter.id === activeManagerId) && canLoadItemsFrom(entry.adapter, entry.status),
  );
  const scopeAdapters = new Map(scopeEntries.map((entry) => [entry.adapter.id, entry.adapter]));
  const localManagerIds = scopeEntries.filter((entry) => entry.adapter.listItems).map((entry) => entry.adapter.id);
  const remoteManagerIds = scopeEntries.filter((entry) => !entry.adapter.listItems).map((entry) => entry.adapter.id);
  const hasLocalManagers = localManagerIds.length > 0;
  const hasRemoteManagers = remoteManagerIds.length > 0;
  const bootstrapManagerIds = scopeEntries
    .filter((entry) => canAutoBootstrapExtensionSession(entry.adapter, entry.status))
    .map((entry) => entry.adapter.id);
  const bootstrapKey = bootstrapManagerIds.join(",");
  const unlockAdapter = isAllSelected
    ? extensionSessionState === "locked"
      ? allAdapters.find((adapter) => adapter.authenticate && hasRememberedCredentials(adapter.id))
      : undefined
    : showUnlockForm
      ? selectedAdapter
      : undefined;

  useEffect(() => {
    if (bootstrapManagerIds.length === 0) {
      return;
    }

    for (const id of bootstrapManagerIds) {
      rememberCredentials(id, {});
    }
    setUnlockedIds((ids) => [...ids, ...bootstrapManagerIds.filter((id) => !ids.includes(id))]);
    bumpSessionEpoch();
  }, [bootstrapKey]);

  const {
    data: allItems,
    isLoading: isLoadingLocalItems,
    error: localItemsError,
    revalidate: revalidateLocalItems,
  } = useCachedPromise(
    (managerIds: string[]) => collectItems(managerIds, (adapter) => adapter.listItems?.() ?? Promise.resolve([])),
    [localManagerIds],
    {
      execute: hasLocalManagers,
      keepPreviousData: true,
    },
  );

  const {
    data: remoteItems,
    isLoading: isLoadingRemoteItems,
    error: remoteItemsError,
    revalidate: revalidateRemoteItems,
  } = useCachedPromise(
    (managerIds: string[], query: string) => collectItems(managerIds, (adapter) => adapter.searchItems(query)),
    [remoteManagerIds, searchText],
    {
      execute: hasRemoteManagers,
      keepPreviousData: false,
    },
  );

  const scopeKey = [...scopeAdapters.keys()].join(",");
  const items = useMemo(() => {
    const localResults = hasLocalManagers && allItems ? filterVaultItems(allItems, searchText) : undefined;
    const remoteResults = hasRemoteManagers ? remoteItems : undefined;
    const merged =
      localResults && remoteResults
        ? sortVaultItems([...localResults, ...remoteResults])
        : (localResults ?? remoteResults);
    // keepPreviousData retains the last manager's items while the next one loads; never show (or act on) those.
    return merged?.filter((item) => scopeAdapters.has(item.managerId));
  }, [allItems, remoteItems, searchText, hasLocalManagers, hasRemoteManagers, scopeKey]);

  const isLoadingItems = (hasLocalManagers && isLoadingLocalItems) || (hasRemoteManagers && isLoadingRemoteItems);
  const searchError =
    (hasLocalManagers ? localItemsError : undefined) ?? (hasRemoteManagers ? remoteItemsError : undefined);

  async function reloadItems(): Promise<void> {
    markActivity();
    // revalidate() is typed as void but resolves with the error instead of rejecting when loading fails.
    const results: unknown[] = await Promise.all([
      hasLocalManagers ? revalidateLocalItems() : undefined,
      hasRemoteManagers ? revalidateRemoteItems() : undefined,
    ]);
    const failure = results.find((result) => result instanceof Error);
    if (failure) {
      await showFailureToast(failure, { title: "Failed to reload items" });
      return;
    }

    await showToast({ style: Toast.Style.Success, title: "Items reloaded" });
  }

  function applyManagerSelection(managerId: string): void {
    markActivity();
    setSessionManagerId(managerId);
    void saveLastManagerId(managerId);
  }

  async function lockActiveSession(): Promise<void> {
    if (!activeManagerId) {
      return;
    }

    markActivity();
    if (isExtensionSessionEnabled()) {
      lockExtensionSession();
      bumpSessionEpoch();
    }

    try {
      await lockManagers(managerIdsInSelection(activeManagerId));
    } catch (error) {
      await showFailureToast(error, { title: "Failed to lock session" });
    }
  }

  function handleListManagerChange(managerId: string): void {
    dropdownChangeCountRef.current += 1;

    if (dropdownChangeCountRef.current === 1) {
      return;
    }

    applyManagerSelection(managerId);
  }

  // Shared by the loading and the main list so text typed while loading is not lost.
  const searchBarProps = {
    searchText,
    onSearchTextChange: (text: string) => {
      markActivity();
      setSearchText(text);
    },
    searchBarPlaceholder: "Search passwords...",
    throttle: true,
  };

  if (isLoadingVault || isLoadingLastManager || isLoadingAdapters) {
    return <List isLoading {...searchBarProps} />;
  }

  if (!isLoadingAdapters && selectableAdapters.length === 0) {
    const externalDirectory = getExternalAdaptersDirectoryForDisplay();
    const setupMarkdown = [
      "# No password manager available",
      "",
      "Register built-in adapters in `src/adapters/index.ts`, install their CLIs, or add external adapters.",
      "",
      "## Registered adapters",
      "",
      ...(allAdapters.length > 0
        ? allAdapters.map((adapter) => {
            const status = adapterStatuses?.find((entry) => entry.adapter.id === adapter.id)?.status;
            const reason = status && !status.ok ? status.reason : "Unknown";
            const kind = adapter.kind === "external" ? "external" : "built-in";
            return `- **${adapter.name}** (${adapter.id}, ${kind}): ${reason}`;
          })
        : ["- No adapters registered"]),
      "",
      "## External adapters",
      "",
      externalDirectory
        ? `Scanning \`${externalDirectory}\` for subfolders with \`pwm-adapter.json\`.`
        : "Set extension preference **External Adapters Directory** (e.g. `~/.config/vaultcast/adapters`).",
      "",
      "See `examples/external-adapter/protonpass` for a reference implementation.",
      "",
      "## CLI path overrides",
      "",
      'Set extension preference `CLI Path Overrides (JSON)` e.g. `{"1password": "/opt/homebrew/bin/op"}` on macOS or `{"protonpass": "%LOCALAPPDATA%\\\\Programs\\\\pass-cli\\\\pass-cli.exe"}` on Windows',
    ].join("\n");

    return <Detail markdown={setupMarkdown} />;
  }

  const unavailableSelection = unavailableAdapters.find(({ adapter }) => adapter.id === activeManagerId);

  if (unlockAdapter && activeManagerId) {
    return (
      <UnlockForm
        adapter={unlockAdapter}
        adapterStatuses={adapterStatuses ?? []}
        activeManagerId={activeManagerId}
        preferredManagerId={preferredManagerId}
        onManagerChange={applyManagerSelection}
        onUnlocked={() => {
          markActivity();
          setUnlockedIds((ids) => (ids.includes(unlockAdapter.id) ? ids : [...ids, unlockAdapter.id]));
          bumpSessionEpoch();
          void revalidateAdapterStatuses();
        }}
        onActivity={markActivity}
      />
    );
  }

  return (
    <List
      {...searchBarProps}
      isLoading={isLoadingAdapters || isLoadingVault || isLoadingLastManager || isLoadingItems}
      actions={
        selectedAdapter || isAllSelected ? (
          <ActionPanel>
            <Action title="Reload Items" icon={Icon.ArrowClockwise} onAction={reloadItems} />
            <Action title="Lock Session" icon={Icon.Lock} onAction={lockActiveSession} />
          </ActionPanel>
        ) : undefined
      }
      searchBarAccessory={
        preferredManagerId ? (
          <List.Dropdown
            key={`manager-${preferences.defaultManagerId}-${preferredManagerId}`}
            id="pwm-manager"
            tooltip="Password Manager"
            storeValue={false}
            value={activeManagerId}
            onChange={handleListManagerChange}
          >
            <List.Dropdown.Section>
              <List.Dropdown.Item title={ALL_MANAGERS_TITLE} value={ALL_MANAGERS_ID} icon={Icon.AppWindowGrid3x3} />
            </List.Dropdown.Section>
            <List.Dropdown.Section title="Available">
              {availableAdapters.map((adapter) => (
                <List.Dropdown.Item key={adapter.id} title={adapter.name} value={adapter.id} />
              ))}
            </List.Dropdown.Section>
            {lockedAdapters.length > 0 && (
              <List.Dropdown.Section title="Locked">
                {lockedAdapters.map(({ adapter }) => (
                  <List.Dropdown.Item key={adapter.id} title={adapter.name} value={adapter.id} icon={Icon.Lock} />
                ))}
              </List.Dropdown.Section>
            )}
            {unavailableAdapters.length > 0 && (
              <List.Dropdown.Section title="Unavailable">
                {unavailableAdapters.map(({ adapter }) => (
                  <List.Dropdown.Item
                    key={adapter.id}
                    title={adapter.name}
                    value={adapter.id}
                    icon={Icon.ExclamationMark}
                  />
                ))}
              </List.Dropdown.Section>
            )}
          </List.Dropdown>
        ) : undefined
      }
    >
      {searchError && (
        <List.EmptyView icon={Icon.ExclamationMark} title="Search failed" description={searchError.message} />
      )}
      {!searchError && !selectedAdapter && unavailableSelection && (
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="Password manager unavailable"
          description={unavailableSelection.status.ok ? undefined : unavailableSelection.status.reason}
        />
      )}
      {!searchError && isAllSelected && scopeEntries.length === 0 && (
        <List.EmptyView
          icon={Icon.Lock}
          title="No unlocked password managers"
          description="Select a password manager in the dropdown to unlock it"
        />
      )}
      {!searchError && !isLoadingItems && scopeEntries.length > 0 && items?.length === 0 && (
        <List.EmptyView icon={Icon.MagnifyingGlass} title="No items found" description="Try a different search term" />
      )}
      {items?.map((item) => {
        const itemAdapter = scopeAdapters.get(item.managerId);
        return (
          <List.Item
            key={`${item.managerId}:${item.id}`}
            title={item.title}
            subtitle={item.subtitle}
            keywords={[item.username, item.email].filter((value): value is string => Boolean(value))}
            accessories={[
              ...(item.email ? [{ text: item.email, icon: Icon.Envelope }] : []),
              ...(item.username ? [{ text: item.username, icon: Icon.Person }] : []),
              ...(isAllSelected && itemAdapter ? [{ tag: itemAdapter.name }] : []),
            ]}
            icon={Icon.Key}
            actions={
              itemAdapter ? (
                <ItemActions
                  item={item}
                  adapter={itemAdapter}
                  closeAfterCopy={closeAfterCopy}
                  autoCopyTotpAfterPassword={autoCopyTotpAfterPassword}
                  onActivity={markActivity}
                  onLock={() => {
                    void lockActiveSession();
                  }}
                />
              ) : undefined
            }
          />
        );
      })}
    </List>
  );
}
