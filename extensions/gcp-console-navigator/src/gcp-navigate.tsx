import {
  Action,
  ActionPanel,
  Form,
  Icon,
  List,
  LocalStorage,
  open,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useCallback, useEffect, useState } from "react";
import { getProjects, refreshProjectsWithToast } from "./projects-cache";
import { buildResourceUrl } from "./resources";
import { GcpProject, GcpResource } from "./types";
import {
  getMergedKeywords,
  getMergedResources,
  saveProjectKeywords,
} from "./custom-data";

const CHROME_BUNDLE_ID = "com.google.Chrome";
const FAVORITES_KEY = "gcpFavorites";
const RECENTS_KEY = "gcpRecents";
const MAX_RECENTS = 5;

async function openInChrome(url: string) {
  try {
    await open(url, CHROME_BUNDLE_ID);
  } catch {
    await showToast({
      style: Toast.Style.Failure,
      title: "Chrome not found",
      message: "Opening in default browser instead",
    });
    await open(url);
  }
}

async function getFavorites(): Promise<Set<string>> {
  const data = await LocalStorage.getItem<string>(FAVORITES_KEY);
  try {
    return new Set(data ? JSON.parse(data) : []);
  } catch {
    return new Set();
  }
}

async function setFavorites(favorites: Set<string>): Promise<void> {
  await LocalStorage.setItem(FAVORITES_KEY, JSON.stringify([...favorites]));
}

async function getRecents(): Promise<string[]> {
  const data = await LocalStorage.getItem<string>(RECENTS_KEY);
  try {
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

async function addRecent(projectId: string): Promise<void> {
  const recents = await getRecents();
  const filtered = recents.filter((id) => id !== projectId);
  const updated = [projectId, ...filtered].slice(0, MAX_RECENTS);
  await LocalStorage.setItem(RECENTS_KEY, JSON.stringify(updated));
}

function AddKeywordForm({
  project,
  existingKeywords,
  onSave,
}: {
  project: GcpProject;
  existingKeywords: string[];
  onSave: (keywords: string[]) => Promise<void>;
}) {
  const [keywords, setKeywords] = useState(existingKeywords.join(", "));
  const { pop } = useNavigation();

  async function handleSubmit() {
    const keywordList = keywords
      .split(",")
      .map((k) => k.trim())
      .filter((k) => k.length > 0);
    await onSave(keywordList);
    showToast({
      style: Toast.Style.Success,
      title: `Keywords saved for ${project.projectId}`,
    });
    pop();
  }

  return (
    <Form
      navigationTitle={`Keywords for ${project.projectId}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Keywords" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="keywords"
        title="Keywords"
        placeholder="dev, development, main"
        info="Comma-separated keywords for searching"
        value={keywords}
        onChange={setKeywords}
      />
    </Form>
  );
}

function ResourceList({ project }: { project: GcpProject }) {
  const [resources, setResources] = useState<GcpResource[]>([]);

  useEffect(() => {
    getMergedResources().then(setResources);
  }, []);

  return (
    <List
      navigationTitle={`Resources in ${project.projectId}`}
      searchBarPlaceholder="Search resources..."
    >
      {resources.map((resource) => (
        <List.Item
          key={resource.id}
          title={resource.name}
          keywords={resource.keywords}
          actions={
            <ActionPanel>
              <Action
                title="Open in Chrome"
                icon={Icon.Globe}
                onAction={() =>
                  openInChrome(
                    buildResourceUrl(resource.path, project.projectId),
                  )
                }
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

export default function Command() {
  const [projects, setProjects] = useState<GcpProject[]>([]);
  const [favorites, setFavoritesState] = useState<Set<string>>(new Set());
  const [recents, setRecents] = useState<string[]>([]);
  const [projectKeywords, setProjectKeywords] = useState<
    Record<string, string[]>
  >({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { push } = useNavigation();

  useEffect(() => {
    loadProjects();
    loadFavoritesAndRecents();
  }, []);

  async function loadFavoritesAndRecents() {
    const [favs, recs, kw] = await Promise.all([
      getFavorites(),
      getRecents(),
      getMergedKeywords(),
    ]);
    setFavoritesState(favs);
    setRecents(recs);
    setProjectKeywords(kw);
  }

  async function loadProjects() {
    setIsLoading(true);
    setError(null);

    try {
      const { projects: cached, isStale } = await getProjects();
      setProjects(cached);

      if (isStale) {
        if (cached.length > 0) {
          showToast({
            style: Toast.Style.Animated,
            title: "Refreshing projects in background...",
          });
        }

        try {
          const fresh = await refreshProjectsWithToast();
          setProjects(fresh);
        } catch (err) {
          if (cached.length === 0) {
            setError(
              err instanceof Error ? err.message : "Failed to fetch projects",
            );
          } else {
            showToast({
              style: Toast.Style.Failure,
              title: "Using cached projects",
              message: err instanceof Error ? err.message : "Fetch failed",
            });
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load projects");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleRefresh() {
    setIsLoading(true);
    try {
      const fresh = await refreshProjectsWithToast();
      setProjects(fresh);
      setError(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to refresh projects",
      );
    } finally {
      setIsLoading(false);
    }
  }

  const toggleFavorite = useCallback(
    async (projectId: string) => {
      const newFavorites = new Set(favorites);
      if (newFavorites.has(projectId)) {
        newFavorites.delete(projectId);
      } else {
        newFavorites.add(projectId);
      }
      setFavoritesState(newFavorites);
      await setFavorites(newFavorites);
    },
    [favorites],
  );

  const handleSelectProject = useCallback(
    async (project: GcpProject) => {
      await addRecent(project.projectId);
      setRecents((prev) =>
        [
          project.projectId,
          ...prev.filter((id) => id !== project.projectId),
        ].slice(0, MAX_RECENTS),
      );
      push(<ResourceList project={project} />);
    },
    [push],
  );

  if (error && projects.length === 0) {
    return (
      <List>
        <List.EmptyView
          title="Failed to load projects"
          description={error}
          actions={
            <ActionPanel>
              <Action
                title="Refresh"
                icon={Icon.ArrowClockwise}
                onAction={handleRefresh}
              />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  const favoriteProjects = projects.filter((p) => favorites.has(p.projectId));
  const recentProjects = projects.filter(
    (p) => recents.includes(p.projectId) && !favorites.has(p.projectId),
  );
  recentProjects.sort(
    (a, b) => recents.indexOf(a.projectId) - recents.indexOf(b.projectId),
  );
  const otherProjects = projects.filter(
    (p) => !favorites.has(p.projectId) && !recents.includes(p.projectId),
  );

  const renderProjectItem = (project: GcpProject) => (
    <List.Item
      key={project.projectId}
      title={project.name}
      subtitle={project.projectId}
      keywords={projectKeywords[project.projectId]}
      accessories={
        favorites.has(project.projectId) ? [{ icon: Icon.Star }] : []
      }
      actions={
        <ActionPanel>
          <Action
            title="Select Resource"
            icon={Icon.List}
            onAction={() => handleSelectProject(project)}
          />
          <Action
            title={
              favorites.has(project.projectId)
                ? "Remove from Favorites"
                : "Add to Favorites"
            }
            icon={Icon.Star}
            shortcut={{ modifiers: ["cmd"], key: "f" }}
            onAction={() => toggleFavorite(project.projectId)}
          />
          <Action
            title="Add Keywords"
            icon={Icon.Tag}
            shortcut={{ modifiers: ["cmd"], key: "k" }}
            onAction={() =>
              push(
                <AddKeywordForm
                  project={project}
                  existingKeywords={projectKeywords[project.projectId] || []}
                  onSave={async (keywords) => {
                    await saveProjectKeywords(project.projectId, keywords);
                    const kw = await getMergedKeywords();
                    setProjectKeywords(kw);
                  }}
                />,
              )
            }
          />
          <Action
            title="Refresh Projects"
            icon={Icon.ArrowClockwise}
            shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
            onAction={handleRefresh}
          />
        </ActionPanel>
      }
    />
  );

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search projects...">
      {favoriteProjects.length > 0 && (
        <List.Section title="Favorites">
          {favoriteProjects.map(renderProjectItem)}
        </List.Section>
      )}
      {recentProjects.length > 0 && (
        <List.Section title="Recent">
          {recentProjects.map(renderProjectItem)}
        </List.Section>
      )}
      <List.Section
        title={
          favoriteProjects.length > 0 || recentProjects.length > 0
            ? "All Projects"
            : undefined
        }
      >
        {otherProjects.map(renderProjectItem)}
      </List.Section>
    </List>
  );
}
