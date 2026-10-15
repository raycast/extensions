import {
  Action,
  ActionPanel,
  Clipboard,
  Color,
  Icon,
  List,
  open,
  showInFinder,
  showToast,
  Toast,
  type Image,
  Keyboard,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import path from "node:path";
import { useEffect, useRef, useState, type ReactElement } from "react";
import {
  truffleBin,
  digupEmbedAhead,
  digupRender,
  digupSearch,
  digupStatus,
  digupText,
  fsearchRecent,
  fsearchSearch,
  fsearchStatus,
  home,
  restartFsearch,
} from "./backends";
import { openFile } from "./open";
import { merge, plan, tilde, where, type DigupHit, type FsearchHit } from "./query";

const PAUSE_MS = 280;
const PICTURES = new Set(["png", "jpg", "jpeg", "gif", "webp", "bmp", "tif", "tiff", "svg"]);
const KIND_ICON: Record<string, Image.ImageLike> = {
  pdf: Icon.Document,
  doc: Icon.Text,
  audio: Icon.Waveform,
  video: Icon.FilmStrip,
  code: Icon.Code,
};

type Digup = { q: string; hits: DigupHit[]; strong: number; meaning: boolean };

export default function Command() {
  const [text, setText] = useState("");
  const [fsearch, setFsearch] = useState<FsearchHit[]>([]);
  const [digup, setDigup] = useState<Digup>({ q: "", hits: [], strong: 0, meaning: false });
  const [busy, setBusy] = useState({ fsearch: false, digup: false });
  const [detail, setDetail] = useState(false);
  const seq = useRef(0);

  const fsStatus = usePromise(fsearchStatus, [], { onError: () => {} });
  // While Full Disk Access is missing, look again every 3 s: the daemon restarts itself once it's granted, and the
  // setup item goes away by itself.
  const waitingForAccess = fsStatus.data?.ready === true && !fsStatus.data.fullDiskAccess;
  useEffect(() => {
    if (!waitingForAccess) return;
    const timer = setInterval(() => fsStatus.revalidate(), 3000);
    return () => clearInterval(timer);
  }, [waitingForAccess]);
  const duStatus = usePromise(digupStatus, [], { onError: () => {} });

  useEffect(() => {
    const run = ++seq.current;
    const fresh = () => run === seq.current;
    const p = plan(text);
    const fail = (engine: string) => (error: unknown) => {
      if (!fresh()) return;
      setBusy((b) => ({ ...b, [engine]: false }));
      showToast({ style: Toast.Style.Failure, title: `${engine} failed`, message: String(error) });
    };

    setBusy({ fsearch: true, digup: p.digup !== null });
    (p.fsearch === null ? Promise.resolve(text.trim() ? [] : null) : fsearchSearch(p.fsearch))
      .then((hits) => hits ?? fsearchRecent())
      .then((hits) => {
        if (!fresh()) return;
        setFsearch(hits);
        setBusy((b) => ({ ...b, fsearch: false }));
      })
      .catch(fail("truffle"));

    if (p.digup === null) {
      setDigup({ q: "", hits: [], strong: 0, meaning: false });
      return;
    }
    const q = p.digup;
    // While typing: the meaning index's exact words at once, and the meaning once typing pauses (its vector embedded ahead).
    digupEmbedAhead(q, p.code);
    digupSearch(q, { code: p.code, meaning: false })
      // Never over this query's own meaning results, should they arrive first.
      .then((r) => fresh() && setDigup((d) => (d.q === q && d.meaning ? d : { q, ...r })))
      .catch(() => {});
    const timer = setTimeout(() => {
      digupSearch(q, { code: p.code, meaning: true })
        .then((r) => {
          if (!fresh()) return;
          setDigup({ q, ...r });
          setBusy((b) => ({ ...b, digup: false }));
          if (r.warning) showToast({ style: Toast.Style.Failure, title: "Meaning", message: r.warning });
        })
        .catch(fail("meaning search"));
    }, PAUSE_MS);
    return () => clearTimeout(timer);
  }, [text]);

  const p = plan(text);
  const merged = merge(digup.hits, fsearch);
  const strongPaths = new Set(digup.hits.slice(0, Math.max(digup.strong, 0)).map((h) => h.path));
  const strong = merged.digup.filter((h) => strongPaths.has(h.path));
  const weaker = merged.digup.filter((h) => !strongPaths.has(h.path)).slice(0, 8);
  const isGrep = merged.fsearch.some((h) => h.lines);

  const meaningSection = strong.length > 0 && (
    <List.Section
      key="meaning"
      title={p.code ? "Code" : "By meaning"}
      subtitle={digup.meaning ? `${strong.length}` : "exact words…"}
    >
      {strong.map((hit) => (
        <DigupItem
          key={`${hit.path}#${hit.segment_id}`}
          hit={hit}
          detail={detail}
          toggle={() => setDetail((d) => !d)}
          setText={setText}
        />
      ))}
    </List.Section>
  );
  const filesSection = merged.fsearch.length > 0 && (
    <List.Section
      key="files"
      title={text.trim() ? (isGrep ? "Contents" : "Files") : "Recent"}
      subtitle={`${merged.fsearch.length}`}
    >
      {merged.fsearch.map((hit) => (
        <FsearchItem key={hit.path} hit={hit} detail={detail} toggle={() => setDetail((d) => !d)} setText={setText} />
      ))}
    </List.Section>
  );

  return (
    <List
      searchText={text}
      onSearchTextChange={setText}
      filtering={false}
      throttle={false}
      isLoading={busy.fsearch || busy.digup}
      isShowingDetail={detail}
      searchBarPlaceholder="Name, words inside, or describe it… (code: … · grep: … · in:~/folder)"
    >
      {p.lead === "digup" ? [meaningSection, filesSection] : [filesSection, meaningSection]}
      {weaker.length > 0 && (
        <List.Section title="Weaker matches">
          {weaker.map((hit) => (
            <DigupItem
              key={`${hit.path}#${hit.segment_id}`}
              hit={hit}
              detail={detail}
              toggle={() => setDetail((d) => !d)}
              setText={setText}
            />
          ))}
        </List.Section>
      )}
      <Setup
        fs={fsStatus.data}
        fsError={fsStatus.error}
        du={duStatus.data}
        duError={duStatus.error}
        revalidate={fsStatus.revalidate}
      />
      <List.EmptyView
        icon={Icon.MagnifyingGlass}
        title={text.trim() ? "Nothing dug up" : "Dig"}
        description="Try fewer words, or describe what the file shows or says."
      />
    </List>
  );
}

type ItemProps = { detail: boolean; toggle: () => void; setText: (text: string) => void };

function DigupItem({ hit, detail, toggle, setText }: ItemProps & { hit: DigupHit }) {
  const ext = path.extname(hit.path).slice(1).toLowerCase();
  const at = where(hit);
  const picture = hit.kind === "image" || hit.kind === "screenshot";
  const icon: Image.ImageLike =
    picture && PICTURES.has(ext) ? { source: hit.path } : (KIND_ICON[hit.kind] ?? { fileIcon: hit.path });
  return (
    <List.Item
      title={path.basename(hit.path)}
      subtitle={detail ? undefined : tilde(path.dirname(hit.path), home)}
      icon={icon}
      quickLook={{ path: hit.path }}
      accessories={
        detail
          ? at
            ? [{ tag: at }]
            : []
          : [
              ...(at ? [{ tag: { value: at, color: Color.Purple } }] : []),
              ...(hit.excerpt ? [{ icon: Icon.QuoteBlock, tooltip: hit.excerpt.slice(0, 300) }] : []),
              { text: hit.kind },
            ]
      }
      detail={detail ? <DigupDetail hit={hit} /> : undefined}
      actions={<FileActions file={hit.path} hit={hit} toggle={toggle} setText={setText} />}
    />
  );
}

function FsearchItem({ hit, detail, toggle, setText }: ItemProps & { hit: FsearchHit }) {
  const first = hit.lines?.[0];
  return (
    <List.Item
      title={path.basename(hit.path)}
      subtitle={detail ? undefined : first ? first.text.trim().slice(0, 120) : tilde(path.dirname(hit.path), home)}
      icon={{ fileIcon: hit.path }}
      quickLook={{ path: hit.path }}
      accessories={
        detail
          ? []
          : [
              ...(first ? [{ tag: `:${first.line}` }] : []),
              ...(hit.mtime ? [{ date: new Date(hit.mtime * 1000), tooltip: "Modified" }] : []),
            ]
      }
      detail={detail ? <FsearchDetail hit={hit} /> : undefined}
      actions={<FileActions file={hit.path} toggle={toggle} setText={setText} />}
    />
  );
}

function FileActions({
  file,
  hit,
  toggle,
  setText,
}: {
  file: string;
  hit?: DigupHit;
  toggle: () => void;
  setText: (t: string) => void;
}) {
  const at = hit ? where(hit) : undefined;
  return (
    <ActionPanel>
      <ActionPanel.Section>
        <Action
          title={at && (hit?.kind === "video" || hit?.kind === "audio") ? `Open at ${at}` : "Open"}
          icon={Icon.ArrowRight}
          onAction={() => openFile(file, hit)}
        />
        <Action
          title="Show in Finder"
          icon={Icon.Finder}
          shortcut={{ modifiers: ["cmd"], key: "return" }}
          onAction={() => showInFinder(file)}
        />
        <Action.ToggleQuickLook shortcut={Keyboard.Shortcut.Common.ToggleQuickLook} />
        <Action
          title="Toggle Preview"
          icon={Icon.Sidebar}
          shortcut={{ modifiers: ["cmd"], key: "d" }}
          onAction={toggle}
        />
        <Action.OpenWith path={file} shortcut={Keyboard.Shortcut.Common.OpenWith} />
      </ActionPanel.Section>
      <ActionPanel.Section>
        <Action
          title="Copy File"
          icon={Icon.CopyClipboard}
          shortcut={Keyboard.Shortcut.Common.Copy}
          onAction={() => Clipboard.copy({ file })}
        />
        <Action.CopyToClipboard title="Copy Path" content={file} shortcut={Keyboard.Shortcut.Common.Pin} />
        <Action
          title="Search in This Folder"
          icon={Icon.MagnifyingGlass}
          shortcut={{ modifiers: ["cmd"], key: "f" }}
          onAction={() => setText(`in:${tilde(path.dirname(file), home)} `)}
        />
      </ActionPanel.Section>
    </ActionPanel>
  );
}

const fileUrl = (file: string) => "file://" + encodeURI(file).replace(/\(/g, "%28").replace(/\)/g, "%29");
const fence = (text: string, lang = "") => "```" + lang + "\n" + text.replace(/```/g, "ˋˋˋ") + "\n```";

function DigupDetail({ hit }: { hit: DigupHit }) {
  const ext = path.extname(hit.path).slice(1).toLowerCase();
  const { data: markdown, isLoading } = usePromise(
    async (h: DigupHit) => {
      const picture = h.kind === "image" || h.kind === "screenshot";
      if (picture && PICTURES.has(ext)) return `![](${fileUrl(h.path)}?raycast-height=320)`;
      if (picture || h.kind === "pdf" || h.kind === "video") {
        const image = await digupRender(h.path, picture ? "image" : (h.kind as "pdf" | "video"), h.loc);
        const quote = h.excerpt ? `\n\n> ${h.excerpt.replace(/\n+/g, " ").slice(0, 400)}` : "";
        return image ? `![](${fileUrl(image)}?raycast-height=320)${quote}` : quote;
      }
      const text = h.excerpt ?? (await digupText(h.segment_id, h.kind === "code"));
      if (!text) return "";
      return h.kind === "code" ? fence(text.slice(0, 3000), ext) : text.slice(0, 3000);
    },
    [hit],
    { onError: () => {} },
  );
  const at = where(hit);
  return (
    <List.Item.Detail
      isLoading={isLoading}
      markdown={markdown ?? ""}
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label title="Kind" text={hit.kind} />
          {at && <List.Item.Detail.Metadata.Label title="At" text={at} />}
          {hit.cosine !== undefined && <List.Item.Detail.Metadata.Label title="Meaning" text={hit.cosine.toFixed(3)} />}
          {hit.keyword_rank !== undefined && (
            <List.Item.Detail.Metadata.Label title="Exact words" text={`#${hit.keyword_rank}`} />
          )}
          <List.Item.Detail.Metadata.Label title="Modified" text={new Date(hit.modified * 1000).toLocaleString()} />
          <List.Item.Detail.Metadata.Label title="Where" text={tilde(hit.path, home)} />
        </List.Item.Detail.Metadata>
      }
    />
  );
}

function FsearchDetail({ hit }: { hit: FsearchHit }) {
  const ext = path.extname(hit.path).slice(1).toLowerCase();
  const markdown = hit.lines?.length
    ? fence(hit.lines.map((l) => `${String(l.line).padStart(5)}  ${l.text}`).join("\n"))
    : PICTURES.has(ext)
      ? `![](${fileUrl(hit.path)}?raycast-height=320)`
      : "";
  return (
    <List.Item.Detail
      markdown={markdown}
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label title="Kind" text={hit.kind} />
          {hit.size > 0 && <List.Item.Detail.Metadata.Label title="Size" text={`${(hit.size / 1024).toFixed(1)} KB`} />}
          {hit.mtime > 0 && (
            <List.Item.Detail.Metadata.Label title="Modified" text={new Date(hit.mtime * 1000).toLocaleString()} />
          )}
          <List.Item.Detail.Metadata.Label title="Where" text={tilde(hit.path, home)} />
        </List.Item.Detail.Metadata>
      }
    />
  );
}

/** What stops a part of the search from working, and the way to fix it. */
function Setup(props: {
  fs?: Awaited<ReturnType<typeof fsearchStatus>>;
  fsError?: Error;
  du?: Awaited<ReturnType<typeof digupStatus>>;
  duError?: Error;
  revalidate: () => void;
}) {
  const items: ReactElement[] = [];
  const copy = (title: string, command: string) => <Action.CopyToClipboard title={title} content={command} />;
  if (props.fsError || (props.fs && !props.fs.ready && props.fs.message)) {
    items.push(
      <List.Item
        key="down"
        icon={{ source: Icon.Warning, tintColor: Color.Orange }}
        title="Truffle isn't answering"
        subtitle={props.fs?.message ?? props.fsError?.message}
        accessories={[{ text: tilde(truffleBin, home) }]}
        actions={
          <ActionPanel>
            {copy("Copy Install Command", "cargo install --path crates/truffle && truffle install --login")}
          </ActionPanel>
        }
      />,
    );
  } else if (props.fs?.ready && !props.fs.fullDiskAccess) {
    items.push(
      <List.Item
        key="fda"
        icon={{ source: Icon.Lock, tintColor: Color.Orange }}
        title="Allow Truffle into Desktop, Documents and Downloads"
        subtitle="Press ↵, then drag truffle from Finder into Full Disk Access and switch it on"
        actions={
          <ActionPanel>
            <Action
              title="Set up Full Disk Access"
              icon={Icon.Lock}
              onAction={async () => {
                await open("x-apple.systempreferences:com.apple.preference.security?Privacy_AllFiles");
                await showInFinder(truffleBin);
              }}
            />
            <Action
              title="Restart Truffle"
              icon={Icon.RotateClockwise}
              onAction={async () => {
                await restartFsearch();
                props.revalidate();
              }}
            />
          </ActionPanel>
        }
      />,
    );
  }
  if (props.duError || props.du?.message) {
    items.push(
      <List.Item
        key="meaning-down"
        icon={{ source: Icon.Warning, tintColor: Color.Orange }}
        title="Search by meaning isn't answering"
        subtitle={props.du?.message ?? props.duError?.message}
      />,
    );
  } else if (props.du && props.du.folders.length === 0) {
    items.push(
      <List.Item
        key="meaning-folders"
        icon={{ source: Icon.Info, tintColor: Color.Blue }}
        title="Search by meaning is off"
        subtitle="Choose the folders to search by what they show or say"
        actions={
          <ActionPanel>
            {copy("Copy Command", "truffle meaning folders add ~/Documents ~/Downloads ~/Desktop")}
          </ActionPanel>
        }
      />,
    );
  } else if (props.du?.encoder === "unavailable") {
    items.push(
      <List.Item
        key="meaning-model"
        icon={{ source: Icon.Download, tintColor: Color.Orange }}
        title="The model isn't downloaded: exact words only"
        subtitle="865 MB, once"
        actions={<ActionPanel>{copy("Copy Command", "truffle model download")}</ActionPanel>}
      />,
    );
  } else if (props.du && props.du.vectors === 0) {
    items.push(
      <List.Item
        key="meaning-empty"
        icon={{ source: Icon.Clock, tintColor: Color.Blue }}
        title="Indexing your folders…"
        subtitle={props.du.folders.map((f) => tilde(f, home)).join(", ")}
      />,
    );
  }
  return items.length ? <List.Section title="Setup">{items}</List.Section> : null;
}
