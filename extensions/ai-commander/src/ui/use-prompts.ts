import { usePromise } from "@raycast/utils";
import { useCallback, useMemo } from "react";
import type { PromptDef } from "../core/types";
import type { SchemaIssue } from "../prompts/schema";
import { getLoadIssues, getPrompts } from "../prompts/store";

export interface PromptsState {
  prompts: PromptDef[];
  isLoading: boolean;
  error?: Error;
  /** Entries in storage this build cannot read. They are kept, but no list shows them. */
  issues: readonly SchemaIssue[];
  reload: () => Promise<void>;
}

const NO_PROMPTS: PromptDef[] = [];

export function usePrompts(): PromptsState {
  // A failed load becomes a recovery view, so the hook's generic failure toast stays off.
  const { data, isLoading, error, revalidate } = usePromise(getPrompts, [], { onError: () => undefined });
  // The store reports the unreadable entries of its latest read, which is the one that produced `data`.
  const issues = useMemo(() => (data ? getLoadIssues() : []), [data]);
  const reload = useCallback(async () => {
    try {
      await revalidate();
    } catch {
      // `error` brings the failure to the view.
    }
  }, [revalidate]);
  return { prompts: data ?? NO_PROMPTS, isLoading, error, issues, reload };
}
