import { Action, ActionPanel, Color, Icon, Keyboard, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { NoSitesView, SiteEmptyView } from "./components/site-empty-view";
import { SiteToolsSubmenu } from "./components/site-tools";
import { ManageSitesAction, SwitchSiteSubmenu, useSelectedSite } from "./hooks/use-selected-site";
import { Breakpoint, getDesign, getSiteInfo } from "./lib/design";
import { Site, wpAdminUrl } from "./lib/sites";

const CSS_LOADING: Record<string, string> = {
  inline: "Inline styles",
  file: "External files",
};

function breakpointRange(breakpoint: Breakpoint): string {
  if (breakpoint.base) return "Base styles, no media query";
  return breakpoint.media ? `@media ${breakpoint.media}` : "";
}

export default function Command() {
  const { sites, site, setSiteId, isLoading: sitesLoading, reloadSites } = useSelectedSite();
  const { data, isLoading, error, revalidate } = useCachedPromise(getSiteInfo, [site as Site], {
    execute: Boolean(site),
  });
  const { data: design } = useCachedPromise(getDesign, [site as Site], {
    execute: Boolean(site),
    onError: () => undefined,
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

  const actions = (copy?: { title: string; content: string }) => (
    <ActionPanel>
      {copy && <Action.CopyToClipboard title={copy.title} content={copy.content} />}
      {site && (
        <Action.OpenInBrowser
          title="Open Bricks Settings"
          icon={Icon.Gear}
          url={wpAdminUrl(site, "admin.php?page=bricks-settings")}
          shortcut={Keyboard.Shortcut.Common.Open}
        />
      )}
      <Action
        title="Reload"
        icon={Icon.ArrowClockwise}
        shortcut={Keyboard.Shortcut.Common.Refresh}
        onAction={revalidate}
      />
      {site && <SiteToolsSubmenu site={site} />}
      <SwitchSiteSubmenu sites={sites} current={site} onChange={setSiteId} />
      <ManageSitesAction onPop={reloadSites} />
    </ActionPanel>
  );

  const classes = design?.classes ?? [];
  const unused = classes.filter((c) => c.used_on === 0 && (c.components ?? []).length === 0).length;
  const breakpoints = data?.breakpoints ?? [];

  const siteActions = (
    <ActionPanel.Section>
      <Action
        title="Reload"
        icon={Icon.ArrowClockwise}
        shortcut={Keyboard.Shortcut.Common.Refresh}
        onAction={revalidate}
      />
      <SwitchSiteSubmenu sites={sites} current={site} onChange={setSiteId} />
      <ManageSitesAction onPop={reloadSites} />
    </ActionPanel.Section>
  );

  return (
    <List
      isLoading={sitesLoading || isLoading}
      searchBarPlaceholder={site ? `Search site info on ${site.name}…` : "Search site info…"}
    >
      <SiteEmptyView
        error={error}
        isLoading={isLoading}
        title="No site info"
        actions={siteActions}
        onRetry={revalidate}
      />
      {data && (
        <List.Section title="Overview">
          <List.Item
            icon={Icon.Hammer}
            title="Bricks Version"
            accessories={[{ tag: data.bricks_version ?? "Unknown" }]}
            actions={actions({ title: "Copy Version", content: data.bricks_version ?? "" })}
          />
          <List.Item
            icon={Icon.Mobile}
            title="Breakpoint Approach"
            subtitle={
              data.mobile_first
                ? "Base is the smallest screen, others use min-width"
                : "Base is desktop, smaller screens use max-width"
            }
            accessories={[{ tag: data.mobile_first ? "Mobile first" : "Desktop first" }]}
            actions={actions()}
          />
          <List.Item
            icon={Icon.Code}
            title="CSS Loading Method"
            accessories={[{ tag: CSS_LOADING[data.css_loading ?? ""] ?? data.css_loading ?? "Unknown" }]}
            actions={actions()}
          />
          <List.Item
            icon={Icon.Document}
            title="Bricks Enabled Post Types"
            subtitle={data.bricks_post_types.join(", ")}
            actions={actions({ title: "Copy Post Types", content: data.bricks_post_types.join(", ") })}
          />
          {design && (
            <List.Item
              icon={Icon.Tag}
              title="Design System"
              subtitle={`${classes.length} classes · ${design.variables.length} variables · ${design.palettes.reduce((n, p) => n + p.colors.length, 0)} colors`}
              accessories={unused > 0 ? [{ tag: { value: `${unused} unused classes`, color: Color.Orange } }] : []}
              actions={actions()}
            />
          )}
        </List.Section>
      )}
      {breakpoints.length > 0 && (
        <List.Section title="Breakpoints" subtitle={`${breakpoints.length}`}>
          {breakpoints.map((bp) => (
            <List.Item
              key={bp.key}
              icon={bp.base ? { source: Icon.Desktop, tintColor: Color.Green } : Icon.Desktop}
              title={bp.label}
              subtitle={breakpointRange(bp)}
              keywords={[bp.key, `${bp.width}`]}
              accessories={[
                ...(bp.paused ? [{ tag: { value: "paused", color: Color.Orange } }] : []),
                ...(bp.custom ? [{ tag: "custom" }] : []),
                ...(bp.base ? [{ tag: { value: "base", color: Color.Green } }] : []),
                { text: `${bp.width}px` },
                { text: bp.key, icon: Icon.Key },
              ]}
              actions={actions(
                bp.media
                  ? { title: "Copy Media Query", content: `@media ${bp.media} {\n\n}` }
                  : { title: "Copy Width", content: `${bp.width}px` },
              )}
            />
          ))}
        </List.Section>
      )}
      {data && data.theme_styles.length > 0 && (
        <List.Section title="Theme Styles" subtitle={`${data.theme_styles.length}`}>
          {data.theme_styles.map((style) => (
            <List.Item
              key={style.id}
              icon={Icon.Brush}
              title={style.label}
              subtitle={style.conditions.length > 0 ? style.conditions.join(", ") : "No conditions, not applied"}
              accessories={[{ text: `${style.groups.length} groups`, tooltip: style.groups.join(", ") }]}
              actions={actions({ title: "Copy Conditions", content: style.conditions.join("\n") })}
            />
          ))}
        </List.Section>
      )}
      {data && data.pseudo_classes.length > 0 && (
        <List.Section title="States (Pseudo-Classes)" subtitle={`${data.pseudo_classes.length}`}>
          {data.pseudo_classes.map((pseudo) => (
            <List.Item
              key={pseudo}
              icon={Icon.Hashtag}
              title={pseudo}
              actions={actions({ title: "Copy State", content: pseudo })}
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}
