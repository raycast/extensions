import { Action, ActionPanel, List, getPreferenceValues, open } from "@raycast/api";
import * as path from "node:path";
import { execFileSync } from "node:child_process";
import { useEffect, useState } from "react";
import { checkCoreAvailable, CORE_INSTALL_URL, getBootstrapCopyText } from "./core-check";
import { withEffectiveConfigPath } from "./config-utils";
import { type Paper, parseCliPapers } from "./paper-utils";
import { PaperListView } from "./paper-list";

const prefs = getPreferenceValues<Preferences.RecentPapers>();
const CONFIG_PATH = prefs.configPath?.trim() ?? "";
const HAS_CONFIG = CONFIG_PATH.length > 0;
const PREF_PAPER_DIR = prefs.paperDir?.trim() ?? "";
const PAPER_DIR = PREF_PAPER_DIR;
const LIBRARY_DIR = PREF_PAPER_DIR ? path.join(PREF_PAPER_DIR, "library") : "";
const HAS_PAPER_DIR = PREF_PAPER_DIR.length > 0;
const AGENT_ROOT = HAS_CONFIG ? path.dirname(CONFIG_PATH) : "";
const PYTHON_BIN =
  prefs.pythonPath && prefs.pythonPath.trim().length > 0
    ? prefs.pythonPath
    : path.join(AGENT_ROOT, ".venv", "bin", "python3");
const DEFAULT_LIMIT = 30;
const rawLimit = prefs.recentLimit;
const parsedLimit = typeof rawLimit === "number" ? rawLimit : parseInt(String(rawLimit ?? "").trim(), 10);
const RECENT_LIMIT = Number.isNaN(parsedLimit) || parsedLimit < 1 ? DEFAULT_LIMIT : Math.min(parsedLimit, 500);

function loadRecentPapers(limit: number = RECENT_LIMIT): Paper[] {
  if (!HAS_CONFIG || !HAS_PAPER_DIR) {
    return [];
  }
  let rawJson = "";
  try {
    rawJson = withEffectiveConfigPath(CONFIG_PATH, PREF_PAPER_DIR, (effectiveConfigPath) =>
      execFileSync(
        PYTHON_BIN,
        ["-m", "paper_agent", "list", "--json", "--limit", String(limit), "--config", effectiveConfigPath],
        { cwd: AGENT_ROOT, encoding: "utf-8" },
      ),
    );
  } catch {
    return [];
  }

  return parseCliPapers(rawJson, {
    paperDir: PAPER_DIR,
    libraryDir: LIBRARY_DIR,
    fallbackDate: "unknown",
  });
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
  const [coreOk, setCoreOk] = useState<boolean | null>(null);

  useEffect(() => {
    if (!HAS_CONFIG || !HAS_PAPER_DIR) return;
    checkCoreAvailable({
      configPath: prefs.configPath,
      paperDir: prefs.paperDir,
      pythonPath: prefs.pythonPath,
    }).then((r) => setCoreOk(r.ok));
  }, []);

  if (!HAS_CONFIG || !HAS_PAPER_DIR) {
    return (
      <List>
        <List.EmptyView
          title="Set preferences first"
          description="Set both 'Config file path' and 'Paper directory' in extension preferences."
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

  const papers = loadRecentPapers();
  return (
    <PaperListView
      papers={papers}
      emptyTitle="No papers shown"
      emptyDescription="Config and Paper directory are set but no data came back. Run the pipeline at least once."
      subtitleMode="date-and-authors"
    />
  );
}
