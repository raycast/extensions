import { Action, ActionPanel, Clipboard, Color, Icon, List, showToast, Toast } from "@raycast/api";
import RootErrorBoundary from "~/components/RootErrorBoundary";
import { BitwardenProvider } from "~/context/bitwarden";
import { SessionProvider } from "~/context/session";
import { useVaultContext, VaultProvider } from "~/context/vault";
import { Item } from "~/types/vault";
import { useItemIcon } from "~/components/searchVault/utils/useItemIcon";
import { authenticator } from "otplib";
import { useEffect, useState } from "react";
import VaultListenersProvider from "~/components/searchVault/context/vaultListeners";
import { SENSITIVE_VALUE_PLACEHOLDER } from "~/constants/general";
import VaultItemContext, { useSelectedVaultItem } from "~/components/searchVault/context/vaultItem";
import useGetUpdatedVaultItem from "~/components/searchVault/utils/useGetUpdatedVaultItem";
import { getTransientCopyPreference } from "~/utils/preferences";
import { showCopySuccessMessage } from "~/utils/clipboard";
import { captureException } from "~/utils/development";

const AuthenticatorComponent = () => (
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
  const { items, isLoading } = useVaultContext();

  const totpItems = items.filter((item) => item.login?.totp);

  return (
    <List searchBarPlaceholder="Search items" isLoading={isLoading}>
      {totpItems.map((item) => (
        <VaultItem key={item.id} item={item} />
      ))}
    </List>
  );
}

const useAuthenticatorInterval = () => {
  const [time, setTime] = useState(authenticator.timeRemaining());

  useEffect(() => {
    const interval = setInterval(() => {
      const time = authenticator.timeRemaining();
      setTime(time);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return time;
};

const useAuthenticator = (item: Item) => {
  const [code, setCode] = useState<string>();
  const time = useAuthenticatorInterval();

  useEffect(() => {
    const { totp } = item.login ?? {};
    if (!totp || totp === SENSITIVE_VALUE_PLACEHOLDER) return undefined;
    setCode(authenticator.generate(totp));
  }, [item]);

  useEffect(() => {
    const { totp } = item.login ?? {};
    if (!totp || totp === SENSITIVE_VALUE_PLACEHOLDER) return undefined;
    if (time === 30) setCode(authenticator.generate(totp));
  }, [time]);

  return { code, time };
};

const CopyCodeAction = () => {
  const selectedItem = useSelectedVaultItem();
  const getUpdatedVaultItem = useGetUpdatedVaultItem();

  const handleCopyCode = async () => {
    try {
      const totp = await getUpdatedVaultItem(selectedItem, (item) => item.login?.totp, "Getting code...");
      if (totp) {
        const code = authenticator.generate(totp);
        await Clipboard.copy(code, { transient: getTransientCopyPreference("other") });
        await showCopySuccessMessage("Copied code to clipboard");
      }
    } catch (error) {
      await showToast(Toast.Style.Failure, "Failed to get code");
      captureException("Failed to copy code", error);
    }
  };

  return <Action title="Copy Code" icon={Icon.Clipboard} onAction={handleCopyCode} />;
};

function VaultItem({ item }: { item: Item }) {
  const icon = useItemIcon(item);
  const { code, time } = useAuthenticator(item);

  return (
    <VaultItemContext.Provider value={item}>
      <List.Item
        title={item.name}
        icon={icon}
        actions={
          <ActionPanel>
            <CopyCodeAction />
          </ActionPanel>
        }
        accessories={[
          { text: item.login?.totp === SENSITIVE_VALUE_PLACEHOLDER ? "Loading..." : code },
          { tag: { value: String(time), color: time < 5 ? Color.Red : Color.Blue } },
        ]}
      />
    </VaultItemContext.Provider>
  );
}

export default AuthenticatorComponent;
