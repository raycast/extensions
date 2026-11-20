import { useCachedPromise } from "@raycast/utils";
import type { ApiTag } from "pond-api";
import { useMemo } from "react";
import { pond } from "../api/client";
import { type FolderPath, folderPaths } from "./display";

async function loadTags() {
  return pond().tags();
}

async function loadFolders() {
  return folderPaths(await pond().folders());
}

async function loadViews() {
  return (await pond().views()).filter((view) => view.kind !== "group");
}

async function loadSources() {
  return pond().sources();
}

async function loadGroups() {
  return (await pond().views()).filter((view) => view.kind === "group");
}

const quiet = { keepPreviousData: true, onError: () => undefined };

export function useTags() {
  return useCachedPromise(loadTags, [], quiet);
}

export function useFolders() {
  return useCachedPromise(loadFolders, [], quiet);
}

export function useViews() {
  return useCachedPromise(loadViews, [], quiet);
}

export function useViewGroups() {
  return useCachedPromise(loadGroups, [], quiet);
}

export function useSources() {
  return useCachedPromise(loadSources, [], quiet);
}

export interface Lookups {
  tags: ApiTag[];
  folders: FolderPath[];
  folderById: ReadonlyMap<string, FolderPath>;
  revalidate: () => void;
}

/** Tags and folders every save row needs for its submenus and detail pane. */
export function useLookups(): Lookups {
  const tags = useTags();
  const folders = useFolders();
  const folderById = useMemo(() => new Map((folders.data ?? []).map((folder) => [folder.id, folder])), [folders.data]);
  return {
    tags: tags.data ?? [],
    folders: folders.data ?? [],
    folderById,
    revalidate: () => {
      tags.revalidate();
      folders.revalidate();
    },
  };
}
