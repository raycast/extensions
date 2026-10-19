// "Search Lantern": Lantern's results in Raycast's window, in the order the daemon decides, with the panel's keys:
// ↩ opens at the line or moment, ⌥↩ from the start, ⌘↩ shows in Finder, ⌘Y previews at the place, ⌘C copies the
// result, ⌥⌘C its matched text, ⌃1…⌃0 filter
// (the panel's digits; Raycast keeps ⌘1…⌘9 for "open the Nth result" and extensions cannot take them).
// Raycast never reads the user's files: text, lines and thumbnails come from the daemon (lantern.ts).
import {
  Action,
  ActionPanel,
  Clipboard,
  Detail,
  Icon,
  Image,
  Keyboard,
  LaunchProps,
  List,
  Toast,
  environment,
  getPreferenceValues,
  open,
  showHUD,
  showToast,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { useEffect, useState } from "react";
import { around, highlight } from "./highlight";
import {
  AppHit,
  DefinitionHit,
  BREW_COMMAND,
  DOWNLOAD_URL,
  FileHit,
  LanternStatus,
  NotRunning,
  SearchReply,
  SettingHit,
  ShortcutHit,
  clock,
  installedApp,
  lines,
  openLanternApp,
  openAt,
  opened,
  passage,
  reveal,
  search,
  shortPath,
  status,
  thumbnail,
  whenWhere,
} from "./lantern";
import { MusicHit, play, show } from "./music";

/* The panel's filters on the panel's digits (search/hybrid.py CATEGORIES; 4 is the clipboard, which lives only in the
   Lantern app's memory), with ⌃: Raycast reserves ⌘1…⌘9 for opening the Nth result. */
const CATEGORIES: { value: string; title: string; icon: Icon; key?: Keyboard.KeyEquivalent }[] = [
  { value: "", title: "All Kinds", icon: Icon.MagnifyingGlass },
  { value: "apps", title: "Applications", icon: Icon.AppWindowGrid3x3, key: "1" },
  { value: "settings", title: "System Settings", icon: Icon.Gear, key: "2" },
  { value: "shortcuts", title: "Shortcuts", icon: Icon.Layers, key: "3" },
  { value: "code", title: "Code", icon: Icon.Code, key: "5" },
  { value: "docs", title: "Documents", icon: Icon.Document, key: "6" },
  { value: "pdf", title: "PDFs", icon: Icon.Document, key: "7" },
  { value: "photos", title: "Photos", icon: Icon.Image, key: "8" },
  { value: "media", title: "Recordings and Videos", icon: Icon.Video, key: "9" },
  { value: "music", title: "Music", icon: Icon.Music, key: "0" },
];

interface Ctx {
  query: string;
  eventId: number | null;
  category: string;
  setCategory: (c: string) => void;
}

// As a Fallback Command (Raycast settings → Fallback Commands) it opens with the text typed in Raycast's root search.
export default function Command(props: LaunchProps) {
  const { includeApps } = getPreferenceValues<Preferences.Search>();
  const [query, setQuery] = useState(props.fallbackText ?? "");
  const [category, setCategory] = useState("");
  const { data, isLoading, error, revalidate } = usePromise(
    async (q: string, c: string) => (q.trim() ? search(q.trim(), c || undefined) : undefined),
    [query, category],
  );
  const ctx: Ctx = { query: query.trim(), eventId: data?.event_id ?? null, category, setCategory };
  // Lantern's own state: an unfinished setup, a download or a first indexing are explained, not shown as "no results"
  const { data: st, revalidate: recheck } = usePromise(status, [], { onError: () => undefined });
  const busy = !!st && (!!st.model_download?.running || (st.worker.running && (st.files.indexed ?? 0) === 0));
  useEffect(() => {
    if (!busy) return;
    const timer = setInterval(recheck, 2000);
    return () => clearInterval(timer);
  }, [busy, recheck]);
  // Raycast only runs the shortcuts of the selected row's actions: every empty state carries the filter actions too,
  // or ⌃1…⌃0 would beep once a filter leaves nothing to select.
  const rows = data && query.trim() ? sections(data, includeApps, ctx).filter(Boolean) : [];

  if (error instanceof NotRunning && !installedApp()) {
    return (
      <List searchText={query} onSearchTextChange={setQuery} throttle>
        <List.EmptyView
          icon={Icon.Download}
          title="Lantern is not installed"
          description="This extension searches with the Lantern app, which runs on your Mac. Install it, open it once, then search here."
          actions={
            <ActionPanel>
              <Action.OpenInBrowser title="Download Lantern" url={DOWNLOAD_URL} />
              <Action.CopyToClipboard title="Copy Homebrew Command" content={BREW_COMMAND} />
              <Action
                title="Retry Search"
                icon={Icon.ArrowClockwise}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
                onAction={() => revalidate()}
              />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  if (error instanceof NotRunning) {
    return (
      <List searchText={query} onSearchTextChange={setQuery} throttle>
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="Lantern is not running"
          description="Start the Lantern app; its background daemon answers these searches."
          actions={
            <ActionPanel>
              <Action
                title="Open Lantern"
                icon={Icon.AppWindow}
                onAction={async () => {
                  await openLanternApp();
                  setTimeout(revalidate, 1500);
                }}
              />
              <Action
                title="Retry Search"
                icon={Icon.ArrowClockwise}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
                onAction={() => revalidate()}
              />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  return (
    <List
      isLoading={isLoading}
      searchText={query}
      onSearchTextChange={setQuery}
      throttle
      isShowingDetail={!!data && hasFiles(data)}
      searchBarPlaceholder="Search Lantern by what is inside"
      searchBarAccessory={
        <List.Dropdown tooltip="Kind" value={category} onChange={setCategory}>
          {CATEGORIES.map((c) => (
            <List.Dropdown.Item
              key={c.value}
              value={c.value}
              title={c.key ? `${c.title}  ⌃${c.key}` : c.title}
              icon={c.icon}
            />
          ))}
        </List.Dropdown>
      }
    >
      {st && setupView(st) && (!query.trim() || !rows.length) ? (
        setupView(st)
      ) : !query.trim() ? (
        <List.EmptyView
          icon="icon.png"
          title="Search your Mac by what is inside"
          description="Files, code, photos and recordings, found by meaning."
          actions={<ActionPanel>{FilterActions({ ctx })}</ActionPanel>}
        />
      ) : error ? (
        <List.EmptyView
          icon={Icon.Warning}
          title="Lantern could not search"
          description={String(error.message)}
          actions={
            <ActionPanel>
              <Action
                title="Retry Search"
                icon={Icon.ArrowClockwise}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
                onAction={() => revalidate()}
              />
              {FilterActions({ ctx })}
            </ActionPanel>
          }
        />
      ) : rows.length ? (
        rows
      ) : !isLoading ? (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title={category ? "Nothing of this kind" : "No results"}
          description={category ? "⌃ and the same digit again shows all kinds." : undefined}
          actions={<ActionPanel>{FilterActions({ ctx })}</ActionPanel>}
        />
      ) : null}
    </List>
  );
}

/** An index needing attention, an unfinished setup, a model download, a first indexing: what to do or wait for. */
function setupView(st: LanternStatus) {
  const openLantern = (
    <ActionPanel>
      <Action
        title="Open Lantern"
        icon={Icon.AppWindow}
        onAction={openLanternApp}
      />
    </ActionPanel>
  );
  if (st.index_problem) {
    return (
      <List.EmptyView
        icon={Icon.Warning}
        title="Lantern’s index needs attention"
        description="Open Lantern from the menu bar: it explains what happened and can update or rebuild the index."
        actions={openLantern}
      />
    );
  }
  if (st.model_download?.running) {
    const approx = Math.max(st.model_download.approx_mb ?? 1200, 1);
    const got = Math.min(st.model_download.downloaded_mb ?? 0, approx);
    return (
      <List.EmptyView
        icon={Icon.Download}
        title="Lantern is downloading its models"
        description={`${got} / ~${approx} MB. You can search here as soon as it is done.`}
        actions={openLantern}
      />
    );
  }
  if (st.models_missing) {
    return (
      <List.EmptyView
        icon={Icon.Download}
        title="Finish setting up Lantern"
        description="Download the search model in Lantern (its icon in the menu bar). It takes one click; then search here."
        actions={openLantern}
      />
    );
  }
  if (st.worker.running && (st.files.indexed ?? 0) === 0) {
    const where = st.worker.total ? ` ${st.worker.done ?? 0} / ${st.worker.total} files.` : "";
    return (
      <List.EmptyView
        icon={Icon.Clock}
        title="Lantern is indexing your files for the first time"
        description={`Results fill in as it goes.${where}`}
        actions={openLantern}
      />
    );
  }
  return null;
}

function hasFiles(r: SearchReply): boolean {
  return r.results.length + r.photos.length + r.definitions.length > 0;
}

/** ⌃1…⌃0 pick a filter; the chosen one again goes back to all kinds, like the panel's chips. */
function FilterActions({ ctx }: { ctx: Ctx }) {
  return (
    <ActionPanel.Section title="Filter by Kind">
      {CATEGORIES.filter((c) => c.key).map((c) => (
        <Action
          key={c.value}
          title={ctx.category === c.value ? `All Kinds (Was ${c.title})` : c.title}
          icon={c.icon}
          shortcut={{ modifiers: ["ctrl"], key: c.key! }}
          onAction={() => ctx.setCategory(ctx.category === c.value ? "" : c.value)}
        />
      ))}
    </ActionPanel.Section>
  );
}

function sections(r: SearchReply, includeApps: boolean, ctx: Ctx) {
  const chosen = (kind: string) => ctx.category === kind; // a chosen filter shows its kind even if hidden by default
  const order = [...r.order, "definitions", "files", "photos", "music"].filter((n, i, all) => all.indexOf(n) === i);
  return order.map((name) => {
    switch (name) {
      case "definitions":
        return r.definitions.length ? (
          <List.Section key={name} title="Definitions">
            {r.definitions.map((d) => (
              <DefinitionItem key={`${d.path}:${d.line}`} d={d} ctx={ctx} />
            ))}
          </List.Section>
        ) : null;
      case "files":
        return r.results.length ? (
          <List.Section key={name} title="Files">
            {r.results.map((h) => (
              <FileItem key={h.chunk_id} h={h} ctx={ctx} />
            ))}
          </List.Section>
        ) : null;
      case "photos":
        return r.photos.length ? (
          <List.Section key={name} title="Photos">
            {r.photos.map((h) => (
              <FileItem key={h.chunk_id} h={h} ctx={ctx} photo />
            ))}
          </List.Section>
        ) : null;
      case "apps":
        return (includeApps || chosen("apps")) && r.apps.length ? (
          <List.Section key={name} title="Applications">
            {r.apps.map((a) => (
              <AppItem key={a.path} a={a} ctx={ctx} />
            ))}
          </List.Section>
        ) : null;
      case "settings":
        return (includeApps || chosen("settings")) && r.settings.length ? (
          <List.Section key={name} title="System Settings">
            {r.settings.map((s) => (
              <SettingItem key={s.key} s={s} ctx={ctx} />
            ))}
          </List.Section>
        ) : null;
      case "shortcuts":
        return r.shortcuts?.length ? (
          <List.Section key={name} title="Shortcuts">
            {r.shortcuts.map((s) => (
              <ShortcutItem key={s.id} s={s} ctx={ctx} />
            ))}
          </List.Section>
        ) : null;
      case "music":
        return r.music?.length ? (
          <List.Section key={name} title="Music">
            {r.music.map((m) => (
              <MusicItem key={`${m.id}:${m.playlist_id ?? ""}`} m={m} ctx={ctx} />
            ))}
          </List.Section>
        ) : null;
      default:
        return null; // answers and the dictionary: Raycast has its own calculator and dictionary
    }
  });
}

/* ---------- files ---------- */

const KIND_ICONS: Record<string, Icon> = {
  code: Icon.Code,
  pdf: Icon.Document,
  image: Icon.Image,
  ocr: Icon.Image,
  audio: Icon.Microphone,
  transcript: Icon.Microphone,
  frame: Icon.Video,
  screen: Icon.Video,
};
const VIDEO = new Set([".mp4", ".mov", ".m4v", ".mkv", ".webm", ".avi"]);
const FENCE: Record<string, string> = {
  py: "python",
  js: "javascript",
  ts: "typescript",
  rs: "rust",
  kt: "kotlin",
  rb: "ruby",
  sh: "bash",
  md: "markdown",
  h: "c",
  hpp: "cpp",
  cc: "cpp",
  cs: "csharp",
  m: "objectivec",
};

function isVideo(h: FileHit): boolean {
  return h.start_ms != null && VIDEO.has(path.extname(h.path).toLowerCase());
}

/**
 * The icon Finder shows for the file's type, without touching the file: macOS draws it for an empty sample file with
 * the same extension, kept in the extension's own support folder (reading the real file in Downloads or Documents
 * would make macOS ask to give Raycast access to that folder).
 */
function typeIcon(file: string): Image.ImageLike | null {
  const ext = path.extname(file).slice(1).toLowerCase();
  if (!/^[a-z0-9]{1,10}$/.test(ext)) return null;
  const folder = path.join(environment.supportPath, "type-icons");
  const sample = path.join(folder, `sample.${ext}`);
  try {
    if (!existsSync(sample)) {
      mkdirSync(folder, { recursive: true });
      writeFileSync(sample, "");
    }
    return { fileIcon: sample };
  } catch {
    return null;
  }
}

function kindIcon(h: FileHit, photo: boolean): Image.ImageLike {
  if (photo) return Icon.Image;
  return typeIcon(h.path) ?? (isVideo(h) ? Icon.Video : (KIND_ICONS[h.kind] ?? Icon.Document));
}

const APP_ICONS = {
  spotify: "/Applications/Spotify.app",
  music: "/System/Applications/Music.app",
  shortcuts: "/System/Applications/Shortcuts.app",
  settings: "/System/Applications/System Settings.app",
};

function appIcon(app: string, fallback: Icon): Image.ImageLike {
  return existsSync(app) ? { fileIcon: app } : fallback;
}

function where(h: FileHit): string {
  if (h.start_ms != null) return clock(h.start_ms);
  if (h.page != null) return `page ${h.page}`;
  if (h.start_line != null)
    return h.end_line && h.end_line !== h.start_line ? `lines ${h.start_line}–${h.end_line}` : `line ${h.start_line}`;
  return "";
}

/** The id the Lantern app gives the same row (LanternCore SearchResult.id), so its history stays one. */
function fileKey(h: FileHit): string {
  return `${h.kind}|${h.chunk_id}|${h.start_line ?? -1}|${h.path}|`;
}

function useThumbnail(h: FileHit, photo: boolean, size = 480): string | null | undefined {
  const { data } = usePromise(
    async (file: string, ms: number | null, wanted: boolean, px: number) => (wanted ? thumbnail(file, ms, px) : null),
    [h.path, h.start_ms, photo || isVideo(h), size],
    { onError: () => undefined }, // no thumbnail (older daemon, unreadable file): the kind icon stays
  );
  return data;
}

/** Code: the lines around the result, its own lines marked ▶. */
function codeMarkdown(file: string, rows: [number, string][], from: number, to: number): string {
  const ext = path.extname(file).slice(1).toLowerCase();
  const width = String(rows[rows.length - 1]?.[0] ?? 0).length;
  const body = rows
    .map(([n, text]) => `${n >= from && n <= to ? "▶" : " "} ${String(n).padStart(width)}  ${text}`)
    .join("\n");
  return "```" + (FENCE[ext] ?? ext) + "\n" + body + "\n```";
}

/**
 * The preview: lines of code around the result, or the whole indexed passage with the query in bold (a window
 * around the first match on the right, all of it behind ⌘Y), under the thumbnail of a photo or video. All of it
 * comes from the daemon.
 */
function usePreviewMarkdown(h: FileHit, ctx: Ctx, photo: boolean, thumb: string | null | undefined, large: boolean) {
  const code = h.kind === "code" && h.start_line != null;
  const { data: rows } = usePromise(
    async (file: string, a: number, b: number | null, context: number) => lines(file, a, b, context),
    [h.path, h.start_line ?? 1, h.end_line, large ? 30 : 8],
    { execute: code, onError: () => undefined },
  );
  const { data: whole } = usePromise(async (id: number) => passage(id), [h.chunk_id], {
    execute: !code && h.chunk_id >= 0,
    onError: () => undefined,
  });
  const size = large ? "" : "?raycast-height=135";
  const image = thumb ? `![](${encodeURI(`file://${thumb}`)}${size})\n\n` : "";
  if (code && rows?.length) return codeMarkdown(h.path, rows, h.start_line!, h.end_line ?? h.start_line!);
  const text = (whole?.text ?? h.preview).trim();
  if (text) return image + highlight(large ? text : around(text, ctx.query), ctx.query);
  if (h.start_ms != null) return image + `_A recording. ↩ plays it from ${clock(h.start_ms)}._`;
  return image + (photo ? "_A photo found by what is in it._" : " ");
}

function FileDetail({ h, ctx, photo, thumb }: { h: FileHit; ctx: Ctx; photo: boolean; thumb?: string | null }) {
  const markdown = usePreviewMarkdown(h, ctx, photo, thumb, false);
  const at = where(h);
  const made = whenWhere(h, photo);
  return (
    <List.Item.Detail
      markdown={markdown}
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label title="Folder" text={shortPath(path.dirname(h.path))} />
          {at ? <List.Item.Detail.Metadata.Label title="Where" text={at} /> : null}
          {made ? <List.Item.Detail.Metadata.Label title="Made" text={made} /> : null}
          {h.symbol ? <List.Item.Detail.Metadata.Label title="In" text={h.symbol} /> : null}
        </List.Item.Detail.Metadata>
      }
    />
  );
}

/**
 * ⌘Y: the preview at the place, inside Raycast like the panel's (30 lines around, the whole passage; a photo or a
 * video's frame at the moment, large, above its transcript). Raycast cannot play a video in its window, and handing
 * the preview to QuickTime left QuickTime open in front: playing stays on ↩.
 */
function PreviewView({ h, ctx, photo, thumb }: { h: FileHit; ctx: Ctx; photo: boolean; thumb?: string | null }) {
  const large = useThumbnail(h, photo, 1024);
  const markdown = usePreviewMarkdown(h, ctx, photo, large ?? thumb, true);
  return (
    <Detail
      navigationTitle={`${path.basename(h.path)}${where(h) ? " · " + where(h) : ""}`}
      markdown={markdown}
      actions={<ActionPanel>{openActions(h, ctx, photo, thumb, false)}</ActionPanel>}
    />
  );
}

/**
 * ⌥⌘C, as the panel's: the whole passage the result was found in (code: the chunk with the definition; a recording:
 * the transcript at the moment; a photo: the text read from it), from the daemon's index.
 */
async function copyMatchedText(h: FileHit) {
  try {
    const text = (await passage(h.chunk_id)).text.trim();
    if (!text) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No text to copy",
        message: "Lantern found this result by what is in it, not by its text.",
      });
      return;
    }
    await Clipboard.copy(text);
    await showHUD("Copied Matched Text");
  } catch (err) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Could not copy the matched text",
      message: String(err instanceof Error ? err.message : err),
    });
  }
}

function openActions(h: FileHit, ctx: Ctx, photo: boolean, thumb: string | null | undefined, withPreview: boolean) {
  const media = h.start_ms != null;
  return (
    <>
      <ActionPanel.Section>
        <Action
          title={
            media
              ? "Play from Here"
              : h.start_line != null
                ? "Open at Line"
                : h.page != null
                  ? "Open at Page"
                  : "Open"
          }
          icon={media ? Icon.Play : Icon.ArrowRight}
          onAction={async () => {
            opened(ctx.eventId, h.chunk_id, fileKey(h));
            await openAt(h.path, h.start_line, h.start_ms, h.page);
          }}
        />
        <Action
          title={media ? "Play from the Start" : "Open from the Start"}
          icon={Icon.ArrowCounterClockwise}
          shortcut={{ modifiers: ["opt"], key: "return" }}
          onAction={async () => {
            opened(ctx.eventId, h.chunk_id, fileKey(h));
            // a recording seeks to 0:00 even when it is already open further on
            await openAt(h.path, null, media ? 0 : null, null);
          }}
        />
        <Action
          title="Show in Finder"
          icon={Icon.Finder}
          shortcut={{ modifiers: ["cmd"], key: "return" }}
          onAction={() => {
            opened(ctx.eventId, h.chunk_id, fileKey(h));
            reveal(h.path);
          }}
        />
        {withPreview ? (
          <Action.Push
            title="Preview Here"
            icon={Icon.Eye}
            shortcut={{ modifiers: ["cmd"], key: "y" }}
            target={<PreviewView h={h} ctx={ctx} photo={photo} thumb={thumb} />}
          />
        ) : null}
        <Action.ToggleQuickLook title="Quick Look the File" shortcut={{ modifiers: ["cmd", "shift"], key: "y" }} />
      </ActionPanel.Section>
      <ActionPanel.Section>
        <Action.CopyToClipboard
          title="Copy File"
          content={{ file: h.path }}
          shortcut={{ modifiers: ["cmd"], key: "c" }}
        />
        {h.chunk_id >= 0 ? (
          <Action
            title="Copy Matched Text"
            icon={Icon.Text}
            shortcut={{ modifiers: ["opt", "cmd"], key: "c" }}
            onAction={() => copyMatchedText(h)}
          />
        ) : null}
        <Action.CopyToClipboard
          title="Copy Path"
          content={h.path}
          shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
        />
      </ActionPanel.Section>
      <FilterActions ctx={ctx} />
    </>
  );
}

function FileItem({ h, ctx, photo = false }: { h: FileHit; ctx: Ctx; photo?: boolean }) {
  const thumb = useThumbnail(h, photo);
  return (
    <List.Item
      title={path.basename(h.path)}
      subtitle={where(h) || whenWhere(h, photo)}
      icon={thumb ? { source: thumb } : kindIcon(h, photo)}
      quickLook={{ path: h.path, name: path.basename(h.path) }}
      detail={<FileDetail h={h} ctx={ctx} photo={photo} thumb={thumb} />}
      actions={<ActionPanel>{openActions(h, ctx, photo, thumb, true)}</ActionPanel>}
    />
  );
}

/* ---------- definitions ---------- */

function DefinitionItem({ d, ctx }: { d: DefinitionHit; ctx: Ctx }) {
  const asHit: FileHit = {
    chunk_id: d.chunk_id ?? -1,
    path: d.path,
    kind: "code",
    preview: d.signature,
    start_line: d.line,
    end_line: d.line,
    start_ms: null,
    end_ms: null,
    page: null,
    symbol: d.parent,
  };
  return (
    <List.Item
      title={d.parent ? `${d.parent}.${d.name}` : d.name}
      subtitle={`line ${d.line}`}
      icon={Icon.Code}
      quickLook={{ path: d.path, name: path.basename(d.path) }}
      detail={<FileDetail h={asHit} ctx={ctx} photo={false} />}
      actions={<ActionPanel>{openActions(asHit, ctx, false, null, true)}</ActionPanel>}
    />
  );
}

/* ---------- apps, settings, shortcuts, music ---------- */

/** A small detail pane for rows that are not files, so the pane beside them is never empty. */
function SimpleDetail({ labels }: { labels: [string, string][] }) {
  return (
    <List.Item.Detail
      metadata={
        <List.Item.Detail.Metadata>
          {labels.map(([title, text]) => (
            <List.Item.Detail.Metadata.Label key={title} title={title} text={text} />
          ))}
        </List.Item.Detail.Metadata>
      }
    />
  );
}

function AppItem({ a, ctx }: { a: AppHit; ctx: Ctx }) {
  return (
    <List.Item
      title={a.name}
      icon={{ fileIcon: a.path }} // apps live in /Applications: no folder permission involved
      detail={<SimpleDetail labels={[["Application", a.name], ["Location", shortPath(path.dirname(a.path))]]} />}
      actions={
        <ActionPanel>
          <Action
            title="Open"
            icon={Icon.AppWindow}
            onAction={() => {
              opened(ctx.eventId, 0, `app|0|-1|${a.path}|`); // the app's row id: both learn from the same choices
              open(a.path);
            }}
          />
          <Action
            title="Show in Finder"
            icon={Icon.Finder}
            shortcut={{ modifiers: ["cmd"], key: "return" }}
            onAction={() => reveal(a.path)}
          />
          <Action.CopyToClipboard
            title="Copy Application"
            content={{ file: a.path }}
            shortcut={{ modifiers: ["cmd"], key: "c" }}
          />
          <FilterActions ctx={ctx} />
        </ActionPanel>
      }
    />
  );
}

function SettingItem({ s, ctx }: { s: SettingHit; ctx: Ctx }) {
  return (
    <List.Item
      title={s.title}
      subtitle={s.is_pane ? "System Settings" : `System Settings › ${s.pane}`}
      icon={appIcon(APP_ICONS.settings, Icon.Gear)}
      detail={<SimpleDetail labels={[["Setting", s.title], ["In", s.is_pane ? "System Settings" : s.pane]]} />}
      actions={
        <ActionPanel>
          <Action
            title="Open"
            icon={Icon.Gear}
            onAction={() => {
              opened(ctx.eventId, 0, `setting|0|-1|${s.url}|${s.title}`);
              open(s.url);
            }}
          />
          <Action.CopyToClipboard title="Copy Name" content={s.title} shortcut={{ modifiers: ["cmd"], key: "c" }} />
          <FilterActions ctx={ctx} />
        </ActionPanel>
      }
    />
  );
}

function ShortcutItem({ s, ctx }: { s: ShortcutHit; ctx: Ctx }) {
  const url = `shortcuts://run-shortcut?name=${encodeURIComponent(s.name)}`;
  return (
    <List.Item
      title={s.name}
      subtitle="Shortcut"
      icon={appIcon(APP_ICONS.shortcuts, Icon.Layers)}
      detail={<SimpleDetail labels={[["Shortcut", s.name], ["Runs in", "Shortcuts"]]} />}
      actions={
        <ActionPanel>
          <Action
            title="Run Shortcut"
            icon={Icon.Play}
            onAction={() => {
              opened(ctx.eventId, 0, `shortcut|0|-1|${url}|`);
              open(url);
            }}
          />
          <Action.CopyToClipboard title="Copy Name" content={s.name} shortcut={{ modifiers: ["cmd"], key: "c" }} />
          <FilterActions ctx={ctx} />
        </ActionPanel>
      }
    />
  );
}

function MusicItem({ m, ctx }: { m: MusicHit; ctx: Ctx }) {
  const subtitle =
    m.kind === "playlist"
      ? m.count > 0
        ? `Playlist · ${m.count} songs`
        : "Playlist"
      : [m.artist, m.album].filter(Boolean).join(" · ") +
        (m.playlist_name ? `  ·  from playlist “${m.playlist_name}”` : "");
  // the app's row id for the same song (LanternCore MusicResult: path music:<source>:<kind>:<id>[:<playlist>])
  const key = `${m.kind}|0|-1|music:${m.source}:${m.kind}:${m.id}${m.playlist_id ? ":" + m.playlist_id : ""}|`;
  return (
    <List.Item
      title={m.title}
      subtitle={subtitle}
      icon={appIcon(m.source === "spotify" ? APP_ICONS.spotify : APP_ICONS.music, m.kind === "playlist" ? Icon.List : Icon.Music)}
      accessories={[{ text: m.source === "spotify" ? "Spotify" : "Music" }]}
      detail={
        <List.Item.Detail
          metadata={
            <List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.Label title={m.kind === "playlist" ? "Playlist" : "Song"} text={m.title} />
              {m.artist ? <List.Item.Detail.Metadata.Label title="Artist" text={m.artist} /> : null}
              {m.album ? <List.Item.Detail.Metadata.Label title="Album" text={m.album} /> : null}
              {m.playlist_name ? <List.Item.Detail.Metadata.Label title="From Playlist" text={m.playlist_name} /> : null}
              {m.kind === "playlist" && m.count > 0 ? (
                <List.Item.Detail.Metadata.Label title="Songs" text={String(m.count)} />
              ) : null}
              <List.Item.Detail.Metadata.Label title="App" text={m.source === "spotify" ? "Spotify" : "Music"} />
            </List.Item.Detail.Metadata>
          }
        />
      }
      actions={
        <ActionPanel>
          <Action
            title="Play"
            icon={Icon.Play}
            onAction={async () => {
              opened(ctx.eventId, 0, key);
              try {
                await play(m);
              } catch (err) {
                await showToast({
                  style: Toast.Style.Failure,
                  title: m.source === "spotify" ? "Could not play in Spotify" : "Could not play in Music",
                  message: String(err instanceof Error ? err.message : err),
                });
              }
            }}
          />
          <Action
            title={m.source === "spotify" ? "Show in Spotify" : "Show in Music"}
            icon={Icon.Eye}
            shortcut={{ modifiers: ["cmd"], key: "return" }}
            onAction={async () => {
              try {
                await show(m);
              } catch (err) {
                await showToast({
                  style: Toast.Style.Failure,
                  title: m.source === "spotify" ? "Could not show in Spotify" : "Could not show in Music",
                  message: String(err instanceof Error ? err.message : err),
                });
              }
            }}
          />
          <Action.CopyToClipboard title="Copy Name" content={m.title} shortcut={{ modifiers: ["cmd"], key: "c" }} />
          <FilterActions ctx={ctx} />
        </ActionPanel>
      }
    />
  );
}
