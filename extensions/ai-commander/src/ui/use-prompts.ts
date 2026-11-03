import { useCallback, useEffect, useState } from "react";
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

export function usePrompts(): PromptsState {
  const [prompts, setPrompts] = useState<PromptDef[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error>();
  const [issues, setIssues] = useState<readonly SchemaIssue[]>([]);

  const reload = useCallback(async () => {
    try {
      setPrompts(await getPrompts());
      setIssues(getLoadIssues());
      setError(undefined);
    } catch (cause) {
      setError(cause instanceof Error ? cause : new Error(String(cause)));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { prompts, isLoading, error, issues, reload };
}
