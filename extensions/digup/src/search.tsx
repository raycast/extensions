import { Action, ActionPanel, Icon, List, getPreferenceValues, open } from "@raycast/api";
import { basename, dirname } from "path";
import { useEffect, useMemo, useRef, useState } from "react";
import { excerptMarkdown, passageMarkdown, imageMarkdown, kinds, place, reason, tilde } from "./format";
import { FullPreview, HitMetadata } from "./preview";
import { DigUpService, Hit, Kind, Status } from "./service";

const prefs = getPreferenceValues<{ cliPath?: string; limit?: string }>();
const cli = prefs.cliPath || "/Applications/DigUp.app/Contents/Helpers/digup";
const limit = Math.min(Math.max(parseInt(prefs.limit || "40", 10) || 40, 5), 200);

/** How long typing has to pause before the meaning search (keyword results show on every keystroke). */
const meaningPause = 160;

type Results = {
  hits: Hit[];
  strong: number;
  meaning: boolean;
  warning?: string;
};

const filters: { value: string; title: string; kinds?: Kind[] }[] = [
  { value: "all", title: "All Files" },
  { value: "doc", title: kinds.doc.plural, kinds: ["doc"] },
  { value: "pdf", title: kinds.pdf.plural, kinds: ["pdf"] },
  {
    value: "images",
    title: "Images & Screenshots",
    kinds: ["image", "screenshot"],
  },
  {
    value: "screenshot",
    title: kinds.screenshot.plural,
    kinds: ["screenshot"],
  },
  { value: "video", title: kinds.video.plural, kinds: ["video"] },
  { value: "audio", title: kinds.audio.plural, kinds: ["audio"] },
];

let shared: DigUpService | undefined;
function service(): DigUpService {
  if (!shared?.alive) shared = new DigUpService(cli);
  return shared;
}

// DigUp returns one hit per file, but keep it safe against repeats.
function unique(hits: Hit[]): Hit[] {
  const seen = new Set<string>();
  return hits.filter((hit) => !seen.has(hit.path) && seen.add(hit.path));
}

export default function Command() {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [results, setResults] = useState<Results>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();
  const [status, setStatus] = useState<Status>();
  const [showingDetail, setShowingDetail] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);
  const [previews, setPreviews] = useState<Record<string, string>>({});
  const asking = useRef(new Set<string>());
  const generation = useRef(0);

  // Start the searcher as the window opens, so the first search is already warm.
  useEffect(() => {
    // Raycast can mount the command twice in a row: whatever the first mount's searcher says after it's closed is stale.
    let unmounted = false;
    const digup = service();
    digup
      .prewarm()
      .then(() => digup.status())
      .then((s) => !unmounted && setStatus(s))
      .catch((e: Error) => !unmounted && e.message !== "closed" && setError(e.message));
    return () => {
      unmounted = true;
      digup.close();
      if (shared === digup) shared = undefined;
    };
  }, []);

  useEffect(() => {
    const words = query.trim();
    const mine = ++generation.current;
    const current = () => generation.current === mine;
    if (!words) {
      setResults(undefined);
      setLoading(false);
      return;
    }
    setLoading(true);
    const digup = service();
    const options = {
      kinds: filters.find((f) => f.value === filter)?.kinds,
      limit,
    };
    let haveMeaning = false;
    const fail = (e: Error) => {
      if (!current() || e.message === "closed") return; // a searcher this window already shut down
      setError(e.message);
      setLoading(false);
    };

    // Words first, on every keystroke: instant, and the last word counts as a prefix.
    digup
      .search(words, { ...options, meaning: false })
      .then((r) => {
        if (current() && !haveMeaning)
          setResults({
            hits: unique(r.hits),
            strong: r.strong ?? r.hits.length,
            meaning: false,
          });
      })
      .catch(fail);
    digup.embedAhead(words);

    let retry: NodeJS.Timeout | undefined;
    const byMeaning = (attempt: number) => {
      digup
        .search(words, { ...options, meaning: true })
        .then((r) => {
          if (!current()) return;
          // The encoder can still be starting on the very first search: keep the word results and try again.
          if (!r.meaning && !r.warning && attempt < 8) {
            retry = setTimeout(() => byMeaning(attempt + 1), 250);
            return;
          }
          haveMeaning = true;
          setError(undefined);
          setResults({
            hits: unique(r.hits),
            strong: r.strong ?? r.hits.length,
            meaning: r.meaning,
            warning: r.warning,
          });
          setLoading(false);
        })
        .catch(fail);
    };
    const pause = setTimeout(() => byMeaning(0), meaningPause);
    return () => {
      clearTimeout(pause);
      if (retry) clearTimeout(retry);
    };
  }, [query, filter]);

  const hits = results?.hits ?? [];
  const strong = hits.slice(0, results?.strong ?? hits.length);
  const weaker = hits.slice(results?.strong ?? hits.length);
  const selectedHit = useMemo(() => hits.find((hit) => hit.path === selected) ?? hits[0], [hits, selected]);
  const toggleDetail = () => setShowingDetail((v) => !v);

  // Load the preview for the selected result: a PDF page or video frame rendered by DigUp, or the passage's text.
  useEffect(() => {
    if (!selectedHit || !showingDetail) return;
    const key = previewKey(selectedHit);
    if (key in previews || asking.current.has(key)) return;
    asking.current.add(key);
    const digup = service();
    const hit = selectedHit;
    const done = (value: string) => setPreviews((p) => ({ ...p, [key]: value }));
    const image = (height?: number) => (path?: string) => done(path ? imageMarkdown(path, height) : "");
    const none = () => done("");
    if (hit.kind === "pdf") digup.render(hit.path, "pdf", hit.loc ?? 1, 900).then(image(), none);
    else if (hit.kind === "video") digup.render(hit.path, "video", hit.loc ?? 0, 900).then(image(260), none);
    else if (hit.kind === "image" || hit.kind === "screenshot")
      digup.render(hit.path, "image", undefined, 900).then(image(), none);
    else digup.text(hit.segment_id).then((text) => done(passageMarkdown(hit, text)), none);
  }, [selectedHit, showingDetail]);

  const noResults = query.trim() && !loading && results && hits.length === 0;
  const indexed = status?.files ? `${status.files.toLocaleString()} files indexed` : undefined;
  const wordsOnly = results && !results.meaning && !loading;

  return (
    <List
      isLoading={loading}
      filtering={false}
      onSearchTextChange={setQuery}
      searchBarPlaceholder="Search your files by what's in them…"
      isShowingDetail={showingDetail && hits.length > 0}
      onSelectionChange={setSelected}
      navigationTitle={wordsOnly ? "DigUp — words only" : "DigUp"}
      searchBarAccessory={
        <List.Dropdown tooltip="File Type" storeValue onChange={setFilter}>
          {filters.map((f) => (
            <List.Dropdown.Item
              key={f.value}
              value={f.value}
              title={f.title}
              icon={f.kinds ? kinds[f.kinds[0]].icon : Icon.MagnifyingGlass}
            />
          ))}
        </List.Dropdown>
      }
    >
      {error ? (
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="Couldn't search with DigUp"
          description={`${error}\n\nIs DigUp installed in /Applications and set up?`}
          actions={
            <ActionPanel>
              <Action title="Open Digup" icon={Icon.AppWindow} onAction={() => open("/Applications/DigUp.app")} />
            </ActionPanel>
          }
        />
      ) : noResults ? (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="No good matches"
          description={
            filter === "all"
              ? "Try describing what's in it, not just its name."
              : "Nothing of this type. Try All Files."
          }
        />
      ) : (
        <List.EmptyView
          icon={{ source: "command-icon.png" }}
          title="Search by what's inside"
          description={[
            "“the invoice from the plumber” · “screenshot of a flight confirmation”",
            "↩ Copy Path   ⌘↩ Open   → Preview   ⌘Y Quick Look",
            indexed,
          ]
            .filter(Boolean)
            .join("\n\n")}
        />
      )}
      <List.Section title={wordsOnly ? "Matching Words" : "Best Matches"}>
        {strong.map((hit) => (
          <Result
            key={hit.path}
            hit={hit}
            preview={previews[previewKey(hit)]}
            showingDetail={showingDetail}
            toggleDetail={toggleDetail}
          />
        ))}
      </List.Section>
      <List.Section title="Weaker Matches">
        {weaker.map((hit) => (
          <Result
            key={hit.path}
            hit={hit}
            preview={previews[previewKey(hit)]}
            showingDetail={showingDetail}
            toggleDetail={toggleDetail}
          />
        ))}
      </List.Section>
    </List>
  );
}

const previewKey = (hit: Hit) => `${hit.path}|${hit.segment_id}`;

function Result(props: { hit: Hit; preview?: string; showingDetail: boolean; toggleDetail: () => void }) {
  const { hit, preview } = props;
  const kind = kinds[hit.kind] ?? kinds.doc;
  const name = basename(hit.path);
  const folder = dirname(hit.path);
  const where = place(hit);
  const why = reason(hit);
  const excerpt = hit.excerpt ? excerptMarkdown(hit.excerpt) : "";
  const visual = hit.kind === "pdf" || hit.kind === "video" || hit.kind === "image" || hit.kind === "screenshot";

  let markdown = visual
    ? [preview, excerpt && `> ${excerpt}`].filter(Boolean).join("\n\n")
    : preview || (excerpt ? `> ${excerpt}` : "");
  if (!markdown) markdown = `### ${name.replace(/([\\`*_[\]#])/g, "\\$1")}`;

  return (
    <List.Item
      id={hit.path}
      icon={{ fileIcon: hit.path }}
      title={name}
      subtitle={props.showingDetail ? undefined : tilde(folder)}
      accessories={[
        ...(where ? [{ text: where, tooltip: why }] : []),
        ...(props.showingDetail ? [] : [{ tag: { value: kind.title, color: kind.color } }]),
      ]}
      detail={<List.Item.Detail markdown={markdown} metadata={<HitMetadata hit={hit} />} />}
      quickLook={{ path: hit.path, name }}
      actions={
        <ActionPanel title={name}>
          <ActionPanel.Section>
            <Action.CopyToClipboard title="Copy Path" content={hit.path} />
            <Action.Open
              title="Open"
              target={hit.path}
              icon={Icon.ArrowNe}
              shortcut={{ modifiers: ["cmd"], key: "return" }}
            />
            <Action.ShowInFinder path={hit.path} shortcut={{ modifiers: ["cmd", "shift"], key: "return" }} />
            <Action.Push
              title="Preview"
              icon={Icon.Eye}
              target={<FullPreview hit={hit} digup={service()} />}
              shortcut={{ modifiers: [], key: "arrowRight" }}
            />
            <Action.ToggleQuickLook shortcut={{ modifiers: ["cmd"], key: "y" }} />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action.Paste title="Paste Path" content={hit.path} shortcut={{ modifiers: ["opt"], key: "return" }} />
            <Action.CopyToClipboard
              title="Copy File"
              content={{ file: hit.path }}
              shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
            />
            <Action.CopyToClipboard
              title="Copy Name"
              content={name}
              shortcut={{ modifiers: ["cmd", "opt"], key: "c" }}
            />
            <Action.CopyToClipboard
              title="Copy Folder Path"
              content={folder}
              shortcut={{ modifiers: ["cmd", "shift"], key: "." }}
            />
            <Action.OpenWith path={hit.path} shortcut={{ modifiers: ["cmd"], key: "o" }} />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action
              title={props.showingDetail ? "Hide Preview" : "Show Preview"}
              icon={Icon.Sidebar}
              shortcut={{ modifiers: ["cmd"], key: "p" }}
              onAction={props.toggleDetail}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
