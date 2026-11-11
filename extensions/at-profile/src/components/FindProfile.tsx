import { countOf, failToast, showError } from "@chrismessina/raycast-kit";
import { logger } from "@chrismessina/raycast-logger";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Action,
  ActionPanel,
  Color,
  getPreferenceValues,
  Icon,
  Image,
  Keyboard,
  List,
  showToast,
  Toast,
} from "@raycast/api";
import { findCatalogSite } from "../catalog";
import { addToMyApps } from "../helpers/add-to-my-apps";
import { getAppFavicon } from "../helpers/apps";
import { forgetLastSearch, lastSearchedProfile, readFindings, recordSearch, saveFindings } from "../helpers/findings";
import { openProfile } from "../helpers/open-profile";
import {
  buildSearchEntries,
  entryIdentity,
  identities,
  runSearch,
  SEARCH_CONCURRENCY,
  SearchEntry,
  SearchMode,
  SearchOutcome,
} from "../helpers/search";
import { cleanProfile, completeHandle, tryBuildAppProfileUrl } from "../helpers/url";
import { useApps } from "../hooks/useApps";
import { PROGRESS_INTERVAL_MS } from "../utils/progress";

const log = logger.child("[Find]");

// Why a search stopped. Only a cancel finishes its toast; a newer search owns the toast slot, and a closed or cleared
// view hides it
type StopReason = "canceled" | "superseded" | "closed" | "cleared";

interface FindProfileProps {
  initialProfile?: string;
  mode?: SearchMode;
  /** Search `initialProfile` right away. Otherwise show its last findings, if there are any. */
  searchOnOpen?: boolean;
  /** The command's own view, where Raycast shows the command title; the search status moves into the Found section */
  isRoot?: boolean;
}

interface SearchRun {
  profile: string;
  mode: SearchMode;
  entries: SearchEntry[];
  outcomes: Map<string, SearchOutcome>;
  status: "searching" | "done" | "canceled";
  finishedAt?: number;
  durationMs?: number;
}

/** `13s`, `1m 5s` */
function formatDuration(ms: number): string {
  const seconds = Math.max(1, Math.round(ms / 1000));
  return seconds < 60 ? `${seconds}s` : `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}

/**
 * `handle` is the username as this site knows it: a bare name on an ATProto site gets its server's domain. `host` is
 * what the filter matches besides the name.
 */
type Row = SearchEntry & { outcome: SearchOutcome; url?: string; handle: string; host: string };

function favicon(entry: SearchEntry): Image.ImageLike {
  return entry.urlTemplate ? getAppFavicon({ urlTemplate: entry.urlTemplate }) : Icon.Person;
}

const REASONS: Partial<Record<SearchOutcome["status"], string>> = {
  blocked: "The site refused the check",
  error: "The site didn't answer",
  unchecked: "This site can't be checked",
};

export default function FindProfile({
  initialProfile,
  mode: initialMode = "default",
  searchOnOpen,
  isRoot,
}: FindProfileProps) {
  const { entries: apps, isLoading: isLoadingApps } = useApps();
  const [searchText, setSearchText] = useState("");
  const [run, setRun] = useState<SearchRun>();

  // Searches read the latest apps through a ref: they start from actions, never from a re-render
  const appsRef = useRef(apps);
  appsRef.current = apps;
  const controllerRef = useRef<AbortController | undefined>(undefined);
  const runRef = useRef(0);
  const myAppIds = useMemo(() => new Set(apps.map((app) => app.value)), [apps]);

  // The apps arrive from a cache first; the first search waits for the fresh list
  const [hasFreshApps, setHasFreshApps] = useState(false);
  useEffect(() => {
    if (!isLoadingApps) setHasFreshApps(true);
  }, [isLoadingApps]);
  const isReady = hasFreshApps;

  useEffect(() => () => controllerRef.current?.abort("closed" satisfies StopReason), []);

  const start = async (input: string, mode: SearchMode) => {
    // A preference, not a toggle in the view, so it can't change while a search runs
    const { includeNsfw } = getPreferenceValues<Preferences>();
    const profile = cleanProfile(input);
    if (!profile) return;
    controllerRef.current?.abort("superseded" satisfies StopReason);
    const controller = new AbortController();
    controllerRef.current = controller;
    const mine = ++runRef.current;
    const entries = buildSearchEntries({ mode, apps: appsRef.current, showNsfw: includeNsfw });
    const results = new Map<string, SearchOutcome>();
    const startedAt = Date.now();
    const update = (status: SearchRun["status"], finishedAt?: number) =>
      setRun({
        profile,
        mode,
        entries,
        outcomes: new Map(results),
        status,
        finishedAt,
        durationMs: finishedAt ? finishedAt - startedAt : undefined,
      });

    // The search bar becomes a filter for the results, as in Cosign's People search
    setSearchText("");
    update("searching");
    log.log(`Searching ${entries.length} sites for ${profile}`, { mode, includeNsfw });
    recordSearch(profile).catch((error) => log.warn("Couldn't record the search in History", error));

    const progress = await showToast({
      style: Toast.Style.Animated,
      title: `Checking ${countOf(entries.length, "site")}…`,
      message: `0 of ${entries.length}`,
      primaryAction: {
        title: "Cancel",
        onAction: () => controller.abort("canceled" satisfies StopReason),
      },
    });
    let lastShown = 0;
    try {
      await runSearch(entries, profile, {
        concurrency: SEARCH_CONCURRENCY[mode],
        signal: controller.signal,
        onOutcome: (key, outcome) => {
          results.set(key, outcome);
          // A cleared or newer search owns the view now
          if (runRef.current === mine && Date.now() - lastShown > PROGRESS_INTERVAL_MS) {
            lastShown = Date.now();
            progress.message = `${results.size} of ${entries.length}`;
            update("searching");
          }
        },
      });
    } catch (error) {
      log.error("Search failed", error);
      update("done", Date.now());
      failToast(progress, error, { title: "Couldn't Search" });
      return;
    }

    const reason = controller.signal.aborted ? (controller.signal.reason as StopReason) : undefined;
    if (reason === "superseded" || reason === "closed" || reason === "cleared") {
      log.log(`Search for ${profile} stopped: ${reason}`);
      if (reason === "cleared" || (reason === "closed" && runRef.current === mine)) {
        progress.hide().catch((error) => log.log("Hiding the toast failed", error));
      }
      return;
    }

    const finishedAt = Date.now();
    const canceled = reason === "canceled";
    update(canceled ? "canceled" : "done", finishedAt);
    saveFindings({
      profile,
      mode,
      finishedAt,
      durationMs: finishedAt - startedAt,
      total: entries.length,
      canceled,
      outcomes: Object.fromEntries(results),
      checked: identities(entries),
    });

    const count = (...statuses: SearchOutcome["status"][]) =>
      [...results.values()].filter((outcome) => statuses.includes(outcome.status)).length;
    const found = count("found");
    const answered = found + count("not-found");
    const failed = count("blocked", "error");
    const durationMs = finishedAt - startedAt;
    log.log(`Search for ${profile} ${canceled ? "canceled" : "done"}`, { found, answered, failed, durationMs });
    // Finish in place; replacing the toast while its progress updates are in flight can let one land on top
    progress.primaryAction = undefined;
    if (!canceled && answered === 0 && failed > 0) {
      // Nothing answered, usually no connection: that says nothing about the username
      failToast(progress, new Error(`None of the ${countOf(failed, "site")} that were asked answered`), {
        title: `Couldn't Check @${profile}`,
      });
      return;
    }
    progress.style = Toast.Style.Success;
    const unanswered = failed > 0 ? `, ${failed} couldn't be checked` : "";
    if (canceled) {
      progress.title = "Search Canceled";
      progress.message = `Checked ${results.size} of ${countOf(entries.length, "site")}, found ${found}`;
    } else if (found > 0) {
      progress.title = `Found @${profile} on ${countOf(found, "site")}`;
      progress.message = `Checked ${countOf(entries.length, "site")} in ${formatDuration(durationMs)}${unanswered}`;
    } else {
      progress.title = `@${profile} Not Found`;
      progress.message = `No profile on the ${countOf(answered, "site")} that answered${unanswered}`;
    }
  };

  /** Back to the empty view: stop a search still running, and open on the empty view next time too */
  const clear = () => {
    runRef.current++;
    controllerRef.current?.abort("cleared" satisfies StopReason);
    setRun(undefined);
    setSearchText("");
    forgetLastSearch();
  };

  // Opening: search the username passed in, or show the last findings for it (or for the last username searched)
  const opened = useRef(false);
  useEffect(() => {
    if (!isReady || opened.current) return;
    opened.current = true;
    const passed = cleanProfile(initialProfile ?? "");
    if (passed && searchOnOpen) {
      void start(passed, initialMode);
      return;
    }
    const profile = passed || lastSearchedProfile();
    if (!profile) return;
    const findings = readFindings(profile);
    if (!findings) return;
    // Every NSFW entry too: the findings already say which sites were searched
    const { checked } = findings;
    const entries = buildSearchEntries({ mode: findings.mode, apps: appsRef.current, showNsfw: true }).filter(
      (entry) =>
        entry.key in findings.outcomes && (!checked?.[entry.key] || checked[entry.key] === entryIdentity(entry)),
    );
    // Every site's check changed since (a catalog update): nothing left to show, so open on the empty state
    if (entries.length === 0) return;
    setRun({
      profile: findings.profile,
      mode: findings.mode,
      entries,
      outcomes: new Map(Object.entries(findings.outcomes)),
      status: findings.canceled ? "canceled" : "done",
      finishedAt: findings.finishedAt,
      durationMs: findings.durationMs,
    });
  }, [isReady]);

  // Built once per answer, not on every keystroke in the filter
  const rows = useMemo<Row[]>(
    () =>
      (run?.entries ?? []).flatMap((entry) => {
        const outcome = run?.outcomes.get(entry.key);
        if (!run || !outcome) return [];
        const inMyApps = entry.inMyApps || (entry.appId !== undefined && myAppIds.has(entry.appId));
        const handle = completeHandle(entry.handleDomain, run.profile);
        const url = tryBuildAppProfileUrl(entry, run.profile);
        const host = url ? new URL(url).hostname.replace(/^www\./, "") : "";
        return [{ ...entry, inMyApps, outcome, url, handle, host }];
      }),
    [run, myAppIds],
  );

  // Typed text filters the results by site name or host. A plain substring match: Raycast's fuzzy filtering matched
  // "yout" against every URL holding those letters in order.
  const typed = cleanProfile(searchText);
  const hasResults = rows.length > 0;
  const filter = hasResults ? searchText.trim().toLowerCase() : "";
  const shownRows = filter
    ? rows.filter((row) => row.name.toLowerCase().includes(filter) || row.host.includes(filter))
    : rows;
  const byStatus = (...statuses: SearchOutcome["status"][]) =>
    shownRows.filter((row) => statuses.includes(row.outcome.status));

  const open = async (row: Row) => {
    if (!row.appId || !run) return;
    try {
      // The handle this row checked: if the app's handle domain changed since, the bare name would complete differently
      const result = await openProfile(row.handle, row.appId);
      await showToast({ style: Toast.Style.Success, title: `Opened @${result.profile} on ${result.app.name}` });
    } catch (error) {
      await showError(error, { title: "Couldn't Open Profile" });
    }
  };

  /**
   * The search actions every panel shares. `name` is the username they apply to: the one typed on the Find row,
   * the one on screen everywhere else.
   */
  const searchActions = (name: string, withFind: boolean) => (
    <ActionPanel.Section>
      {withFind && name && (
        <Action title={`Find @${name}`} icon={Icon.MagnifyingGlass} onAction={() => start(name, "default")} />
      )}
      {name && (
        <Action
          title={`Search Everywhere for @${name}`}
          icon={Icon.Globe}
          onAction={() => start(name, "everywhere")}
          // Second after Find, where it takes ⌘⏎; after a row's own actions it needs its own shortcut
          shortcut={withFind ? undefined : { modifiers: ["cmd", "shift"], key: "enter" }}
        />
      )}
      {run && name === run.profile && run.status !== "searching" && (
        <Action
          title="Search Again"
          icon={Icon.ArrowClockwise}
          onAction={() => start(run.profile, run.mode)}
          shortcut={Keyboard.Shortcut.Common.Refresh}
        />
      )}
      {run && (
        <Action
          title="Clear Search"
          icon={Icon.XMarkCircle}
          onAction={clear}
          shortcut={Keyboard.Shortcut.Common.RemoveAll}
        />
      )}
    </ActionPanel.Section>
  );

  const renderRow = (row: Row) => {
    const status = row.outcome.status;
    const profile = run?.profile ?? "";
    const accessories: List.Item.Accessory[] = [];
    if (row.nsfw) accessories.push({ tag: { value: "NSFW", color: Color.Red } });
    if (row.inMyApps) accessories.push({ icon: Icon.Checkmark, tooltip: "In My Apps" });
    const reason = REASONS[status];
    if (reason) accessories.push({ icon: Icon.QuestionMarkCircle, tooltip: reason });

    const subtitle = !row.appId ? (status === "found" ? "Username is taken" : "Valid username") : row.url;
    return (
      <List.Item
        key={row.key}
        title={row.name}
        subtitle={subtitle}
        icon={favicon(row)}
        accessories={accessories}
        actions={
          <ActionPanel>
            {row.appId && row.url ? (
              <Action title={`Open @${row.handle} on ${row.name}`} icon={favicon(row)} onAction={() => open(row)} />
            ) : (
              <Action.CopyToClipboard title="Copy Username" content={profile} />
            )}
            {row.url && (
              // Always the second action, so it takes ⌘⏎
              <Action.CopyToClipboard title="Copy Profile URL" content={row.url} />
            )}
            {!row.inMyApps && row.appId && (
              <Action
                title="Add to My Apps"
                icon={Icon.Plus}
                onAction={() => {
                  const site = findCatalogSite(row.key);
                  if (site) void addToMyApps(site);
                }}
                shortcut={Keyboard.Shortcut.Common.New}
              />
            )}
            {searchActions(profile, false)}
          </ActionPanel>
        }
      />
    );
  };

  const section = (title: string, sectionRows: Row[], status?: string) =>
    sectionRows.length > 0 && (
      <List.Section title={title} subtitle={[countOf(sectionRows.length, "site"), status].filter(Boolean).join(" · ")}>
        {sectionRows.map(renderRow)}
      </List.Section>
    );

  // How long the search took; the toast and History carry the rest
  const runStatus = !run
    ? undefined
    : run.status === "searching"
      ? "searching…"
      : `${run.status === "canceled" ? "canceled after " : ""}${formatDuration(run.durationMs ?? 0)}`;
  // Raycast titles a command's own view; a view pushed from History names the username and the status
  const navigationTitle = isRoot ? undefined : run ? `@${run.profile} · ${runStatus}` : "Find Profile";

  return (
    <List
      isLoading={!isReady || run?.status === "searching"}
      filtering={false}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder={hasResults ? "Filter results, or type a new search and press Enter" : "Username to find…"}
      navigationTitle={navigationTitle}
      actions={<ActionPanel>{searchActions(typed, true)}</ActionPanel>}
    >
      {typed && (
        <List.Section title="New Search">
          <List.Item
            title={`Find @${typed}`}
            subtitle="On your apps and the usual sites"
            icon={Icon.MagnifyingGlass}
            actions={<ActionPanel>{searchActions(typed, true)}</ActionPanel>}
          />
        </List.Section>
      )}
      {!typed && shownRows.length === 0 && (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          {...(run?.status === "searching"
            ? { title: `Checking Sites for @${run.profile}…`, description: "Each site appears here as it answers." }
            : {
                title: "Find a Profile",
                description: "Type a username, then press Return to look for it across sites.",
              })}
        />
      )}
      {section(run ? `Found @${run.profile}` : "Found", byStatus("found"), isRoot ? runStatus : undefined)}
      {section("Couldn't Check", byStatus("blocked", "error"))}
      {section("Not Checked", byStatus("unchecked"))}
      {section("Not Found", byStatus("not-found"))}
      {section("Username Not Allowed", byStatus("invalid"))}
    </List>
  );
}
