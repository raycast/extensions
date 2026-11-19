import { countOf, failToast } from "@chrismessina/raycast-kit";
import { logger } from "@chrismessina/raycast-logger";
import { useMemo, useRef, useState } from "react";
import {
  Action,
  ActionPanel,
  Color,
  getPreferenceValues,
  Icon,
  Image,
  Keyboard,
  List,
  showToast,
  Toast,
} from "@raycast/api";
import { catalogSites, catalogSource, saveCatalog } from "../catalog";
import { PLATFORMS } from "../catalog/platforms";
import { buildCatalog } from "../catalog/sync";
import type { CatalogSite } from "../catalog/types";
import { addToMyApps } from "../helpers/add-to-my-apps";
import { getAppFavicon } from "../helpers/apps";
import { normalizeUrlTemplate } from "../helpers/url";
import { useApps } from "../hooks/useApps";
import { PROGRESS_INTERVAL_MS } from "../utils/progress";

// Sites with no profile URL can't be apps
const pickableSites = () =>
  catalogSites()
    .filter((site): site is CatalogSite & { urlTemplate: string } => Boolean(site.urlTemplate))
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));

// What each grade means for Find Profile, which is the only place it matters
const CHECK_LABEL: Record<CatalogSite["reliability"], { text: string; color: Color; tooltip: string }> = {
  works: {
    text: "Searchable",
    color: Color.Green,
    tooltip: "Find Profile can tell whether a profile exists on this site",
  },
  unverified: {
    text: "Unconfirmed",
    color: Color.Orange,
    tooltip: "The site refused to be tested, so Find Profile may not get an answer",
  },
  unreliable: {
    text: "Open Only",
    color: Color.SecondaryText,
    tooltip: "The site's answers can't be trusted, so Find Profile only offers to open it",
  },
};

type Filter = "all" | CatalogSite["reliability"] | "added";
// Each grade's dot takes its tag's color, so the menu reads like the rows
const dot = (tintColor: Color) => ({ source: Icon.CircleFilled, tintColor });
const FILTERS: { value: Filter; title: string; icon: Image.ImageLike }[] = [
  { value: "all", title: "All Sites", icon: Icon.Globe },
  { value: "works", title: CHECK_LABEL.works.text, icon: dot(CHECK_LABEL.works.color) },
  { value: "unverified", title: CHECK_LABEL.unverified.text, icon: dot(CHECK_LABEL.unverified.color) },
  { value: "unreliable", title: CHECK_LABEL.unreliable.text, icon: dot(CHECK_LABEL.unreliable.color) },
  { value: "added", title: "In My Apps", icon: { source: Icon.CheckCircle, tintColor: Color.Green } },
];

export default function CatalogPicker() {
  const { entries: apps, isLoading } = useApps();
  const { includeNsfw: showNsfw } = getPreferenceValues<Preferences>();

  const [filter, setFilter] = useState<Filter>("all");
  // Bumped after Update Catalog, so the list reads the new catalog
  const [revision, setRevision] = useState(0);
  const pickable = useMemo(pickableSites, [revision]);
  const source = useMemo(catalogSource, [revision]);

  // The sites already in My Apps, by ID or by opening the same profile URLs
  const addedIds = useMemo(() => {
    const ids = new Set(apps.map((app) => app.value));
    const templates = new Set(apps.map((app) => normalizeUrlTemplate(app.urlTemplate)));
    return new Set(
      pickable
        .filter((site) => ids.has(site.id) || templates.has(normalizeUrlTemplate(site.urlTemplate)))
        .map((site) => site.id),
    );
  }, [apps, pickable]);
  // A double Return would start a second update before the first one's state lands; a ref blocks it at once
  const updating = useRef(false);

  const updateCatalog = async () => {
    if (updating.current) return;
    updating.current = true;
    const controller = new AbortController();
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Updating Catalog…",
      message: "Downloading Sherlock's site list",
      primaryAction: { title: "Cancel", onAction: () => controller.abort() },
    });
    try {
      let lastShown = 0;
      const catalog = await buildCatalog({
        signal: controller.signal,
        onProgress: (done, total) => {
          if (Date.now() - lastShown < PROGRESS_INTERVAL_MS && done < total) return;
          lastShown = Date.now();
          toast.message = `Checked ${done} of ${countOf(total, "site")}`;
        },
      });
      const known = new Set(catalogSites().map((site) => site.id));
      saveCatalog(catalog);
      setRevision((count) => count + 1);
      const added = catalog.sites.filter((site) => !known.has(site.id)).length;
      const searchable = catalog.sites.filter((site) => site.reliability === "works").length;
      logger.info("Catalog updated", { sites: catalog.sites.length, searchable, added, commit: catalog.source.commit });
      toast.style = Toast.Style.Success;
      toast.primaryAction = undefined;
      toast.title = "Catalog Updated";
      toast.message = `${countOf(catalog.sites.length, "site")}, ${searchable} searchable${added ? `, ${added} new` : ""}`;
    } catch (error) {
      if (controller.signal.aborted) {
        toast.style = Toast.Style.Success;
        toast.primaryAction = undefined;
        toast.title = "Update Canceled";
        toast.message = "The catalog is unchanged";
      } else {
        failToast(toast, error, { title: "Couldn't Update Catalog" });
      }
    } finally {
      updating.current = false;
    }
  };

  const updateAction = (
    <Action
      title="Update Catalog"
      icon={Icon.ArrowClockwise}
      onAction={updateCatalog}
      shortcut={Keyboard.Shortcut.Common.Refresh}
    />
  );

  const sites = pickable.filter(
    (site) =>
      (showNsfw || !site.nsfw) &&
      (filter === "all" || (filter === "added" ? addedIds.has(site.id) : site.reliability === filter)),
  );

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search sites…"
      navigationTitle="Import from Catalog"
      actions={<ActionPanel>{updateAction}</ActionPanel>}
      searchBarAccessory={
        <List.Dropdown tooltip="Filter Sites" value={filter} onChange={(value) => setFilter(value as Filter)}>
          {FILTERS.map((option) => (
            <List.Dropdown.Item key={option.value} value={option.value} title={option.title} icon={option.icon} />
          ))}
        </List.Dropdown>
      }
    >
      <List.Section
        title="Sherlock Catalog"
        subtitle={`${countOf(sites.length, "site")} · ${source.updated ? "updated" : "checked"} ${source.probedAt}`}
      >
        {sites.map((site) => {
          const isAdded = addedIds.has(site.id);
          const label = CHECK_LABEL[site.reliability];
          const accessories: List.Item.Accessory[] = [];
          if (site.nsfw) accessories.push({ tag: { value: "NSFW", color: Color.Red } });
          if (site.platform) accessories.push({ tag: PLATFORMS[site.platform].name, tooltip: "Platform" });
          // A filter on the grade already says it, so the tag would repeat it on every row
          if (filter !== site.reliability) {
            accessories.push({ tag: { value: label.text, color: label.color }, tooltip: label.tooltip });
          }
          if (isAdded && filter !== "added")
            accessories.push({ icon: { source: Icon.CheckCircle, tintColor: Color.Green }, tooltip: "In My Apps" });
          return (
            <List.Item
              key={site.id}
              title={site.name}
              subtitle={site.urlTemplate}
              icon={getAppFavicon(site)}
              keywords={[site.homepage]}
              accessories={accessories}
              actions={
                <ActionPanel>
                  {!isAdded && <Action title="Add to My Apps" icon={Icon.Plus} onAction={() => addToMyApps(site)} />}
                  <Action.OpenInBrowser title="Open Site" url={site.homepage} />
                  {updateAction}
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
    </List>
  );
}
