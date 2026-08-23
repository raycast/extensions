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
  closeMainWindow,
  showHUD,
} from "@raycast/api";
import { loadVault, isVaultConfigured, type VaultService } from "./lib/vault";
import { generateCodeForService, type TOTPCode } from "./lib/totp";
import { addRecentService, togglePin } from "./lib/cache";
import { withVaultUnlock, reportVaultLoadError } from "./lib/vault-ui";

interface ServiceWithCode {
  service: VaultService;
  totp: TOTPCode;
}

interface SkippedService {
  service: VaultService;
  reason: string;
}

export default function SearchOTP() {
  const [items, setItems] = useState<ServiceWithCode[]>([]);
  const [skipped, setSkipped] = useState<SkippedService[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [vaultReady, setVaultReady] = useState(false);
  const servicesRef = useRef<VaultService[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval>>(undefined);

  const refreshCodes = useCallback(() => {
    if (servicesRef.current.length === 0) return;
    const results: ServiceWithCode[] = [];
    const failed: SkippedService[] = [];
    for (const service of servicesRef.current) {
      try {
        results.push({ service, totp: generateCodeForService(service) });
      } catch (error) {
        failed.push({
          service,
          reason: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }
    setItems(results);
    setSkipped(failed);
  }, []);

  useEffect(() => {
    if (!isVaultConfigured()) {
      setIsLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const services = await withVaultUnlock(() => loadVault());
        if (cancelled) return;
        servicesRef.current = services;
        setVaultReady(true);
        refreshCodes();
      } catch (error) {
        if (!cancelled) await reportVaultLoadError(error);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
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
    await closeMainWindow({ clearRootSearch: true });
    await showHUD(`Copied OTP for ${label}`);
  }, []);

  const handleCopyAccount = useCallback(async (item: ServiceWithCode) => {
    if (!item.service.account) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No account on this service",
      });
      return;
    }
    const label = item.service.issuer || item.service.name;
    await Clipboard.copy(item.service.account, { concealed: true });
    await closeMainWindow({ clearRootSearch: true });
    await showHUD(`Copied account for ${label}`);
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
                <Action
                  title="Copy Account"
                  icon={Icon.AtSymbol}
                  shortcut={{ modifiers: ["cmd"], key: "u" }}
                  onAction={() => handleCopyAccount(item)}
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
      {skipped.length > 0 && (
        <List.Section title={`Skipped (${skipped.length})`}>
          {skipped.map((entry) => (
            <List.Item
              key={`skipped-${entry.service.id}`}
              icon={{ source: Icon.ExclamationMark, tintColor: Color.Orange }}
              title={entry.service.issuer || entry.service.name}
              subtitle={entry.service.account}
              accessories={[{ text: entry.reason }]}
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}
