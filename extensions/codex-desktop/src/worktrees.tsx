import {
  Action,
  ActionPanel,
  Icon,
  List,
  Toast,
  showToast,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { ProjectListItem } from "./components/project-list-item";
import {
  useProjectActions,
  type ProjectListState,
} from "./hooks/use-project-actions";
import { codexDocsUrl } from "./lib/codex";
import { loadProjects, readCachedProjects } from "./lib/project-store";

type WorktreeListState = ProjectListState;

export default function Command() {
  const [state, set] = useState<WorktreeListState>(() => ({
    items: readCachedProjects(),
    loading: true,
  }));
  const {
    toggleFavorite,
    removeProject,
    saveProject,
    chooseAndSaveProjectIcon,
  } = useProjectActions(set);

  useEffect(() => {
    let live = true;
    const hadCachedItems = state.items.length > 0;

    loadProjects()
      .then((data) => {
        if (!live) return;
        set({ items: data.items, loading: false });
      })
      .catch(async (err) => {
        if (!live) return;

        set((current) => {
          if (current.items.length) return { ...current, loading: false };
          return {
            err: err instanceof Error ? err.message : String(err),
            items: [],
            loading: false,
          };
        });

        if (hadCachedItems) {
          await showToast({
            style: Toast.Style.Failure,
            title: "Using cached worktrees",
            message: err instanceof Error ? err.message : String(err),
          });
        }
      });

    return () => {
      live = false;
    };
  }, []);

  if ("err" in state) {
    return (
      <List
        isLoading={state.loading}
        searchBarPlaceholder="Codex worktrees unavailable"
      >
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="Codex worktrees not available"
          description={state.err}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser
                title="Open Codex Docs"
                url={codexDocsUrl()}
              />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  return (
    <List
      isLoading={state.loading}
      searchBarPlaceholder="Search Codex worktrees..."
    >
      {state.items.map((item) => (
        <ProjectListItem
          key={item.id}
          item={item}
          onToggleFavorite={toggleFavorite}
          onRemoveProject={removeProject}
          onSaveProject={saveProject}
          onSaveProjectIcon={chooseAndSaveProjectIcon}
        />
      ))}
    </List>
  );
}
