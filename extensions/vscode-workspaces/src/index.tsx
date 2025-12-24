import React, { useEffect, useState } from "react";
import { showToast, Toast, confirmAlert, Alert, closeMainWindow } from "@raycast/api";
import WorkspaceList from "./components/WorkspaceList";
import type { WorkspaceWithMetadata, SortOption } from "./types";
import { loadWorkspaces, deleteWorkspaceById } from "./services/workspaceService";
import { assignIconsToWorkspaces } from "./services/iconService";
import { openWorkspaceInEditor } from "./services/editorService";
import { openInTerminal, revealInFinder } from "./services/terminalService";
import {
  getAllWorkspaceMetadata,
  toggleFavorite,
  updateLastOpened,
  getSortPreference,
  setSortPreference,
} from "./services/storageService";

export default function Command() {
  const [workspaces, setWorkspaces] = useState<WorkspaceWithMetadata[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sortOption, setSortOption] = useState<SortOption>("recently-opened");

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        // Load workspaces and metadata
        const list = await loadWorkspaces();
        const withIcons = await assignIconsToWorkspaces(list);
        const metadata = await getAllWorkspaceMetadata(list.map((w) => w.id));
        const preference = await getSortPreference();

        const withMetadata: WorkspaceWithMetadata[] = withIcons.map((w) => ({
          ...w,
          metadata: metadata[w.id] || { isFavorite: false, tags: [] },
        }));

        if (!mounted) return;

        setSortOption(preference);
        setWorkspaces(sortWorkspaces(withMetadata, preference));

        if (!list.length) {
          await showToast({
            style: Toast.Style.Failure,
            title: "No workspaces found",
            message: "Could not find any VS Code workspaces",
          });
        }
      } catch (err) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Error loading workspaces",
          message: err instanceof Error ? err.message : String(err),
        });
      } finally {
        if (mounted) setIsLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  // Sort workspaces based on selected option
  function sortWorkspaces(items: WorkspaceWithMetadata[], option: SortOption): WorkspaceWithMetadata[] {
    const sorted = [...items];

    switch (option) {
      case "favorites-first":
        sorted.sort((a, b) => {
          if (a.metadata.isFavorite === b.metadata.isFavorite) {
            return a.name.localeCompare(b.name);
          }
          return a.metadata.isFavorite ? -1 : 1;
        });
        break;

      case "recently-opened":
        sorted.sort((a, b) => {
          const aTime = a.metadata.lastOpened || 0;
          const bTime = b.metadata.lastOpened || 0;
          if (aTime === bTime) return a.name.localeCompare(b.name);
          return bTime - aTime; // Most recent first
        });
        break;

      case "project-type":
        sorted.sort((a, b) => {
          if (a.icon === b.icon) return a.name.localeCompare(b.name);
          return a.icon.localeCompare(b.icon);
        });
        break;

      case "alphabetical":
      default:
        sorted.sort((a, b) => a.name.localeCompare(b.name));
        break;
    }

    return sorted;
  }

  async function handleSortChange(newSort: SortOption) {
    setSortOption(newSort);
    await setSortPreference(newSort);
    setWorkspaces((prev) => sortWorkspaces(prev, newSort));
  }

  async function handleOpen(w: WorkspaceWithMetadata) {
    try {
      await showToast({
        style: Toast.Style.Animated,
        title: "Opening workspace",
        message: w.name,
      });

      await openWorkspaceInEditor(w.path, "code");
      await updateLastOpened(w.id);

      // Update the workspace in state
      setWorkspaces((prev) =>
        prev.map((workspace) =>
          workspace.id === w.id
            ? { ...workspace, metadata: { ...workspace.metadata, lastOpened: Date.now() } }
            : workspace,
        ),
      );

      await closeMainWindow();
      await showToast({
        style: Toast.Style.Success,
        title: "Opened workspace",
        message: w.name,
      });
    } catch (err) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to open workspace",
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }

  async function handleToggleFavorite(w: WorkspaceWithMetadata) {
    try {
      const newState = await toggleFavorite(w.id);

      setWorkspaces((prev) =>
        sortWorkspaces(
          prev.map((workspace) =>
            workspace.id === w.id
              ? { ...workspace, metadata: { ...workspace.metadata, isFavorite: newState } }
              : workspace,
          ),
          sortOption,
        ),
      );

      await showToast({
        style: Toast.Style.Success,
        title: newState ? "Added to favorites" : "Removed from favorites",
        message: w.name,
      });
    } catch (err) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to toggle favorite",
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }

  async function handleOpenTerminal(w: WorkspaceWithMetadata) {
    try {
      await showToast({ style: Toast.Style.Animated, title: "Opening terminal", message: w.name });
      await openInTerminal(w.path);
      await closeMainWindow();
      await showToast({ style: Toast.Style.Success, title: "Opened terminal", message: w.name });
    } catch (err) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to open terminal",
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }

  async function handleRevealInFinder(w: WorkspaceWithMetadata) {
    try {
      await showToast({
        style: Toast.Style.Animated,
        title: process.platform === "darwin" ? "Revealing in Finder" : "Revealing in Explorer",
        message: w.name,
      });
      await revealInFinder(w.path);
      await showToast({
        style: Toast.Style.Success,
        title: process.platform === "darwin" ? "Opened in Finder" : "Opened in Explorer",
        message: w.name,
      });
    } catch (err) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to reveal workspace",
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }

  async function handleDelete(w: WorkspaceWithMetadata) {
    const confirmed = await confirmAlert({
      title: "Delete Workspace",
      message: `Are you sure you want to delete "${w.name}"? This will remove it from history.`,
      primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
    });

    if (!confirmed) return;

    try {
      await showToast({
        style: Toast.Style.Animated,
        title: "Deleting workspace...",
        message: w.name,
      });
      await deleteWorkspaceById(w.id);
      setWorkspaces((prev) => prev.filter((x) => x.id !== w.id));
      await showToast({
        style: Toast.Style.Success,
        title: "Workspace deleted",
        message: w.name,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to delete workspace",
        message: msg,
      });
    }
  }

  return (
    <WorkspaceList
      workspaces={workspaces}
      isLoading={isLoading}
      sortOption={sortOption}
      onOpen={handleOpen}
      onToggleFavorite={handleToggleFavorite}
      onOpenTerminal={handleOpenTerminal}
      onRevealInFinder={handleRevealInFinder}
      onDelete={handleDelete}
      onSortChange={handleSortChange}
    />
  );
}
