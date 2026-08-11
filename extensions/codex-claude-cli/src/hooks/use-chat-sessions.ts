import { getPreferenceValues } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { watch, FSWatcher } from "node:fs";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { listChatSessions, resolveDataRoots, sessionWatchPaths } from "../lib/sessions";
import { ChatSession } from "../lib/types";

export function useChatSessions({ notifyOnError = true }: { notifyOnError?: boolean } = {}) {
  const preferences = getPreferenceValues<Preferences>();
  const roots = useMemo(() => resolveDataRoots(preferences), [preferences.claudeHome, preferences.codexHome]);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error>();
  const isReloading = useRef(false);
  const shouldReloadAgain = useRef(false);

  const reload = useCallback(async () => {
    if (isReloading.current) {
      shouldReloadAgain.current = true;
      return;
    }

    isReloading.current = true;
    try {
      const nextSessions = await listChatSessions(roots);
      setSessions((currentSessions) =>
        chatSessionsMatch(currentSessions, nextSessions) ? currentSessions : nextSessions,
      );
      setError(undefined);
    } catch (loadError) {
      const normalizedError = loadError instanceof Error ? loadError : new Error(String(loadError));
      setError(normalizedError);
      if (notifyOnError) {
        await showFailureToast(normalizedError, {
          title: "Could Not Read Local Histories",
        });
      }
    } finally {
      setIsLoading(false);
      isReloading.current = false;
      if (shouldReloadAgain.current) {
        shouldReloadAgain.current = false;
        void reload();
      }
    }
  }, [notifyOnError, roots]);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    const watchers: FSWatcher[] = [];
    let debounceTimer: ReturnType<typeof setTimeout> | undefined;
    const scheduleReload = () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => void reload(), 900);
    };

    for (const sourcePath of sessionWatchPaths(roots)) {
      try {
        watchers.push(watch(sourcePath, { recursive: true }, scheduleReload));
      } catch {
        continue;
      }
    }

    const interval = setInterval(() => void reload(), 15_000);
    return () => {
      clearInterval(interval);
      clearTimeout(debounceTimer);
      watchers.forEach((watcher) => watcher.close());
    };
  }, [reload, roots]);

  return { sessions, isLoading, error, reload, roots };
}

function chatSessionsMatch(currentSessions: ChatSession[], nextSessions: ChatSession[]): boolean {
  if (currentSessions.length !== nextSessions.length) return false;
  return currentSessions.every((current, index) => {
    const next = nextSessions[index];
    return (
      current.id === next.id &&
      current.provider === next.provider &&
      current.title === next.title &&
      current.nativeTitle === next.nativeTitle &&
      current.preview === next.preview &&
      current.projectName === next.projectName &&
      current.cwd === next.cwd &&
      current.sourcePath === next.sourcePath &&
      current.createdAt === next.createdAt &&
      current.updatedAt === next.updatedAt &&
      current.size === next.size &&
      current.userMessageCount === next.userMessageCount &&
      current.isActive === next.isActive &&
      current.model === next.model &&
      current.cliVersion === next.cliVersion
    );
  });
}
