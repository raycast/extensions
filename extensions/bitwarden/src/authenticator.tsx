import { ActionPanel, BrowserExtension, Clipboard, Color, Icon, List, showToast, Toast } from "@raycast/api";
import RootErrorBoundary from "~/components/RootErrorBoundary";
import { BitwardenProvider } from "~/context/bitwarden";
import { SessionProvider } from "~/context/session";
import { useVaultContext, VaultProvider } from "~/context/vault";
import { Item } from "~/types/vault";
import { useItemIcon } from "~/components/searchVault/utils/useItemIcon";
import { authenticator } from "otplib";
import { useEffect, useMemo, useState } from "react";
import VaultListenersProvider from "~/components/searchVault/context/vaultListeners";
import { SENSITIVE_VALUE_PLACEHOLDER } from "~/constants/general";
import VaultItemContext, { useSelectedVaultItem } from "~/components/searchVault/context/vaultItem";
import useGetUpdatedVaultItem from "~/components/searchVault/utils/useGetUpdatedVaultItem";
import { getTransientCopyPreference } from "~/utils/preferences";
import { showCopySuccessMessage } from "~/utils/clipboard";
import { captureException } from "~/utils/development";
import { usePromise } from "@raycast/utils";
import useFrontmostApplicationName from "~/utils/hooks/useFrontmostApplicationName";
import { ActionWithReprompt, DebuggingBugReportingActionSection, VaultActionsSection } from "~/components/actions";
import { tryCatch } from "~/utils/errors";
import { Cache } from "~/utils/cache";

const AuthenticatorComponent = () => (
  <RootErrorBoundary>
    <BitwardenProvider loadingFallback={<List searchBarPlaceholder="Search vault" isLoading />}>
      <SessionProvider unlock>
        <VaultListenersProvider>
          <VaultProvider>
            <AuthenticatorList />
          </VaultProvider>
        </VaultListenersProvider>
      </SessionProvider>
    </BitwardenProvider>
  </RootErrorBoundary>
);

function AuthenticatorList() {
  const { items: vaultItems, isLoading } = useVaultContext();
  const { data: activeTab, isLoading: isActiveTabLoading } = useActiveTabUrl();

  useSyncTimeRemaining();

  const items = useMemo(() => vaultItems.filter((item) => item.login?.totp), [vaultItems]);

  const itemsWithTabMatches = useMemo(() => {
    if (!activeTab) return { items: items, tabItems: [] };

    return items.reduce<{ items: Item[]; tabItems: Item[] }>(
      (acc, item) => {
        const mayHaveUrl = item.login?.uris?.some(({ uri }) => uri?.includes(activeTab.url.hostname));
        if (mayHaveUrl) {
          acc.tabItems.push(item);
        } else {
          acc.items.push(item);
        }
        return acc;
      },
      { items: [], tabItems: [] }
    );
  }, [items, activeTab]);

  const otherItemsList = itemsWithTabMatches.items.map((item) => <VaultItem key={item.id} item={item} />);

  const isEmpty = itemsWithTabMatches.tabItems.length === 0 && otherItemsList.length === 0;

  return (
    <List
      searchBarPlaceholder="Search vault"
      isLoading={isLoading || isActiveTabLoading}
      actions={
        <ActionPanel>
          <CommonActions />
        </ActionPanel>
      }
    >
      {activeTab && itemsWithTabMatches.tabItems.length > 0 ? (
        <>
          <List.Section title={`Active Tab (${activeTab.url.hostname})`}>
            {itemsWithTabMatches.tabItems.map((item) => (
              <VaultItem key={item.id} item={item} />
            ))}
          </List.Section>
          <List.Section title="Others">{otherItemsList}</List.Section>
        </>
      ) : (
        otherItemsList
      )}
      <List.EmptyView
        icon={{ source: "bitwarden-64.png" }}
        title={isEmpty ? "No authenticator keys found" : "No matching items found"}
        description="Hit the sync button to sync your vault"
      />
    </List>
  );
}

function VaultItem({ item }: { item: Item }) {
  const icon = useItemIcon(item);
  const interval = useTimeRemaining();
  const code = useAuthenticatorCode(item, interval);

  return (
    <VaultItemContext.Provider value={item}>
      <List.Item
        title={item.name}
        subtitle={item.login?.username ?? undefined}
        icon={icon}
        actions={
          <ActionPanel>
            <CopyCodeAction />
            <PasteCodeAction />
            <CommonActions />
          </ActionPanel>
        }
        accessories={[
          { text: item.login?.totp === SENSITIVE_VALUE_PLACEHOLDER ? "Loading..." : code },
          { tag: { value: String(interval), color: interval < 5 ? Color.Red : Color.Blue } },
        ]}
      />
    </VaultItemContext.Provider>
  );
}

function CommonActions() {
  return (
    <>
      <VaultActionsSection />
      <DebuggingBugReportingActionSection />
    </>
  );
}

function CopyCodeAction() {
  const selectedItem = useSelectedVaultItem();
  const getUpdatedVaultItem = useGetUpdatedVaultItem();

  const copy = async () => {
    const { data: totp, error } = await tryCatch(
      getUpdatedVaultItem(selectedItem, (item) => item.login?.totp, "Getting code...")
    );
    if (error) {
      await showToast(Toast.Style.Failure, "Failed to get code");
      captureException("Failed to copy code", error);
    }
    if (totp) {
      const code = authenticator.generate(totp);
      await Clipboard.copy(code, { transient: getTransientCopyPreference("other") });
      await showCopySuccessMessage("Copied code to clipboard");
    }
  };

  return <ActionWithReprompt title="Copy Code" icon={Icon.Clipboard} onAction={copy} />;
}

function PasteCodeAction() {
  const selectedItem = useSelectedVaultItem();
  const getUpdatedVaultItem = useGetUpdatedVaultItem();
  const frontmostAppName = useFrontmostApplicationName();

  const paste = async () => {
    const { data: totp, error } = await tryCatch(
      getUpdatedVaultItem(selectedItem, (item) => item.login?.totp, "Getting code...")
    );
    if (error) {
      await showToast(Toast.Style.Failure, "Failed to get code");
      captureException("Failed to paste code", error);
    }
    if (totp) {
      const code = authenticator.generate(totp);
      await Clipboard.paste(code);
    }
  };

  return (
    <ActionWithReprompt
      title={frontmostAppName ? `Paste Code into ${frontmostAppName}` : "Paste Code"}
      icon={Icon.Window}
      onAction={paste}
    />
  );
}

function useActiveTabUrl() {
  return usePromise(async () => {
    const tabs = await BrowserExtension.getTabs();
    const activeTab = tabs.find((tab) => tab.active);
    return activeTab ? { ...activeTab, url: new URL(activeTab.url) } : undefined;
  });
}

const TimeRemainingCacheKey = "authenticatorTimeRemaining";

function useSyncTimeRemaining() {
  useEffect(() => {
    Cache.set(TimeRemainingCacheKey, String(authenticator.timeRemaining()));

    const interval = setInterval(() => {
      const time = authenticator.timeRemaining();
      Cache.set(TimeRemainingCacheKey, String(time));
    }, 500); // update every 500ms for better accuracy

    return () => clearInterval(interval);
  }, []);
}

function useTimeRemaining() {
  const [time, setTime] = useState(() => {
    const value = Cache.get(TimeRemainingCacheKey);
    return value ? Number.parseInt(value) : 30;
  });

  useEffect(() => {
    Cache.subscribe((key, value) => {
      if (!value || key !== TimeRemainingCacheKey) return;
      const newTime = Number.parseInt(value);
      if (newTime) setTime(newTime);
    });
  }, []);

  return time;
}

function useAuthenticatorCode(item: Item, interval: number) {
  const [code, setCode] = useState<string>();

  useEffect(() => {
    const { totp } = item.login ?? {};
    if (!totp || totp === SENSITIVE_VALUE_PLACEHOLDER) return;
    setCode(authenticator.generate(totp));
  }, [item]);

  useEffect(() => {
    const { totp } = item.login ?? {};
    if (!totp || totp === SENSITIVE_VALUE_PLACEHOLDER) return;
    if (interval === 30) setCode(authenticator.generate(totp));
  }, [interval]);

  return code;
}

export default AuthenticatorComponent;
