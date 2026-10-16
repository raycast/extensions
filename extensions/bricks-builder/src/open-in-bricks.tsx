import { Action, ActionPanel, Color, Icon, Keyboard, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { ReactElement, useMemo, useState } from "react";
import { CreateForm } from "./components/create-form";
import { ErrorEmptyView, NoSitesView } from "./components/site-empty-view";
import { ManageSitesAction, useSelectedSite } from "./hooks/use-selected-site";
import { Site, wpAdminUrl } from "./lib/sites";
import { adminEditUrl, ContentItem, listContent, searchContentRemote } from "./lib/wordpress";

const STATUS_COLORS: Record<string, Color> = {
  draft: Color.Orange,
  pending: Color.Yellow,
  private: Color.Purple,
  future: Color.Blue,
};

export default function Command() {
  const { sites, site, setSiteId, isLoading: sitesLoading, reloadSites } = useSelectedSite();

  // Cached between launches: the last list shows instantly while a fresh one loads in the background.
  const {
    data,
    isLoading: itemsLoading,
    error,
    revalidate: reloadItems,
  } = useCachedPromise(listContent, [site as Site], { execute: Boolean(site) });
  const [searchText, setSearchText] = useState("");
  const truncated = data?.truncated ?? [];

  // The cached list holds the most recent items of each type; on big sites, also ask the server.
  const searchRemotely = Boolean(site && data?.viaHelper && truncated.length > 0 && searchText.trim().length >= 2);
  const { data: remoteItems, isLoading: remoteLoading } = useCachedPromise(
    searchContentRemote,
    [site as Site, searchText.trim()],
    { execute: searchRemotely, keepPreviousData: true },
  );

  const items = useMemo(() => {
    const local = data?.items ?? [];
    if (!searchRemotely || !remoteItems) return local;
    const seen = new Set(local.map((item) => `${item.type.slug}-${item.id}`));
    return [...local, ...remoteItems.filter((item) => !seen.has(`${item.type.slug}-${item.id}`))];
  }, [data, remoteItems, searchRemotely]);

  const onSiteSaved = (saved: Site) => {
    setSiteId(saved.id);
    reloadSites();
  };
  // Shared by every row and the empty views: create something new, or manage sites.
  const commonActions = (
    <>
      <Action.Push
        title="Create in Bricks"
        icon={Icon.Plus}
        shortcut={Keyboard.Shortcut.Common.New}
        target={<CreateForm />}
        onPop={reloadItems}
      />
      <ManageSitesAction onPop={reloadSites} />
    </>
  );

  if (!sitesLoading && sites.length === 0) {
    return <NoSitesView onSaved={onSiteSaved} />;
  }

  return (
    <List
      isLoading={sitesLoading || itemsLoading || (searchRemotely && remoteLoading)}
      // Keep Raycast's instant local filtering; the search text only drives the server search.
      filtering
      onSearchTextChange={setSearchText}
      throttle
      searchBarPlaceholder={site ? `Search ${site.name}…` : "Search…"}
      searchBarAccessory={
        sites.length > 1 ? (
          <List.Dropdown tooltip="Site" value={site?.id} onChange={setSiteId}>
            {sites.map((s) => (
              <List.Dropdown.Item key={s.id} title={s.name} value={s.id} icon={Icon.Globe} />
            ))}
          </List.Dropdown>
        ) : undefined
      }
    >
      {error ? (
        <ErrorEmptyView error={error} actions={commonActions} />
      ) : (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title={itemsLoading ? "Loading…" : "Nothing found"}
          actions={<ActionPanel>{commonActions}</ActionPanel>}
        />
      )}
      {site && data && !data.viaHelper && (
        <List.Item
          icon={{ source: Icon.Info, tintColor: Color.Blue }}
          title="Install the Bricks Raycast Helper plugin to see Bricks templates"
          subtitle="It also makes this list load in one request"
          actions={
            <ActionPanel>
              <Action.OpenInBrowser
                title="Open Plugin Upload Page"
                url={wpAdminUrl(site, "plugin-install.php?tab=upload")}
              />
            </ActionPanel>
          }
        />
      )}
      {truncated.length > 0 && !searchText && (
        <List.Item
          icon={{ source: Icon.Info, tintColor: Color.SecondaryText }}
          title={`Showing the latest ${truncated.map((t) => `${t.returned} of ${t.total.toLocaleString()} ${t.label.toLowerCase()}`).join(", ")}`}
          subtitle="Type to search the whole site"
        />
      )}
      {site &&
        items.map((item) => (
          <ContentListItem
            key={`${item.type.slug}-${item.id}`}
            site={site}
            item={item}
            commonActions={commonActions}
            onReload={reloadItems}
          />
        ))}
    </List>
  );
}

function ContentListItem(props: { site: Site; item: ContentItem; commonActions: ReactElement; onReload: () => void }) {
  const { site, item } = props;
  const accessories: List.Item.Accessory[] = [];
  if (item.templateType) {
    accessories.push({ tag: { value: item.templateType, color: Color.Magenta } });
  }
  if (item.conditions) {
    // Headers, footers and single/archive templates do nothing without conditions.
    const needsConditions = !["section", "popup", "password_protection"].includes(item.templateType ?? "");
    if (item.conditions.length > 0) {
      accessories.push({
        icon: Icon.Pin,
        text: item.conditions.length > 1 ? `${item.conditions[0]} +${item.conditions.length - 1}` : item.conditions[0],
        tooltip: `Conditions:\n${item.conditions.join("\n")}`,
      });
    } else if (needsConditions) {
      accessories.push({ icon: { source: Icon.Warning, tintColor: Color.Orange }, tooltip: "No conditions set" });
    }
  }
  if (item.status !== "publish") {
    accessories.push({ tag: { value: item.status, color: STATUS_COLORS[item.status] } });
  }
  accessories.push(
    { tag: item.type.name },
    { date: new Date(item.modified), tooltip: `Modified ${new Date(item.modified).toLocaleString()}` },
  );

  return (
    <List.Item
      icon={item.type.slug === "bricks_template" ? Icon.AppWindowGrid3x3 : Icon.Document}
      title={item.title}
      keywords={[
        item.type.name,
        item.type.slug,
        item.status,
        ...(item.templateType ? [item.templateType] : []),
        ...(item.conditions ?? []),
      ]}
      accessories={accessories}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser title="Open in Bricks" icon={Icon.Hammer} url={item.builderUrl} />
          <Action.OpenInBrowser
            title="Open Live Page"
            icon={Icon.Globe}
            url={item.link}
            shortcut={Keyboard.Shortcut.Common.OpenWith}
          />
          <Action.OpenInBrowser
            title="Edit in WordPress Admin"
            icon={Icon.Pencil}
            url={adminEditUrl(site, item.id)}
            shortcut={Keyboard.Shortcut.Common.Edit}
          />
          <Action.CopyToClipboard
            title="Copy Bricks URL"
            content={item.builderUrl}
            shortcut={Keyboard.Shortcut.Common.Copy}
          />
          <Action.CopyToClipboard
            title="Copy Live URL"
            content={item.link}
            shortcut={Keyboard.Shortcut.Common.CopyName}
          />
          <Action
            title="Reload"
            icon={Icon.ArrowClockwise}
            shortcut={Keyboard.Shortcut.Common.Refresh}
            onAction={props.onReload}
          />
          <ActionPanel.Section>{props.commonActions}</ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
