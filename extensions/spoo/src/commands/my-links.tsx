import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useState } from "react";
import { AuthGate } from "@/components/auth-gate";
import { EmptyLinks } from "@/components/empty-state";
import { LinkActions } from "@/components/link-actions";
import { LinkDetailSidebar } from "@/components/link-detail";
import { LinkListItem } from "@/components/link-list-item";
import { useLinks } from "@/hooks/use-links";
import type { SortField, SortOrder } from "@/api/urls";
import type { UrlStatus } from "@/schemas/url";

type StatusFilter = "all" | UrlStatus;

interface SortOption {
  label: string;
  sortBy: SortField;
  sortOrder: SortOrder;
}

const SORT_OPTIONS: Record<string, SortOption> = {
  newest: { label: "Newest first", sortBy: "created_at", sortOrder: "desc" },
  oldest: { label: "Oldest first", sortBy: "created_at", sortOrder: "asc" },
  "most-clicked": {
    label: "Most clicked",
    sortBy: "total_clicks",
    sortOrder: "desc",
  },
  "last-clicked": {
    label: "Last clicked",
    sortBy: "last_click",
    sortOrder: "desc",
  },
};

const SORT_KEYS = Object.keys(SORT_OPTIONS);

export default function MyLinks() {
  return (
    <AuthGate>
      <MyLinksList />
    </AuthGate>
  );
}

function MyLinksList() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortKey, setSortKey] = useState("newest");

  const sort = SORT_OPTIONS[sortKey];

  const { links, isLoading, revalidate } = useLinks({
    search: search || undefined,
    status: statusFilter === "all" ? undefined : statusFilter,
    sortBy: sort.sortBy,
    sortOrder: sort.sortOrder,
  });

  const cycleSort = () => {
    const i = SORT_KEYS.indexOf(sortKey);
    setSortKey(SORT_KEYS[(i + 1) % SORT_KEYS.length]);
  };

  const isEmpty =
    !isLoading && links.length === 0 && !search && statusFilter === "all";

  return (
    <List
      isLoading={isLoading}
      isShowingDetail
      searchBarPlaceholder="Search by alias or destination URL"
      navigationTitle={`My Links · ${sort.label}`}
      onSearchTextChange={setSearch}
      throttle
      searchBarAccessory={
        <List.Dropdown
          tooltip="Status"
          value={statusFilter}
          onChange={(v) => setStatusFilter(v as StatusFilter)}
        >
          <List.Dropdown.Item title="All" value="all" />
          <List.Dropdown.Item title="Active" value="ACTIVE" />
          <List.Dropdown.Item title="Inactive" value="INACTIVE" />
          <List.Dropdown.Item title="Expired" value="EXPIRED" />
          <List.Dropdown.Item title="Blocked" value="BLOCKED" />
        </List.Dropdown>
      }
    >
      {isEmpty ? (
        <EmptyLinks />
      ) : (
        links.map((link) => (
          <LinkListItem
            key={link.id}
            link={link}
            showAccessories={false}
            detail={<LinkDetailSidebar link={link} />}
            actions={
              <LinkActions link={link} onMutated={revalidate}>
                <ActionPanel.Section title={`Sort: ${sort.label}`}>
                  <Action
                    title="Cycle Sort"
                    icon={Icon.ArrowCounterClockwise}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "s" }}
                    onAction={cycleSort}
                  />
                  {SORT_KEYS.map((key) => {
                    const opt = SORT_OPTIONS[key];
                    return (
                      <Action
                        key={key}
                        title={opt.label}
                        icon={key === sortKey ? Icon.Checkmark : Icon.Minus}
                        onAction={() => setSortKey(key)}
                      />
                    );
                  })}
                </ActionPanel.Section>
              </LinkActions>
            }
          />
        ))
      )}
    </List>
  );
}
