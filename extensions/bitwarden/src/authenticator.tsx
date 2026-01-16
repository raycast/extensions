import * as OTPAuth from "otpauth";
import { useEffect, useMemo, useState } from "react";
import {
  Action,
  ActionPanel,
  BrowserExtension,
  Clipboard,
  Color,
  environment,
  getPreferenceValues,
  Icon,
  List,
  showToast,
  Toast,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";

import RootErrorBoundary from "~/components/RootErrorBoundary";
import { BitwardenProvider } from "~/context/bitwarden";
import { SessionProvider } from "~/context/session";
import { useVaultContext, VaultProvider } from "~/context/vault";
import { Item } from "~/types/vault";
import { useItemIcon } from "~/components/searchVault/utils/useItemIcon";
import VaultListenersProvider from "~/components/searchVault/context/vaultListeners";
import { SENSITIVE_VALUE_PLACEHOLDER } from "~/constants/general";
import VaultItemContext, { useSelectedVaultItem } from "~/components/searchVault/context/vaultItem";
import useGetUpdatedVaultItem from "~/components/searchVault/utils/useGetUpdatedVaultItem";
import { getTransientCopyPreference } from "~/utils/preferences";
import { showCopySuccessMessage } from "~/utils/clipboard";
import { captureException } from "~/utils/development";
import useFrontmostApplicationName from "~/utils/hooks/useFrontmostApplicationName";
import { ActionWithReprompt, DebuggingBugReportingActionSection, VaultActionsSection } from "~/components/actions";
import { Err, Ok, Result, tryCatch } from "~/utils/errors";
import { useVaultSearch } from "~/utils/search";
import ListFolderDropdown from "~/components/ListFolderDropdown";
import ComponentReverser from "~/components/ComponentReverser";
import { useStateEffect } from "~/utils/hooks/useStateEffect";

const AuthenticatorCommand = () => (
  <RootErrorBoundary>
    <BitwardenProvider loadingFallback={<List searchBarPlaceholder="Search items" isLoading />}>
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

  const vaultItems = vault.items.filter((item) => item.login?.totp);
  const { setSearchText, filteredItems } = useVaultSearch(vaultItems);

  const itemMatches = useMemo(() => {
    if (!activeTabUrl) return { items: filteredItems, tabItems: [] };

    return filteredItems.reduce<{ items: Item[]; tabItems: Item[] }>(
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
  }, [filteredItems, activeTabUrl]);

  const isEmpty = itemMatches.items.length === 0 && itemMatches.tabItems.length === 0;

  const otherItemsList = itemMatches.items.map((item) => <ListItem key={item.id} item={item} />);

  return (
    <List
      filtering={false}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search items"
      isLoading={vault.isLoading || isActiveTabLoading}
      searchBarAccessory={<ListFolderDropdown />}
      actions={
        <ActionPanel>
          <CommonActions />
        </ActionPanel>
      }
    >
      {activeTabUrl && itemMatches.tabItems.length > 0 ? (
        <>
          <List.Section title={`Active Tab (${activeTabUrl.url.hostname})`}>
            {itemMatches.tabItems.map((item) => (
              <ListItem key={item.id} item={item} />
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

function ListItem({ item }: { item: Item }) {
  const icon = useItemIcon(item);
  const preferences = getPreferenceValues<Preferences.Authenticator>();

  const [canGenerate, setCanGenerate] = useState(!item.reprompt);
  const { code, time, error, isLoading } = authenticator.useCode(item, canGenerate);

  function getAccessories(): List.Item.Props["accessories"] {
    if (!canGenerate) {
      return [
        {
          text: { value: "Needs confirmation", color: Color.Yellow },
          tooltip: "Needs master password confirmation",
        },
      ];
    }
    if (!isLoading) {
      if (error) {
        return [{ text: { value: error.message, color: Color.Red } }];
      }
      if (code && time) {
        return [
          { text: code },
          {
            tag: { value: String(time), color: time <= 7 ? Color.Red : Color.Blue },
            tooltip: `${time} seconds remaining`,
          },
        ];
      }
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
            {canGenerate ? (
              <ComponentReverser reverse={preferences.primaryAction === "paste"}>
                <CopyCodeAction />
                <PasteCodeAction />
              </ComponentReverser>
            ) : (
              <ConfirmAction onConfirm={() => setCanGenerate(true)} />
            )}
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

function ConfirmAction({ onConfirm }: { onConfirm: () => void }) {
  const selectedItem = useSelectedVaultItem();

  return (
    <ActionWithReprompt
      title="Confirm Password"
      onAction={onConfirm}
      icon={Icon.Lock}
      repromptDescription={`Generating an authentication code for <${selectedItem.name}>`}
    />
  );
}

function CopyCodeAction() {
  const getCode = useGetCodeForAction("copy");

  const copy = async () => {
    const code = await getCode();
    if (code) {
      await Clipboard.copy(code, { transient: getTransientCopyPreference("other") });
      await showCopySuccessMessage("Copied code to clipboard");
    }
  };

  return <Action title="Copy Code" onAction={copy} icon={Icon.Clipboard} />;
}

function PasteCodeAction() {
  const frontmostAppName = useFrontmostApplicationName();
  const getCode = useGetCodeForAction("paste");

  const paste = async () => {
    const code = await getCode();
    if (code) {
      await Clipboard.paste(code);
    }
  };

  return (
    <Action
      title={frontmostAppName ? `Paste Code into ${frontmostAppName}` : "Paste Code"}
      onAction={paste}
      icon={Icon.Window}
    />
  );
}

function useGetCodeForAction(action: "copy" | "paste") {
  const selectedItem = useSelectedVaultItem();
  const getVaultItem = useGetUpdatedVaultItem();

  return async () => {
    try {
      const totp = await getVaultItem(selectedItem, (item) => item.login?.totp, "Getting code...");
      if (!totp) throw new Error("Failed to get totp");

      const [generator, error] = authenticator.getGenerator(totp);
      if (error) throw error;

      return generator.generate();
    } catch (error) {
      await showToast(Toast.Style.Failure, "Failed to get code");
      captureException(`Failed to ${action} code`, error);
      return undefined;
    }
  };
}

function useActiveTab() {
  return usePromise(async () => {
    if (!environment.canAccess(BrowserExtension)) return undefined;

    const [tabs, error] = await tryCatch(BrowserExtension.getTabs());
    if (error) return undefined;

    const activeTab = tabs.find((tab) => tab.active);
    return activeTab ? { ...activeTab, url: new URL(activeTab.url) } : undefined;
  });
}

type AuthenticatorOptions = {
  secret: string;
  period: number;
  algorithm: string;
  digits: number;
};

const authenticator = {
  parseTotp(totpString: string): AuthenticatorOptions {
    if (totpString.includes("otpauth")) {
      const [totp, parseError] = tryCatch(() => OTPAuth.URI.parse(totpString));
      if (parseError) throw parseError;
      if (!(totp instanceof OTPAuth.TOTP)) throw new Error("Invalid authenticator key");

      return {
        algorithm: totp.algorithm,
        secret: totp.secret.base32.toString(),
        period: totp.period,
        digits: totp.digits,
      };
    }

    return { secret: totpString, period: 30, algorithm: "SHA1", digits: 6 };
  },
  getGenerator(totpString: string): Result<OTPAuth.TOTP> {
    const [options, parseError] = tryCatch(() => authenticator.parseTotp(totpString));
    if (parseError) {
      captureException("Failed to parse key", parseError);
      return Err(new Error("Failed to parse authenticator key"));
    }
    const [generator, initError] = tryCatch(() => new OTPAuth.TOTP(options));
    if (initError) {
      captureException("Failed to initialize authenticator", initError);
      return Err(new Error("Failed to initialize authenticator"));
    }

    return Ok(generator);
  },
  useCode(item: Item, canGenerate = true) {
    const [[generator, error, isLoading = false], setState] = useStateEffect(() => {
      const { totp } = item.login ?? {};
      if (!canGenerate) return Loading(new Error("Needs confirmation..."));
      if (totp === SENSITIVE_VALUE_PLACEHOLDER) return Loading(new Error("Loading..."));
      if (!totp) return Err(new Error("No TOTP found"));

      return authenticator.getGenerator(totp);
    }, [item, canGenerate]);

    const [code, setCode] = useState<string | null>(null);
    const [time, setTime] = useState<number | null>(null);

    useEffect(() => {
      if (error) return;

      let interval: NodeJS.Timeout | undefined;
      let timeout: NodeJS.Timeout | undefined;

      const cleanup = () => {
        clearTimeout(timeout);
        clearInterval(interval);
      };

      const setTimeAndCode = () => {
        try {
          const timeRemaining = Math.ceil(generator.remaining() / 1000);
          setTime(timeRemaining);

          if (timeRemaining === generator.period) {
            setCode(generator.generate());
          }
        } catch (error) {
          setState(Err(new Error("Failed to regenerate")));
          cleanup();
          captureException("Failed to regenerate", error);
        }
      };

      try {
        // set an initial timeout to ensure the first evaluation is time accurate
        // and then keep evaluating every second
        timeout = setTimeout(() => {
          setTimeAndCode();
          interval = setInterval(setTimeAndCode, 1000);
        }, generator.remaining() % 1000);

        setCode(generator.generate()); // first generation before the interval starts
      } catch (error) {
        setState(Err(new Error("Failed to generate")));
        cleanup();
        captureException("Failed to generate", error);
      }

      return cleanup;
    }, [item, generator]);

    return { code, time, error, isLoading };
  },
};

function Loading(error: Error) {
  return [null, error, true] as const;
}

export default AuthenticatorCommand;
