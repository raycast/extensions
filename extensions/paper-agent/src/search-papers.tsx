import { Action, ActionPanel, List, getPreferenceValues, open } from "@raycast/api";
import * as path from "node:path";
import { execFile } from "node:child_process";
import { useEffect, useState } from "react";
import { checkCoreAvailable, CORE_INSTALL_URL, getBootstrapCopyText } from "./core-check";
import { withEffectiveConfigPathAsync } from "./config-utils";
import { type Paper, parseCliPapers } from "./paper-utils";
import { PaperListView } from "./paper-list";

const SEARCH_DEBOUNCE_MS = 250;

async function loadSearchResults(
  query: string,
  options: {
    configPath: string;
    prefPaperDir: string;
    paperDir: string;
    libraryDir: string;
    pythonBin: string;
    agentRoot: string;
  },
): Promise<Paper[]> {
  const { configPath, prefPaperDir, paperDir, libraryDir, pythonBin, agentRoot } = options;

  if (!configPath || !prefPaperDir) {
    return [];
  }

  try {
    const rawJson = await withEffectiveConfigPathAsync(
      configPath,
      prefPaperDir,
      (effectiveConfigPath) =>
        new Promise<string>((resolve, reject) => {
          execFile(
            pythonBin,
            ["-m", "paper_agent", "search", "--query", query, "--json", "--config", effectiveConfigPath],
            { cwd: agentRoot, encoding: "utf-8" },
            (error, stdout) => {
              if (error) {
                reject(error);
                return;
              }
              resolve(stdout);
            },
          );
        }),
    );

    return parseCliPapers(rawJson, {
      paperDir,
      libraryDir,
      fallbackDate: "unknown",
    });
  } catch {
    return [];
  }
}

function CoreNotFoundEmptyView() {
  return (
    <List.EmptyView
      title="Core not found"
      description={`Install: ${CORE_INSTALL_URL} — or run the bootstrap command (Copy action).`}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Bootstrap Command" content={getBootstrapCopyText()} />
          <Action title="Open GitHub" onAction={() => open(CORE_INSTALL_URL)} />
        </ActionPanel>
      }
    />
  );
}

export default function Command() {
  const prefs = getPreferenceValues<Preferences.SearchPapers>();
  const configPath = prefs.configPath?.trim() ?? "";
  const hasConfig = configPath.length > 0;
  const prefPaperDir = prefs.paperDir?.trim() ?? "";
  const paperDir = prefPaperDir;
  const libraryDir = prefPaperDir ? path.join(prefPaperDir, "library") : "";
  const hasPaperDir = prefPaperDir.length > 0;
  const agentRoot = hasConfig ? path.dirname(configPath) : "";
  const pythonBin =
    prefs.pythonPath && prefs.pythonPath.trim().length > 0
      ? prefs.pythonPath
      : path.join(agentRoot, ".venv", "bin", "python3");

  const [searchText, setSearchText] = useState("");
  const [debouncedSearchText, setDebouncedSearchText] = useState("");
  const [papers, setPapers] = useState<Paper[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [coreOk, setCoreOk] = useState<boolean | null>(null);

  useEffect(() => {
    if (!hasConfig || !hasPaperDir) return;
    checkCoreAvailable({
      configPath: prefs.configPath,
      paperDir: prefs.paperDir,
      pythonPath: prefs.pythonPath,
    }).then((r) => setCoreOk(r.ok));
  }, [hasConfig, hasPaperDir, prefs.configPath, prefs.paperDir, prefs.pythonPath]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchText(searchText);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [searchText]);

  useEffect(() => {
    if (!hasConfig || !hasPaperDir || !coreOk) {
      setPapers([]);
      setIsSearching(false);
      return;
    }

    let cancelled = false;
    setIsSearching(true);

    void loadSearchResults(debouncedSearchText, {
      configPath,
      prefPaperDir,
      paperDir,
      libraryDir,
      pythonBin,
      agentRoot,
    })
      .then((results) => {
        if (cancelled) return;
        setPapers(results);
      })
      .catch(() => {
        if (cancelled) return;
        setPapers([]);
      })
      .finally(() => {
        if (cancelled) return;
        setIsSearching(false);
      });

    return () => {
      cancelled = true;
    };
  }, [
    debouncedSearchText,
    coreOk,
    hasConfig,
    hasPaperDir,
    configPath,
    prefPaperDir,
    paperDir,
    libraryDir,
    pythonBin,
    agentRoot,
  ]);

  if (!hasConfig || !hasPaperDir) {
    return (
      <List
        isShowingDetail
        searchBarPlaceholder="Search by title, authors, abstract, date..."
        onSearchTextChange={setSearchText}
      >
        <List.EmptyView
          title="Set preferences first"
          description="Set both 'Config File Path' and 'Paper Directory' in extension preferences."
        />
      </List>
    );
  }

  if (coreOk === null) {
    return (
      <List
        isShowingDetail
        searchBarPlaceholder="Search by title, authors, abstract, date..."
        onSearchTextChange={setSearchText}
      >
        <List.EmptyView title="Checking core…" description="Verifying Paper Agent is installed." />
      </List>
    );
  }

  if (!coreOk) {
    return (
      <List
        isShowingDetail
        searchBarPlaceholder="Search by title, authors, abstract, date..."
        onSearchTextChange={setSearchText}
      >
        <CoreNotFoundEmptyView />
      </List>
    );
  }

  return (
    <PaperListView
      papers={papers}
      isLoading={isSearching}
      emptyTitle="No papers or CLI failed"
      emptyDescription="Run the pipeline at least once, or check Config path and Paper directory."
      subtitleMode="date-and-authors"
      searchBarPlaceholder="Search by title, authors, abstract, date..."
      onSearchTextChange={setSearchText}
    />
  );
}
