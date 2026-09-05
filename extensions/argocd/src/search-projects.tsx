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
import { Project, listProjects, projectUrl } from "./argocd";
import { ApplicationList } from "./application-list";
import { useFavorites } from "./favorites";
import { fuzzyFilterSort } from "./fuzzy";
import { ProjectDetail } from "./project-detail";

const MAX_RESULTS = 50;

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const { favorites, isFavorite, toggle } = useFavorites("projects");

  const { data, isLoading, error, revalidate } = useCachedPromise(async () => listProjects(), [], {
    onError: (err) => {
      showToast({ style: Toast.Style.Failure, title: "Failed to load projects", message: err.message });
    },
  });

  const { favoriteProjects, otherProjects } = useMemo(() => {
    const filtered = fuzzyFilterSort(data ?? [], searchText, (p) => p.metadata.name);

    const favs: Project[] = [];
    const others: Project[] = [];
    for (const project of filtered) {
      if (favorites.has(project.metadata.name)) favs.push(project);
      else others.push(project);
    }
    return { favoriteProjects: favs, otherProjects: searchText ? others : others.slice(0, MAX_RESULTS) };
  }, [data, searchText, favorites]);

  if (error) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.Warning}
          title="Failed to load projects"
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
  const shownCount = favoriteProjects.length + otherProjects.length;
  const subtitle = total ? `${shownCount} of ${total}` : undefined;

  const renderRow = (project: Project) => {
    const name = project.metadata.name;
    const description = project.spec?.description;
    const destinations = project.spec?.destinations ?? [];
    const roles = project.spec?.roles ?? [];
    const starred = isFavorite(name);

    const accessories: List.Item.Accessory[] = [];
    if (description) accessories.push({ text: description });
    if (destinations.length > 0) {
      accessories.push({
        text: `${destinations.length} destination${destinations.length === 1 ? "" : "s"}`,
      });
    }
    if (roles.length > 0) {
      accessories.push({ text: `${roles.length} role${roles.length === 1 ? "" : "s"}` });
    }
    if (starred) {
      accessories.unshift({
        icon: { source: Icon.Star, tintColor: Color.Yellow },
        tooltip: "Favorite",
      });
    }

    return (
      <List.Item
        key={name}
        title={name}
        accessories={accessories}
        actions={
          <ActionPanel>
            <Action.Push
              title="View Applications"
              icon={Icon.AppWindowGrid3x3}
              target={<ApplicationList project={name} />}
            />
            <Action.Push
              title="View Details"
              icon={Icon.Sidebar}
              target={<ProjectDetail name={name} />}
              shortcut={{ macOS: { modifiers: ["cmd"], key: "d" }, Windows: { modifiers: ["ctrl"], key: "d" } }}
            />
            <Action.OpenInBrowser
              title="Open in ArgoCD"
              url={projectUrl(name)}
              shortcut={{ macOS: { modifiers: ["cmd"], key: "b" }, Windows: { modifiers: ["ctrl"], key: "b" } }}
            />
            <Action
              title={starred ? "Remove from Favorites" : "Add to Favorites"}
              icon={starred ? Icon.StarDisabled : Icon.Star}
              onAction={() => toggle(name)}
              shortcut={{ macOS: { modifiers: ["cmd"], key: "f" }, Windows: { modifiers: ["ctrl"], key: "f" } }}
            />
            <Action.CopyToClipboard title="Copy Name" content={name} />
            <Action.CopyToClipboard title="Copy URL" content={projectUrl(name)} />
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

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search projects..."
      onSearchTextChange={setSearchText}
      filtering={false}
      throttle
    >
      {favoriteProjects.length > 0 ? (
        <>
          <List.Section title="Favorites" subtitle={`${favoriteProjects.length}`}>
            {favoriteProjects.map(renderRow)}
          </List.Section>
          <List.Section title="All Projects" subtitle={subtitle}>
            {otherProjects.map(renderRow)}
          </List.Section>
        </>
      ) : (
        <List.Section title="Projects" subtitle={subtitle}>
          {otherProjects.map(renderRow)}
        </List.Section>
      )}
    </List>
  );
}
