import { useEffect, useState } from "react";
import { get, type PaginatedResponse } from "./utils/fetcher";
import { Cache, List, showToast, Toast } from "@raycast/api";
import { ModEntry } from "./entries/mods/mod-entry";
import { useDebounce } from "./utils/use-debounce";

type ListState = {
  response?: PaginatedResponse<ListModrinthProject>;
  error?: Error;
};

type ProjectState = {
  project?: ModrinthProject;
  error?: Error;
};

// The project data which is returned from the search endpoint.
export type ListModrinthProject = {
  slug: string;
  title: string;
  project_type: "mod" | "modpack" | "resourcepack" | "shader";
  author: string;
  icon_url?: string;
  downloads: number;
  follows: number;
};

// The specific project fetched by slug.
export type ModrinthProject = ListModrinthProject & {
  source_url?: string;
  issues_url?: string;
  wiki_url?: string;
  discord_url?: string;
  donation_urls?: DonationUrl[];
  body: string;
  published: string;
  updated: string;
  approved: string;
};

type DonationUrl = {
  id: string;
  platform: string;
  url: string;
};

const cache = new Cache({ namespace: "mods" });

export default function Command() {
  const [state, setState] = useState<ListState>({});
  const [searchQuery, setSearchQuery] = useState<string | undefined>();
  const [currentProject, setCurrentProject] = useState<ProjectState | undefined>();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    async function searchProjects() {
      try {
        const projects = await get<PaginatedResponse<ListModrinthProject>>("search", {
          query: searchQuery,
          facets: '[["project_type:mod"]]',
        });
        setState({ response: projects });
      } catch (error) {
        setState({ error: error instanceof Error ? error : new Error("An unknown error occurred") });
      }
    }

    searchProjects();
  }, [searchQuery]);

  useEffect(() => {
    async function fetchProject() {
      if (!selectedId) {
        return;
      }

      if (cache.has(selectedId)) {
        setCurrentProject({ project: JSON.parse(cache.get(selectedId)!) as ModrinthProject });
        return;
      }

      try {
        const project = await get<ModrinthProject>(`project/${selectedId}`);
        setCurrentProject({ project });
        cache.set(selectedId, JSON.stringify(project));
      } catch (error) {
        setCurrentProject({
          error: error instanceof Error ? error : new Error("An unknown error occurred"),
        });
      }
    }

    fetchProject();
  }, [selectedId]);

  function handleSearchBarChange(text?: string) {
    setSearchQuery(text);
  }

  if (state.error) {
    showToast({
      style: Toast.Style.Failure,
      title: "Failed searching projects",
      message: state.error.message,
    });
  }

  if (currentProject?.error) {
    showToast({
      style: Toast.Style.Failure,
      title: "Failed fetching project",
      message: currentProject.error.message,
    });
  }

  const debouncedSelectionChange = useDebounce((id: string | null) => {
    if (!id) {
      setSelectedId(null);
      return;
    }

    setSelectedId(id);
  }, 300);

  return (
    <List
      isLoading={!state.response?.hits && !state.error}
      searchBarPlaceholder="Search for any modrinth mod"
      onSearchTextChange={handleSearchBarChange}
      onSelectionChange={debouncedSelectionChange}
      throttle
      isShowingDetail
    >
      {state.response?.hits?.map((item) => {
        return (
          <ModEntry
            key={item.slug}
            listProject={item}
            project={selectedId === item.slug ? currentProject?.project : undefined}
            isSelected={selectedId === item.slug}
            isLoading={selectedId === item.slug && !currentProject?.error && !currentProject?.project}
          />
        );
      })}
      {!state.response?.hits.length && (
        <List.EmptyView
          title="Your search seems to narrow"
          description="It looks like the specified mod could not be found, try typing it again."
        />
      )}
    </List>
  );
}
