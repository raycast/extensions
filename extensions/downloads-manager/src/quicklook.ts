import { execFile, type ChildProcess } from "child_process";
import { mkdtempSync, readdirSync, readFileSync, rmSync } from "fs";
import { tmpdir } from "os";
import { extname, join } from "path";

const PREVIEW_THUMBNAIL_SIZE = 512;
const PREVIEW_TIMEOUT_MS = 1000;

// qlmanage does not return for these types. A 231 byte .zip still hangs after
// two minutes, and .ipynb does the same. When it does return, the thumbnail is a
// generic archive icon rather than the contents, so there is nothing to show.
const UNSUPPORTED_EXTENSIONS = new Set([".zip", ".ipynb"]);

export function isQuickLookPreviewSupported(fileName: string): boolean {
  return !UNSUPPORTED_EXTENSIONS.has(extname(fileName).toLowerCase());
}

type ActivePreview = { cancel: () => void };

// qlmanage hangs indefinitely for some file types (notably .zip). Without
// killing it on timeout every previewed file leaves an orphaned process and a
// temp directory behind, which accumulates until the extension host becomes
// unresponsive.
let activePreview: ActivePreview | null = null;

/** Drops the preview currently being generated, if any. */
function cancelPendingQuickLookPreview() {
  activePreview?.cancel();
}

export function getQuickLookPreviewDataUrl(filePath: string): Promise<string | null> {
  if (process.platform !== "darwin" || !isQuickLookPreviewSupported(filePath)) {
    return Promise.resolve(null);
  }

  // Only the selected item needs a preview. Cancelling the previous request
  // keeps fast selection changes from spawning a qlmanage process per row.
  cancelPendingQuickLookPreview();

  return new Promise((resolve) => {
    let tempDir: string | null = null;
    let child: ChildProcess | null = null;
    let settled = false;

    const cleanupTempDir = () => {
      if (!tempDir) return;
      try {
        rmSync(tempDir, { recursive: true, force: true });
      } catch {
        // ignore cleanup errors
      }
    };

    const killChild = () => {
      if (!child || child.exitCode !== null || child.signalCode !== null) return;
      // The temp directory can only be removed once the process is really gone.
      child.once("exit", cleanupTempDir);
      child.kill("SIGKILL");
    };

    const settle = (value: string | null) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeoutId);
      if (activePreview === request) {
        activePreview = null;
      }
      killChild();
      cleanupTempDir();
      resolve(value);
    };

    const request: ActivePreview = { cancel: () => settle(null) };

    const timeoutId = setTimeout(() => {
      console.warn(`Quick Look preview timed out for '${filePath}'`);
      settle(null);
    }, PREVIEW_TIMEOUT_MS);

    activePreview = request;

    try {
      tempDir = mkdtempSync(join(tmpdir(), "raycast-ql-preview-"));
      child = execFile(
        "qlmanage",
        ["-t", "-s", String(PREVIEW_THUMBNAIL_SIZE), "-o", tempDir, filePath],
        (error, _stdout, stderr) => {
          if (error || stderr) {
            settle(null);
            return;
          }

          try {
            if (!tempDir) {
              settle(null);
              return;
            }

            const files = readdirSync(tempDir);
            const png = files.find((f) => f.endsWith(".png"));

            if (!png) {
              settle(null);
              return;
            }

            const buffer = readFileSync(join(tempDir, png));
            settle(`data:image/png;base64,${buffer.toString("base64")}`);
          } catch (err) {
            console.warn(`Error generating Quick Look preview for '${filePath}':`, err);
            settle(null);
          }
        },
      );

      // A killed child must not keep the extension host alive.
      child.unref();
    } catch (err) {
      console.warn(`Error starting Quick Look for '${filePath}':`, err);
      settle(null);
    }
  });
}
