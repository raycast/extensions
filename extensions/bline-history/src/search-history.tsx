import {
  Action,
  ActionPanel,
  Clipboard,
  Icon,
  List,
  Toast,
  closeMainWindow,
  getPreferenceValues,
  showHUD,
  showToast,
} from "@raycast/api";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { execFile } from "child_process";
import { closeSync, existsSync, openSync, readFileSync, readSync, readdirSync, statSync } from "fs";
import { pathToFileURL } from "url";
import { promisify } from "util";

const run = promisify(execFile);

// Prefer the CLI bundled inside the installed app; fall back to a dev build.
// App Support copy first: some managed Macs strip extra executables out of
// the .app bundle, which used to break this extension with no error.
// App Support first: the app stages a copy there wherever it's installed,
// so this works whether bLine lives in /Applications or ~/Applications.
const CLI_CANDIDATES = [
  `${process.env.HOME}/Library/Application Support/bLine/bline-cli`,
  "/Applications/bLine.app/Contents/MacOS/bline-cli",
  `${process.env.HOME}/Applications/bLine.app/Contents/MacOS/bline-cli`,
  `${process.env.HOME}/Development/bLine/.build/release/bline`,
];
const BLINE = CLI_CANDIDATES.find(existsSync) ?? CLI_CANDIDATES[0];

// A clip can be ~12.58MB of text. Markdown that big locks the window up, and
// nobody reads it in a 350px pane — show the head and say so. Only the head is
// ever kept: holding whole clip bodies in a map that never evicts put hundreds
// of MB of decrypted plaintext in this process's heap for the session.
const DETAIL_CHARS = 8000;

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

type Clip = {
  id: string;
  kind: string;
  preview: string;
  source: string;
  at: number;
  pinned: boolean;
  /// Text found inside an image, so a screenshot can be found by what it says.
  ocr?: string | null;
};

type Meta = { bytes: number; dims?: string };

// What the pane needs of a text clip: the head it renders, the true size, and
// whether the clip could be read at all.
type Body = { head: string; chars: number; truncated: boolean; error?: string };

function age(at: number): string {
  const s = Date.now() / 1000 - at;
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

// "Aug 18, 10:57 AM" — the metadata column is narrow enough that a full
// toLocaleString() gets elided in the middle, which loses the date itself.
function when(at: number): string {
  const d = new Date(at * 1000);
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: d.getFullYear() === new Date().getFullYear() ? undefined : "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

// Raycast filters on title, subtitle and KEYWORDS. Feeding it the whole OCR
// dump would be thousands of entries per screenshot, so reduce to distinct
// words: that is what a search actually matches on.
function searchWords(c: Clip): string[] | undefined {
  if (!c.ocr) return undefined;
  const seen = new Set<string>();
  for (const w of c.ocr.toLowerCase().split(/[^\p{L}\p{N}@._-]+/u)) {
    if (w.length >= 2) seen.add(w);
    if (seen.size >= 150) break;
  }
  return seen.size ? [...seen] : undefined;
}

// Raycast's own filtering searches title + keywords, and feeding it the OCR
// words did not match — the text reached the pane ("Text found" showed) but
// typing it found nothing. Rather than keep guessing at an undocumented
// matcher, bLine filters the list itself: `filtering={false}` hands the search
// text over and this decides. Every word you type must appear somewhere in the
// clip — its preview, the Mac it came from, or the text read out of the image.
function matches(c: Clip, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const hay = `${c.preview} ${c.source} ${c.ocr ?? ""}`.toLowerCase();
  return q.split(/\s+/).every((word) => hay.includes(word));
}

function titleFor(c: Clip): string {
  return c.preview || (c.kind === "image" ? "Image" : "Clip");
}

function kindLabel(kind: string): string {
  if (kind === "image") return "Image";
  if (kind === "rtf") return "Rich Text";
  return "Text";
}

function bytesLabel(n: number): string {
  if (n < 1024) return `${n} bytes`;
  const kb = n / 1024;
  // Round BEFORE picking the unit, or 1,048,500 bytes reads "1024.0 KB".
  if (kb < 999.95) return `${kb.toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

// A JS string is UTF-16, so `.length` counts an emoji twice. The pane says
// "characters", so count what a reader would call one.
function countChars(s: string): number {
  const pairs = s.match(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g);
  return s.length - (pairs?.length ?? 0);
}

function bodyOf(text: string): Body {
  const chars = countChars(text);
  if (text.length <= DETAIL_CHARS) return { head: text, chars, truncated: false };
  // Never cut between a surrogate pair — a lone half renders as a replacement
  // glyph right at the seam.
  let end = DETAIL_CHARS;
  const last = text.charCodeAt(end - 1);
  if (last >= 0xd800 && last <= 0xdbff) end -= 1;
  return { head: text.slice(0, end), chars, truncated: true };
}

// execFile rejects with the CLI's own stdout attached — "no such clip" and the
// like are worth showing verbatim.
function reason(e: unknown): string {
  const out = (e as { stdout?: string })?.stdout?.trim();
  if (out) return out;
  return e instanceof Error ? e.message : String(e);
}

// Markdown needs a file: URL. encodeURI leaves `#` and `?` alone — both are
// legal in a macOS filename and both truncate the link — and markdown's own
// parser ends the destination at an unbalanced `)`. pathToFileURL handles the
// first two; the parens have to go by hand.
function fileURL(path: string): string {
  return pathToFileURL(path).href.replace(/\(/g, "%28").replace(/\)/g, "%29");
}

// Clip text is not markdown — fence it so #, *, _ and, above all, line breaks
// survive. Widen the fence past any run of backticks the clip itself contains.
function fenced(text: string): string {
  const longest = (text.match(/`+/g) ?? []).reduce((n, run) => Math.max(n, run.length), 0);
  const fence = "`".repeat(Math.max(3, longest + 1));
  return `${fence}\n${text}\n${fence}`;
}

// Dimensions read from the header of whichever format the clip actually is.
// `bline file` stopped writing PNG for every image clip when bLine began
// preserving formats, so a PNG-only reader silently dropped the dimensions for
// every GIF, JPEG, HEIC and WebP — Size showed bytes alone beside PNG clips
// that showed "1920 × 1080 · 1.2 MB".
//
// Full signatures are checked, never a short substring: a text clip beginning
// "[PNG] see attached" would otherwise report dimensions in the billions.
function dimensions(head: Buffer, read: number): string | undefined {
  const be16 = (o: number) => head.readUInt16BE(o);
  const le16 = (o: number) => head.readUInt16LE(o);
  if (read >= 24 && head.subarray(0, 8).equals(PNG_SIGNATURE)) {
    return `${head.readUInt32BE(16)} × ${head.readUInt32BE(20)}`;
  }
  if (read >= 10 && (head.subarray(0, 6).toString("ascii") === "GIF89a"
                  || head.subarray(0, 6).toString("ascii") === "GIF87a")) {
    return `${le16(6)} × ${le16(8)}`;   // logical screen descriptor
  }
  if (read >= 4 && head[0] === 0xff && head[1] === 0xd8) {
    // JPEG carries its size in a frame header, so it needs a marker walk —
    // done by the caller, which has the whole file.
    return undefined;
  }
  return undefined;
}

// JPEG: walk the segment chain to the SOFn frame header, whose height and
// width sit at offsets 5 and 7. Every other segment is skipped by its length.
function jpegDimensions(buf: Buffer): string | undefined {
  let i = 2;
  while (i + 9 < buf.length) {
    if (buf[i] !== 0xff) return undefined;
    const marker = buf[i + 1];
    const len = buf.readUInt16BE(i + 2);
    // SOF0..SOF15, excluding the non-frame markers DHT/JPG/DAC
    if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
      return `${buf.readUInt16BE(i + 7)} × ${buf.readUInt16BE(i + 5)}`;
    }
    i += 2 + len;
  }
  return undefined;
}

function imageMeta(path: string): Meta | undefined {
  try {
    const bytes = statSync(path).size;
    const fd = openSync(path, "r");
    let read = 0;
    const head = Buffer.alloc(24);
    try {
      read = readSync(fd, head, 0, 24, 0);
    } finally {
      // A throw between open and close leaks the descriptor for the life of
      // the Raycast process, and this runs once per clip browsed.
      closeSync(fd);
    }
    let dims = dimensions(head, read);
    if (!dims && read >= 4 && head[0] === 0xff && head[1] === 0xd8) {
      // JPEG only: re-read the file, since the frame header can sit past the
      // 24-byte peek that suffices for every other format.
      try {
        dims = jpegDimensions(readFileSync(path));
      } catch {
        dims = undefined;
      }
    }
    return { bytes, dims };
  } catch {
    return undefined;
  }
}

export default function SearchHistory() {
  const prefs = getPreferenceValues<{ showPreview?: boolean }>();
  const [clips, setClips] = useState<Clip[]>([]);
  const [thumbDir, setThumbDir] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [showDetail, setShowDetail] = useState(prefs.showPreview !== false);
  // Quick Look needs a real file. We make one per clip ON DEMAND rather than
  // up front: `bline file` writes DECRYPTED content to a cache dir, so the
  // fewer that exist the better (the CLI keeps only the newest 24).
  const [previews, setPreviews] = useState<Record<string, string>>({});
  const [bodies, setBodies] = useState<Record<string, Body>>({});
  const [metas, setMetas] = useState<Record<string, Meta>>({});
  const [selected, setSelected] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  // The in-flight (and completed) `bline file` request per clip. A map of
  // PROMISES rather than a set of ids, so an action can wait for the file
  // instead of discovering it is not there yet — and so pressing Quick Look
  // the instant a row is selected joins the request that selection already
  // started rather than spawning a second decrypt of the same clip.
  const inflight = useRef<Record<string, Promise<string | undefined>>>({});
  const askedText = useRef<Set<string>>(new Set());

  const reload = useCallback(() => {
    setLoading(true);
    Promise.all([
      run(BLINE, ["history"], { maxBuffer: 16 * 1024 * 1024 }),
      run(BLINE, ["thumbs"]).catch(() => ({ stdout: "" })),
    ])
      .then(([h, t]) => {
        setClips(JSON.parse(h.stdout));
        setThumbDir(t.stdout.trim());
      })
      .catch(() => setClips([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(reload, [reload]);

  const shown = useMemo(() => clips.filter((c) => matches(c, query)), [clips, query]);

  const byId = useMemo(() => {
    const m: Record<string, Clip> = {};
    for (const c of clips) m[c.id] = c;
    return m;
  }, [clips]);

  // One readdir beats an existsSync per image clip per render — the thumbnail
  // directory is written once by `bline thumbs` at load and never changes
  // under us until the next reload.
  const thumbs = useMemo(() => {
    if (!thumbDir) return new Set<string>();
    try {
      return new Set(readdirSync(thumbDir));
    } catch {
      return new Set<string>();
    }
  }, [thumbDir]);

  const ensureFile = useCallback((clip?: Clip): Promise<string | undefined> => {
    if (!clip) return Promise.resolve(undefined);
    const running = inflight.current[clip.id];
    if (running) return running;
    const job = run(BLINE, ["file", clip.id], { maxBuffer: 1024 * 1024 })
      .then(({ stdout }) => {
        const path = stdout.trim();
        if (!path) return undefined;
        setPreviews((prev) => ({ ...prev, [clip.id]: path }));
        if (clip.kind === "image") {
          const meta = imageMeta(path);
          if (meta) setMetas((prev) => ({ ...prev, [clip.id]: meta }));
        }
        return path;
      })
      .catch(() => {
        delete inflight.current[clip.id]; // let a later selection retry
        return undefined;
      });
    inflight.current[clip.id] = job;
    return job;
  }, []);

  // `bline cat` exits 2 on an image — text and rtf only.
  const ensureBody = useCallback((clip?: Clip) => {
    if (!clip || clip.kind === "image" || askedText.current.has(clip.id)) return;
    askedText.current.add(clip.id);
    run(BLINE, ["cat", clip.id], { maxBuffer: 16 * 1024 * 1024 })
      .then(({ stdout }) => setBodies((prev) => ({ ...prev, [clip.id]: bodyOf(stdout) })))
      // Record the failure instead of clearing the guard. `cat` also exits 1
      // for a clip deleted on another Mac mid-session, and retrying that on
      // every arrow-press re-spawns a full decrypt forever while the pane
      // shows a loading bar that never ends.
      .catch((e) =>
        setBodies((prev) => ({
          ...prev,
          [clip.id]: { head: "", chars: 0, truncated: false, error: reason(e) },
        })),
      );
  }, []);

  // Only the selected clip is hydrated. Prefetching neighbours tripled the
  // number of DECRYPTED files on disk for clips the user never opened, and
  // the CLI's cache is only 24 deep — the image the pane actually wanted got
  // pruned to make room for text clips nobody looked at.
  useEffect(() => {
    if (!selected) return;
    // A path cached earlier can be pruned out from under us. Forget it, rather
    // than leave Quick Look aimed at a file that is gone and the pane showing
    // a thumbnail captioned with the full image's dimensions.
    const cached = previews[selected];
    if (cached && !existsSync(cached)) {
      delete inflight.current[selected];
      setPreviews((prev) => {
        const next = { ...prev };
        delete next[selected];
        return next;
      });
      setMetas((prev) => {
        const next = { ...prev };
        delete next[selected];
        return next;
      });
      return;
    }
    const clip = byId[selected];
    ensureFile(clip);
    if (showDetail) ensureBody(clip);
  }, [selected, byId, previews, showDetail, ensureFile, ensureBody]);

  async function togglePin(c: Clip) {
    await run(BLINE, ["pin", c.id]);
    await new Promise((r) => setTimeout(r, 400)); // app applies async
    reload();
  }

  async function remove(c: Clip) {
    await run(BLINE, ["remove", c.id]);
    await new Promise((r) => setTimeout(r, 400));
    reload();
  }

  // Every action shells out, and the CLI exits non-zero for a clip that has
  // been deleted on another Mac since the list was read. Without this the
  // promise rejected into nothing: no HUD, no error, no closed window.
  async function attempt(title: string, work: () => Promise<void>) {
    try {
      await work();
    } catch (e) {
      await showToast({ style: Toast.Style.Failure, title, message: reason(e) });
    }
  }

  async function prepareQuickLook(c: Clip) {
    const toast = await showToast({ style: Toast.Style.Animated, title: "Preparing the preview…" });
    const path = await ensureFile(c);
    if (path) {
      toast.style = Toast.Style.Success;
      toast.title = "Ready — press ⌘Y";
    } else {
      toast.style = Toast.Style.Failure;
      toast.title = "Couldn't prepare that clip for Quick Look";
    }
  }

  function thumbFor(c: Clip): string | undefined {
    if (c.kind !== "image" || !thumbDir) return undefined;
    return thumbs.has(`${c.id}.png`) ? `${thumbDir}/${c.id}.png` : undefined;
  }

  function iconFor(c: Clip) {
    const thumb = thumbFor(c);
    if (thumb) return { source: thumb };
    return c.kind === "image" ? Icon.Image : Icon.Text;
  }

  // Images render from the materialized file; until it exists the 128px
  // thumbnail already on disk stands in, so the pane is never empty. Only ever
  // called for the SELECTED clip — running it across the whole list cost a
  // stat() per image per render, several hundred per keypress.
  function detailFor(c: Clip): { markdown: string; loading: boolean } {
    if (c.kind === "image") {
      const full = previews[c.id];
      const path = full && existsSync(full) ? full : thumbFor(c);
      if (!path) return { markdown: "", loading: true };
      return {
        markdown: `![${titleFor(c).replace(/[[\]]/g, "")}](${fileURL(path)})`,
        loading: !full,
      };
    }
    const body = bodies[c.id];
    if (!body) return { markdown: fenced(c.preview), loading: true };
    if (body.error) return { markdown: `*${body.error}*`, loading: false };
    // Only promise ⌘Y when it is actually wired up: the whole-clip file is a
    // separate fetch from the text, and it can fail or be pruned on its own.
    const whole = previews[c.id] ? " — ⌘Y for the whole clip" : "";
    const note = body.truncated
      ? `\n*First ${DETAIL_CHARS.toLocaleString()} of ${body.chars.toLocaleString()} characters${whole}.*`
      : "";
    return { markdown: fenced(body.head) + note, loading: false };
  }

  function sizeFor(c: Clip): string {
    if (c.kind === "image") {
      const meta = metas[c.id];
      return meta ? [meta.dims, bytesLabel(meta.bytes)].filter(Boolean).join(" · ") : "—";
    }
    const body = bodies[c.id];
    if (!body || body.error) return "—";
    return `${body.chars.toLocaleString()} character${body.chars === 1 ? "" : "s"}`;
  }

  async function copy(c: Clip) {
    await run(BLINE, ["copy", c.id]);
    await closeMainWindow();
    await showHUD(`Copied — ${c.source}'s clip is on your clipboard`);
  }

  // Vision runs locally, so this needs no permission and no network. `bline
  // ocr` exits 3 when the image simply has no text in it, which is a different
  // thing from failing — say so rather than showing an error.
  async function ocr(c: Clip) {
    const toast = await showToast({ style: Toast.Style.Animated, title: "Reading the image…" });
    // Usually ~60ms. Only a garbled first pass escalates to the slow model,
    // which can take 20s cold — say what is happening rather than spinning.
    const slow = setTimeout(() => {
      toast.message = "Reading closely — this one needs the slower model";
    }, 2500);
    try {
      const { stdout } = await run(BLINE, ["ocr", c.id], { maxBuffer: 4 * 1024 * 1024 });
      await Clipboard.copy(stdout);
      toast.style = Toast.Style.Success;
      toast.title = "Copied the text";
      toast.message = `${stdout.trim().split("\n").length} lines — it syncs to your other Macs`;
    } catch (e) {
      const code = (e as { code?: number })?.code;
      if (code === 3) {
        toast.style = Toast.Style.Failure;
        toast.title = "No text in that image";
        return;
      }
      throw e;
    } finally {
      clearTimeout(slow);
    }
  }

  async function pasteNow(c: Clip) {
    if (c.kind === "image") {
      // image fidelity comes from the CLI; Raycast pastes text only
      await copy(c);
      return;
    }
    const { stdout } = await run(BLINE, ["cat", c.id], { maxBuffer: 16 * 1024 * 1024 });
    await closeMainWindow();
    await Clipboard.paste(stdout);
  }

  return (
    <List
      isLoading={loading}
      isShowingDetail={showDetail}
      filtering={false}
      onSearchTextChange={setQuery}
      searchBarPlaceholder="Search clips, and the text inside screenshots…"
      onSelectionChange={(id) => {
        if (id) setSelected(id);
      }}
    >
      {shown.map((c) => {
        const pin = c.pinned ? [{ icon: Icon.Pin }] : [];
        const detail = c.id === selected ? detailFor(c) : undefined;
        return (
          <List.Item
            key={c.id}
            // Raycast hands onSelectionChange the item's `id`, generating one
            // when it isn't set — the React key is not it. Without this the
            // selection never matches a clip and only the prefetched top of
            // the list ever got a preview, which is why Quick Look silently
            // did nothing below the sixth row.
            id={c.id}
            icon={iconFor(c)}
            title={titleFor(c)}
            keywords={searchWords(c)}
            quickLook={previews[c.id] ? { path: previews[c.id], name: titleFor(c) } : undefined}
            // With the pane open the list column is too narrow for both, so
            // the source moves into the metadata. The age stays: without it
            // five near-identical rows are impossible to tell apart without
            // arrowing onto each one.
            accessories={
              showDetail ? [...pin, { text: age(c.at) }] : [...pin, { text: c.source }, { text: age(c.at) }]
            }
            detail={
              detail ? (
                <List.Item.Detail
                  isLoading={detail.loading}
                  markdown={detail.markdown}
                  metadata={
                    <List.Item.Detail.Metadata>
                      <List.Item.Detail.Metadata.Label title="Type" text={kindLabel(c.kind)} />
                      <List.Item.Detail.Metadata.Label title="From" icon={Icon.Desktop} text={c.source} />
                      <List.Item.Detail.Metadata.Label title="Copied" text={`${age(c.at)} · ${when(c.at)}`} />
                      <List.Item.Detail.Metadata.Label title="Size" text={sizeFor(c)} />
                      {c.kind === "image" && c.ocr ? (
                        <List.Item.Detail.Metadata.Label
                          title="Text found"
                          icon={Icon.Text}
                          text={c.ocr.replace(/\s+/g, " ").trim().slice(0, 60)}
                        />
                      ) : null}
                      {c.pinned ? (
                        <List.Item.Detail.Metadata.Label title="Pinned" icon={Icon.Pin} text="On every Mac" />
                      ) : null}
                    </List.Item.Detail.Metadata>
                  }
                />
              ) : undefined
            }
            actions={
              <ActionPanel>
                <Action
                  title="Copy to Clipboard"
                  icon={Icon.Clipboard}
                  onAction={() => attempt("Couldn't copy that clip", () => copy(c))}
                />
                {/* cmd+Y, the Raycast-recommended system-wide Quick Look shortcut.
                    Bare Space was tried in b86 and reverted: Raycast shortcuts are
                    declarative, so unlike bLine's own palette (where Space previews
                    only when the search box is empty) it cannot yield to typing. */}
                {previews[c.id] ? (
                  <Action.ToggleQuickLook title="Quick Look" shortcut={{ modifiers: ["cmd"], key: "y" }} />
                ) : (
                  /* The whole-clip file is fetched when a row is selected, and
                     for a moment it is not there yet. ToggleQuickLook is
                     declarative and does NOTHING when the item has no
                     quickLook — so cmd-Y in that window silently failed and
                     Raycast logged "cannot find a quickLook prop". Stand in for
                     it until the file lands, so the key always does something
                     and says what it is doing. */
                  <Action
                    title="Quick Look"
                    icon={Icon.Eye}
                    shortcut={{ modifiers: ["cmd"], key: "y" }}
                    onAction={() => prepareQuickLook(c)}
                  />
                )}
                <Action
                  title="Paste in Frontmost App"
                  icon={Icon.ArrowRightCircle}
                  shortcut={{ modifiers: ["cmd"], key: "return" }}
                  onAction={() => attempt("Couldn't paste that clip", () => pasteNow(c))}
                />
                {c.kind === "image" ? (
                  <Action
                    title="Copy Text from Image"
                    icon={Icon.Text}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "o" }}
                    onAction={() => attempt("Couldn't read that image", () => ocr(c))}
                  />
                ) : null}
                <Action
                  title={showDetail ? "Hide Preview" : "Show Preview"}
                  icon={Icon.Sidebar}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
                  onAction={() => setShowDetail((v) => !v)}
                />
                <Action
                  title={c.pinned ? "Unpin on Every Mac" : "Pin on Every Mac"}
                  icon={Icon.Pin}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
                  onAction={() => attempt("Couldn't change that pin", () => togglePin(c))}
                />
                <Action
                  title="Delete from Every Mac"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  shortcut={{ modifiers: ["ctrl"], key: "x" }}
                  onAction={() => attempt("Couldn't delete that clip", () => remove(c))}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
