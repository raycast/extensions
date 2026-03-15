import { Action, ActionPanel, List, getPreferenceValues, open } from "@raycast/api";
import * as path from "node:path";
import { execFileSync } from "node:child_process";
import { useEffect, useMemo, useState } from "react";
import { checkCoreAvailable, CORE_INSTALL_URL, getBootstrapCopyText } from "./core-check";
import { withEffectiveConfigPath } from "./config-utils";
import { type Paper, parseCliPapers } from "./paper-utils";
import { PaperListView } from "./paper-list";

const prefs = getPreferenceValues<Preferences.SearchPapers>();
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

function loadSearchResults(query: string): Paper[] {
  if (!HAS_CONFIG || !HAS_PAPER_DIR) {
    return [];
  }
  let rawJson = "";
  try {
    rawJson = withEffectiveConfigPath(CONFIG_PATH, PREF_PAPER_DIR, (effectiveConfigPath) =>
      execFileSync(
        PYTHON_BIN,
        ["-m", "paper_agent", "search", "--query", query, "--json", "--config", effectiveConfigPath],
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
  const [searchText, setSearchText] = useState("");
  const [coreOk, setCoreOk] = useState<boolean | null>(null);

  useEffect(() => {
    if (!HAS_CONFIG || !HAS_PAPER_DIR) return;
    checkCoreAvailable({
      configPath: prefs.configPath,
      paperDir: prefs.paperDir,
      pythonPath: prefs.pythonPath,
    }).then((r) => setCoreOk(r.ok));
  }, []);

  const papers = useMemo(
    () => (HAS_CONFIG && HAS_PAPER_DIR && coreOk ? loadSearchResults(searchText) : []),
    [searchText, coreOk],
  );

  if (!HAS_CONFIG || !HAS_PAPER_DIR) {
    return (
      <List
        isShowingDetail
        searchBarPlaceholder="Search by title, authors, abstract, date..."
        onSearchTextChange={setSearchText}
      >
        <List.EmptyView
          title="Set preferences first"
          description="Set both 'Config file path' and 'Paper directory' in extension preferences."
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
      emptyTitle="No papers or CLI failed"
      emptyDescription="Run the pipeline at least once, or check Config path and Paper directory."
      subtitleMode="date-and-authors"
      searchBarPlaceholder="Search by title, authors, abstract, date..."
      onSearchTextChange={setSearchText}
    />
  );
}
