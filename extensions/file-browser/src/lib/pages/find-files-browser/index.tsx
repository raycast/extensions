import { Action, ActionPanel, Detail, showToast, Toast } from "@raycast/api";
import { useCallback, useEffect, useRef, useState } from "react";
import { Contents, type ContentsSortMode, type ContentsViewMode } from "$lib/components/contents";
import type { ContentsSection } from "$lib/components/contents/types";
import { isNavigableDirectory } from "$lib/item-behavior";
import { ItemDetail } from "$lib/pages/item-detail";
import { ItemEdit } from "$lib/pages/item-edit";
import { execHydrateItems, useFinderTags, createItem, copyItem, moveItem } from "$lib/ray-fb";
import { generateSearchArtifact } from "$lib/pages/find-files-browser/logic/ai-artifact-generator";
import { executeSearchWithArtifact, SearchExecutionError } from "$lib/pages/find-files-browser/logic/search-executor";
import { PromptAssetError } from "$lib/pages/find-files-browser/logic/prompt-loader";
import { resolveSymlink } from "$lib/symlink-resolve";
import type { FindFilesSearchArtifact } from "$lib/pages/find-files-browser/logic/types";
import type { Item } from "$lib/types";
import { DirectoryBrowser } from "../directory-browser";
import { EditSearchForm } from "./edit-search-form";
import type { FindFilesBrowserProps } from "./types";

type SearchPhase = "generating" | "searching" | "hydrating" | "done" | "error";

interface SearchError {
  kind: "generation" | "config" | "execution";
  message: string;
  path?: string;
}

function classifyError(err: unknown): SearchError {
  if (err instanceof PromptAssetError) {
    return { kind: "config", message: err.message, path: err.path };
  }
  if (err instanceof SearchExecutionError) {
    return { kind: "execution", message: err.message };
  }
  return { kind: "execution", message: err instanceof Error ? err.message : String(err) };
}

export function FindFilesBrowser({
  query,
  scopePath,
  initialArtifact,
  initialView = "list",
  initialSort = "name-asc",
  gridColumns = 6,
  enabledAccessories = { showHidden: true, showTags: true, showSize: true },
  onArtifactGenerated,
  enterAction = "detail",
}: FindFilesBrowserProps) {
  const [view, setView] = useState<ContentsViewMode>(initialView);
  const [sort, setSort] = useState<ContentsSortMode>(initialSort);

  const [phase, setPhase] = useState<SearchPhase>("generating");
  const [artifact, setArtifact] = useState<FindFilesSearchArtifact | null>(null);
  const [searchPaths, setSearchPaths] = useState<string[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [error, setError] = useState<SearchError | null>(null);
  const [showEditForm, setShowEditForm] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const editSearchSeq = useRef(0);
  const { data: tagCatalog } = useFinderTags();

  // Search effect: AI artifact generation → native search → hydration
  // Depends on query, scopePath, retryKey, and initialArtifact (when set).
  // Excludes display controls (showHidden, sort, view).
  useEffect(() => {
    if (!query.trim()) return;

    let cancelled = false;

    async function run() {
      try {
        setError(null);

        let artifactToSearch: FindFilesSearchArtifact;

        if (initialArtifact) {
          artifactToSearch = initialArtifact;
        } else {
          setPhase("generating");
          const genResult = await generateSearchArtifact(query);
          if (cancelled) return;

          if (!genResult.success) {
            setError({ kind: "generation", message: genResult.error });
            setPhase("error");
            return;
          }

          artifactToSearch = genResult.artifact;
          if (onArtifactGenerated) onArtifactGenerated(artifactToSearch);
        }

        setArtifact(artifactToSearch);
        setPhase("searching");
        const searchResult = await executeSearchWithArtifact(artifactToSearch);
        if (cancelled) return;

        if (searchResult.paths.length === 0) {
          setSearchPaths([]);
          setItems([]);
          setPhase("done");
          return;
        }

        setSearchPaths(searchResult.paths);

        setPhase("hydrating");
        const hydrated = await execHydrateItems({
          paths: searchResult.paths,
          showHidden: enabledAccessories.showHidden,
        });
        if (cancelled) return;
        setItems(hydrated);
        setPhase("done");
      } catch (err) {
        if (cancelled) return;
        setError(classifyError(err));
        setPhase("error");
      }
    }

    void run();

    return () => {
      cancelled = true;
    };
  }, [query, scopePath, retryKey, initialArtifact, onArtifactGenerated]);

  // Rehydration effect: when showHidden changes, rehydrate existing paths without re-searching
  useEffect(() => {
    if (phase !== "done" || searchPaths.length === 0) return;

    let cancelled = false;

    async function rehydrate() {
      const hydrated = await execHydrateItems({ paths: searchPaths, showHidden: enabledAccessories.showHidden });
      if (cancelled) return;
      setItems(hydrated);
    }

    void rehydrate();

    return () => {
      cancelled = true;
    };
  }, [enabledAccessories.showHidden, phase, searchPaths]);

  const isLoading = phase === "generating" || phase === "searching" || phase === "hydrating";

  const handleCreateFolder = useCallback(
    async (name: string) => {
      const dir = artifact?.scopePath || scopePath;
      try {
        await createItem({ directoryPath: dir, name });
        await showToast({
          style: Toast.Style.Success,
          title: "Folder Created",
          message: `"${name}" created successfully.`,
        });
      } catch (err) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to Create Folder",
          message: err instanceof Error ? err.message : String(err),
        });
      }
    },
    [artifact, scopePath],
  );

  const handleCopyItem = useCallback(async (sourcePath: string, destinationPath: string) => {
    try {
      await copyItem({ sourcePath, destinationPath });
      await showToast({ style: Toast.Style.Success, title: "Item Copied", message: `Copied to "${destinationPath}".` });
    } catch (err) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to Copy Item",
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }, []);

  const handleMoveItem = useCallback(async (sourcePath: string, destinationPath: string) => {
    try {
      await moveItem({ sourcePath, destinationPath });
      await showToast({ style: Toast.Style.Success, title: "Item Moved", message: `Moved to "${destinationPath}".` });
    } catch (err) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to Move Item",
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }, []);

  const handleEditSearch = useCallback(
    (editedArtifact: FindFilesSearchArtifact) => {
      const seq = ++editSearchSeq.current;
      setArtifact(editedArtifact);
      setError(null);
      setPhase("searching");

      (async () => {
        try {
          const searchResult = await executeSearchWithArtifact(editedArtifact);
          if (editSearchSeq.current !== seq) return;

          if (searchResult.paths.length === 0) {
            setSearchPaths([]);
            setItems([]);
            setPhase("done");
            return;
          }

          setSearchPaths(searchResult.paths);
          setPhase("hydrating");
          const hydrated = await execHydrateItems({
            paths: searchResult.paths,
            showHidden: enabledAccessories.showHidden,
          });
          if (editSearchSeq.current !== seq) return;
          setItems(hydrated);
          setPhase("done");
        } catch (err) {
          if (editSearchSeq.current !== seq) return;
          setError(classifyError(err));
          setPhase("error");
        }
      })();
    },
    [enabledAccessories.showHidden],
  );

  const handleRetry = useCallback(() => {
    setError(null);
    setRetryKey((k) => k + 1);
  }, []);

  const createDirectoryTarget = useCallback(
    (dirPath: string) => (
      <DirectoryBrowser
        path={dirPath}
        initialView={view}
        initialSort={sort}
        gridColumns={gridColumns}
        enabledAccessories={enabledAccessories}
        enterAction={enterAction}
      />
    ),
    [view, sort, gridColumns, enabledAccessories, enterAction],
  );

  const createItemActionCallbacks = useCallback(
    (entry: Item) => ({
      onCreateFolder: handleCreateFolder,
      onCopyItem: async (dest: string) => handleCopyItem(entry.path, dest),
      onMoveItem: async (dest: string) => handleMoveItem(entry.path, dest),
    }),
    [handleCreateFolder, handleCopyItem, handleMoveItem],
  );

  const effectiveScope = artifact?.scopePath || scopePath;
  const scopeLabel = effectiveScope
    ? (effectiveScope.split("/").filter(Boolean).pop() ?? effectiveScope)
    : "everywhere";
  const displayItems = phase === "done" ? items : [];

  const buildItem = (entry: Item) => {
    const itemActionCallbacks = createItemActionCallbacks(entry);
    const navDir = isNavigableDirectory(entry);
    const resolvedSymlink = entry.type === "symlink" ? resolveSymlink(entry.path) : null;
    const symlinkTargetPath = resolvedSymlink?.targetIsDirectory ? resolvedSymlink.resolvedPath : null;

    const buildDirectoryTarget = () => (navDir ? createDirectoryTarget(entry.path) : undefined);
    const buildSymlinkDirectoryTarget = () =>
      symlinkTargetPath ? createDirectoryTarget(symlinkTargetPath) : undefined;
    const buildEditTarget = () => (
      <ItemEdit
        entry={entry}
        directoryTarget={buildDirectoryTarget()}
        symlinkDirectoryTarget={buildSymlinkDirectoryTarget()}
        onCreateFolder={itemActionCallbacks.onCreateFolder}
        onCopyItem={itemActionCallbacks.onCopyItem}
        onMoveItem={itemActionCallbacks.onMoveItem}
      />
    );

    return (
      <Contents.Item
        key={entry.path}
        entry={entry}
        enabledAccessories={enabledAccessories}
        totalEntries={displayItems.length}
        tagCatalog={tagCatalog}
        actions={
          <Contents.ItemActionPanel
            type={entry.type}
            path={entry.path}
            enterAction={enterAction}
            onCreateFolder={itemActionCallbacks.onCreateFolder}
            onCopyItem={itemActionCallbacks.onCopyItem}
            onMoveItem={itemActionCallbacks.onMoveItem}
            target={buildDirectoryTarget()}
            symlinkDirectoryTarget={buildSymlinkDirectoryTarget()}
            detail={
              <ItemDetail
                entry={entry}
                tagCatalog={tagCatalog}
                directoryTarget={buildDirectoryTarget()}
                symlinkDirectoryTarget={buildSymlinkDirectoryTarget()}
                editTarget={buildEditTarget()}
              />
            }
            edit={buildEditTarget()}
          />
        }
      />
    );
  };

  const folders = displayItems.filter((entry) => isNavigableDirectory(entry));
  const files = displayItems.filter((entry) => !isNavigableDirectory(entry));
  const sections: ContentsSection[] = [];

  if (folders.length > 0) {
    sections.push({ title: "Folders", subtitle: String(folders.length), children: folders.map(buildItem) });
  }
  if (files.length > 0) {
    sections.push({ title: "Files", subtitle: String(files.length), children: files.map(buildItem) });
  }

  if (phase === "error" && error) {
    if (showEditForm) {
      const editArtifact: FindFilesSearchArtifact = artifact ?? {
        naturalQuery: query,
        predicate: "",
        scopePath: "",
        scopeMode: "recursive",
        interpretation: "",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      return <EditSearchForm initialArtifact={editArtifact} onSubmit={handleEditSearch} />;
    }

    let markdown: string;
    let detailActions: JSX.Element | undefined;

    switch (error.kind) {
      case "generation":
        markdown = `## Search Generation Failed\n\n${error.message}\n\n> Try editing the search parameters or search again.`;
        detailActions = (
          <ActionPanel>
            <Action title="Edit Search Form" onAction={() => setShowEditForm(true)} />
            <Action title="Try Again" onAction={handleRetry} />
          </ActionPanel>
        );
        break;
      case "config":
        markdown = `## Configuration Error\n\n${error.message}${error.path ? `\n\n**Path:** \`${error.path}\`` : ""}\n\n> This is a setup issue. Ensure the prompt asset file exists in the extension assets directory.`;
        break;
      case "execution":
        markdown = `## Search Failed\n\n\`${error.message}\`\n\n> The native search bridge returned an error.`;
        break;
    }

    return <Detail markdown={markdown} actions={detailActions} />;
  }

  let emptyTitle: string | undefined;
  let emptyDescription: string | undefined;

  if (phase === "done" && items.length === 0 && artifact) {
    emptyTitle = "No Results";
    emptyDescription = `No files matching "${query}" were found in ${scopeLabel}.`;
  } else if (isLoading) {
    if (phase === "generating") {
      emptyTitle = "Generating Search…";
      emptyDescription = `Building search query for "${query}"…`;
    } else if (phase === "searching") {
      emptyTitle = "Searching…";
      emptyDescription = `Looking for "${query}" in ${scopeLabel}…`;
    } else {
      emptyTitle = "Loading Results…";
      emptyDescription = "Hydrating file metadata…";
    }
  }

  return (
    <Contents
      view={view}
      path={`Search: "${query}"`}
      counts={displayItems.length}
      isLoading={isLoading}
      searchBarAccessory={<Contents.Dropdown view={view} sort={sort} onViewChange={setView} onSortChange={setSort} />}
      columns={gridColumns}
      sections={sections}
      emptyTitle={emptyTitle}
      emptyDescription={emptyDescription}
      actions={
        <ActionPanel>
          <Action.Push
            title="Edit Search"
            target={<EditSearchForm initialArtifact={artifact ?? undefined} onSubmit={handleEditSearch} />}
            shortcut={{ modifiers: ["cmd"], key: "e" }}
          />
        </ActionPanel>
      }
    />
  );
}
