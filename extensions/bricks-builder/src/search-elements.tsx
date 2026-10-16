import { Action, ActionPanel, Color, Icon, Keyboard, List } from "@raycast/api";
import { useCachedPromise, useCachedState } from "@raycast/utils";
import { ReactElement, useEffect, useMemo, useState } from "react";
import { ErrorEmptyView, NoSitesView } from "./components/site-empty-view";
import { ManageSitesAction, SwitchSiteSubmenu, useSelectedSite } from "./hooks/use-selected-site";
import { elementTitle, ElementResult, fieldLabel, searchElements } from "./lib/bricks-data";
import { Site } from "./lib/sites";

const ALL = "";

const AREA_LABELS: Record<ElementResult["area"], string> = {
  content: "Content",
  header: "Header",
  footer: "Footer",
  component: "Component",
};

function sectionKey(result: ElementResult) {
  return result.post ? `post-${result.post.id}-${result.area}` : `component-${result.component}`;
}

/** Results tagged with the site they came from (the previous search stays while typing). */
async function searchSite(site: Site, query: string, element: string) {
  return { ...(await searchElements(site, query, element)), siteId: site.id };
}

export default function Command() {
  const { sites, site, setSiteId, isLoading: sitesLoading, reloadSites } = useSelectedSite();
  const [searchText, setSearchText] = useState("");
  const [elementType, setElementType] = useCachedState<string>("search-elements:type", ALL);
  const query = searchText.trim();

  const {
    data: loaded,
    isLoading,
    error,
    revalidate,
  } = useCachedPromise(searchSite, [site as Site, query.length >= 2 ? query : "", elementType], {
    execute: Boolean(site),
    keepPreviousData: true,
  });
  // keepPreviousData keeps the last results while typing; never show another site's.
  const data = loaded && loaded.siteId === site?.id ? loaded : undefined;

  // The saved element type may not be used on this site (e.g. picked on another one): search all.
  const typeMissing = Boolean(data && elementType !== ALL && !data.element_types.some((t) => t.name === elementType));
  useEffect(() => {
    if (typeMissing) setElementType(ALL);
  }, [typeMissing]);

  // Results grouped by the page, template or component they're on, in the order the server found them.
  const sections = useMemo(() => {
    const map = new Map<string, ElementResult[]>();
    for (const result of data?.results ?? []) {
      const key = sectionKey(result);
      map.set(key, [...(map.get(key) ?? []), result]);
    }
    return [...map.values()];
  }, [data]);

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

  const siteActions = (
    <>
      <Action
        title="Reload"
        icon={Icon.ArrowClockwise}
        shortcut={Keyboard.Shortcut.Common.Refresh}
        onAction={revalidate}
      />
      <SwitchSiteSubmenu sites={sites} current={site} onChange={setSiteId} />
      <ManageSitesAction onPop={reloadSites} />
    </>
  );

  const asked = query.length >= 2 || elementType !== ALL;
  const shown = data?.results.length ?? 0;

  return (
    <List
      isLoading={sitesLoading || isLoading}
      filtering={false}
      throttle
      onSearchTextChange={setSearchText}
      searchBarPlaceholder={
        site
          ? `${site.name}: text, class, color, CSS, link or element type…`
          : "Text, class, color, CSS, link or element type…"
      }
      searchBarAccessory={
        <List.Dropdown tooltip="Element Type" value={elementType} onChange={setElementType}>
          <List.Dropdown.Item title="All Elements" value={ALL} />
          {(data?.element_types ?? []).map((t) => (
            <List.Dropdown.Item key={t.name} title={`${elementTitle(t.name)} (${t.count})`} value={t.name} />
          ))}
        </List.Dropdown>
      }
    >
      {error ? (
        <ErrorEmptyView error={error} actions={siteActions} onRetry={revalidate} />
      ) : (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title={asked ? (isLoading ? "Searching…" : "No elements found") : "Search every Bricks element on the site"}
          description={
            asked
              ? undefined
              : "Type text, a class name, a color or CSS value, or pick an element type (e.g. Form) to see where it's used."
          }
          actions={<ActionPanel>{siteActions}</ActionPanel>}
        />
      )}
      {asked && data && data.total > shown && (
        <List.Item
          icon={{ source: Icon.Info, tintColor: Color.SecondaryText }}
          title={`Showing ${shown} of ${data.total.toLocaleString()} matches`}
          subtitle="Type more to narrow it down"
        />
      )}
      {asked &&
        sections.map((results) => {
          const first = results[0];
          const title = first.post ? first.post.title || "(no title)" : (first.component ?? "Component");
          const subtitle = first.post ? `${first.post.type_label} · ${AREA_LABELS[first.area]}` : "Global component";
          return (
            <List.Section key={sectionKey(first)} title={title} subtitle={`${subtitle} · ${results.length}`}>
              {results.map((result) => (
                <ElementItem
                  key={`${sectionKey(result)}-${result.element.id}`}
                  result={result}
                  siteActions={siteActions}
                />
              ))}
            </List.Section>
          );
        })}
    </List>
  );
}

function ElementItem(props: { result: ElementResult; siteActions: ReactElement }) {
  const { post, element, matches } = props.result;
  const match = matches.find((m) => m.field !== "element") ?? matches[0];
  return (
    <List.Item
      icon={element.name === "component" || !post ? Icon.Box : Icon.AppWindowGrid3x3}
      title={element.label ?? elementTitle(element.name)}
      subtitle={match?.text}
      accessories={[
        ...(match && match.field !== "element" ? [{ text: fieldLabel(match.field), tooltip: match.text }] : []),
        ...(element.classes.length > 0
          ? [
              {
                icon: Icon.Tag,
                text: `${element.classes.length}`,
                tooltip: element.classes.map((c) => `.${c}`).join("\n"),
              },
            ]
          : []),
        { tag: element.name },
      ]}
      actions={
        <ActionPanel>
          {post && <Action.OpenInBrowser title="Open in Bricks" icon={Icon.Hammer} url={post.builder_url} />}
          {post && (
            <Action.OpenInBrowser
              title="Open Live Page"
              icon={Icon.Globe}
              url={post.link}
              shortcut={Keyboard.Shortcut.Common.OpenWith}
            />
          )}
          <Action.CopyToClipboard
            title="Copy Element ID"
            content={`#brxe-${element.id}`}
            shortcut={Keyboard.Shortcut.Common.Copy}
          />
          {match && (
            <Action.CopyToClipboard
              title="Copy Matched Value"
              content={match.text}
              shortcut={Keyboard.Shortcut.Common.CopyName}
            />
          )}
          <ActionPanel.Section>{props.siteActions}</ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
