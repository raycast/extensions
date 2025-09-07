import { Action, ActionPanel, Color, Icon, List, showToast, Toast } from "@raycast/api";
import { showFailureToast, usePromise } from "@raycast/utils";
import { useState, useCallback, useMemo } from "react";
import * as gandiAPI from "./api";
import { GandiDomain } from "./types";
import DomainDetail from "./components/DomainDetail";

type FilterKey = "all" | "autorenew_on" | "autorenew_off" | "locked" | "unlocked";
type SortKey = "days_asc" | "days_desc" | "name_asc";

export default function ListDomains() {
  const [searchText, setSearchText] = useState("");
  const [filter, setFilter] = useState<FilterKey>("all");
  const [sort, setSort] = useState<SortKey>("days_asc");

  const fetchDomains = useCallback(async () => {
    try {
      return await gandiAPI.getDomains();
    } catch (error) {
      await showFailureToast(error, { title: "Failed to fetch domains" });
      return [];
    }
  }, []);

  const { data: domains, isLoading, revalidate } = usePromise(fetchDomains, []);

  const daysUntil = (d: GandiDomain) =>
    Math.ceil((new Date(d.dates.registry_ends_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24));

  const matchesFilter = (d: GandiDomain) => {
    switch (filter) {
      case "autorenew_on":
        return d.autorenew;
      case "autorenew_off":
        return !d.autorenew;
      case "locked":
        return d.is_locked;
      case "unlocked":
        return !d.is_locked;
      case "all":
      default:
        return true;
    }
  };

  const sortDomains = (a: GandiDomain, b: GandiDomain) => {
    if (sort === "name_asc") return a.fqdn.localeCompare(b.fqdn);
    const da = daysUntil(a);
    const db = daysUntil(b);
    return sort === "days_asc" ? da - db : db - da;
  };

  const filteredDomains = useMemo(() => {
    return (domains || [])
      .filter((domain) => domain.fqdn.toLowerCase().includes(searchText.toLowerCase()))
      .filter(matchesFilter)
      .sort(sortDomains);
  }, [domains, searchText, filter, sort]);

  const getDomainStatusColor = (domain: GandiDomain): Color => {
    const d = daysUntil(domain);
    if (d < 0) return Color.Red;
    if (d < 30) return Color.Red;
    if (d < 90) return Color.Orange;
    return Color.Green;
  };

  const toggleAutoRenew = async (domain: GandiDomain) => {
    try {
      await showToast({
        style: Toast.Style.Animated,
        title: "Updating auto-renewal...",
      });

      await gandiAPI.setAutoRenew(domain.fqdn, !domain.autorenew);

      await showToast({
        style: Toast.Style.Success,
        title: `Auto-renewal ${!domain.autorenew ? "enabled" : "disabled"}`,
      });

      revalidate();
    } catch (error) {
      await showFailureToast(error, { title: "Failed to update auto-renewal" });
    }
  };

  const renderItem = (domain: GandiDomain) => {
    const expDate = new Date(domain.dates.registry_ends_at);

    // Derive independent lock states
    const transferLocked = domain.is_locked || domain.status?.some((s) => s.includes("TransferProhibited")) || false;
    const updateLocked = domain.status?.some((s) => s.includes("UpdateProhibited")) || false;

    const tags = [
      domain.autorenew
        ? { tag: { value: "Auto-Renew", color: Color.Green, tooltip: "Auto-renewal enabled" } }
        : { tag: { value: "Manual Renewal", color: Color.SecondaryText, tooltip: "Auto-renewal disabled" } },
      transferLocked
        ? { tag: { value: "Transfer: Locked", color: Color.Purple, tooltip: "Registrar transfer is locked" } }
        : { tag: { value: "Transfer: Unlocked", color: Color.Blue, tooltip: "Registrar transfer is allowed" } },
      updateLocked
        ? { tag: { value: "Edit: Locked", color: Color.Purple, tooltip: "Updates to domain are locked" } }
        : { tag: { value: "Edit: Unlocked", color: Color.Blue, tooltip: "Domain updates allowed" } },
    ];

    const keywords = [domain.tld, domain.owner, domain.nameserver.current].filter((v): v is string => Boolean(v));

    return (
      <List.Item
        key={domain.fqdn}
        icon={{ source: Icon.Globe, tintColor: getDomainStatusColor(domain) }}
        title={domain.fqdn}
        keywords={keywords}
        accessories={[{ date: expDate, tooltip: `Expires ${expDate.toLocaleString()}`, icon: Icon.Calendar }, ...tags]}
        actions={
          <ActionPanel>
            <Action.Push title="View Details" icon={Icon.Eye} target={<DomainDetail domain={domain} />} />
            <Action
              title={domain.autorenew ? "Disable Auto-Renewal" : "Enable Auto-Renewal"}
              icon={Icon.ArrowClockwise}
              onAction={() => toggleAutoRenew(domain)}
            />
            <Action.OpenInBrowser
              title="Open in Gandi Dashboard"
              url={`https://admin.gandi.net/domain/${domain.fqdn}`}
            />
            <Action.CopyToClipboard
              title="Copy Domain Name"
              content={domain.fqdn}
              shortcut={{ modifiers: ["cmd"], key: "c" }}
            />
            <Action
              title="Refresh"
              icon={Icon.ArrowClockwise}
              onAction={() => revalidate()}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
            />
          </ActionPanel>
        }
      />
    );
  };

  const soon = filteredDomains.filter((d) => daysUntil(d) >= 0 && daysUntil(d) < 30);
  const quarter = filteredDomains.filter((d) => daysUntil(d) >= 30 && daysUntil(d) < 90);
  const later = filteredDomains.filter((d) => daysUntil(d) >= 90);
  const expired = filteredDomains.filter((d) => daysUntil(d) < 0);

  return (
    <List
      isLoading={isLoading}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search domains..."
      searchBarAccessory={
        <>
          <List.Dropdown tooltip="Filter" storeValue onChange={(v) => setFilter(v as FilterKey)}>
            <List.Dropdown.Item value="all" title="All" />
            <List.Dropdown.Section title="Auto-Renew">
              <List.Dropdown.Item value="autorenew_on" title="Auto-Renew On" />
              <List.Dropdown.Item value="autorenew_off" title="Auto-Renew Off" />
            </List.Dropdown.Section>
            <List.Dropdown.Section title="Lock">
              <List.Dropdown.Item value="locked" title="Locked" />
              <List.Dropdown.Item value="unlocked" title="Unlocked" />
            </List.Dropdown.Section>
          </List.Dropdown>
          <List.Dropdown tooltip="Sort" storeValue onChange={(v) => setSort(v as SortKey)}>
            <List.Dropdown.Item value="days_asc" title="Soonest First" />
            <List.Dropdown.Item value="days_desc" title="Latest First" />
            <List.Dropdown.Item value="name_asc" title="Name (A→Z)" />
          </List.Dropdown>
        </>
      }
    >
      {filteredDomains.length === 0 && !isLoading ? (
        <List.EmptyView
          icon={Icon.Globe}
          title="No domains found"
          description={searchText ? "Try a different search term" : "You don't have any domains in your account"}
        />
      ) : (
        <>
          {expired.length > 0 && <List.Section title="Expired">{expired.map((d) => renderItem(d))}</List.Section>}
          {soon.length > 0 && (
            <List.Section title="Expiring Soon (under 30 days)">{soon.map((d) => renderItem(d))}</List.Section>
          )}
          {quarter.length > 0 && <List.Section title="Next 90 Days">{quarter.map((d) => renderItem(d))}</List.Section>}
          {later.length > 0 && <List.Section title="Later">{later.map((d) => renderItem(d))}</List.Section>}
        </>
      )}
    </List>
  );
}
