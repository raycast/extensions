import { runRemote } from "./ssh";
import { getPaths, shQuote, cleanOutput, nowStamp, backupLabel, basenameFromPath } from "./utils";

// === File Operations ===

// Number of most-recent backups kept per file base name; older ones are
// pruned right after each successful backup so .raycast-backups doesn't
// grow unbounded on the router's limited flash storage.
const BACKUPS_TO_KEEP = 20;

export function getBackupDir(): string {
  const { profilesDir } = getPaths();
  return `${profilesDir}/.raycast-backups`;
}

export async function readRemoteFile(path: string): Promise<string> {
  const qPath = shQuote(path);
  let stdout: string;
  try {
    ({ stdout } = await runRemote(
      `if [ -f ${qPath} ]; then echo "___FILE_START___"; cat ${qPath}; echo "___FILE_END___"; else echo "FILE_NOT_FOUND" 1>&2; exit 2; fi`,
    ));
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("FILE_NOT_FOUND")) throw new Error(`File not found: ${path}`);
    throw error;
  }
  const startMarker = "___FILE_START___";
  const endMarker = "___FILE_END___";
  const startIdx = stdout.indexOf(startMarker);
  const endIdx = stdout.lastIndexOf(endMarker);
  if (startIdx !== -1 && endIdx > startIdx) {
    const content = stdout.slice(startIdx + startMarker.length, endIdx);
    // Remove the leading newline from echo and trailing newline before end marker
    return content.replace(/^\n/, "").replace(/\n$/, "");
  }
  return stdout;
}

export async function writeRemoteFile(path: string, content: string): Promise<void> {
  const qPath = shQuote(path);
  const delim = `RAYCAST_XKEEN_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  const remoteCmd =
    `set -e; DEST=${qPath}; DIR=$(dirname "$DEST"); TMP="$DEST.tmp"; mkdir -p "$DIR"; ` +
    `cat > "$TMP" <<'${delim}'\n` +
    content.replace(/\r\n/g, "\n") +
    `\n${delim}\n` +
    `mv "$TMP" "$DEST";`;
  await runRemote(remoteCmd);
}

export async function createRemoteBackup(path: string, label: string): Promise<string | null> {
  const qPath = shQuote(path);
  const qBackupDir = shQuote(getBackupDir());
  const qBase = shQuote(basenameFromPath(path));
  const qStamp = shQuote(nowStamp());
  const qLabel = shQuote(backupLabel(label));
  const { stdout, stderr } = await runRemote(
    `set -e; SRC=${qPath}; BACKUP_DIR=${qBackupDir}; BASE=${qBase}; STAMP=${qStamp}; LABEL=${qLabel}; ` +
      `mkdir -p "$BACKUP_DIR"; ` +
      `if [ -f "$SRC" ]; then DEST="$BACKUP_DIR/$BASE.$STAMP.$LABEL.bak"; cp "$SRC" "$DEST"; echo "$DEST"; ` +
      `i=0; for f in $(ls -1 "$BACKUP_DIR"/"$BASE".*.bak 2>/dev/null | sort -r); do i=$((i+1)); [ $i -le ${BACKUPS_TO_KEEP} ] || rm -f "$f"; done; ` +
      `fi`,
  );
  const line = cleanOutput(stdout, stderr).firstLine;
  return line === "—" || line === "(empty)" ? null : line;
}

export async function listRemoteBackups(path: string, limit = 30): Promise<string[]> {
  const qBackupDir = shQuote(getBackupDir());
  const qBase = shQuote(basenameFromPath(path));
  const { stdout, stderr } = await runRemote(
    `set -e; BACKUP_DIR=${qBackupDir}; BASE=${qBase}; ` +
      `[ -d "$BACKUP_DIR" ] || exit 0; ` +
      `for f in "$BACKUP_DIR"/"$BASE".*.bak; do [ -f "$f" ] && echo "$f"; done | sort -r | head -n ${Math.max(1, limit)}`,
  );
  return cleanOutput(stdout, stderr)
    .text.split("\n")
    .map((s) => s.trim())
    .filter(Boolean)
    .filter((s) => s !== "(empty)");
}

export async function restoreRemoteBackup(path: string, backupPath: string): Promise<void> {
  const qPath = shQuote(path);
  const qBackup = shQuote(backupPath);
  await runRemote(`set -e; DEST=${qPath}; SRC=${qBackup}; [ -f "$SRC" ] && cp "$SRC" "$DEST"`);
}

export async function safeWriteRemoteFile(
  path: string,
  content: string,
  options: { backupTag: string; restartAfterWrite?: boolean; afterWrite?: () => Promise<void> },
): Promise<{ backupPath: string | null }> {
  const backupPath = await createRemoteBackup(path, options.backupTag);
  try {
    await writeRemoteFile(path, content);
    if (options.afterWrite) await options.afterWrite();
    if (options.restartAfterWrite) await runRemote("xkeen -restart");
    return { backupPath };
  } catch (error: unknown) {
    if (backupPath) {
      try {
        await restoreRemoteBackup(path, backupPath);
        if (options.restartAfterWrite) await runRemote("xkeen -restart");
      } catch {
        // ignore rollback failure here and return original error below
      }
    }
    throw error;
  }
}
