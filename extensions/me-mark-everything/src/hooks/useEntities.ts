import { usePromise } from "@raycast/utils";
import { useRef } from "react";
import { queryAll, type Session } from "../helper";
import { session } from "../session";

/** Collection/tag options are scoped to the bound library and never cached globally. */
export function useEntities(kind: "collection" | "tag", bound?: Session | null) {
  const abortable = useRef<AbortController | undefined>(undefined);
  const library = useRef<string | undefined>(undefined);
  const request = usePromise(
    async (entityKind: "collection" | "tag", binding?: Session | null) => {
      const signal = abortable.current?.signal;
      const active = binding ?? (await session());
      signal?.throwIfAborted();
      library.current = active.libraryId;
      const rows = await queryAll(active, { kind: entityKind }, signal);
      return { entities: rows.items, libraryId: active.libraryId };
    },
    [kind, bound],
    {
      execute: bound !== null,
      abortable,
      onError: (error) => {
        // Keep the filter identity through ordinary read failures, but never a library mismatch.
        if ("code" in error && error.code === "LIBRARY_MISMATCH") library.current = undefined;
      },
    },
  );
  const visible = bound === null || (bound && request.data?.libraryId !== bound.libraryId) ? undefined : request.data;
  return {
    entities: request.error ? undefined : visible?.entities,
    libraryId: bound === null ? undefined : library.current,
    error: bound === null ? undefined : request.error,
    isLoading: request.isLoading,
    revalidate: request.revalidate,
  };
}
