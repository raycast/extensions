// Dig Up: describe a file, find it. DigUp's search panel as a Raycast list: keyword results at once, the hybrid ones
// after a 120 ms pause, grouped by kind with the weaker ones folded, and a preview of the page, moment, passage or
// code that matched (DigUp: SearchPanel.swift, SearchPanelView.swift).

import { Action, ActionPanel, Icon, Keyboard, List, showToast, Toast } from "@raycast/api";
import { getProgressIcon, showFailureToast, useLocalStorage } from "@raycast/utils";
import { useEffect, useMemo, useRef, useState, type ReactElement } from "react";
import type { SearchResponse, Status } from "../engine/api";
import { codeQueryText } from "../engine/types";
import { api } from "./lib/client";
import {
  CODE_EXAMPLES,
  CODE_HINT,
  CODE_OFF,
  HOME_MESSAGE,
  HOME_TITLE,
  HOTKEY_HINT,
  MENU_BAR_HINT,
  NO_FOLDERS,
  WEAKER_EXPLAINER,
  filterTitle,
  homeExamples,
  noMatches,
  placeholder,
  setupSubtitle,
  setupActionTitle,
  showAllTitle,
  weakerTitle,
  welcomeMarkdown,
  type KindFilter,
} from "./lib/copy";
import { baseName, formatCount, longDate } from "./lib/format";
import { hasListThumb, previewNeeds, thumbSpec, type ThumbSpec } from "./lib/preview";
import {
  EMPTY_RESULTS,
  FILE_GROUPS,
  GROUP_KINDS,
  GROUP_TITLES,
  ROWS_PER_GROUP,
  buildResultSet,
  resultCount,
  type ResultRow,
  type ResultSet,
} from "./lib/results";
import {
  codeCaveat,
  foldersText,
  hasCode,
  indexSummary,
  kindCountsText,
  meaningUnavailable,
  nothingChosen,
  progressOf,
  resultsCaveat,
  searchable,
  setupLine,
  setupProgress,
  setupProgressText,
  startingLine,
  statusDetail,
  statusLine,
} from "./lib/status-text";
import { useDaemonStatus, useSearchRefresh, usePictures, useSegmentText, type DaemonStatus } from "./ui/hooks";
import { openLog } from "./ui/log";
import { preferencesSent } from "./ui/prefs";
import {
  DigUpActions,
  ICON_PIXELS,
  KIND_ICONS,
  PANE_PIXELS,
  ResultActions,
  SetupAction,
  ResultDetail,
  indexNow,
  openCommand,
} from "./ui/result-parts";

/** How many hits the panel asks for (DigUp: Engine.swift, panel 40, window 120). */
const LIMIT = 40;
/** The typing pause before meaning results replace the keyword ones (DigUp: SearchPanel.typingPause). */
const TYPING_PAUSE_MS = 120;
/** While the query encoder starts, the meaning search is asked again this often, this many times. */
const WARMING_RETRY_MS = 400;
const WARMING_RETRIES = 50;

type Phase = "empty" | "words" | "meaning" | "wordsOnly" | "codeHint" | "codeOff" | "failed";

interface SearchView {
  phase: Phase;
  /** The query sent (with "code: " when the Code filter is on). */
  query: string;
  isCode: boolean;
  results: ResultSet;
  response: SearchResponse | null;
  /** The encoder is still starting: meaning results come later. */
  warming: boolean;
  error: string | null;
}

const EMPTY_VIEW: SearchView = {
  phase: "empty",
  query: "",
  isCode: false,
  results: EMPTY_RESULTS,
  response: null,
  warming: false,
  error: null,
};

function aborted(error: unknown, signal: AbortSignal): boolean {
  return signal.aborted || (error instanceof Error && error.name === "AbortError");
}

export default function Command() {
  const daemon = useDaemonStatus();
  const { status } = daemon;
  const statusRef = useRef<Status | null>(null);
  statusRef.current = status;

  // The search field is always controlled: Raycast puts `searchText` back into the field whenever no keystroke is on
  // its way, so it must be the text as typed (or an example picked here).
  const [text, setText] = useState("");
  /** The field's text as last typed or set here, for the echo check (a handler may be one from an older render). */
  const textRef = useRef("");
  const [kind, setKind] = useState<KindFilter>("all");
  const [view, setView] = useState<SearchView>(EMPTY_VIEW);
  const [busy, setBusy] = useState(false);
  const [showWeaker, setShowWeaker] = useState(false);
  const [selectedId, setSelectedId] = useState<string | undefined>(undefined);
  /** You moved the selection since the query changed: it no longer follows the top hit. */
  const [navigated, setNavigated] = useState(false);
  /** The rows named to Raycast as the selection for this query, and the one named now. */
  const forced = useRef(new Set<string>());
  const hintRef = useRef<string | undefined>(undefined);
  const detailSetting = useLocalStorage<boolean>("showDetail", true);
  const showDetail = detailSetting.value ?? true;

  const generation = useRef(0);
  const finalGeneration = useRef(0);
  const controller = useRef<AbortController | null>(null);
  const timer = useRef<NodeJS.Timeout | undefined>(undefined);

  // Opening the panel hands the daemon the preferences it needs, then warms the query encoder (it runs the model and
  // llama-server they name) and loads the vectors (DigUp: Engine.prewarm).
  useEffect(() => {
    preferencesSent(true)
      .then(() => api("POST /prewarm", {}))
      .catch(() => undefined);
    return () => {
      controller.current?.abort();
      clearTimeout(timer.current);
    };
  }, []);

  useSearchRefresh(status, text, kind === "code" || codeQueryText(text) !== null, busy, () => run(text, kind, true));

  function run(typed: string, filter: KindFilter, background = false) {
    const current = ++generation.current;
    controller.current?.abort();
    clearTimeout(timer.current);
    if (!background) setShowWeaker(false);
    // A new query: the selection follows its top hit again (DigUp: SearchPanel.queryChanged). The old rows keep the
    // selection you gave them until the first results are drawn; `follow` comes after those (React may draw each update
    // at once, and the top hit has to be named before Raycast reports selecting it).
    if (!background) forced.current = new Set();
    let followed = background;
    const follow = () => {
      if (followed) return;
      followed = true;
      setNavigated(false);
    };
    const trimmed = typed.trim();
    if (!trimmed) {
      follow();
      setBusy(false);
      setView(EMPTY_VIEW);
      return;
    }
    const query = filter === "code" && codeQueryText(trimmed) === null ? `code: ${trimmed}` : trimmed;
    const codeText = codeQueryText(query);
    const isCode = codeText !== null;
    const known = statusRef.current;
    // "code:" alone, or without code folders: what to do instead of results.
    if (isCode && (codeText === "" || (known && !hasCode(known)))) {
      follow();
      setBusy(false);
      setView({ ...EMPTY_VIEW, query, isCode, phase: known && !hasCode(known) ? "codeOff" : "codeHint" });
      return;
    }
    const abort = new AbortController();
    controller.current = abort;
    const kinds = filter !== "all" && filter !== "code" ? GROUP_KINDS[filter] : undefined;
    setBusy(true);

    const show = (response: SearchResponse, phase: Phase, warming = false) => {
      const results = buildResultSet(response.hits, {
        terms: response.terms,
        strong: response.strong,
        // Code is one group: it gets the room of all of them.
        rowsPerGroup: response.code ? ROWS_PER_GROUP * 3 : ROWS_PER_GROUP,
      });
      const shownPhase: Phase =
        response.note === "code-off" ? "codeOff" : response.note === "code-hint" ? "codeHint" : phase;
      setView({ phase: shownPhase, query, isCode: response.code, results, response, warming, error: null });
      follow();
    };
    const ignored = (error: unknown) => aborted(error, abort.signal) || current !== generation.current;
    const fail = (error: unknown) => {
      setBusy(false);
      setView({ ...EMPTY_VIEW, query, isCode, phase: "failed", error: String((error as Error)?.message ?? error) });
    };
    // Either half can fail alone. When meaning fails, the word matches stay as words only (DigUp's .wordsOnly), and
    // the failure screen is only for when there's nothing to show.
    let wordsShown = background;
    let wordsError: unknown = null;
    let meaningError: unknown = null;

    // Words now. The last word is probably half-typed, so it matches as a prefix.
    if (!background)
      api("POST /search", { query, kinds, limit: LIMIT, meaning: false, prefixLast: true }, { signal: abort.signal })
        .then((response) => {
          if (current !== generation.current || finalGeneration.current === current) return;
          if (meaningError !== null) {
            finalGeneration.current = current;
            setBusy(false);
            show(response, "wordsOnly");
            return;
          }
          wordsShown = true;
          show(response, "words", response.note === "warming" || statusRef.current?.encoder === "starting");
        })
        .catch((error) => {
          if (ignored(error)) return;
          wordsError = error;
          if (meaningError !== null) fail(error);
        });

    // Meaning once typing pauses; while the encoder starts, ask again until it's ready.
    const meaning = (attempt: number) => {
      api("POST /search", { query, kinds, limit: LIMIT, meaning: true, prefixLast: false }, { signal: abort.signal })
        .then((response) => {
          if (current !== generation.current) return;
          if (!response.meaning && response.note === "warming" && attempt < WARMING_RETRIES) {
            if (finalGeneration.current !== current) {
              wordsShown = true;
              show(response, "words", true);
            }
            timer.current = setTimeout(() => meaning(attempt + 1), WARMING_RETRY_MS);
            return;
          }
          finalGeneration.current = current;
          setBusy(false);
          show(response, response.meaning ? "meaning" : "wordsOnly");
        })
        .catch((error) => {
          if (ignored(error)) return;
          if (wordsShown) {
            finalGeneration.current = current;
            setBusy(false);
            setView((before) =>
              before.phase === "words" ? { ...before, phase: "wordsOnly", warming: false } : before,
            );
          } else if (wordsError !== null) {
            fail(error);
          } else {
            // The words are still on their way: they come as words only.
            meaningError = error;
          }
        });
    };
    timer.current = setTimeout(() => meaning(0), TYPING_PAUSE_MS);
  }

  function onSearchTextChange(next: string) {
    // Raycast also reports text set from here (an example), which has run already.
    if (next === textRef.current) return;
    textRef.current = next;
    setText(next);
    run(next, kind);
  }

  function onSelectionChange(id: string | null) {
    setSelectedId(id ?? undefined);
    // Raycast reports the rows it selects itself too (the top hit named to it, a reset to the first row): only a row
    // this query never named is your move.
    if (id && hintRef.current !== undefined && !forced.current.has(id)) setNavigated(true);
  }

  function onKindChange(next: string) {
    const filter = next as KindFilter;
    if (filter === kind) return;
    setKind(filter);
    run(textRef.current, filter);
  }

  function tryExample(example: string) {
    textRef.current = example;
    setText(example);
    run(example, kind);
  }

  // The code index needs code folders: "code:" typed before the status arrived says code search is off once it's here.
  const codeOn = status ? hasCode(status) : false;
  const shown: SearchView = status && view.phase === "codeHint" && !codeOn ? { ...view, phase: "codeOff" } : view;

  const { results } = shown;
  const rows = useMemo(
    () => [...results.groups.flatMap((group) => group.rows), ...(showWeaker ? results.weaker : [])],
    [results, showWeaker],
  );
  // The selection follows the top hit until you move it (DigUp: SearchPanel.show). Raycast keeps the selected row when
  // the rows are replaced in place (meaning results after the words), so the top hit is named to it as the selection.
  const hint = navigated ? undefined : results.ranked[0]?.id;
  if (hint !== undefined) forced.current.add(hint);
  hintRef.current = hint;
  const selected = rows.find((row) => row.id === selectedId) ?? rows.find((row) => row.id === hint) ?? rows[0];

  // Pictures: the list's icons, and the selected result's preview (first).
  const iconSpecs = useMemo(
    () => rows.filter((row) => hasListThumb(row.kind)).map((row) => thumbSpec(row, ICON_PIXELS, false)),
    [rows],
  );
  const icon = usePictures(iconSpecs);
  const needs = selected ? previewNeeds(selected) : null;
  const paneSpec: ThumbSpec | null = selected && needs?.thumb ? thumbSpec(selected, PANE_PIXELS, true) : null;
  const pane = usePictures(paneSpec && showDetail ? [paneSpec] : [], true);
  const segmentText = useSegmentText(selected, showDetail && needs?.text !== null && needs?.text !== undefined);

  const toggleDetail = () => detailSetting.setValue(!showDetail);
  const weaker = {
    count: results.weaker.length,
    shown: showWeaker,
    toggle: () => setShowWeaker((shown) => !shown),
  };

  function item(row: ResultRow) {
    const picture = hasListThumb(row.kind) ? icon(thumbSpec(row, ICON_PIXELS, false)) : null;
    const isSelected = row.id === selected?.id;
    const accessories: List.Item.Accessory[] = [];
    if (row.place) accessories.push({ tag: row.place, tooltip: row.reason });
    if (!showDetail) accessories.push({ date: new Date(row.modified * 1000), tooltip: longDate(row.modified) });
    return (
      <List.Item
        key={row.id}
        id={row.id}
        title={row.title}
        subtitle={showDetail ? undefined : row.folder}
        icon={picture ? { source: picture.path } : { fileIcon: row.path }}
        accessories={accessories}
        quickLook={{ path: row.path, name: row.name }}
        detail={
          showDetail ? (
            <ResultDetail
              row={row}
              parts={
                isSelected
                  ? { thumb: paneSpec ? pane(paneSpec) : null, text: segmentText }
                  : { thumb: undefined, text: undefined }
              }
            />
          ) : undefined
        }
        actions={
          <ResultActions
            row={row}
            query={text}
            kind={kind}
            onRefresh={() => run(text, kind, true)}
            setup={status?.setup}
            onToggleDetail={toggleDetail}
            weaker={results.weaker.length > 0 ? weaker : undefined}
          />
        }
      />
    );
  }

  // What the footer of DigUp's panel says, in the navigation title.
  const footer = (() => {
    switch (shown.phase) {
      case "words":
        return shown.warming ? "Matching words; meaning search is warming up…" : "Matching words…";
      case "wordsOnly":
        return (status && meaningUnavailable(status)) ?? "Words only: meaning search isn't available";
      case "codeHint":
        return "Searching your code";
      case "codeOff":
        return "Code search is off";
      case "meaning": {
        const caveat = status ? (shown.isCode ? codeCaveat(status) : resultsCaveat(status)) : null;
        if (caveat) return caveat;
        const count = resultCount(results);
        return shown.isCode ? count.replace(/ results?/, (word) => `${word} in your code`) : count;
      }
      case "failed":
        return "Search failed";
      case "empty":
        return status ? statusLine(status) : startingLine(daemon.error);
    }
  })();

  const isLoading =
    busy || (!status && !daemon.error) || (shown.phase === "words" && shown.warming) || detailSetting.isLoading;
  const typed = text.trim() !== "";

  // No `throttle`: Raycast's waits 250 ms after the last keystroke, and word matches show on every keystroke (stale
  // replies are dropped by the generation counter and aborted).
  return (
    <List
      filtering={false}
      searchText={text}
      onSearchTextChange={onSearchTextChange}
      selectedItemId={hint}
      onSelectionChange={onSelectionChange}
      isLoading={isLoading}
      isShowingDetail={showDetail && (typed || !!status)}
      searchBarPlaceholder={placeholder(codeOn, kind)}
      searchBarAccessory={
        <List.Dropdown tooltip="Kind" value={kind} onChange={onKindChange}>
          <List.Dropdown.Item title={filterTitle("all")} value="all" icon={Icon.MagnifyingGlass} />
          {FILE_GROUPS.map((group) => (
            <List.Dropdown.Item key={group} title={GROUP_TITLES[group]} value={group} icon={groupIcon(group)} />
          ))}
          {codeOn || kind === "code" ? (
            <List.Dropdown.Section>
              <List.Dropdown.Item title={filterTitle("code")} value="code" icon={KIND_ICONS.code} />
            </List.Dropdown.Section>
          ) : null}
        </List.Dropdown>
      }
    >
      {typed ? (
        <ResultsBody
          footer={footer}
          view={shown}
          status={status}
          showWeaker={showWeaker}
          weaker={weaker}
          item={item}
          text={text}
          kind={kind}
          onExample={tryExample}
          onRetry={() => run(text, kind)}
          showDetail={showDetail}
          toggleDetail={toggleDetail}
        />
      ) : (
        <Home
          status={status}
          error={daemon.error}
          secondsLeft={daemon.secondsLeft}
          refresh={daemon.refresh}
          onExample={tryExample}
          toggleDetail={toggleDetail}
        />
      )}
    </List>
  );
}

function groupIcon(group: (typeof FILE_GROUPS)[number]) {
  return KIND_ICONS[GROUP_KINDS[group][0]];
}

interface ResultsBodyProps {
  footer: string;
  view: SearchView;
  status: Status | null;
  showWeaker: boolean;
  weaker: { count: number; shown: boolean; toggle: () => void };
  item: (row: ResultRow) => ReactElement;
  text: string;
  kind: KindFilter;
  onExample: (text: string) => void;
  onRetry: () => void;
  showDetail: boolean;
  toggleDetail: () => void;
}

/** Results, or what to do instead: the code hint, code search off, no matches. */
function ResultsBody(props: ResultsBodyProps) {
  const { view, status, weaker, item, text, kind } = props;
  const { results } = view;
  const needsSetup = status && status.setup.state !== "ready";

  if (view.phase === "codeOff") {
    return (
      <List.EmptyView
        icon={KIND_ICONS.code}
        title={CODE_OFF.title}
        description={CODE_OFF.message}
        actions={
          <ActionPanel>
            <Action
              title="Choose Code Folders…"
              icon={Icon.Folder}
              onAction={() => openCommand("folders", { focus: "code" })}
            />
          </ActionPanel>
        }
      />
    );
  }
  if (view.phase === "codeHint") {
    return (
      <List.Section title={CODE_HINT.title} subtitle={CODE_HINT.message}>
        {CODE_EXAMPLES.map((example) => (
          <List.Item
            key={example}
            id={`example:${example}`}
            title={example}
            icon={KIND_ICONS.code}
            detail={
              props.showDetail ? (
                <List.Item.Detail markdown={`## ${CODE_HINT.title}\n\n${CODE_HINT.message}`} />
              ) : undefined
            }
            actions={
              <ActionPanel>
                <Action title="Search for This" icon={Icon.MagnifyingGlass} onAction={() => props.onExample(example)} />
                <DigUpActions onRefresh={props.onRetry} setup={status?.setup} />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    );
  }
  if (view.phase === "failed") {
    return (
      <List.EmptyView
        icon={Icon.Warning}
        title="Dig Up couldn't search"
        description={view.error ?? undefined}
        actions={
          <ActionPanel>
            <Action title="Try Again" icon={Icon.ArrowClockwise} onAction={props.onRetry} />
            <Action title="Open Log" icon={Icon.Terminal} onAction={openLog} />
          </ActionPanel>
        }
      />
    );
  }
  if (results.groups.length === 0 && results.weaker.length === 0) {
    if (view.phase === "empty" || view.phase === "words")
      return <List.EmptyView icon={Icon.MagnifyingGlass} title="Searching…" />;
    const empty = needsSetup
      ? {
          title: setupLine(status.setup) ?? "Finish Setup",
          message: "Set up Dig Up to search images and file contents. File names can still match.",
        }
      : status && nothingChosen(status)
        ? NO_FOLDERS
        : noMatches(view.isCode);
    return (
      <List.EmptyView
        icon={Icon.MagnifyingGlass}
        title={empty.title}
        description={empty.message}
        actions={
          <ActionPanel>
            {status && (status.setup.state === "missing" || status.setup.state === "failed") ? (
              <SetupAction setup={status.setup} />
            ) : null}
            {status && nothingChosen(status) ? (
              <Action title="Choose Folders…" icon={Icon.Folder} onAction={() => openCommand("folders")} />
            ) : null}
            <Action
              title="Search in Grid"
              icon={Icon.AppWindowGrid3x3}
              onAction={() => openCommand("search-pictures", { query: text, kind })}
            />
            <DigUpActions onRefresh={props.onRetry} />
          </ActionPanel>
        }
      />
    );
  }

  return (
    <>
      {results.groups.map((group) => (
        <List.Section
          key={group.kind}
          title={GROUP_TITLES[group.kind]}
          subtitle={
            props.footer === resultCount(results)
              ? formatCount(group.total)
              : `${formatCount(group.total)} · ${props.footer}`
          }
        >
          {group.rows.map(item)}
          {group.total > group.rows.length ? (
            <List.Item
              key={`show-all:${group.kind}`}
              id={`show-all:${group.kind}`}
              title={showAllTitle(group.kind, group.total)}
              icon={Icon.AppWindowGrid3x3}
              detail={
                props.showDetail ? (
                  <List.Item.Detail
                    markdown={`## ${showAllTitle(group.kind, group.total)}\n\nOpen them in Dig Up Pictures (⌘O shows everything).`}
                  />
                ) : undefined
              }
              actions={
                <ActionPanel>
                  <Action
                    title={`Show All ${GROUP_TITLES[group.kind]}`}
                    icon={Icon.AppWindowGrid3x3}
                    onAction={() => openCommand("search-pictures", { query: text, kind: group.kind })}
                  />
                  <Action
                    title="Search in Grid"
                    icon={Icon.AppWindowGrid3x3}
                    shortcut={Keyboard.Shortcut.Common.Open}
                    onAction={() => openCommand("search-pictures", { query: text, kind })}
                  />
                  <DigUpActions onRefresh={props.onRetry} setup={status?.setup} />
                </ActionPanel>
              }
            />
          ) : null}
        </List.Section>
      ))}
      {weaker.count > 0 ? (
        <List.Section title={props.showWeaker ? "Weaker matches" : undefined}>
          <List.Item
            key="weaker-toggle"
            id="weaker-toggle"
            title={weakerTitle(weaker.count, weaker.shown)}
            icon={weaker.shown ? Icon.ChevronDown : Icon.ChevronRight}
            detail={
              props.showDetail ? (
                <List.Item.Detail
                  markdown={`## ${weakerTitle(weaker.count, weaker.shown)}\n\n${WEAKER_EXPLAINER(weaker.shown)}`}
                />
              ) : undefined
            }
            actions={
              <ActionPanel>
                <Action
                  title={weaker.shown ? "Hide Weaker Matches" : `Show ${weaker.count} Weaker Matches`}
                  icon={weaker.shown ? Icon.ChevronUp : Icon.ChevronDown}
                  onAction={weaker.toggle}
                />
                <Action
                  title="Toggle Details"
                  icon={Icon.Sidebar}
                  shortcut={{ modifiers: ["cmd"], key: "d" }}
                  onAction={props.toggleDetail}
                />
                <DigUpActions onRefresh={props.onRetry} setup={status?.setup} />
              </ActionPanel>
            }
          />
          {props.showWeaker ? results.weaker.map(item) : null}
        </List.Section>
      ) : null}
    </>
  );
}

interface HomeProps {
  status: Status | null;
  error: Error | null;
  secondsLeft: number | null;
  refresh: DaemonStatus["refresh"];
  onExample: (text: string) => void;
  toggleDetail: () => void;
}

/** Nothing typed: the first-run setup, the folders to choose, or examples to try and how indexing goes. */
function Home({ status, error, secondsLeft, refresh, onExample, toggleDetail }: HomeProps) {
  if (!status) {
    if (!error) return <List.EmptyView icon={{ source: "icon.png" }} title="Starting Dig Up…" />;
    return (
      <List.EmptyView
        icon={Icon.Warning}
        title="Dig Up's engine didn't start"
        description={error.message}
        actions={
          <ActionPanel>
            <Action title="Try Again" icon={Icon.ArrowClockwise} onAction={() => refresh()} />
            <Action title="Open Log" icon={Icon.Terminal} onAction={openLog} />
          </ActionPanel>
        }
      />
    );
  }

  const setUp = async () => {
    try {
      // The download is skipped when the Model Folder preference already names the model.
      await preferencesSent();
      await api("POST /setup", {});
      await refresh({ setupAsked: true });
    } catch (caught) {
      await showFailureToast(caught, { title: "Dig Up couldn't start the download" });
    }
  };
  const chooseFolders = () => openCommand("folders");
  const setup = status.setup;
  const welcome = <List.Item.Detail markdown={welcomeMarkdown(setup)} />;

  const sections: ReactElement[] = [];
  if (setup.state !== "ready") {
    const progress = setupProgress(setup);
    sections.push(
      <List.Section key="setup" title="Set Up">
        {setup.state === "missing" ? (
          <List.Item
            id="setup"
            title="Set Up Dig Up"
            subtitle={setupSubtitle(setup)}
            icon={Icon.Download}
            detail={welcome}
            actions={
              <ActionPanel>
                <Action title={setupActionTitle(setup)} icon={Icon.Download} onAction={setUp} />
                <Action title="Choose Folders…" icon={Icon.Folder} onAction={chooseFolders} />
              </ActionPanel>
            }
          />
        ) : setup.state === "failed" ? (
          <List.Item
            id="setup"
            title={setupLine(setup) as string}
            subtitle={setup.error}
            icon={Icon.Warning}
            detail={welcome}
            actions={
              <ActionPanel>
                <Action title="Try Again" icon={Icon.ArrowClockwise} onAction={setUp} />
                <Action title="Open Log" icon={Icon.Terminal} onAction={openLog} />
              </ActionPanel>
            }
          />
        ) : (
          <List.Item
            id="setup"
            title={setupLine(setup) as string}
            subtitle={setupProgressText(setup, secondsLeft) ?? undefined}
            icon={progress !== null ? getProgressIcon(progress) : Icon.Hourglass}
            detail={welcome}
            actions={
              <ActionPanel>
                <Action title="Choose Folders…" icon={Icon.Folder} onAction={chooseFolders} />
              </ActionPanel>
            }
          />
        )}
      </List.Section>,
    );
  }

  if (nothingChosen(status)) {
    sections.push(
      <List.Section key="folders" title="Folders">
        <List.Item
          id="choose-folders"
          title={NO_FOLDERS.title}
          subtitle={NO_FOLDERS.message}
          icon={Icon.Folder}
          detail={<List.Item.Detail markdown={`## ${NO_FOLDERS.title}\n\n${NO_FOLDERS.message}\n\n${HOTKEY_HINT}`} />}
          actions={
            <ActionPanel>
              <Action title="Choose Folders…" icon={Icon.Folder} onAction={chooseFolders} />
            </ActionPanel>
          }
        />
      </List.Section>,
    );
  } else {
    const kinds: Record<string, number> = {};
    for (const [kind, counts] of Object.entries(status.main.byKind)) kinds[kind] = searchable(counts);
    const names = status.folders.map((folder) => baseName(folder));
    const counted = kindCountsText(kinds);
    const where = foldersText(names);
    const index = counted
      ? `${counted} in ${where}`
      : `${formatCount(searchable(status.main.total))} files to search in ${where}`;
    const homeDetail = (
      <List.Item.Detail
        markdown={`## ${HOME_TITLE}\n\n${HOME_MESSAGE}\n\n${names.length > 0 ? `${index}\n\n` : ""}${HOTKEY_HINT}\n\n${MENU_BAR_HINT}`}
      />
    );
    sections.push(
      <List.Section key="try" title="Try" subtitle={names.length > 0 ? index : undefined}>
        {homeExamples(hasCode(status)).map((example) => (
          <List.Item
            key={example.text}
            id={`example:${example.text}`}
            title={example.text}
            subtitle={GROUP_TITLES[example.kind]}
            icon={KIND_ICONS[GROUP_KINDS[example.kind][0]]}
            detail={homeDetail}
            actions={
              <ActionPanel>
                <Action title="Search for This" icon={Icon.MagnifyingGlass} onAction={() => onExample(example.text)} />
                <Action
                  title="Toggle Details"
                  icon={Icon.Sidebar}
                  shortcut={{ modifiers: ["cmd"], key: "d" }}
                  onAction={toggleDetail}
                />
                <DigUpActions />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>,
    );
  }

  if (!nothingChosen(status)) sections.push(<IndexSection key="index" status={status} refresh={refresh} />);
  return <>{sections}</>;
}

/** How indexing goes, with pause and index-now: DigUp's status line, badge and menu in one row. */
function IndexSection({ status, refresh }: { status: Status; refresh: DaemonStatus["refresh"] }) {
  const progress = progressOf(status);
  const paused = status.held === "paused";
  const detail = statusDetail(status, (path) => baseName(path));
  const summary = indexSummary(status.main);
  const code = indexSummary(status.code, "code files");
  const togglePause = async () => {
    try {
      await preferencesSent();
      await api("POST /pause", { paused: !paused });
      await refresh();
      await showToast({ style: Toast.Style.Success, title: paused ? "Indexing resumed" : "Indexing paused" });
    } catch (caught) {
      await showFailureToast(caught, { title: "Dig Up couldn't change that" });
    }
  };
  const markdown = [
    `## ${statusLine(status)}`,
    detail ?? "",
    summary ? `**Files:** ${summary}` : "",
    code ? `**Code:** ${code}` : "",
    status.lastError
      ? `**Last problem** (${longDate(status.lastError.at / 1000)}): ${status.lastError.message}` +
        (status.lastError.path ? ` — \`${status.lastError.path}\`` : "")
      : "",
    MENU_BAR_HINT,
  ]
    .filter(Boolean)
    .join("\n\n");
  return (
    <List.Section title="Index">
      <List.Item
        id="index-status"
        title={statusLine(status)}
        subtitle={detail ?? undefined}
        icon={progress !== null ? getProgressIcon(progress) : paused ? Icon.Pause : Icon.CheckCircle}
        detail={<List.Item.Detail markdown={markdown} />}
        actions={
          <ActionPanel>
            <Action
              title={paused ? "Resume Indexing" : "Pause Indexing"}
              icon={paused ? Icon.Play : Icon.Pause}
              onAction={togglePause}
            />
            <Action title="Index Now" icon={Icon.ArrowClockwise} onAction={indexNow} />
            <Action title="Choose Folders…" icon={Icon.Folder} onAction={() => openCommand("folders")} />
            <Action title="Open Log" icon={Icon.Terminal} onAction={openLog} />
          </ActionPanel>
        }
      />
    </List.Section>
  );
}
