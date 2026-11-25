import { runCoreCommand } from "./core-process";
import { withEffectiveConfigPathAsync } from "./config-utils";
import { type Paper, parseCliPapers } from "./paper-utils";

function getTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export async function loadTodayPapers(options: {
  configPath: string;
  prefPaperDir: string;
  paperDir: string;
  libraryDir: string;
  pythonBin: string;
  agentRoot: string;
  signal: AbortSignal;
}): Promise<Paper[]> {
  const { configPath, prefPaperDir, paperDir, libraryDir, pythonBin, agentRoot } = options;

  const rawJson = await withEffectiveConfigPathAsync(configPath, prefPaperDir, async (effectiveConfigPath) => {
    return runCoreCommand(pythonBin, ["-m", "paper_agent", "today", "--json", "--config", effectiveConfigPath], {
      cwd: agentRoot,
      signal: options.signal,
    });
  });

  return parseCliPapers(rawJson, {
    paperDir,
    libraryDir,
    fallbackDate: getTodayDateString(),
  });
}

export async function loadRecentPapers(options: {
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

export async function loadSearchResults(
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
