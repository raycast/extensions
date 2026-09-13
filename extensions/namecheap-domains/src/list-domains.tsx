import {
  Action,
  ActionPanel,
  Color,
  Icon,
  Keyboard,
  List,
  Toast,
  openExtensionPreferences,
  showToast,
} from "@raycast/api";
import { errorMessage } from "./errors";
import { useMemo, useState } from "react";
import { useDomains } from "./hooks";
import { isSandbox } from "./preferences";
import { advancedDnsUrl, domainListUrl, managementUrl, websiteUrl, whoisUrl } from "./namecheap/urls";
import { isWhitelistError } from "./domain/failure";
import { SetupActions, SetupEmptyView, useWhitelistIp } from "./setup";
import { clearStoredData } from "./storage";
import type { Domain, DomainListType } from "./namecheap/types";

const LIST_TYPES: { value: DomainListType; title: string; icon: Icon }[] = [
  { value: "ALL", title: "All Domains", icon: Icon.Globe },
  { value: "EXPIRING", title: "Expiring", icon: Icon.Clock },
  { value: "EXPIRED", title: "Expired", icon: Icon.XMarkCircle },
];

const DAY_MS = 86_400_000;
const EXPIRY_WARNING_DAYS = 30;

function daysUntil(isoDate: string | null): number | undefined {
  if (!isoDate) return undefined;
  const time = Date.parse(`${isoDate}T12:00:00Z`);
  return Number.isNaN(time) ? undefined : Math.round((time - Date.now()) / DAY_MS);
}

const toDate = (isoDate: string | null): Date | undefined => {
  if (!isoDate) return undefined;
  const date = new Date(`${isoDate}T12:00:00Z`);
  return Number.isNaN(date.getTime()) ? undefined : date;
};

const formatDate = (isoDate: string | null): string => {
  const date = toDate(isoDate);
  return date ? date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }) : "Unknown";
};

function expiryColor(domain: Domain): Color | undefined {
  const days = daysUntil(domain.expires);
  if (domain.isExpired || (days !== undefined && days < 0)) return Color.Red;
  if (days !== undefined && days <= EXPIRY_WARNING_DAYS) return Color.Orange;
  return undefined;
}

function accessoriesFor(domain: Domain): List.Item.Accessory[] {
  const accessories: List.Item.Accessory[] = [];
  if (domain.isPremium) {
    accessories.push({ tag: { value: "Premium", color: Color.Purple }, tooltip: "Premium domain" });
  }
  if (domain.whoisGuard === "ENABLED") {
    accessories.push({ icon: Icon.EyeDisabled, tooltip: "Domain privacy is on" });
  }
  if (domain.isLocked) {
    accessories.push({ icon: Icon.Lock, tooltip: "Registrar lock is on" });
  }
  if (domain.autoRenew) {
    accessories.push({ icon: Icon.ArrowClockwise, tooltip: "Auto-renew is on" });
  }
  const expires = toDate(domain.expires);
  if (expires) {
    accessories.push({
      date: { value: expires, color: expiryColor(domain) },
      tooltip: `${domain.isExpired ? "Expired" : "Expires"} on ${formatDate(domain.expires)}`,
    });
  }
  return accessories;
}

function DomainDetail({ domain, sandbox }: { domain: Domain; sandbox: boolean }) {
  const days = daysUntil(domain.expires);
  const expiryText = domain.isExpired
    ? "Expired"
    : days === undefined
      ? formatDate(domain.expires)
      : `${formatDate(domain.expires)} (in ${days} day${days === 1 ? "" : "s"})`;

  return (
    <List.Item.Detail
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label title="Domain" text={domain.name} icon={Icon.Globe} />
          <List.Item.Detail.Metadata.Label title="Registered" text={formatDate(domain.created)} />
          <List.Item.Detail.Metadata.Label
            title="Expires"
            text={{ value: expiryText, color: expiryColor(domain) ?? Color.PrimaryText }}
          />
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.TagList title="Status">
            <List.Item.Detail.Metadata.TagList.Item
              text={domain.autoRenew ? "Auto-renew on" : "Auto-renew off"}
              color={domain.autoRenew ? Color.Green : Color.SecondaryText}
            />
            <List.Item.Detail.Metadata.TagList.Item
              text={domain.whoisGuard === "ENABLED" ? "Privacy on" : "Privacy off"}
              color={domain.whoisGuard === "ENABLED" ? Color.Green : Color.SecondaryText}
            />
            <List.Item.Detail.Metadata.TagList.Item
              text={domain.isLocked ? "Locked" : "Unlocked"}
              color={domain.isLocked ? Color.Blue : Color.SecondaryText}
            />
          </List.Item.Detail.Metadata.TagList>
          <List.Item.Detail.Metadata.Label
            title="DNS"
            text={domain.isOurDns ? "Namecheap nameservers" : "Custom nameservers"}
          />
          <List.Item.Detail.Metadata.Label title="Premium" text={domain.isPremium ? "Yes" : "No"} />
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Link
            title="Manage"
            target={managementUrl(domain.name, sandbox)}
            text="Namecheap panel"
          />
        </List.Item.Detail.Metadata>
      }
    />
  );
}

/** "Showing the list from 2 hours ago", so a snapshot is never mistaken for live data. */
function describeSnapshot(at?: number): string {
  if (!at) return "Showing the last list that loaded.";
  const minutes = Math.max(1, Math.round((Date.now() - at) / 60_000));
  if (minutes < 60) return `Showing the list from ${minutes} minute${minutes === 1 ? "" : "s"} ago.`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `Showing the list from ${hours} hour${hours === 1 ? "" : "s"} ago.`;
  const days = Math.round(hours / 24);
  return `Showing the list from ${days} day${days === 1 ? "" : "s"} ago.`;
}

/**
 * Shown above a cached list when a refresh fails. Without it the stale domains stay on screen with no
 * indication that anything is wrong, because List.EmptyView only renders when the list is empty.
 */
function ConnectionBanner({ error, onRetry, staleAt }: { error: unknown; onRetry: () => void; staleAt?: number }) {
  const { ip } = useWhitelistIp(error);
  const whitelist = isWhitelistError(error);

  return (
    <List.Section title="Connection">
      <List.Item
        icon={{ source: whitelist ? Icon.Lock : Icon.Warning, tintColor: Color.Orange }}
        title={whitelist && ip ? `Whitelist ${ip} to refresh` : "Could not refresh from Namecheap"}
        subtitle={whitelist ? `Your IP is not on the whitelist. ${describeSnapshot(staleAt)}` : errorMessage(error)}
        accessories={[{ tag: { value: "Offline", color: Color.Orange } }]}
        actions={
          <ActionPanel>
            <SetupActions error={error} onRetry={onRetry} />
          </ActionPanel>
        }
      />
    </List.Section>
  );
}

export default function ListDomains() {
  const sandbox = isSandbox();
  const [listType, setListType] = useState<DomainListType>("ALL");
  const [showingDetail, setShowingDetail] = useState(false);
  const { data: domains, isLoading, error, revalidate, staleAt } = useDomains(listType);

  const sorted = useMemo(() => {
    const items = [...domains];
    if (listType === "ALL") return items.sort((a, b) => a.name.localeCompare(b.name));
    return items.sort((a, b) => (a.expires ?? "9999").localeCompare(b.expires ?? "9999"));
  }, [domains, listType]);

  const sharedActions = (
    <ActionPanel.Section>
      <Action
        title="Toggle Details"
        icon={Icon.Sidebar}
        shortcut={{ modifiers: ["cmd"], key: "i" }}
        onAction={() => setShowingDetail((current) => !current)}
      />
      <Action
        title="Refresh"
        icon={Icon.ArrowClockwise}
        shortcut={Keyboard.Shortcut.Common.Refresh}
        onAction={revalidate}
      />
      <Action.OpenInBrowser
        title="Open Domain List on Namecheap"
        url={domainListUrl(sandbox)}
        icon={Icon.AppWindowList}
        shortcut={{ modifiers: ["cmd", "shift"], key: "l" }}
      />
      <Action
        title="Open Extension Preferences"
        icon={Icon.Gear}
        shortcut={{ modifiers: ["cmd", "shift"], key: "," }}
        onAction={openExtensionPreferences}
      />
      <Action
        title="Clear Stored Data"
        icon={Icon.Trash}
        style={Action.Style.Destructive}
        onAction={async () => {
          await clearStoredData();
          await showToast({ style: Toast.Style.Success, title: "Cleared stored data" });
        }}
      />
    </ActionPanel.Section>
  );

  return (
    <List
      navigationTitle={sandbox ? "My Domains (Sandbox)" : undefined}
      isLoading={isLoading}
      isShowingDetail={showingDetail && sorted.length > 0}
      searchBarPlaceholder="Filter your domains…"
      searchBarAccessory={
        <List.Dropdown
          tooltip="Filter"
          storeValue
          value={listType}
          onChange={(value) => setListType(value as DomainListType)}
        >
          {LIST_TYPES.map((type) => (
            <List.Dropdown.Item key={type.value} value={type.value} title={type.title} icon={type.icon} />
          ))}
        </List.Dropdown>
      }
    >
      {error && sorted.length > 0 ? <ConnectionBanner error={error} onRetry={revalidate} staleAt={staleAt} /> : null}
      {error ? (
        <SetupEmptyView error={error} onRetry={revalidate} />
      ) : (
        <List.EmptyView
          icon={Icon.Globe}
          title={isLoading ? "Loading your domains…" : "No domains found"}
          description={
            isLoading
              ? undefined
              : "Nothing matches this filter. Register a domain with the Check Domain Availability command."
          }
        />
      )}
      {sorted.map((domain) => (
        <List.Item
          key={domain.id || domain.name}
          // A favicon lookup would send every domain the user owns to a third-party service on each render.
          icon={Icon.Globe}
          title={domain.name}
          subtitle={showingDetail ? undefined : domain.isExpired ? "Expired" : undefined}
          accessories={showingDetail ? undefined : accessoriesFor(domain)}
          detail={<DomainDetail domain={domain} sandbox={sandbox} />}
          actions={
            <ActionPanel>
              <ActionPanel.Section>
                <Action.OpenInBrowser
                  title="Open Domain Management"
                  icon={Icon.Gear}
                  url={managementUrl(domain.name, sandbox)}
                />
                <Action.OpenInBrowser
                  title="Open Advanced DNS"
                  icon={Icon.Network}
                  url={advancedDnsUrl(domain.name, sandbox)}
                  shortcut={{ modifiers: ["cmd"], key: "d" }}
                />
                <Action.OpenInBrowser
                  title="Open Website"
                  icon={Icon.Globe}
                  url={websiteUrl(domain.name)}
                  shortcut={Keyboard.Shortcut.Common.Open}
                />
                <Action.OpenInBrowser
                  title="Look up Whois"
                  icon={Icon.MagnifyingGlass}
                  url={whoisUrl(domain.name, sandbox)}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "w" }}
                />
                <Action.CopyToClipboard
                  title="Copy Domain"
                  content={domain.name}
                  shortcut={Keyboard.Shortcut.Common.Copy}
                />
              </ActionPanel.Section>
              {sharedActions}
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
