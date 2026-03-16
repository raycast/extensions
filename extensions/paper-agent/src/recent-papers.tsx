import { Action, ActionPanel, List, getPreferenceValues, open } from "@raycast/api";
import * as path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { useEffect, useMemo, useState } from "react";
import { checkCoreAvailable, CORE_INSTALL_URL, getBootstrapCopyText } from "./core-check";
import { withEffectiveConfigPathAsync } from "./config-utils";
import { type Paper, parseCliPapers } from "./paper-utils";
import { PaperListView } from "./paper-list";

const execFileAsync = promisify(execFile);
const DEFAULT_LIMIT = 30;

async function loadRecentPapers(options: {
  configPath: string;
  prefPaperDir: string;
  paperDir: string;
  libraryDir: string;
  pythonBin: string;
  agentRoot: string;
  limit: number;
}): Promise<Paper[]> {
  const { configPath, prefPaperDir, paperDir, libraryDir, pythonBin, agentRoot, limit } = options;

  if (!configPath || !prefPaperDir) {
    return [];
  }

  try {
    const rawJson = await withEffectiveConfigPathAsync(configPath, prefPaperDir, async (effectiveConfigPath) => {
      const result = await execFileAsync(
        pythonBin,
        ["-m", "paper_agent", "list", "--json", "--limit", String(limit), "--config", effectiveConfigPath],
        { cwd: agentRoot, encoding: "utf-8" },
      );
      return result.stdout;
    });

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
        ? prefs.pythonPath
        : path.join(agentRoot, ".venv", "bin", "python3");
    const rawLimit = prefs.recentLimit;
    const parsedLimit = typeof rawLimit === "number" ? rawLimit : parseInt(String(rawLimit ?? "").trim(), 10);
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

  useEffect(() => {
    if (!hasConfig || !hasPaperDir) return;

    let cancelled = false;
    void checkCoreAvailable({
      configPath: prefs.configPath,
      paperDir: prefs.paperDir,
      pythonPath: prefs.pythonPath,
    })
      .then((r) => {
        if (cancelled) return;
        setCoreOk(r.ok);
      })
      .catch(() => {
        if (cancelled) return;
        setCoreOk(false);
      });

    return () => {
      cancelled = true;
    };
  }, [normalized]);

  useEffect(() => {
    if (!hasConfig || !hasPaperDir || !coreOk) {
      setPapers([]);
      setIsLoadingPapers(false);
      return;
    }

    let cancelled = false;
    setIsLoadingPapers(true);

    void loadRecentPapers({ configPath, prefPaperDir, paperDir, libraryDir, pythonBin, agentRoot, limit: recentLimit })
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
        setIsLoadingPapers(false);
      });

    return () => {
      cancelled = true;
    };
  }, [normalized, coreOk]);

  if (!hasConfig || !hasPaperDir) {
    return (
      <List>
        <List.EmptyView
          title="Set preferences first"
          description="Set both 'Config File Path' and 'Paper Directory' in extension preferences."
        />
      </List>
    );
  }

  if (coreOk === null) {
    return (
      <List>
        <List.EmptyView title="Checking core…" description="Verifying Paper Agent is installed." />
      </List>
    );
  }

  if (!coreOk) {
    return (
      <List>
        <CoreNotFoundEmptyView />
      </List>
    );
  }

  return (
    <PaperListView
      papers={papers}
      isLoading={isLoadingPapers}
      emptyTitle="No papers shown"
      emptyDescription="Config and Paper directory are set but no data came back. Run the pipeline at least once."
      subtitleMode="date-and-authors"
    />
  );
}
