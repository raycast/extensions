import { unwatchFile, watchFile } from "fs";
import { getCodexPaths, type CodexPaths } from "./codex-paths";
import { loadDictationHistory } from "./history";
import type { LoadState } from "./types";

export function watchDictationHistory(
  onChange: (state: LoadState) => void,
  paths: CodexPaths = getCodexPaths(),
): () => void {
  let request: AbortController | undefined;

  const reload = async () => {
    request?.abort();
    const current = new AbortController();
    request = current;
    const state = await loadDictationHistory(paths, current.signal);
    if (!current.signal.aborted) onChange(state);
  };

  const onFileChange = () => void reload();
  // Watch the path, not its inode: Codex replaces the file atomically.
  // Stat polling also notices when a previously missing file is created.
  watchFile(
    paths.historyPath,
    { interval: 1_000, persistent: false },
    onFileChange,
  );
  void reload();

  return () => {
    unwatchFile(paths.historyPath, onFileChange);
    request?.abort();
  };
}
