import { formatBytes, scanProcesses } from "../lib/processes";
import { folderName } from "../lib/snapshot";

/**
 * The Codex plugin's app-server-broker process trees running on this Mac, as Lancetta's
 * Processes pane lists them: one per working folder, with the memory it holds, and whether
 * its folder is gone (an orphan Lancetta can reclaim). Read-only: stopping them is done in
 * the Lancetta app.
 */
export default async function tool() {
  const trees = await scanProcesses();
  const orphans = trees.filter((t) => t.orphan);
  return {
    trees: trees.map((t) => ({
      folder: folderName(t.cwd) ?? "unknown",
      memory: formatBytes(t.bytes),
      children: t.children.length,
      orphan: t.orphan,
    })),
    totalMemory: formatBytes(trees.reduce((sum, t) => sum + t.bytes, 0)),
    orphanedMemory: formatBytes(orphans.reduce((sum, t) => sum + t.bytes, 0)),
    howToReclaim: orphans.length ? "Open Lancetta > Processes > Reclaim." : undefined,
  };
}
