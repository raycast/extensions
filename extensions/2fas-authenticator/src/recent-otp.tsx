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
type Accessory = List.Item.Accessory;
import { loadVault, isVaultConfigured, type VaultService } from "./lib/vault";
import { generateCodeForService, type TOTPCode } from "./lib/totp";
import {
  getCachedServices,
  removeService,
  togglePin,
  addRecentService,
  sortServices,
  type CachedService,
} from "./lib/cache";
import { withVaultUnlock, reportVaultLoadError } from "./lib/vault-ui";

interface RecentRow {
  entry: CachedService;
  service: VaultService | null;
  totp: TOTPCode | null;
}

function relativeTime(ts: number): string {
  const diff = Date.now() - ts;
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "yesterday";
  if (days < 30) return `${days}d ago`;
  return new Date(ts).toLocaleDateString();
}

export default function RecentOTP() {
  const [rows, setRows] = useState<RecentRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [vaultReady, setVaultReady] = useState(false);
  const servicesRef = useRef<VaultService[]>([]);
  const serviceMapRef = useRef<Map<string, VaultService>>(new Map());
  const entriesRef = useRef<CachedService[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval>>(undefined);

  const setServices = useCallback((services: VaultService[]) => {
    servicesRef.current = services;
    serviceMapRef.current = new Map(services.map((s) => [s.id, s]));
  }, []);

  const buildRows = useCallback(() => {
    const map = serviceMapRef.current;
    const entries = entriesRef.current;
    const next: RecentRow[] = entries.map((entry) => {
      const service = map.get(entry.serviceId) ?? null;
      let totp: TOTPCode | null = null;
      if (service) {
        try {
          totp = generateCodeForService(service);
        } catch {
          totp = null;
        }
      }
      return { entry, service, totp };
    });
    setRows(next);
  }, []);

  const loadEntries = useCallback(async () => {
    const cached = await getCachedServices();
    entriesRef.current = sortServices(cached);
    buildRows();
  }, [buildRows]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const cached = await getCachedServices();
        if (cancelled) return;
        entriesRef.current = sortServices(cached);
        if (isVaultConfigured()) {
          try {
            const services = await withVaultUnlock(() => loadVault());
            if (cancelled) return;
            setServices(services);
            setVaultReady(true);
          } catch (error) {
            if (!cancelled) await reportVaultLoadError(error);
          }
        }
        if (!cancelled) buildRows();
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [buildRows, setServices]);

  useEffect(() => {
    if (!vaultReady) return;
    timerRef.current = setInterval(buildRows, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [vaultReady, buildRows]);

  const handleCopy = useCallback(
    async (row: RecentRow) => {
      let service = row.service;
      if (!service && isVaultConfigured() && servicesRef.current.length === 0) {
        try {
          const services = await withVaultUnlock(() => loadVault());
          setServices(services);
          setVaultReady(true);
          service = serviceMapRef.current.get(row.entry.serviceId) ?? null;
          buildRows();
        } catch (error) {
          await reportVaultLoadError(error);
          return;
        }
      }
      if (!service) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Service not found in vault",
          message: "Re-import or remove from recents",
        });
        return;
      }
      try {
        const fresh = generateCodeForService(service);
        const label = service.issuer || service.name;
        await Clipboard.copy(fresh.code, { concealed: true });
        await addRecentService(service.id, label);
        await closeMainWindow({ clearRootSearch: true });
        await showHUD(`Copied OTP for ${label}`);
      } catch (error) {
        await reportVaultLoadError(error);
      }
    },
    [buildRows, setServices],
  );

  const handleRemove = useCallback(
    async (serviceId: string) => {
      await removeService(serviceId);
      await loadEntries();
      await showToast({ style: Toast.Style.Success, title: "Removed" });
    },
    [loadEntries],
  );

  const handleTogglePin = useCallback(
    async (serviceId: string) => {
      await togglePin(serviceId);
      await loadEntries();
    },
    [loadEntries],
  );

  if (rows.length === 0 && !isLoading) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.Clock}
          title="No recent services"
          description='Use "Search OTP" first to build your recent list'
        />
      </List>
    );
  }

  return (
    <List isLoading={isLoading}>
      {rows.map((row) => {
        const expiring = row.totp ? row.totp.remaining <= 5 : false;
        const codeColor = expiring ? Color.Red : Color.Green;
        const accessories: Accessory[] = [];
        if (row.totp) {
          accessories.push({
            tag: { value: row.totp.code, color: codeColor },
          });
          accessories.push({
            tag: { value: `${row.totp.remaining}s`, color: codeColor },
          });
        } else if (!row.service) {
          accessories.push({
            tag: { value: "missing", color: Color.Orange },
          });
        }
        accessories.push({
          text: relativeTime(row.entry.lastUsed),
          tooltip: "Last used",
        });
        return (
          <List.Item
            key={row.entry.serviceId}
            icon={row.entry.pinned ? Icon.Pin : Icon.Clock}
            title={row.entry.displayName}
            accessories={accessories}
            actions={
              <ActionPanel>
                <Action
                  title="Copy OTP"
                  icon={Icon.Clipboard}
                  onAction={() => handleCopy(row)}
                />
                <Action
                  title={row.entry.pinned ? "Unpin" : "Pin"}
                  icon={row.entry.pinned ? Icon.PinDisabled : Icon.Pin}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
                  onAction={() => handleTogglePin(row.entry.serviceId)}
                />
                <Action
                  title="Remove from Recents"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  shortcut={{ modifiers: ["ctrl"], key: "x" }}
                  onAction={() => handleRemove(row.entry.serviceId)}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
