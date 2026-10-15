// Dig Up Pictures: DigUp's bigger search window as a Raycast grid: all the strong results as pictures (the frame or
// page that matched), a kind filter with counts, and the weaker ones folded underneath (DigUp: SearchWindow.swift).

import { Action, ActionPanel, Grid, Icon, type LaunchProps } from "@raycast/api";
import { useEffect, useMemo, useRef, useState } from "react";
import type { SearchRequest, SearchResponse, Status } from "../engine/api";
import { codeQueryText } from "../engine/types";
import { api } from "./lib/client";
import {
  CODE_EXAMPLES,
  CODE_HINT,
  CODE_OFF,
  HOME_MESSAGE,
  HOME_TITLE,
  NO_FOLDERS_WINDOW,
  filterTitle,
  homeExamples,
  isKindFilter,
  noMatches,
  placeholder,
  weakerTitle,
  type KindFilter,
} from "./lib/copy";
import { baseName, formatCount } from "./lib/format";
import { thumbSpec } from "./lib/preview";
import {
  EMPTY_RESULTS,
  FILE_GROUPS,
  GROUP_KINDS,
  GROUP_TITLES,
  buildResultSet,
  groupCounts,
  resultCount,
  type ResultGroupKind,
  type ResultRow,
  type ResultSet,
} from "./lib/results";
import {
  codeCaveat,
  setupLine,
  hasCode,
  nothingChosen,
  resultsCaveat,
  startingLine,
  statusLine,
} from "./lib/status-text";
import { useDaemonStatus, useSearchRefresh, usePictures } from "./ui/hooks";
import { openLog } from "./ui/log";
import { preferencesSent } from "./ui/prefs";
import { CELL_PIXELS, DigUpActions, KIND_ICONS, ResultActions, SetupAction, openCommand } from "./ui/result-parts";

/** The window asks for more than the panel (DigUp: SearchWindow.swift:296). */
const LIMIT = 120;
const TYPING_PAUSE_MS = 120;
const WARMING_RETRY_MS = 400;
const WARMING_RETRIES = 50;
/** ⌘1 All, ⌘2 Screenshots … ⌘7 Code (DigUp: SearchWindow.swift:132-137). */
const DIGITS = ["1", "2", "3", "4", "5", "6", "7"] as const;

type Phase = "empty" | "searching" | "results" | "codeHint" | "codeOff" | "failed";

interface GridView {
  phase: Phase;
  query: string;
  isCode: boolean;
  results: ResultSet;
  /** Strong results per kind, from the unfiltered search: the dropdown's counts. */
  counts: Partial<Record<ResultGroupKind, number>>;
  /** The query encoder is still starting: these are word matches, and meaning results follow. */
  warming: boolean;
  error: string | null;
}

const EMPTY_VIEW: GridView = {
  phase: "empty",
  query: "",
  isCode: false,
  results: EMPTY_RESULTS,
  counts: {},
  warming: false,
  error: null,
};

interface Context {
  query?: string;
  kind?: string;
}

export default function Command(props: LaunchProps<{ arguments: Arguments.SearchPictures; launchContext?: Context }>) {
  const initialQuery = props.launchContext?.query ?? props.arguments?.query ?? "";
  const initialKind: KindFilter = isKindFilter(props.launchContext?.kind) ? props.launchContext.kind : "all";
  const daemon = useDaemonStatus();
  const { status } = daemon;
  const statusRef = useRef<Status | null>(null);
  statusRef.current = status;

  // Always controlled (Raycast puts `searchText` back into the field whenever no keystroke is on its way): the text
  // as typed, as launched with, or an example picked here.
  const [text, setText] = useState(initialQuery);
  /** The field's text as last typed or set here, for the echo check (a handler may be one from an older render). */
  const textRef = useRef(initialQuery);
  const [kind, setKind] = useState<KindFilter>(initialKind);
  const [view, setView] = useState<GridView>(EMPTY_VIEW);
  const [showWeaker, setShowWeaker] = useState(false);
  /** A search is on its way (the shown results may be the last query's). */
  const [busy, setBusy] = useState(false);
  const [selectedId, setSelectedId] = useState<string | undefined>(undefined);

  const generation = useRef(0);
  const controller = useRef<AbortController | null>(null);
  const timer = useRef<NodeJS.Timeout | undefined>(undefined);

  useEffect(() => {
    // The preferences name the model and llama-server the query encoder runs.
    preferencesSent()
      .then(() => api("POST /prewarm", {}))
      .catch(() => undefined);
    if (initialQuery.trim()) run(initialQuery, initialKind);
    return () => {
      controller.current?.abort();
      clearTimeout(timer.current);
    };
  }, []);

  /** One search per typing pause (no keyword-first phase), and a second with the kind filter (SearchWindow.run). */
  useSearchRefresh(status, text, kind === "code" || codeQueryText(text) !== null, busy, () => run(text, kind, true));

  function run(typed: string, filter: KindFilter, background = false) {
    const current = ++generation.current;
    controller.current?.abort();
    clearTimeout(timer.current);
    if (!background) setShowWeaker(false);
    setBusy(false);
    const trimmed = typed.trim();
    if (!trimmed) {
      setView(EMPTY_VIEW);
      return;
    }
    const query = filter === "code" && codeQueryText(trimmed) === null ? `code: ${trimmed}` : trimmed;
    const codeText = codeQueryText(query);
    const isCode = codeText !== null;
    const known = statusRef.current;
    if (isCode && (codeText === "" || (known && !hasCode(known)))) {
      setView({ ...EMPTY_VIEW, query, isCode, phase: known && !hasCode(known) ? "codeOff" : "codeHint" });
      return;
    }
    const abort = new AbortController();
    controller.current = abort;
    setBusy(true);
    setView((before) => ({ ...before, phase: before.phase === "results" ? "results" : "searching" }));
    const search = (request: SearchRequest) => api("POST /search", request, { signal: abort.signal });

    const attempt = async (tries: number) => {
      try {
        const all = await search({ query, limit: LIMIT, meaning: true });
        const shown =
          all.code || filter === "all" || filter === "code"
            ? all
            : await search({ query, kinds: GROUP_KINDS[filter], limit: LIMIT, meaning: true });
        if (current !== generation.current) return;
        setBusy(false);
        if (all.note === "code-off" || all.note === "code-hint") {
          setView({ ...EMPTY_VIEW, query, isCode: true, phase: all.note === "code-off" ? "codeOff" : "codeHint" });
          return;
        }
        const warming = !shown.meaning && shown.note === "warming" && tries < WARMING_RETRIES;
        setView({
          phase: "results",
          query,
          isCode: all.code,
          results: resultSet(shown),
          counts: all.code ? { code: all.strong } : groupCounts(resultSet(all)),
          warming,
          error: null,
        });
        if (warming) timer.current = setTimeout(() => attempt(tries + 1), WARMING_RETRY_MS);
      } catch (error) {
        if (abort.signal.aborted || current !== generation.current) return;
        setBusy(false);
        if (!background)
          setView({ ...EMPTY_VIEW, query, isCode, phase: "failed", error: String((error as Error)?.message ?? error) });
      }
    };
    timer.current = setTimeout(() => attempt(0), TYPING_PAUSE_MS);
  }

  function onSearchTextChange(next: string) {
    if (next === textRef.current) return;
    textRef.current = next;
    setText(next);
    run(next, kind);
  }

  function choose(filter: KindFilter) {
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
  const shown: GridView = status && view.phase === "codeHint" && !codeOn ? { ...view, phase: "codeOff" } : view;

  const { results } = shown;
  const rows = useMemo(() => [...results.ranked, ...(showWeaker ? results.weaker : [])], [results, showWeaker]);
  // DigUp's window keeps the selection on its file while new results still hold it, else moves to the first result
  // (SearchWindow.run; unlike the panel, it doesn't follow the top hit). Raycast does that when cells are replaced in
  // place, but goes to the first cell when the query changes, so the file is named to it.
  const kept =
    selectedId !== undefined &&
    (rows.some((row) => row.id === selectedId) || (selectedId === "weaker-toggle" && results.weaker.length > 0));
  const hint = kept ? selectedId : results.ranked[0]?.id;
  const specs = useMemo(
    () => rows.filter((row) => row.kind !== "code").map((row) => thumbSpec(row, CELL_PIXELS, false)),
    [rows],
  );
  const picture = usePictures(specs);
  const weaker = { count: results.weaker.length, shown: showWeaker, toggle: () => setShowWeaker((shown) => !shown) };

  const filterActions = (
    <ActionPanel.Section title="Show">
      {(["all", ...FILE_GROUPS, ...(codeOn ? (["code"] as const) : [])] as KindFilter[]).map((filter, i) => (
        <Action
          key={filter}
          title={filter === "all" ? "Show All Kinds" : `Show ${filterTitle(filter)}`}
          icon={
            filter === "all" ? Icon.MagnifyingGlass : KIND_ICONS[filter === "code" ? "code" : GROUP_KINDS[filter][0]]
          }
          shortcut={{ modifiers: ["cmd"], key: DIGITS[i] }}
          onAction={() => choose(filter)}
        />
      ))}
    </ActionPanel.Section>
  );

  function cell(row: ResultRow) {
    const made = row.kind === "code" ? null : picture(thumbSpec(row, CELL_PIXELS, false));
    const content = made ? { source: made.path } : { fileIcon: row.path };
    return (
      <Grid.Item
        key={row.id}
        id={row.id}
        content={{ value: content, tooltip: row.reason }}
        title={row.title}
        subtitle={
          row.kind === "code"
            ? (row.span ?? row.folder)
            : row.place
              ? `${row.place} · ${baseName(row.folderPath)}`
              : baseName(row.folderPath)
        }
        accessory={
          row.kind === "image" || row.kind === "screenshot"
            ? { tooltip: row.reason }
            : { icon: KIND_ICONS[row.kind], tooltip: row.reason }
        }
        quickLook={{ path: row.path, name: row.name }}
        actions={
          <ResultActions
            row={row}
            query={text}
            kind={kind}
            grid
            setup={status?.setup}
            onRefresh={() => run(text, kind, true)}
            weaker={weaker.count > 0 ? weaker : undefined}
          >
            {filterActions}
          </ResultActions>
        }
      />
    );
  }

  const typed = text.trim() !== "";
  const right = (() => {
    if (!typed || shown.phase !== "results" || !status) return null;
    const caveat = shown.isCode ? codeCaveat(status) : resultsCaveat(status);
    return caveat ?? resultCount(results);
  })();
  const navigationTitle = right ?? (status ? statusLine(status) : startingLine(daemon.error));
  const shownCounts = typed && shown.phase === "results";
  const total = Object.values(shown.counts).reduce<number>((sum, n) => sum + (n ?? 0), 0);
  const countText = (filter: KindFilter) => {
    if (!shownCounts) return filterTitle(filter);
    const n = filter === "all" ? total : (shown.counts[filter] ?? 0);
    return `${filterTitle(filter)} ${formatCount(n)}`;
  };

  // No `throttle` (Raycast's waits 250 ms after the last keystroke): the 120 ms typing pause in run() is the wait.
  return (
    <Grid
      columns={5}
      aspectRatio="3/2"
      fit={Grid.Fit.Contain}
      inset={shown.isCode ? Grid.Inset.Large : undefined}
      filtering={false}
      searchText={text}
      onSearchTextChange={onSearchTextChange}
      selectedItemId={hint}
      onSelectionChange={(id) => setSelectedId(id ?? undefined)}
      isLoading={(typed && busy) || (!status && !daemon.error) || (typed && shown.warming)}
      searchBarPlaceholder={placeholder(codeOn, kind, true)}
      searchBarAccessory={
        <Grid.Dropdown tooltip="Kind" value={kind} onChange={(value) => choose(value as KindFilter)}>
          <Grid.Dropdown.Item title={countText("all")} value="all" icon={Icon.MagnifyingGlass} />
          {FILE_GROUPS.map((group) => (
            <Grid.Dropdown.Item
              key={group}
              title={countText(group)}
              value={group}
              icon={KIND_ICONS[GROUP_KINDS[group][0]]}
            />
          ))}
          {codeOn || kind === "code" ? (
            <Grid.Dropdown.Section>
              <Grid.Dropdown.Item title={countText("code")} value="code" icon={KIND_ICONS.code} />
            </Grid.Dropdown.Section>
          ) : null}
        </Grid.Dropdown>
      }
    >
      {body()}
    </Grid>
  );

  function body() {
    if (!status && daemon.error) {
      return (
        <Grid.EmptyView
          icon={Icon.Warning}
          title="Dig Up's engine didn't start"
          description={daemon.error.message}
          actions={
            <ActionPanel>
              <Action title="Try Again" icon={Icon.ArrowClockwise} onAction={() => daemon.refresh()} />
              <Action title="Open Log" icon={Icon.Terminal} onAction={openLog} />
            </ActionPanel>
          }
        />
      );
    }
    if (status && status.setup.state !== "ready" && (!typed || results.ranked.length === 0)) {
      return (
        <Grid.EmptyView
          icon={Icon.Download}
          title={setupLine(status.setup) ?? "Set Up Dig Up"}
          description="Set up Dig Up to search images and file contents. You can choose folders while it downloads."
          actions={
            <ActionPanel>
              {status.setup.state === "missing" || status.setup.state === "failed" ? (
                <SetupAction setup={status.setup} onComplete={() => void daemon.refresh({ setupAsked: true })} />
              ) : null}
              <DigUpActions />
            </ActionPanel>
          }
        />
      );
    }
    if (status && nothingChosen(status)) {
      return (
        <Grid.EmptyView
          icon={{ source: "icon.png" }}
          title={NO_FOLDERS_WINDOW.title}
          description={NO_FOLDERS_WINDOW.message}
          actions={
            <ActionPanel>
              <Action title="Choose Folders…" icon={Icon.Folder} onAction={() => openCommand("folders")} />
            </ActionPanel>
          }
        />
      );
    }
    if (!typed) {
      if (!status) return <Grid.EmptyView icon={{ source: "icon.png" }} title="Starting Dig Up…" />;
      return (
        <Grid.Section
          title={HOME_TITLE}
          subtitle={HOME_MESSAGE}
          aspectRatio="3/2"
          fit={Grid.Fit.Contain}
          inset={Grid.Inset.Large}
        >
          {homeExamples(hasCode(status)).map((example) => (
            <Grid.Item
              key={example.text}
              id={`example:${example.text}`}
              content={{ value: { source: KIND_ICONS[GROUP_KINDS[example.kind][0]] }, tooltip: example.text }}
              title={example.text}
              subtitle={GROUP_TITLES[example.kind]}
              actions={
                <ActionPanel>
                  <Action
                    title="Search for This"
                    icon={Icon.MagnifyingGlass}
                    onAction={() => tryExample(example.text)}
                  />
                  <DigUpActions />
                </ActionPanel>
              }
            />
          ))}
        </Grid.Section>
      );
    }
    if (shown.phase === "codeOff") {
      return (
        <Grid.EmptyView
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
    if (shown.phase === "codeHint") {
      return (
        <Grid.Section
          title={CODE_HINT.title}
          subtitle={CODE_HINT.message}
          fit={Grid.Fit.Contain}
          inset={Grid.Inset.Large}
        >
          {CODE_EXAMPLES.map((example) => (
            <Grid.Item
              key={example}
              id={`example:${example}`}
              content={{ value: { source: Icon.Code }, tooltip: example }}
              title={example}
              actions={
                <ActionPanel>
                  <Action title="Search for This" icon={Icon.MagnifyingGlass} onAction={() => tryExample(example)} />
                </ActionPanel>
              }
            />
          ))}
        </Grid.Section>
      );
    }
    if (shown.phase === "failed") {
      return (
        <Grid.EmptyView
          icon={Icon.Warning}
          title="Dig Up couldn't search"
          description={shown.error ?? undefined}
          actions={
            <ActionPanel>
              <Action title="Try Again" icon={Icon.ArrowClockwise} onAction={() => run(text, kind)} />
              <Action title="Open Log" icon={Icon.Terminal} onAction={openLog} />
            </ActionPanel>
          }
        />
      );
    }
    if (shown.phase !== "results") return <Grid.EmptyView icon={Icon.MagnifyingGlass} title="Searching…" />;
    if (results.ranked.length === 0 && results.weaker.length === 0) {
      const empty = noMatches(shown.isCode, true, text);
      return (
        <Grid.EmptyView
          icon={Icon.MagnifyingGlass}
          title={empty.title}
          description={`${empty.message} ${right ?? ""}`}
          actions={
            <ActionPanel>
              <Action title="Clear Search" icon={Icon.XMarkCircle} onAction={() => onSearchTextChange("")} />
              <DigUpActions setup={status?.setup} onRefresh={() => run(text, kind)} />
              {filterActions}
            </ActionPanel>
          }
        />
      );
    }
    return (
      <>
        <Grid.Section title="Results" subtitle={navigationTitle}>
          {results.ranked.map(cell)}
        </Grid.Section>
        {weaker.count > 0 ? (
          <Grid.Section title={showWeaker ? "Weaker matches" : undefined}>
            <Grid.Item
              key="weaker-toggle"
              id="weaker-toggle"
              content={{ value: { source: showWeaker ? Icon.ChevronUp : Icon.ChevronDown }, tooltip: "Weaker matches" }}
              title={weakerTitle(weaker.count, showWeaker)}
              actions={
                <ActionPanel>
                  <Action
                    title={showWeaker ? "Hide Weaker Matches" : `Show ${weaker.count} Weaker Matches`}
                    icon={showWeaker ? Icon.ChevronUp : Icon.ChevronDown}
                    onAction={weaker.toggle}
                  />
                  {filterActions}
                </ActionPanel>
              }
            />
            {showWeaker ? results.weaker.map(cell) : null}
          </Grid.Section>
        ) : null}
      </>
    );
  }
}

function resultSet(response: SearchResponse): ResultSet {
  return buildResultSet(response.hits, { terms: response.terms, strong: response.strong });
}
