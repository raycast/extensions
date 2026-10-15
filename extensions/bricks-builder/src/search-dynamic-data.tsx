import { Action, ActionPanel, Icon, Keyboard, List } from "@raycast/api";
import { useCachedPromise, useCachedState } from "@raycast/utils";
import { ErrorEmptyView, NoSitesView } from "./components/site-empty-view";
import { ManageSitesAction, SwitchSiteSubmenu, useSelectedSite } from "./hooks/use-selected-site";
import { DynamicTag, getDynamicTags } from "./lib/bricks-data";
import { Site } from "./lib/sites";

const DOCS_URL = "https://academy.bricksbuilder.io/article/dynamic-data/";

const PROVIDER_NAMES: Record<string, string> = {
  wp: "WordPress",
  acf: "ACF",
  metabox: "Meta Box",
  jetengine: "JetEngine",
  pods: "Pods",
  toolset: "Toolset",
  cmb2: "CMB2",
  woo: "WooCommerce",
  property: "Element Properties",
};

const providerName = (tag: DynamicTag) => (tag.provider ? (PROVIDER_NAMES[tag.provider] ?? tag.provider) : "Other");

export default function Command() {
  const { sites, site, setSiteId, isLoading: sitesLoading, reloadSites } = useSelectedSite();
  const [provider, setProvider] = useCachedState<string>("dynamic-data:provider", "all");

  const { data, isLoading, error, revalidate } = useCachedPromise(getDynamicTags, [site as Site], {
    execute: Boolean(site),
    keepPreviousData: true,
  });

  if (!sitesLoading && sites.length === 0) {
    return (
      <NoSitesView
        onSaved={(saved) => {
          setSiteId(saved.id);
          reloadSites();
        }}
      />
    );
  }

  const tags = data ?? [];
  const providers = [...new Set(tags.map(providerName))];
  const visible = tags.filter((tag) => provider === "all" || providerName(tag) === provider);

  // Sections in the order Bricks lists them (by group, e.g. "Post", "ACF", "Woo Product").
  const groups = new Map<string, DynamicTag[]>();
  for (const tag of visible) {
    groups.set(tag.group, [...(groups.get(tag.group) ?? []), tag]);
  }

  return (
    <List
      isLoading={sitesLoading || isLoading}
      searchBarPlaceholder={site ? `Search dynamic data tags on ${site.name}…` : "Search dynamic data tags…"}
      searchBarAccessory={
        <List.Dropdown tooltip="Provider" value={provider} onChange={setProvider}>
          <List.Dropdown.Item title="All Providers" value="all" />
          {providers.map((p) => (
            <List.Dropdown.Item key={p} title={p} value={p} />
          ))}
        </List.Dropdown>
      }
    >
      <ErrorEmptyView error={error} onRetry={revalidate} />
      {[...groups].map(([group, groupTags]) => (
        <List.Section key={group} title={group} subtitle={`${groupTags.length}`}>
          {groupTags.map((tag) => (
            <List.Item
              key={tag.name}
              icon={Icon.Bolt}
              title={tag.label}
              subtitle={tag.name}
              keywords={[tag.name, group, providerName(tag), ...(tag.field_type ? [tag.field_type] : [])]}
              accessories={[
                ...(tag.field_type ? [{ tag: tag.field_type }] : []),
                ...(provider === "all" ? [{ text: providerName(tag) }] : []),
              ]}
              actions={
                <ActionPanel>
                  <Action.Paste title="Paste Tag" content={tag.name} />
                  <Action.CopyToClipboard
                    title="Copy Tag"
                    content={tag.name}
                    shortcut={Keyboard.Shortcut.Common.Copy}
                  />
                  <Action.CopyToClipboard
                    title="Copy Tag Without Formatting"
                    content={tag.name.replace(/}$/, ":plain}")}
                    shortcut={Keyboard.Shortcut.Common.CopyName}
                  />
                  <Action.OpenInBrowser
                    title="Open Dynamic Data Docs"
                    url={DOCS_URL}
                    shortcut={Keyboard.Shortcut.Common.Open}
                  />
                  <Action
                    title="Reload"
                    icon={Icon.ArrowClockwise}
                    shortcut={Keyboard.Shortcut.Common.Refresh}
                    onAction={revalidate}
                  />
                  <SwitchSiteSubmenu sites={sites} current={site} onChange={setSiteId} />
                  <ManageSitesAction onPop={reloadSites} />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ))}
    </List>
  );
}
