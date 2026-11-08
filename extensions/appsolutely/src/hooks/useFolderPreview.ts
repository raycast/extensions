import { environment } from "@raycast/api";
import { join } from "node:path";
import { useEffect, useMemo, useState } from "react";
import { folderPreview, folderPreviewEntries, type FolderPreviewEntry } from "../services/folder-previews";
import { applicationIconStore } from "../services/applications";
import { useApplications } from "./useApplications";
import { useLauncherState } from "./useLauncherState";

export function useFolderPreview(folderId: string, enabled = true): string | undefined {
  const { applications } = useApplications();
  const { state } = useLauncherState();
  const entries = useMemo(
    () => (enabled ? folderPreviewEntries(folderId, applications, state) : []),
    [folderId, applications, state, enabled],
  );
  const key = JSON.stringify(entries);
  const [preview, setPreview] = useState<{ key: string; path: string }>();

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    const requestedEntries: FolderPreviewEntry[] = JSON.parse(key);
    if (requestedEntries.length) {
      void folderPreview(
        requestedEntries,
        join(environment.supportPath, "folder-previews-v1"),
        join(environment.supportPath, "icons-v1"),
        controller.signal,
        applicationIconStore.resolve,
      ).then((path) => {
        if (!cancelled && path) setPreview({ key, path });
      });
    }
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [key, applications]);

  return entries.length && preview?.key === key ? preview.path : undefined;
}
