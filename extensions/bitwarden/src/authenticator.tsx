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
import { ActionWithReprompt } from "~/components/actions";
import { tryCatch } from "~/utils/errors";

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
  const { data: activeTab, isLoading: isActiveTabLoading } = usePromise(async () => {
    const tabs = await BrowserExtension.getTabs();
    const activeTab = tabs.find((tab) => tab.active);
    return activeTab ? { ...activeTab, url: new URL(activeTab.url) } : undefined;
  });

  const interval = useInterval(1000);

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

  const otherItemList = itemsWithTabMatches.items.map((item) => (
    <VaultItem key={item.id} item={item} interval={interval} />
  ));

  return (
    <List searchBarPlaceholder="Search vault" isLoading={isLoading || isActiveTabLoading}>
      {activeTab && itemsWithTabMatches.tabItems.length > 0 ? (
        <>
          <List.Section title={`Active Tab (${activeTab.url.hostname})`}>
            {itemsWithTabMatches.tabItems.map((item) => (
              <VaultItem key={item.id} item={item} interval={interval} />
            ))}
          </List.Section>
          <List.Section title="Others">{otherItemList}</List.Section>
        </>
      ) : (
        <>{otherItemList}</>
      )}
    </List>
  );
}

function VaultItem({ item, interval }: { item: Item; interval: number }) {
  const icon = useItemIcon(item);
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

function useInterval(ms: number) {
  const [time, setTime] = useState(authenticator.timeRemaining());

  useEffect(() => {
    const interval = setInterval(() => {
      const time = authenticator.timeRemaining();
      setTime(time);
    }, ms);

    return () => clearInterval(interval);
  }, [ms]);

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
