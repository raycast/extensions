import { Color, List } from "@raycast/api";
import RootErrorBoundary from "~/components/RootErrorBoundary";
import { BitwardenProvider } from "~/context/bitwarden";
import { SessionProvider } from "~/context/session";
import { useVaultContext, VaultProvider } from "~/context/vault";
import { Item } from "~/types/vault";
import { VaultLoadingFallback } from "~/components/searchVault/VaultLoadingFallback";
import { useItemIcon } from "~/components/searchVault/utils/useItemIcon";
import { totp } from "speakeasy";
import { authenticator } from "otplib";
import { useEffect, useState } from "react";

const AuthenticatorComponent = () => (
  <RootErrorBoundary>
    <BitwardenProvider loadingFallback={<VaultLoadingFallback />}>
      <SessionProvider unlock>
        <VaultProvider>
          <AuthenticatorList />
        </VaultProvider>
      </SessionProvider>
    </BitwardenProvider>
  </RootErrorBoundary>
);

function AuthenticatorList() {
  const { items, isLoading, isEmpty } = useVaultContext();

  return (
    <List searchBarPlaceholder="Search items" isLoading={isLoading}>
      {items
        .filter((item) => item.login?.totp)
        .map((item) => (
          <VaultItem key={item.id} item={item} />
        ))}
    </List>
  );
}

function VaultItem({ item }: { item: Item }) {
  const icon = useItemIcon(item);
  const [code, setCode] = useState(() => authenticator.generate(item.login!.totp!));
  const [time, setTime] = useState(() => authenticator.timeRemaining());

  useEffect(() => {
    const interval = setInterval(() => {
      const newTime = authenticator.timeRemaining();
      if (newTime !== time) {
        setTime(newTime);
      }
      if (newTime === 0) {
        setCode(() => authenticator.generate(item.login!.totp!));
      }
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <List.Item
      title={item.name}
      icon={icon}
      accessories={[{ text: code }, { tag: { value: String(time), color: Color.Blue } }]}
    />
  );
}

export default AuthenticatorComponent;
