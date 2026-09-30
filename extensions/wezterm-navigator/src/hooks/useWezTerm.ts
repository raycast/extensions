import { useExec } from "@raycast/utils";
import { findWezTermBinary, parsePaneEntries, groupByWorkspace } from "../utils/wezterm";
import type { WezTermPaneEntry, WezTermTab, WezTermWorkspace } from "../types";

interface UseWezTermTabsResult {
  tabs: WezTermTab[];
  workspaces: WezTermWorkspace[];
  isLoading: boolean;
  error: string | undefined;
  revalidate: () => void;
  isWezTermInstalled: boolean;
}

/**
 * Hook to list all WezTerm tabs and panes, grouped by workspace.
 * Uses useExec to run `wezterm cli list --format json`.
 */
export function useWezTermTabs(): UseWezTermTabsResult {
  const binary = findWezTermBinary();

  const { data, isLoading, error, revalidate } = useExec(binary ?? "wezterm", ["cli", "list", "--format", "json"], {
    shell: true,
    env: {
      PATH: `/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:${process.env.PATH ?? ""}`,
    },
    execute: binary !== null,
    keepPreviousData: true,
    parseOutput: ({ stdout }) => {
      if (!stdout.trim()) return { tabs: [], workspaces: [] };
      try {
        const entries: WezTermPaneEntry[] = JSON.parse(stdout);
        const tabs = parsePaneEntries(entries);
        const workspaces = groupByWorkspace(tabs);
        return { tabs, workspaces };
      } catch {
        return { tabs: [], workspaces: [] };
      }
    },
    failureToastOptions: {
      title: "Failed to List WezTerm Tabs",
      message: "Make sure WezTerm is running",
    },
  });

  return {
    tabs: data?.tabs ?? [],
    workspaces: data?.workspaces ?? [],
    isLoading,
    error: error?.message,
    revalidate,
    isWezTermInstalled: binary !== null,
  };
}
