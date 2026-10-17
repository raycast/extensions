import {
  List,
  ActionPanel,
  Action,
  Icon,
  getPreferenceValues,
  showToast,
  Toast,
  Clipboard,
} from "@raycast/api";
import { useEffect, useRef, useState } from "react";
import { execFile, ChildProcess } from "child_process";
import * as fs from "fs";
import * as path from "path";
import {
  Scope,
  EngineOpts,
  ensureIndex,
  runSearch,
  rerank,
  applyPostFilters,
  parseQuery,
  humanBytes,
  prettyPath,
  scopePaths,
} from "./engine";

interface Prefs extends EngineOpts {
  resultLimit: string;
}

interface Meta {
  size?: number;
  mtime?: Date;
  dir?: boolean;
  gone?: boolean;
}

const IMG_EXT = new Set([
  "png",
  "jpg",
  "jpeg",
  "gif",
  "webp",
  "svg",
  "heic",
  "tiff",
  "bmp",
  "ico",
]);
const isImage = (p: string) =>
  IMG_EXT.has(path.extname(p).slice(1).toLowerCase());

export default function Command() {
  const prefs = getPreferenceValues<Prefs>();
  const [scope, setScope] = useState<Scope>("home");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<string[]>([]);
  const [indexing, setIndexing] = useState(true);
  const [searching, setSearching] = useState(false);
  const [meta, setMeta] = useState<Record<string, Meta>>({});
  const [showDetail, setShowDetail] = useState(false);
  const [tick, setTick] = useState(0);
  const procRef = useRef<ChildProcess[]>([]);
  const seq = useRef(0);
  const limit = Math.max(
    10,
    parseInt(prefs.resultLimit || "300", 10) || 300,
  );

  useEffect(() => {
    let alive = true;
    setIndexing(true);
    ensureIndex(scope, prefs)
      .then(() => {
        if (alive) setIndexing(false);
      })
      .catch((e) => {
        if (alive) {
          setIndexing(false);
          showToast({
            style: Toast.Style.Failure,
            title: "Index build failed",
            message: String(e?.message || e),
          });
        }
      });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope]);

  useEffect(() => {
    const q = query.trim();
    if (indexing || q.length < 2) {
      setResults([]);
      setSearching(false);
      return;
    }
    const timer = setTimeout(async () => {
      const mySeq = ++seq.current;
      setSearching(true);
      for (const p of procRef.current) p.kill("SIGKILL");
      const out = await runSearch(q, scope, limit, (c) => {
        procRef.current = c;
      });
      if (mySeq !== seq.current) return;
      setResults(applyPostFilters(rerank(out, q), parseQuery(q)));
      setSearching(false);
    }, 120);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, scope, indexing, tick]);

  useEffect(() => {
    const pending = results.slice(0, 60).filter((p) => !(p in meta));
    if (!pending.length) return;
    let alive = true;
    Promise.all(
      pending.map(async (p): Promise<[string, Meta]> => {
        try {
          const s = await fs.promises.stat(p);
          return [
            p,
            { size: s.size, mtime: s.mtime, dir: s.isDirectory() },
          ];
        } catch {
          return [p, { gone: true }];
        }
      }),
    ).then((entries) => {
      if (alive)
        setMeta((m) => ({ ...m, ...Object.fromEntries(entries) }));
    });
    return () => {
      alive = false;
    };
  }, [results]);

  const refresh = () => {
    setIndexing(true);
    ensureIndex(scope, prefs, true)
      .then(() => {
        setIndexing(false);
        setTick((t) => t + 1); // retrigger search effect
        showToast({ style: Toast.Style.Success, title: "Index rebuilt" });
      })
      .catch((e) => {
        setIndexing(false);
        showToast({
          style: Toast.Style.Failure,
          title: "Rebuild failed",
          message: String(e?.message || e),
        });
      });
  };

  const emptyTitle = indexing
    ? "Building index…"
    : query.trim().length < 2
      ? "Type to fuzzy-search files"
      : searching
        ? "Searching…"
        : "No matches";

  const customEmpty =
    scope === "custom" && scopePaths("custom", prefs).length === 0;
  const emptyDesc = indexing
    ? `Building your personal index — first run only.`
    : customEmpty
      ? "Set 'Custom Search Paths' in the command preferences first."
      : query.trim().length < 2
        ? "Every file on your Mac. No Spotlight needed."
        : "Nothing found — try a shorter term or ⌘R to refresh.";

  return (
    <List
      isLoading={indexing}
      throttle
      isShowingDetail={showDetail}
      searchText={query}
      onSearchTextChange={setQuery}
      navigationTitle="Find Everything"
      searchBarPlaceholder="Find every file on your Mac — instantly…"
      searchBarAccessory={
        <List.Dropdown
          tooltip="Search scope"
          value={scope}
          onChange={(v) => setScope(v as Scope)}
          storeValue
        >
          <List.Dropdown.Item title="Home" value="home" icon={Icon.House} />
          <List.Dropdown.Item
            title="Downloads"
            value="downloads"
            icon={Icon.Download}
          />
          <List.Dropdown.Item
            title="Documents"
            value="documents"
            icon={Icon.Document}
          />
          <List.Dropdown.Item
            title="Applications"
            value="applications"
            icon={Icon.AppWindow}
          />
          <List.Dropdown.Item
            title="All (/)"
            value="all"
            icon={Icon.HardDrive}
          />
          <List.Dropdown.Item
            title="Custom paths"
            value="custom"
            icon={Icon.Folder}
          />
        </List.Dropdown>
      }
    >
      <List.EmptyView title={emptyTitle} description={emptyDesc} />
      {results.map((p) => {
        const m = meta[p];
        const accessories: List.Item.Accessory[] = [];
        if (m?.dir) accessories.push({ tag: "Folder" });
        if (m?.size !== undefined && !m?.dir)
          accessories.push({ text: humanBytes(m.size) });
        if (m?.gone) accessories.push({ tag: { value: "gone", color: "#888" } });
        const shownPath = prettyPath(p);
        const detailMd =
          isImage(p) && !m?.dir && !m?.gone
            ? `![](file://${encodeURI(p).replace(/#/g, "%23")})\n\n`
            : `**${path.basename(p)}**\n\n`;
        return (
          <List.Item
            key={p}
            icon={{ fileIcon: p }}
            title={path.basename(p)}
            subtitle={{ value: shownPath, tooltip: p }}
            accessories={accessories}
            detail={
              <List.Item.Detail
                markdown={detailMd}
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label
                      title="Path"
                      text={p}
                    />
                    <List.Item.Detail.Metadata.Label
                      title="Size"
                      text={
                        m?.dir
                          ? "—"
                          : m?.size !== undefined
                            ? humanBytes(m.size)
                            : ""
                      }
                    />
                    <List.Item.Detail.Metadata.Label
                      title="Modified"
                      text={m?.mtime ? m.mtime.toLocaleString() : ""}
                    />
                    <List.Item.Detail.Metadata.Label
                      title="Type"
                      text={
                        m?.dir
                          ? "Folder"
                          : path.extname(p).slice(1).toUpperCase() || "File"
                      }
                    />
                  </List.Item.Detail.Metadata>
                }
              />
            }
            actions={
              <ActionPanel>
                <ActionPanel.Section>
                  <Action.Open title="Open" target={p} />
                  <Action.ShowInFinder path={p} />
                  <Action
                    title="Open in Terminal"
                    icon={Icon.Terminal}
                    shortcut={{ modifiers: ["cmd"], key: "t" }}
                    onAction={() =>
                      execFile("open", [
                        "-a",
                        "Terminal",
                        m?.dir ? p : path.dirname(p),
                      ])
                    }
                  />
                </ActionPanel.Section>
                <ActionPanel.Section>
                  <Action.CopyToClipboard
                    title="Copy Path"
                    content={p}
                    shortcut={{ modifiers: ["cmd"], key: "c" }}
                  />
                  <Action.CopyToClipboard
                    title="Copy File Name"
                    content={path.basename(p)}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                  />
                  <Action
                    title="Copy File"
                    icon={Icon.Clipboard}
                    shortcut={{ modifiers: ["cmd", "opt"], key: "c" }}
                    onAction={() => Clipboard.copy({ file: p })}
                  />
                </ActionPanel.Section>
                <ActionPanel.Section>
                  <Action
                    title="Toggle Preview"
                    icon={Icon.AppWindowSidebarRight}
                    shortcut={{ modifiers: ["cmd"], key: "d" }}
                    onAction={() => setShowDetail((v) => !v)}
                  />
                  <Action
                    title="Rebuild Index"
                    icon={Icon.ArrowClockwise}
                    shortcut={{ modifiers: ["cmd"], key: "r" }}
                    onAction={refresh}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
