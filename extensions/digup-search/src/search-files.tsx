import {
  Action,
  ActionPanel,
  type Application,
  Icon,
  Keyboard,
  type LaunchProps,
  List,
  Toast,
  closeMainWindow,
  environment,
  getApplications,
  getDefaultApplication,
  getPreferenceValues,
  open,
  showHUD,
  showToast,
} from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { basename, extname, join } from "node:path";
import { useEffect, useMemo, useRef, useState } from "react";
import { BUNDLE_ID, checkReadiness, parseOverride, realSystem, type Readiness } from "./digup/installation";
import type { EncoderState, Hit } from "./digup/protocol";
import { DigUpService } from "./digup/service";
import { soon } from "./digup/soon";
import { chooseEditor } from "./open/editors";
import { momentOf, pageOf } from "./open/moments";
import { openTitle, planOpen, runOpen, type OpenContext } from "./open/open";
import { detailMarkdown, hasPassage, metadataRows, placeOf, sections } from "./search/presentation";
import { loadPreview } from "./search/previews";
import { EMPTY_STATE, FILTERS, SearchSession, toFilter, type SessionState } from "./search/session";
import { SetupView } from "./setup-view";
import { queryWords } from "./words";

type Ready = Extract<Readiness, { state: "ready" }>;

const HOME = homedir();
const PLACEHOLDER = "Describe what you're looking for";

/** For working on the extension: ~/.config/digup-raycast/dev-settings.json points it at a test index (see README). */
async function developmentOverride() {
  if (!environment.isDevelopment) return {};
  try {
    return parseOverride(await readFile(join(HOME, ".config", "digup-raycast", "dev-settings.json"), "utf8"), HOME);
  } catch {
    return {};
  }
}

function exec(program: string, args: string[]) {
  return new Promise<{ ok: boolean; stdout: string }>((resolve) => {
    execFile(program, args, { timeout: 20_000 }, (error, stdout) => resolve({ ok: !error, stdout: String(stdout) }));
  });
}

/** A JetBrains IDE's launcher is named after the IDE: "pycharm", "idea". */
async function bundleExecutable(appPath: string): Promise<string | undefined> {
  const plist = join(appPath, "Contents", "Info.plist");
  const result = await exec("/usr/bin/plutil", ["-extract", "CFBundleExecutable", "raw", "-o", "-", plist]);
  return (result.ok && result.stdout.trim()) || undefined;
}

const idOf = (hit: Hit) => `${hit.segmentId}:${hit.path}`;

export default function SearchFilesCommand(props: LaunchProps) {
  const [attempt, setAttempt] = useState(0);
  const [found, setFound] = useState<{ readiness: Readiness; apps: Application[] } | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  // What's typed is kept here, above the checks: people start typing the moment the command opens, and what they
  // typed while DigUp was being looked for must still be there when the search starts. As a fallback command, or
  // from a deeplink, it starts with the text that came along.
  const [typed, setTyped] = useState(props.fallbackText ?? "");

  useEffect(() => {
    let current = true;
    setFound(null);
    setFailure(null);
    (async () => {
      const apps = await getApplications().catch(() => [] as Application[]);
      const candidates = apps.filter((app) => app.bundleId === BUNDLE_ID).map((app) => app.path);
      const readiness = await checkReadiness(candidates, realSystem(), await developmentOverride());
      if (current) setFound({ readiness, apps });
    })();
    return () => {
      current = false;
    };
  }, [attempt]);

  const retry = () => setAttempt((value) => value + 1);
  if (found === null) {
    return <List isLoading searchText={typed} onSearchTextChange={setTyped} searchBarPlaceholder={PLACEHOLDER} />;
  }
  if (failure !== null) return <SetupView problem={{ state: "failed", log: failure }} onRetry={retry} />;
  if (found.readiness.state !== "ready") return <SetupView problem={found.readiness} onRetry={retry} />;
  return <Search ready={found.readiness} apps={found.apps} onFailed={setFailure} typed={typed} onType={setTyped} />;
}

function Search(props: {
  ready: Ready;
  apps: Application[];
  onFailed: (log: string) => void;
  typed: string;
  onType: (text: string) => void;
}) {
  const { ready, apps, onFailed, typed, onType: setTyped } = props;
  // How many times the helper has been started here: nothing is searched before the first.
  const [starts, setStarts] = useState(0);
  const [savedFilter, setFilter] = useCachedState<string>("filter", "all");
  const filter = toFilter(savedFilter, ready.hasCode);
  const [state, setState] = useState<SessionState>(EMPTY_STATE);
  const [encoder, setEncoder] = useState<EncoderState>("starting");
  const [restarts, setRestarts] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loaded, setLoaded] = useState<{ id: string; previewUrl?: string; text: string | null } | null>(null);
  const [defaultApps, setDefaultApps] = useState<Record<string, string>>({});
  const service = useRef<DigUpService | null>(null);
  const session = useRef<SearchSession | null>(null);
  const editor = useMemo(() => chooseEditor(ready.settings.codeEditor, apps), [ready, apps]);
  // The app for videos and recordings, from the extension's settings: QuickTime Player unless it was changed.
  const { player } = getPreferenceValues<Preferences>();

  // The helper lives as long as the command is open.
  useEffect(() => {
    let replaced = false;
    const digup = new DigUpService(ready.launch, {
      onEvent: (event) => {
        if (event.event === "encoder") setEncoder(event.state);
        // The helper that took over is ready: what's typed is searched again, and the selected row gets its
        // preview again. (Also when the first helper ended before it ever got ready.)
        if (event.event === "ready" && replaced) {
          replaced = false;
          setRestarts((value) => value + 1);
        }
      },
      onRestart: () => {
        replaced = true;
      },
      onFailed,
    });
    const search = new SearchSession(digup, setState);
    service.current = digup;
    session.current = search;
    // Soon, not now: in a development build React runs this effect twice, and the first run's helper would load
    // the model only to be told to quit (see `soon`).
    const cancelStart = soon(() => {
      digup.start();
      setStarts((value) => value + 1);
    });
    return () => {
      cancelStart();
      search.dispose();
      digup.stop();
      service.current = null;
      session.current = null;
    };
  }, [ready]);

  useEffect(() => {
    if (starts > 0) session.current?.update(typed, filter);
  }, [typed, filter, restarts, starts]);

  useEffect(() => {
    if (encoder !== "unavailable") return;
    showToast({
      style: Toast.Style.Failure,
      title: "Meaning Search Is Off",
      message: "Open DigUp to finish downloading its model. Showing word matches only.",
      primaryAction: { title: "Open DigUp", onAction: () => open(ready.appPath) },
    });
  }, [encoder]);

  useEffect(() => {
    if (state.warning)
      showToast({ style: Toast.Style.Failure, title: "Meaning Search Is Off", message: state.warning });
  }, [state.warning]);

  useEffect(() => {
    if (state.error) showToast({ style: Toast.Style.Failure, title: "Search Failed", message: state.error });
  }, [state.error]);

  const hits = state.reply?.hits ?? [];
  const words = useMemo(() => queryWords(state.query.text), [state.query.text]);
  const selected = hits.find((hit) => idOf(hit) === selectedId) ?? null;
  const selectedKey = selected ? idOf(selected) : null;

  // The selected result's preview and text; the others get theirs when they're selected.
  useEffect(() => {
    const digup = service.current;
    if (!selected || !digup) return;
    let current = true;
    const id = idOf(selected);
    const isCode = selected.kind === "code";
    // Only for a row the selection rests on: the helper makes two previews at a time and reads nothing else while
    // a third waits, so a preview for every row passed over would hold up the next search.
    const resting = setTimeout(() => {
      Promise.all([
        loadPreview(selected, (path, kind, loc, pixels) => digup.render(path, kind, loc, pixels)),
        hasPassage(selected) ? digup.text(selected.segmentId, isCode).catch(() => null) : Promise.resolve(null),
      ]).then(([previewUrl, text]) => {
        if (current) setLoaded({ id, previewUrl, text });
      });
    }, 120);
    return () => {
      current = false;
      clearTimeout(resting);
    };
  }, [selectedKey, restarts]);

  // Which app opens the selected recording decides whether the action says "Open at 0:06".
  useEffect(() => {
    if (!selected || momentOf(selected) === null) return;
    const extension = extname(selected.path).toLowerCase();
    if (extension in defaultApps) return;
    let current = true;
    getDefaultApplication(selected.path)
      .then((app) => app.bundleId ?? "")
      .catch(() => "")
      .then((bundleId) => {
        if (current) setDefaultApps((known) => ({ ...known, [extension]: bundleId }));
      });
    return () => {
      current = false;
    };
  }, [selectedKey]);

  async function openHit(hit: Hit) {
    try {
      const context: OpenContext = { editor, words, player };
      if (momentOf(hit) !== null) {
        context.defaultApp = await getDefaultApplication(hit.path)
          .then((app) => app.bundleId)
          .catch(() => undefined);
      }
      const page = pageOf(hit);
      if (page !== null && page > 1)
        context.pageText = await service.current?.text(hit.segmentId, false).catch(() => null);
      if (hit.kind === "code" && editor?.editor.method.type === "jetBrains") {
        context.editorExecutable = await bundleExecutable(editor.appPath);
      }
      // The window goes first: telling a player the moment can take a second or more (and, the first time, waits
      // for macOS's question about controlling it), and Raycast shouldn't sit there meanwhile.
      await closeMainWindow();
      await runOpen(planOpen(hit, context), hit.path, { open: (target, appPath) => open(target, appPath), exec });
    } catch (error) {
      // The window is closed by now, where a toast wouldn't be seen.
      await showHUD(`Could not open ${basename(hit.path)}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  const searching = state.query.text !== "";
  const wordsOnly = encoder === "unavailable" || state.phase === "wordsOnly";
  return (
    <List
      filtering={false}
      isLoading={state.loading}
      isShowingDetail={hits.length > 0}
      // The selection follows the best match. Raycast keeps it on a row that is still there, so a row picked from
      // the word matches stayed selected when the matches by meaning arrived, even as a weaker match far down the
      // list, and Return opened that. The id changes only when the best match does, so arrowing around is left alone.
      selectedItemId={hits.length > 0 ? idOf(hits[0]) : undefined}
      onSelectionChange={setSelectedId}
      searchText={typed}
      onSearchTextChange={setTyped}
      searchBarPlaceholder={PLACEHOLDER}
      searchBarAccessory={
        <List.Dropdown tooltip="File Type" value={filter} onChange={setFilter}>
          {FILTERS.filter((item) => item.value !== "code" || ready.hasCode).map((item) => (
            <List.Dropdown.Item key={item.value} title={item.title} value={item.value} />
          ))}
        </List.Dropdown>
      }
    >
      <List.EmptyView
        icon={Icon.MagnifyingGlass}
        title={!searching ? "Describe It. Dig It Up." : state.loading ? "Searching…" : "No Matches"}
        description={
          !searching
            ? `Try "a dog on the beach", "the clause about pets in the lease" or "where they talk about sleep".${
                ready.hasCode ? ' Start with "code:" to search your code.' : ""
              }`
            : state.loading
              ? undefined
              : state.query.code && !ready.hasCode
                ? "Code search is off. Turn it on in DigUp's Settings → Code, and let DigUp read your projects."
                : wordsOnly
                  ? "Only exact words were matched: meaning search is off. Open DigUp to finish setting it up."
                  : "Try describing it another way, or check in DigUp that its folder has been indexed."
        }
        actions={
          <ActionPanel>
            <Action title="Open DigUp" icon={Icon.AppWindow} onAction={() => open(ready.appPath)} />
          </ActionPanel>
        }
      />
      {sections(hits, state.reply?.strong ?? 0).map((section) => (
        <List.Section key={section.title} title={section.title} subtitle={String(section.hits.length)}>
          {section.hits.map((hit) => {
            const id = idOf(hit);
            const place = placeOf(hit);
            const mine = loaded?.id === id ? loaded : null;
            return (
              <List.Item
                key={id}
                id={id}
                title={basename(hit.path)}
                icon={{ fileIcon: hit.path }}
                accessories={place ? [{ tag: place }] : undefined}
                quickLook={{ path: hit.path, name: basename(hit.path) }}
                detail={
                  <List.Item.Detail
                    markdown={detailMarkdown({ hit, previewUrl: mine?.previewUrl, text: mine?.text, words })}
                    metadata={
                      <List.Item.Detail.Metadata>
                        {metadataRows(hit, HOME).map((row) => (
                          <List.Item.Detail.Metadata.Label key={row.title} title={row.title} text={row.text} />
                        ))}
                      </List.Item.Detail.Metadata>
                    }
                  />
                }
                actions={
                  <ActionPanel>
                    <ActionPanel.Section>
                      <Action
                        title={openTitle(hit, {
                          editor,
                          player,
                          defaultApp: defaultApps[extname(hit.path).toLowerCase()],
                        })}
                        icon={hit.kind === "code" ? Icon.Code : momentOf(hit) !== null ? Icon.Play : Icon.Document}
                        onAction={() => openHit(hit)}
                      />
                      {/* Second, so it gets ⌘↩: where Finder-like lists, and DigUp's own panel, reveal a file. */}
                      <Action.ShowInFinder path={hit.path} />
                      <Action.ToggleQuickLook shortcut={Keyboard.Shortcut.Common.ToggleQuickLook} />
                      <Action.OpenWith path={hit.path} shortcut={Keyboard.Shortcut.Common.OpenWith} />
                    </ActionPanel.Section>
                    <ActionPanel.Section>
                      <Action.CopyToClipboard
                        title="Copy File"
                        content={{ file: hit.path }}
                        shortcut={Keyboard.Shortcut.Common.Copy}
                      />
                      <Action.CopyToClipboard
                        title="Copy Path"
                        content={hit.path}
                        shortcut={Keyboard.Shortcut.Common.CopyPath}
                      />
                    </ActionPanel.Section>
                    <ActionPanel.Section>
                      <Action title="Open DigUp" icon={Icon.AppWindow} onAction={() => open(ready.appPath)} />
                    </ActionPanel.Section>
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      ))}
    </List>
  );
}
