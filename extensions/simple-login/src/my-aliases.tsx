import { Action, ActionPanel, Color, Icon, List, showToast, Toast } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import { Alias, AliasFilter, getAliases, toggleAlias, updateAlias } from "./api";

const PAGE_SIZE = 20;

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const [filter, setFilter] = useState<AliasFilter | "all">("all");

  const { isLoading, data, pagination, mutate } = useCachedPromise(
    (query: string, filterValue: AliasFilter | "all") => async (options: { page: number }) => {
      const aliases = await getAliases({
        page_id: options.page,
        query: query || undefined,
        filter: filterValue === "all" ? undefined : filterValue,
      });
      return { data: aliases, hasMore: aliases.length === PAGE_SIZE };
    },
    [searchText, filter],
  );

  const handlePinAlias = async (alias: Alias) => {
    const newPinned = !alias.pinned;
    try {
      await mutate(updateAlias(alias.id, { pinned: newPinned }), {
        optimisticUpdate: (currentData) =>
          currentData?.map((a) => (a.id === alias.id ? { ...a, pinned: newPinned } : a)),
      });
      await showToast({ style: Toast.Style.Success, title: `Alias ${newPinned ? "pinned" : "unpinned"}` });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: `Failed to ${newPinned ? "pin" : "unpin"} alias`,
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  const handleToggleAlias = async (alias: Alias) => {
    const newEnabled = !alias.enabled;
    try {
      await mutate(toggleAlias(alias.id), {
        optimisticUpdate: (currentData) =>
          currentData?.map((a) => (a.id === alias.id ? { ...a, enabled: newEnabled } : a)),
      });
      await showToast({ style: Toast.Style.Success, title: `Alias ${newEnabled ? "enabled" : "disabled"}` });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: `Failed to ${newEnabled ? "enable" : "disable"} alias`,
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      filtering={false}
      throttle
      pagination={pagination}
      searchBarAccessory={
        <List.Dropdown tooltip="Filter" value={filter} onChange={(value) => setFilter(value as AliasFilter | "all")}>
          <List.Dropdown.Item title="All" value="all" />
          <List.Dropdown.Item title="Enabled" value="enabled" />
          <List.Dropdown.Item title="Disabled" value="disabled" />
          <List.Dropdown.Item title="Pinned" value="pinned" />
        </List.Dropdown>
      }
    >
      <List.EmptyView title="No aliases found" description="Try adjusting your search or filter" />
      {data?.map((alias) => (
        <List.Item
          key={alias.id}
          title={alias.email}
          subtitle={alias.mailboxes.map((m) => m.email).join(", ")}
          accessories={[
            alias.pinned ? { icon: { source: Icon.Tack, tintColor: Color.Yellow }, tooltip: "Pinned" } : {},
            !alias.enabled ? { icon: { source: Icon.CircleDisabled, tintColor: Color.Red }, tooltip: "Disabled" } : {},
            { text: `${alias.nb_forward} fwd`, tooltip: "Forwarded" },
            { text: `${alias.nb_reply} rep`, tooltip: "Replied" },
            { text: `${alias.nb_block} blk`, tooltip: "Blocked" },
          ]}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard
                title="Copy Alias"
                content={alias.email}
                shortcut={{ modifiers: ["cmd"], key: "c" }}
              />
              <Action.CopyToClipboard
                title="Copy All Mailboxes"
                content={alias.mailboxes.map((m) => m.email).join(", ")}
                shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
              />
              <Action
                title={alias.pinned ? "Unpin" : "Pin"}
                icon={alias.pinned ? Icon.TackDisabled : Icon.Tack}
                shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
                onAction={() => handlePinAlias(alias)}
              />
              <Action
                title={alias.enabled ? "Disable" : "Enable"}
                icon={alias.enabled ? Icon.CircleDisabled : Icon.CheckCircle}
                shortcut={{ modifiers: ["cmd", "shift"], key: "t" }}
                onAction={() => handleToggleAlias(alias)}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
