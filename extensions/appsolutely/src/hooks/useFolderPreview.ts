import { environment } from "@raycast/api";
import { join } from "node:path";
import { useMemo, useRef } from "react";
import { usePromise } from "@raycast/utils";
import { folderPreview, folderPreviewEntries, type FolderPreviewEntry } from "../services/folder-previews";
import { applicationIconStore } from "../services/applications";
import { useApplications } from "./useApplications";
import { useLauncherState } from "./useLauncherState";

export function useFolderPreview(folderId: string, enabled = true): string | undefined {
  const { applications, revision } = useApplications();
  const { state } = useLauncherState();
  const entries = useMemo(
    () => (enabled ? folderPreviewEntries(folderId, applications, state) : []),
    [folderId, applications, state, enabled],
  );
  const key = JSON.stringify([entries, revision]);
  const abortable = useRef<AbortController | null>(null);
  const { data: preview } = usePromise(
    async (requestedKey: string) => {
      const [requestedEntries]: [FolderPreviewEntry[], number] = JSON.parse(requestedKey);
      const path = await folderPreview(
        requestedEntries,
        join(environment.supportPath, "folder-previews-v1"),
        join(environment.supportPath, "icons-v1"),
        abortable.current?.signal,
        applicationIconStore.resolve,
      );
      return { key: requestedKey, path };
    },
    [key],
    { abortable, execute: entries.length > 0, onError: () => undefined },
  );

  return entries.length && preview?.key === key ? preview.path : undefined;
}
