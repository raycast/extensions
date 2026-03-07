import { useState, useEffect, useRef, useCallback } from "react";
import {
  List,
  ActionPanel,
  Action,
  Icon,
  Color,
  showToast,
  Toast,
  Clipboard,
} from "@raycast/api";
import { loadVault, isVaultConfigured, type VaultService } from "./lib/vault";
import { generateCodeForService, type TOTPCode } from "./lib/totp";
import { addRecentService, togglePin } from "./lib/cache";
import { KeychainAuthCancelled } from "./lib/keychain";

interface ServiceWithCode {
  service: VaultService;
  totp: TOTPCode;
}

export default function SearchOTP() {
  const [items, setItems] = useState<ServiceWithCode[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [vaultReady, setVaultReady] = useState(false);
  const servicesRef = useRef<VaultService[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval>>(undefined);

  const refreshCodes = useCallback(() => {
    if (servicesRef.current.length === 0) return;
    const results: ServiceWithCode[] = [];
    for (const service of servicesRef.current) {
      try {
        results.push({ service, totp: generateCodeForService(service) });
      } catch {
        // Skip services with invalid secrets
      }
    }
    setItems(results);
  }, []);

  useEffect(() => {
    if (!isVaultConfigured()) {
      setIsLoading(false);
      return;
    }
    try {
      const services = loadVault();
      servicesRef.current = services;
      setVaultReady(true);
      refreshCodes();
    } catch (error) {
      if (error instanceof KeychainAuthCancelled) {
        showToast({
          style: Toast.Style.Failure,
          title: "Authentication cancelled",
        });
      } else {
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to load vault",
        });
      }
    } finally {
      setIsLoading(false);
    }
  }, [refreshCodes]);

  useEffect(() => {
    if (!vaultReady) return;
    timerRef.current = setInterval(refreshCodes, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [vaultReady, refreshCodes]);

  const handleCopy = useCallback(async (item: ServiceWithCode) => {
    const fresh = generateCodeForService(item.service);
    await Clipboard.copy(fresh.code, { concealed: true });
    const label = item.service.issuer || item.service.name;
    await addRecentService(item.service.id, label);
    await showToast({
      style: Toast.Style.Success,
      title: `Copied: ${fresh.code}`,
    });
  }, []);

  const handleTogglePin = useCallback(async (item: ServiceWithCode) => {
    await togglePin(item.service.id);
    await showToast({ style: Toast.Style.Success, title: "Pin toggled" });
  }, []);

  if (!isLoading && !vaultReady) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.Lock}
          title="No vault configured"
          description="Use the Import Vault command to import your 2FAS export"
        />
      </List>
    );
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search services..."
      filtering={true}
    >
      {items.map((item) => {
        const label = item.service.issuer || item.service.name;
        const subtitle = item.service.account;
        const expiring = item.totp.remaining <= 5;
        const codeColor = expiring ? Color.Red : Color.Green;
        return (
          <List.Item
            key={item.service.id}
            icon={Icon.Key}
            title={label}
            subtitle={subtitle}
            keywords={[
              item.service.name,
              item.service.issuer,
              item.service.account,
            ]}
            accessories={[
              { tag: { value: item.totp.code, color: codeColor } },
              {
                tag: {
                  value: `${item.totp.remaining}s`,
                  color: codeColor,
                },
              },
            ]}
            actions={
              <ActionPanel>
                <Action
                  title="Copy OTP Code"
                  icon={Icon.Clipboard}
                  onAction={() => handleCopy(item)}
                />
                <Action.CopyToClipboard
                  title="Copy Account"
                  content={item.service.account}
                  shortcut={{ modifiers: ["cmd"], key: "u" }}
                />
                <Action
                  title="Toggle Pin"
                  icon={Icon.Pin}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
                  onAction={() => handleTogglePin(item)}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
