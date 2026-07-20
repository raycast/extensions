import { watch } from "node:fs";
import { useCallback, useEffect, useRef, useState } from "react";

import { loadTranscript } from "../lib/sessions";
import { ChatSession, Transcript } from "../lib/types";

export function useTranscript(session: ChatSession) {
  const [transcript, setTranscript] = useState<Transcript>();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error>();
  const isReloading = useRef(false);

  const reload = useCallback(async () => {
    if (isReloading.current) return;
    isReloading.current = true;
    try {
      const nextTranscript = await loadTranscript(session);
      setTranscript((currentTranscript) =>
        transcriptsMatch(currentTranscript, nextTranscript) ? currentTranscript : nextTranscript,
      );
      setError(undefined);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError : new Error(String(loadError)));
    } finally {
      setIsLoading(false);
      isReloading.current = false;
    }
  }, [session]);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    let debounceTimer: ReturnType<typeof setTimeout> | undefined;
    const scheduleReload = () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => void reload(), 500);
    };

    let watcher: ReturnType<typeof watch> | undefined;
    try {
      watcher = watch(session.sourcePath, scheduleReload);
    } catch {
      watcher = undefined;
    }

    const interval = setInterval(() => void reload(), session.isActive ? 1_500 : 5_000);
    return () => {
      watcher?.close();
      clearInterval(interval);
      clearTimeout(debounceTimer);
    };
  }, [reload, session.isActive, session.sourcePath]);

  return { transcript, isLoading, error, reload };
}

function transcriptsMatch(current: Transcript | undefined, next: Transcript): boolean {
  if (!current || current.truncated !== next.truncated || current.messages.length !== next.messages.length)
    return false;
  return current.messages.every((currentMessage, index) => {
    const nextMessage = next.messages[index];
    return (
      currentMessage.id === nextMessage.id &&
      currentMessage.role === nextMessage.role &&
      currentMessage.content === nextMessage.content &&
      currentMessage.timestamp === nextMessage.timestamp &&
      currentMessage.model === nextMessage.model
    );
  });
}
