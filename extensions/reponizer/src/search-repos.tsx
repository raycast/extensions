import { Action, ActionPanel, Icon, List, openExtensionPreferences } from "@raycast/api";
import { useMemo, useState } from "react";
import { RepoListItem } from "./components/RepoListItem";
import { useRepoIndex } from "./hooks/useRepoIndex";
import type { Filter } from "./lib/filters";
import { hostOf, matchesFilter, ownerOf } from "./lib/filters";
import type { RepoEntry } from "./lib/types";
import { pluralize } from "./lib/util";

function FilterDropdown({
  hosts,
  owners,
  onChange,
}: {
  hosts: string[];
  owners: string[];
  onChange: (filter: Filter) => void;
}) {
  return (
    <List.Dropdown tooltip="Filter repositories" storeValue onChange={(value) => onChange(value as Filter)}>
      <List.Dropdown.Section title="Status">
        <List.Dropdown.Item title="All Repositories" value="all" icon={Icon.Folder} />
        <List.Dropdown.Item title="Needs Attention" value="attention" icon={Icon.Warning} />
        <List.Dropdown.Item title="Remote Issues" value="remote-issues" icon={Icon.Globe} />
        <List.Dropdown.Item title="Uncommitted Changes" value="dirty" icon={Icon.Pencil} />
        <List.Dropdown.Item title="Ahead / Behind" value="unsynced" icon={Icon.ArrowClockwise} />
        <List.Dropdown.Item title="Offloaded" value="offloaded" icon={Icon.Cloud} />
      </List.Dropdown.Section>
      <List.Dropdown.Section title="Hosts">
        {hosts.map((host) => (
          <List.Dropdown.Item key={host} title={host} value={`host:${host}`} icon={Icon.Globe} />
        ))}
      </List.Dropdown.Section>
      <List.Dropdown.Section title="Owners">
        {owners.map((owner) => (
          <List.Dropdown.Item key={owner} title={owner} value={`owner:${owner}`} icon={Icon.Person} />
        ))}
      </List.Dropdown.Section>
    </List.Dropdown>
  );
}

export default function Command() {
  const ctl = useRepoIndex();
  const [filter, setFilter] = useState<Filter>("all");
  const [showDetail, setShowDetail] = useState(false);

  const entries = useMemo(() => ctl.index?.entries ?? [], [ctl.index]);
  const hosts = useMemo(() => [...new Set(entries.map(hostOf))].sort(), [entries]);
  const owners = useMemo(() => [...new Set(entries.map(ownerOf).filter(Boolean))].sort(), [entries]);

  const sections = useMemo(() => {
    const filtered = entries.filter((entry) => matchesFilter(entry, filter));
    const byGroup = new Map<string, RepoEntry[]>();
    for (const entry of filtered) {
      const list = byGroup.get(entry.group) ?? [];
      list.push(entry);
      byGroup.set(entry.group, list);
    }
    return [...byGroup.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [entries, filter]);

  return (
    <List
      isLoading={ctl.isLoading}
      isShowingDetail={showDetail}
      searchBarPlaceholder="Search repositories…"
      searchBarAccessory={<FilterDropdown hosts={hosts} owners={owners} onChange={setFilter} />}
    >
      {entries.length === 0 && ctl.scanError ? (
        <List.EmptyView
          icon={Icon.Warning}
          title="Could Not Scan Repositories"
          description={ctl.scanError}
          actions={
            <ActionPanel>
              <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
              <Action title="Try Again" icon={Icon.ArrowClockwise} onAction={() => ctl.refresh()} />
            </ActionPanel>
          }
        />
      ) : (
        <List.EmptyView
          icon={Icon.Folder}
          title={ctl.isLoading ? "Scanning…" : "No Repositories Found"}
          description={
            ctl.isLoading ? undefined : "Clone something with the “Clone Repository” command, or check the root folder."
          }
          actions={
            <ActionPanel>
              <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
            </ActionPanel>
          }
        />
      )}
      {sections.map(([group, groupEntries]) => (
        <List.Section key={group} title={group} subtitle={pluralize(groupEntries.length, "repo")}>
          {groupEntries.map((entry) => (
            <RepoListItem
              key={entry.relativePath}
              entry={entry}
              ctl={ctl}
              showDetail={showDetail}
              setShowDetail={setShowDetail}
            />
          ))}
        </List.Section>
      ))}
    </List>
  );
}
