import { useCallback, useEffect, useRef, useState } from "react";
import { queryAll, type Entity, type Session } from "../helper";
import { session } from "../session";

/** Collection/tag options share cancellation and library ownership, not a global cache. */
export function useEntities(kind: "collection" | "tag", bound?: Session | null) {
  const [result, setResult] = useState<{ entities: Entity[]; libraryId: string }>();
  const [error, setError] = useState<Error>();
  const [isLoading, setIsLoading] = useState(true);
  const controller = useRef<AbortController | undefined>(undefined);
  const load = useCallback(async () => {
    controller.current?.abort();
    const current = new AbortController();
    controller.current = current;
    setError(undefined);
    if (bound === null) {
      setResult(undefined);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const active = bound ?? (await session());
      if (current.signal.aborted) return;
      setResult((previous) => (previous?.libraryId === active.libraryId ? previous : undefined));
      const rows = await queryAll(active, { kind }, current.signal);
      if (!current.signal.aborted) setResult({ entities: rows.items, libraryId: active.libraryId });
    } catch (cause) {
      if (
        !current.signal.aborted &&
        cause instanceof Error &&
        "code" in cause &&
        cause.code === "LIBRARY_MISMATCH"
      )
        setResult(undefined);
      if (!current.signal.aborted) setError(cause instanceof Error ? cause : new Error(String(cause)));
    } finally {
      if (!current.signal.aborted) setIsLoading(false);
    }
  }, [kind, bound]);
  useEffect(() => {
    void load();
    return () => controller.current?.abort();
  }, [load]);
  const visible = bound === null || (bound && result?.libraryId !== bound.libraryId) ? undefined : result;
  return {
    entities: error ? undefined : visible?.entities,
    libraryId: visible?.libraryId,
    error,
    isLoading,
    revalidate: load,
  };
}
