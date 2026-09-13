import {
  Action,
  ActionPanel,
  Color,
  Icon,
  Keyboard,
  List,
  openExtensionPreferences,
  showToast,
  Toast,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useMemo, useState } from "react";
import { Application, applicationDeeplink, applicationUrl, listApplications } from "./argocd";
import { ApplicationDetail } from "./application-detail";
import { ApplicationManifest } from "./application-manifest";
import { ApplicationResourcesByKind } from "./application-resources";
import { useFavorites } from "./favorites";
import { fuzzyFilterSort } from "./fuzzy";
import { healthIcon, syncIcon } from "./status";

const MAX_RESULTS = 50;

export function ApplicationList({ project }: { project?: string } = {}) {
  const [searchText, setSearchText] = useState("");
  const { favorites, isFavorite, toggle } = useFavorites("applications");

  const { data, isLoading, error, revalidate } = useCachedPromise(
    async (p?: string) => listApplications(p),
    [project],
    {
      onError: (err) => {
        showToast({ style: Toast.Style.Failure, title: "Failed to load applications", message: err.message });
      },
    },
  );

  const { favoriteApps, otherApps } = useMemo(() => {
    const filtered = fuzzyFilterSort(data ?? [], searchText, (a) => a.metadata.name);

    const favs: Application[] = [];
    const others: Application[] = [];
    for (const app of filtered) {
      if (favorites.has(app.metadata.name)) favs.push(app);
      else others.push(app);
    }
    return { favoriteApps: favs, otherApps: searchText ? others : others.slice(0, MAX_RESULTS) };
  }, [data, searchText, favorites]);

  if (error) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.Warning}
          title="Failed to load applications"
          description={error.message}
          actions={
            <ActionPanel>
              <Action title="Reload" icon={Icon.ArrowClockwise} onAction={revalidate} />
              <Action title="Open Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
              <Action.CopyToClipboard title="Copy Error" content={error.message} />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  const total = data?.length ?? 0;
  const shownCount = favoriteApps.length + otherApps.length;
  const subtitle = total ? `${shownCount} of ${total}` : undefined;

  const renderRow = (app: Application) => {
    const name = app.metadata.name;
    const sync = app.status?.sync?.status;
    const health = app.status?.health?.status;
    const starred = isFavorite(name);
    const accessories = [
      { icon: syncIcon(sync), tooltip: `Sync: ${sync ?? "Unknown"}` },
      { icon: healthIcon(health), tooltip: `Health: ${health ?? "Unknown"}` },
    ];
    if (starred) {
      accessories.unshift({
        icon: { source: Icon.Star, tintColor: Color.Yellow },
        tooltip: "Favorite",
      });
    }
    return (
      <List.Item
        key={`${app.metadata.namespace ?? ""}/${name}`}
        title={name}
        accessories={accessories}
        actions={
          <ActionPanel>
            <Action.Push
              title="Browse Resources"
              icon={Icon.AppWindowGrid3x3}
              target={<ApplicationResourcesByKind appName={name} />}
            />
            <Action.Push title="View Details" icon={Icon.Sidebar} target={<ApplicationDetail name={name} />} />
            <Action.Push
              title="View Manifest"
              icon={Icon.Document}
              target={<ApplicationManifest name={name} />}
              shortcut={{ macOS: { modifiers: ["cmd"], key: "m" }, Windows: { modifiers: ["ctrl"], key: "m" } }}
            />
            <Action.OpenInBrowser
              title="Open in ArgoCD"
              url={applicationUrl(name)}
              shortcut={{ macOS: { modifiers: ["cmd"], key: "b" }, Windows: { modifiers: ["ctrl"], key: "b" } }}
            />
            <Action
              title={starred ? "Remove from Favorites" : "Add to Favorites"}
              icon={starred ? Icon.StarDisabled : Icon.Star}
              onAction={() => toggle(name)}
              shortcut={{ macOS: { modifiers: ["cmd"], key: "f" }, Windows: { modifiers: ["ctrl"], key: "f" } }}
            />
            <Action.CopyToClipboard title="Copy Name" content={name} />
            <Action.CopyToClipboard title="Copy URL" content={applicationUrl(name)} />
            <Action.CopyToClipboard title="Copy Deeplink" content={applicationDeeplink(name)} />
            <Action
              title="Reload"
              icon={Icon.ArrowClockwise}
              onAction={revalidate}
              shortcut={Keyboard.Shortcut.Common.Refresh}
            />
          </ActionPanel>
        }
      />
    );
  };

  const placeholder = project ? `Search applications in ${project}...` : "Search applications...";

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder={placeholder}
      onSearchTextChange={setSearchText}
      filtering={false}
      throttle
    >
      {favoriteApps.length > 0 ? (
        <>
          <List.Section title="Favorites" subtitle={`${favoriteApps.length}`}>
            {favoriteApps.map(renderRow)}
          </List.Section>
          <List.Section title={project ? `Applications in ${project}` : "All Applications"} subtitle={subtitle}>
            {otherApps.map(renderRow)}
          </List.Section>
        </>
      ) : (
        <List.Section title={project ? `Applications in ${project}` : "Applications"} subtitle={subtitle}>
          {otherApps.map(renderRow)}
        </List.Section>
      )}
    </List>
  );
}
