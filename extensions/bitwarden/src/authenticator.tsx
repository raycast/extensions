import * as OTPAuth from "otpauth";

import { ActionPanel, BrowserExtension, Clipboard, Color, Icon, List, showToast, Toast } from "@raycast/api";
import RootErrorBoundary from "~/components/RootErrorBoundary";
import { BitwardenProvider } from "~/context/bitwarden";
import { SessionProvider } from "~/context/session";
import { useVaultContext, VaultProvider } from "~/context/vault";
import { Item } from "~/types/vault";
import { useItemIcon } from "~/components/searchVault/utils/useItemIcon";
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
import { ErrN, OkN, ResultN, tryCatch } from "~/utils/errors";

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
  const vault = useVaultContext();
  const { data: activeTabUrl, isLoading: isActiveTabLoading } = useActiveTab();

  const items = useMemo(() => vault.items.filter((item) => item.login?.totp), [vault.items]);

  const itemsWithTabMatches = useMemo(() => {
    if (!activeTabUrl) return { items, tabItems: [] };

    return items.reduce<{ items: Item[]; tabItems: Item[] }>(
      (acc, item) => {
        const matchesUrl = item.login?.uris?.some(({ uri }) => uri?.includes(activeTabUrl.url.hostname));
        if (matchesUrl) {
          acc.tabItems.push(item);
        } else {
          acc.items.push(item);
        }
        return acc;
      },
      { items: [], tabItems: [] }
    );
  }, [items, activeTabUrl]);

  const isEmpty = itemsWithTabMatches.items.length === 0 && itemsWithTabMatches.tabItems.length === 0;

  const otherItemsList = itemsWithTabMatches.items.map((item) => <VaultItem key={item.id} item={item} />);

  return (
    <List
      searchBarPlaceholder="Search vault"
      isLoading={vault.isLoading || isActiveTabLoading}
      actions={
        <ActionPanel>
          <CommonActions />
        </ActionPanel>
      }
    >
      {activeTabUrl && itemsWithTabMatches.tabItems.length > 0 ? (
        <>
          <List.Section title={`Active Tab (${activeTabUrl.url.hostname})`}>
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
  const { code, timeRemaining, error, isLoading } = authenticator.useCode(item);

  function getAccessories(): List.Item.Props["accessories"] {
    if (isLoading) return [{ text: "Loading..." }];
    if (error) return [{ text: { value: error.message, color: Color.Red } }];
    if (code && timeRemaining) {
      return [
        { text: code },
        { tag: { value: String(timeRemaining), color: timeRemaining <= 7 ? Color.Red : Color.Blue } },
      ];
    }
    return [{ text: "Loading..." }];
  }

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
        accessories={getAccessories()}
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
      const { generator, error } = authenticator.getGenerator(totp);
      if (error) {
        await showToast(Toast.Style.Failure, "Failed to get code");
        captureException("Failed to copy code", error);
      }
      if (generator) {
        const code = generator.generate();
        await Clipboard.copy(code, { transient: getTransientCopyPreference("other") });
        await showCopySuccessMessage("Copied code to clipboard");
      }
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
      const { generator, error } = authenticator.getGenerator(totp);
      if (error) {
        await showToast(Toast.Style.Failure, "Failed to get code");
        captureException("Failed to paste code", error);
      }
      if (generator) {
        const code = generator.generate();
        await Clipboard.paste(code);
      }
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

function useActiveTab() {
  return usePromise(async () => {
    const { data: tabs, error } = await tryCatch(BrowserExtension.getTabs());
    if (error) return undefined;
    const activeTab = tabs.find((tab) => tab.active);
    return activeTab ? { ...activeTab, url: new URL(activeTab.url) } : undefined;
  });
}

const Algorithms = {
  SHA1: "SHA1",
  SHA224: "SHA224",
  SHA256: "SHA256",
  SHA384: "SHA384",
  SHA512: "SHA512",
  SHA3_224: "SHA3-224",
  SHA3_256: "SHA3-256",
  SHA3_384: "SHA3-384",
  SHA3_512: "SHA3-512",
} as const;

type Algorithm = (typeof Algorithms)[keyof typeof Algorithms];

type AuthenticatorOptions = {
  secret: string;
  period: number;
  algorithm: Algorithm;
  digits: number;
};

const authenticator = {
  parseTotp(totpString: string): AuthenticatorOptions {
    if (totpString.includes("otpauth")) {
      const { data: parsed, error } = tryCatch(() => OTPAuth.URI.parse(totpString));
      if (error || !(parsed instanceof OTPAuth.TOTP)) throw new Error("Invalid key");

      const algorithm = Algorithms[parsed.algorithm as keyof typeof Algorithms];
      if (!algorithm) throw new Error("Invalid algorithm");

      return {
        algorithm,
        secret: parsed.secret.base32.toString(),
        period: parsed.period,
        digits: parsed.digits,
      };
    }

    return { secret: totpString, period: 30, algorithm: "SHA1", digits: 6 };
  },
  getGenerator(totpString: string): ResultN<"generator", OTPAuth.TOTP> {
    const { data: options, error } = tryCatch(() => authenticator.parseTotp(totpString));
    if (error) return ErrN("generator", error);
    return OkN("generator", new OTPAuth.TOTP(options));
  },
  useCode(item: Item) {
    const { generator, error, isLoading } = useMemo(() => {
      const { totp } = item.login ?? {};
      if (totp === SENSITIVE_VALUE_PLACEHOLDER) {
        return { generator: null, error: new Error("Loading..."), isLoading: true };
      }
      if (!totp) {
        return { generator: null, error: new Error("No TOTP found"), isLoading: false };
      }
      return { ...authenticator.getGenerator(totp), isLoading: false };
    }, [item]);

    const [code, setCode] = useState(() => {
      if (error) return null;
      return generator.generate();
    });

    const [timeRemaining, setTimeRemaining] = useState(() => {
      if (error) return null;
      return Math.ceil(generator.remaining() / 1000);
    });

    useEffect(() => {
      if (error) return;

      const setTimeAndCode = () => {
        const timeRemaining = Math.ceil(generator.remaining() / 1000);
        setTimeRemaining(timeRemaining);

        if (timeRemaining === generator.period) {
          setCode(generator.generate());
        }
      };

      let interval: NodeJS.Timeout;
      // set an initial timeout to ensure the first evaluation is time accurate
      // and then keep evaluating every second
      setTimeout(() => {
        setTimeAndCode();
        interval = setInterval(setTimeAndCode, 1000);
      }, generator.remaining() % 1000);

      setCode(generator.generate()); // first generation before the interval starts

      return () => interval && clearInterval(interval);
    }, [item, generator]);

    return { code, timeRemaining, error, isLoading };
  },
};

export default AuthenticatorComponent;
