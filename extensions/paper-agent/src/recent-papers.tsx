import { List, getPreferenceValues } from "@raycast/api";
import * as path from "node:path";
import { useEffect, useMemo, useState } from "react";
import { checkCoreAvailable } from "./core-check";
import { runCoreCommand } from "./core-process";
import { PaperEmptyView } from "./paper-empty-view";
import { withEffectiveConfigPathAsync } from "./config-utils";
import { type Paper, parseCliPapers } from "./paper-utils";
import { PaperListView } from "./paper-list";

const DEFAULT_LIMIT = 30;

async function loadRecentPapers(options: {
  configPath: string;
  prefPaperDir: string;
  paperDir: string;
  libraryDir: string;
  pythonBin: string;
  agentRoot: string;
  limit: number;
  signal: AbortSignal;
}): Promise<Paper[]> {
  const { configPath, prefPaperDir, paperDir, libraryDir, pythonBin, agentRoot, limit } = options;

  if (!configPath || !prefPaperDir) {
    return [];
  }

  const rawJson = await withEffectiveConfigPathAsync(configPath, prefPaperDir, async (effectiveConfigPath) => {
    return runCoreCommand(
      pythonBin,
      ["-m", "paper_agent", "list", "--json", "--limit", String(limit), "--config", effectiveConfigPath],
      { cwd: agentRoot, signal: options.signal },
    );
  });

  return parseCliPapers(rawJson, {
    paperDir,
    libraryDir,
    fallbackDate: "unknown",
  });
}

export default function Command() {
  const prefs = getPreferenceValues<Preferences.RecentPapers>();
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
    const rawLimit = prefs.recentLimit;
    const parsedLimit = parseInt(rawLimit?.trim() ?? "", 10);
    const recentLimit = Number.isNaN(parsedLimit) || parsedLimit < 1 ? DEFAULT_LIMIT : Math.min(parsedLimit, 500);
    return {
      configPath,
      hasConfig,
      prefPaperDir,
      paperDir,
      libraryDir,
      hasPaperDir,
      agentRoot,
      pythonBin,
      recentLimit,
    };
  }, [prefs.configPath, prefs.paperDir, prefs.pythonPath, prefs.recentLimit]);
  const { configPath, hasConfig, prefPaperDir, paperDir, libraryDir, hasPaperDir, agentRoot, pythonBin, recentLimit } =
    normalized;

  const [coreOk, setCoreOk] = useState<boolean | null>(null);
  const [papers, setPapers] = useState<Paper[]>([]);
  const [isLoadingPapers, setIsLoadingPapers] = useState(false);
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
    if (!hasConfig || !hasPaperDir || !coreOk) {
      setPapers([]);
      setIsLoadingPapers(false);
      return;
    }

    let cancelled = false;
    const controller = new AbortController();
    setIsLoadingPapers(true);
    setLoadError("");

    void loadRecentPapers({
      configPath,
      prefPaperDir,
      paperDir,
      libraryDir,
      pythonBin,
      agentRoot,
      limit: recentLimit,
      signal: controller.signal,
    })
      .then((results) => {
        if (cancelled) return;
        setPapers(results);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setPapers([]);
        setLoadError(error instanceof Error ? error.message : "Unable to load papers. Please retry.");
      })
      .finally(() => {
        if (cancelled) return;
        setIsLoadingPapers(false);
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [normalized, coreOk]);

  if (!hasConfig || !hasPaperDir) {
    return (
      <List>
        <PaperEmptyView
          title="Set preferences first"
          description="Set both 'Config File Path' and 'Paper Directory' in extension preferences."
        />
      </List>
    );
  }

  if (coreOk === null) {
    return (
      <List isLoading>
        <List.EmptyView title="Checking core…" description="Verifying Paper Agent is installed." />
      </List>
    );
  }

  if (!coreOk) {
    return (
      <List>
        <PaperEmptyView title="Core unavailable" description={coreError} onRetry={retryLoad} showInstall />
      </List>
    );
  }

  if (loadError) {
    return (
      <List>
        <PaperEmptyView title="Could not load papers" description={loadError} onRetry={retryLoad} />
      </List>
    );
  }

  return (
    <PaperListView
      papers={papers}
      isLoading={isLoadingPapers}
      emptyTitle="No papers yet"
      emptyDescription="Run the pipeline to add papers to your library."
      subtitleMode="date-and-authors"
    />
  );
}
