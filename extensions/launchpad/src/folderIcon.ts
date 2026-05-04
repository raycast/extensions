import { exec, execSync } from "child_process";
import { promisify } from "util";
import {
  existsSync,
  mkdirSync,
  readFile,
  readFileSync,
  unlink,
  unlinkSync,
  writeFile,
  writeFileSync,
} from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { PNG } from "pngjs";
import crypto from "crypto";

const execP = promisify(exec);
const readFileP = promisify(readFile);
const writeFileP = promisify(writeFile);
const unlinkP = promisify(unlink);

const CACHE_DIR = join(tmpdir(), "raycast-launchpad-icons");

function ensureCache() {
  if (!existsSync(CACHE_DIR)) mkdirSync(CACHE_DIR, { recursive: true });
}

// Extract the .icns path from an .app bundle (async)
async function icnsPath(appPath: string): Promise<string | null> {
  try {
    const { stdout } = await execP(
      `plutil -extract CFBundleIconFile raw -o - "${appPath.replace(/"/g, '\\"')}/Contents/Info.plist"`
    );
    const iconFile = stdout.trim();
    const name = iconFile.endsWith(".icns") ? iconFile : `${iconFile}.icns`;
    const full = `${appPath}/Contents/Resources/${name}`;
    return existsSync(full) ? full : null;
  } catch {
    return null;
  }
}

// Convert an icns file to a square PNG buffer at the given pixel size (async)
async function icnsToPng(icns: string, size: number): Promise<Buffer | null> {
  const tmp = join(tmpdir(), `lp_icon_${crypto.randomUUID()}.png`);
  try {
    await execP(`sips -s format png "${icns.replace(/"/g, '\\"')}" --out "${tmp}" --resampleWidth ${size} 2>/dev/null`);
    return await readFileP(tmp);
  } catch {
    return null;
  } finally {
    try {
      await unlinkP(tmp);
    } catch {
      /* ignore — file may not exist if sips failed */
    }
  }
}

// Sync variants — used after first paint so user mutations don't flicker
// through a "wrong icon" frame. Slower (serial sips calls per app) but the
// cost is bounded: typically one folder's top-9 changes per click, and most
// of the time the cache short-circuits before sips even runs.
function icnsPathSync(appPath: string): string | null {
  try {
    const stdout = execSync(
      `plutil -extract CFBundleIconFile raw -o - "${appPath.replace(/"/g, '\\"')}/Contents/Info.plist"`,
      { encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] }
    );
    const iconFile = stdout.trim();
    const name = iconFile.endsWith(".icns") ? iconFile : `${iconFile}.icns`;
    const full = `${appPath}/Contents/Resources/${name}`;
    return existsSync(full) ? full : null;
  } catch {
    return null;
  }
}

function icnsToPngSync(icns: string, size: number): Buffer | null {
  const tmp = join(tmpdir(), `lp_icon_${crypto.randomUUID()}.png`);
  try {
    execSync(`sips -s format png "${icns.replace(/"/g, '\\"')}" --out "${tmp}" --resampleWidth ${size} 2>/dev/null`, {
      stdio: ["pipe", "pipe", "pipe"],
    });
    return readFileSync(tmp);
  } catch {
    return null;
  } finally {
    try {
      unlinkSync(tmp);
    } catch {
      /* ignore */
    }
  }
}

// Tight 3x3 layout: cells touch at the canvas edges, with a small uniform
// gap between cells. The canvas itself is fully transparent so the folder
// cell shows the Raycast cell background between icons.
const CELL = 64; // px per app icon cell — bigger gives a denser look
const GAP = 2; //  px gap between cells (no border padding around the grid)
const COLS = 3; // max columns (3×3 = 9 apps)
// Bump CACHE_VERSION whenever the rendering algorithm changes so existing
// caches are invalidated automatically.
const CACHE_VERSION = "v2-transparent";

function cachePathFor(folderId: string, paths: string[]): string {
  const cacheKey = crypto
    .createHash("md5")
    .update(CACHE_VERSION + ":" + folderId + paths.join("|"))
    .digest("hex");
  return join(CACHE_DIR, `${cacheKey}.png`);
}

// Cheap synchronous lookup: returns a cached PNG path if one exists, else null.
// Used by the UI to fall back to fileIcon while the real icon builds in the
// background.
export function getCachedFolderIcon(folderId: string, appPaths: string[]): string | null {
  if (appPaths.length === 0) return null;
  const paths = appPaths.slice(0, 9);
  const outPath = cachePathFor(folderId, paths);
  return existsSync(outPath) ? outPath : null;
}

// Composite up to 9 app icons into a folder-preview PNG.
// Returns the path to a cached PNG file, or null on failure.
// Async so multiple folders can build in parallel via Promise.all.
export async function buildFolderIcon(
  folderId: string,
  appPaths: string[]
): Promise<string | null> {
  if (appPaths.length === 0) return null;

  const paths = appPaths.slice(0, 9);
  const outPath = cachePathFor(folderId, paths);

  ensureCache();
  if (existsSync(outPath)) return outPath;

  // Always use a 3x3 grid so the icon is always square — visually consistent
  // regardless of how many apps the folder has.
  const rows = COLS;
  const cols = COLS;
  // No outer border padding: only inter-cell gaps.
  const W = cols * CELL + (cols - 1) * GAP;
  const H = rows * CELL + (rows - 1) * GAP;

  // PNG buffer is zero-initialized: fully transparent (alpha=0) black
  // pixels everywhere. We don't fill a background — the folder cell's
  // Raycast background shows through the gaps and any transparent
  // app-icon edges.
  const out = new PNG({ width: W, height: H });

  // Resolve all icns paths in parallel, then convert to PNG in parallel.
  // This collapses ~N×15ms of shell calls into ~max(15ms) wall time.
  const icnsResults = await Promise.all(paths.map(icnsPath));
  const pngResults = await Promise.all(
    icnsResults.map((icns) => (icns ? icnsToPng(icns, CELL) : Promise.resolve(null)))
  );

  for (let i = 0; i < paths.length; i++) {
    const pngBuf = pngResults[i];
    if (!pngBuf) continue;

    let src: PNG;
    try {
      src = PNG.sync.read(pngBuf);
    } catch {
      continue;
    }

    const col = i % COLS;
    const row = Math.floor(i / COLS);
    // No outer padding — first column/row sits flush against the canvas edge
    const ox = col * (CELL + GAP);
    const oy = row * (CELL + GAP);

    const cellW = Math.min(src.width, CELL);
    const cellH = Math.min(src.height, CELL);

    for (let sy = 0; sy < cellH; sy++) {
      for (let sx = 0; sx < cellW; sx++) {
        const si = (sy * src.width + sx) * 4;
        const di = ((oy + sy) * W + (ox + sx)) * 4;
        out.data[di] = src.data[si];
        out.data[di + 1] = src.data[si + 1];
        out.data[di + 2] = src.data[si + 2];
        out.data[di + 3] = src.data[si + 3];
      }
    }
  }

  try {
    await writeFileP(outPath, PNG.sync.write(out));
    return outPath;
  } catch {
    return null;
  }
}

// Synchronous twin of buildFolderIcon. Used in the user-mutation path so the
// composite icon updates in the same render as the config change — no flash
// of stale icon while an async build catches up.
export function buildFolderIconSync(folderId: string, appPaths: string[]): string | null {
  if (appPaths.length === 0) return null;

  const paths = appPaths.slice(0, 9);
  const outPath = cachePathFor(folderId, paths);

  ensureCache();
  if (existsSync(outPath)) return outPath;

  const rows = COLS;
  const cols = COLS;
  const W = cols * CELL + (cols - 1) * GAP;
  const H = rows * CELL + (rows - 1) * GAP;

  const out = new PNG({ width: W, height: H });

  for (let i = 0; i < paths.length; i++) {
    const icns = icnsPathSync(paths[i]);
    if (!icns) continue;
    const pngBuf = icnsToPngSync(icns, CELL);
    if (!pngBuf) continue;

    let src: PNG;
    try {
      src = PNG.sync.read(pngBuf);
    } catch {
      continue;
    }

    const col = i % COLS;
    const row = Math.floor(i / COLS);
    const ox = col * (CELL + GAP);
    const oy = row * (CELL + GAP);

    const cellW = Math.min(src.width, CELL);
    const cellH = Math.min(src.height, CELL);

    for (let sy = 0; sy < cellH; sy++) {
      for (let sx = 0; sx < cellW; sx++) {
        const si = (sy * src.width + sx) * 4;
        const di = ((oy + sy) * W + (ox + sx)) * 4;
        out.data[di] = src.data[si];
        out.data[di + 1] = src.data[si + 1];
        out.data[di + 2] = src.data[si + 2];
        out.data[di + 3] = src.data[si + 3];
      }
    }
  }

  try {
    writeFileSync(outPath, PNG.sync.write(out));
    return outPath;
  } catch {
    return null;
  }
}
