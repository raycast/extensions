import { List, getPreferenceValues } from "@raycast/api";
import * as path from "node:path";
import { useEffect, useMemo, useState } from "react";
import { checkCoreAvailable } from "./core-check";
import { runCoreCommand } from "./core-process";
import { PaperEmptyView } from "./paper-empty-view";
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
    signal: AbortSignal;
  },
): Promise<Paper[]> {
  const { configPath, prefPaperDir, paperDir, libraryDir, pythonBin, agentRoot } = options;

  if (!configPath || !prefPaperDir) {
    return [];
  }

  const rawJson = await withEffectiveConfigPathAsync(configPath, prefPaperDir, (effectiveConfigPath) =>
    runCoreCommand(
      pythonBin,
      ["-m", "paper_agent", "search", "--query", query, "--json", "--config", effectiveConfigPath],
      { cwd: agentRoot, signal: options.signal },
    ),
  );

  return parseCliPapers(rawJson, {
    paperDir,
    libraryDir,
    fallbackDate: "unknown",
  });
}

export default function Command() {
  const prefs = getPreferenceValues<Preferences.SearchPapers>();
  const normalized = useMemo(() => {
    const configPath = prefs.configPath?.trim() ?? "";
    const hasConfig = configPath.length > 0;
    const prefPaperDir = prefs.paperDir?.trim() ?? "";
    const paperDir = prefPaperDir;
    const libraryDir = prefPaperDir ? path.join(prefPaperDir, "library") : "";
    const hasPaperDir = prefPaperDir.length > 0;
    const agentRoot = hasConfig ? path.dirname(configPath) : "";
    const pythonBin =
      prefs.pythonPath && prefs.pythonPath.trim().length > 0
        ? prefs.pythonPath.trim()
        : path.join(agentRoot, ".venv", "bin", "python3");
    return {
      configPath,
      hasConfig,
      prefPaperDir,
      paperDir,
      libraryDir,
      hasPaperDir,
      agentRoot,
      pythonBin,
    };
  }, [prefs.configPath, prefs.paperDir, prefs.pythonPath]);
  const { configPath, hasConfig, prefPaperDir, paperDir, libraryDir, hasPaperDir, agentRoot, pythonBin } = normalized;

  const [searchText, setSearchText] = useState("");
  const [debouncedSearchText, setDebouncedSearchText] = useState("");
  const [papers, setPapers] = useState<Paper[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [coreOk, setCoreOk] = useState<boolean | null>(null);
  const [coreError, setCoreError] = useState("");
  const [loadError, setLoadError] = useState("");
  const [retry, setRetry] = useState(0);
  const retryLoad = () => setRetry((value) => value + 1);

  useEffect(() => {
    if (!hasConfig || !hasPaperDir) return;

    let cancelled = false;
    const controller = new AbortController();
    setCoreOk(null);
    void checkCoreAvailable(
      {
        configPath: prefs.configPath,
        paperDir: prefs.paperDir,
        pythonPath: prefs.pythonPath,
      },
      controller.signal,
    )
      .then((r) => {
        if (cancelled) return;
        setCoreOk(r.ok);
        setCoreError(r.error ?? "");
      })
      .catch(() => {
        if (cancelled) return;
        setCoreOk(false);
        setCoreError("Unable to check Paper Agent. Check extension preferences and retry.");
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [normalized, retry]);

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
    const controller = new AbortController();
    setIsSearching(true);
    setLoadError("");

    void loadSearchResults(debouncedSearchText, {
      configPath,
      prefPaperDir,
      paperDir,
      libraryDir,
      pythonBin,
      agentRoot,
      signal: controller.signal,
    })
      .then((results) => {
        if (cancelled) return;
        setPapers(results);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setPapers([]);
        setLoadError(error instanceof Error ? error.message : "Unable to search papers. Please retry.");
      })
      .finally(() => {
        if (cancelled) return;
        setIsSearching(false);
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [debouncedSearchText, normalized, coreOk]);

  if (!hasConfig || !hasPaperDir) {
    return (
      <List
        isShowingDetail
        searchText={searchText}
        searchBarPlaceholder="Search by title, authors, abstract, date..."
        onSearchTextChange={setSearchText}
      >
        <PaperEmptyView
          title="Set preferences first"
          description="Set both 'Config File Path' and 'Paper Directory' in extension preferences."
        />
      </List>
    );
  }

  if (coreOk === null) {
    return (
      <List
        isLoading
        isShowingDetail
        searchText={searchText}
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
        searchText={searchText}
        searchBarPlaceholder="Search by title, authors, abstract, date..."
        onSearchTextChange={setSearchText}
      >
        <PaperEmptyView title="Core unavailable" description={coreError} onRetry={retryLoad} showInstall />
      </List>
    );
  }

  if (loadError) {
    return (
      <List
        searchText={searchText}
        onSearchTextChange={setSearchText}
        searchBarPlaceholder="Search by title, authors, abstract, date..."
      >
        <PaperEmptyView title="Could not search papers" description={loadError} onRetry={retryLoad} />
      </List>
    );
  }

  return (
    <PaperListView
      papers={papers}
      isLoading={isSearching}
      emptyTitle="No matching papers"
      emptyDescription="Try another search, or run the pipeline to add papers to your library."
      subtitleMode="date-and-authors"
      searchBarPlaceholder="Search by title, authors, abstract, date..."
      onSearchTextChange={setSearchText}
      searchText={searchText}
    />
  );
}
