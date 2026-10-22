import {
  Action,
  ActionPanel,
  Alert,
  Color,
  confirmAlert,
  Detail,
  Icon,
  Keyboard,
  List,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { existsSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import {
  type ActionId,
  actionsFor,
  type BrowseView,
  BUILT_IN_STRATEGIES,
  canPin,
  itemId,
  type ItemType,
  newMenuOrder,
  type NewType,
} from "../lib/actions";
import { resolveInput, shared } from "../lib/input";
import {
  CONTEXTS_DIR,
  loadContexts,
  loadModelRows,
  loadPatterns,
  loadProfiles,
  loadSessions,
  loadStrategies,
  orEmpty,
  readStrategy,
  readSystemPrompt,
  readText,
  SESSIONS_DIR,
  STRATEGIES_DIR,
} from "../lib/loaders";
import { classifyFailure, stateFor } from "../lib/states";
import type { ModelRow } from "../lib/models";
import { orderItems, type Usage } from "../lib/store";
import { deleteOwnFile, deletePattern, duplicatePattern, listMyPatterns } from "../lib/writers";
import { listWorkflows, stepsLabel } from "../lib/workflow";
import { ConfigureRun, recheckChain } from "./configure";
import { errorText, PATTERNS_ROOT, PROFILES_DIR, WORKFLOWS_DIR } from "./deliver";
import { EditPattern } from "./edit-pattern";
import { EditChain, EditContext, EditProfile, EditStrategy, RenameSession, ViewSession } from "./editors";
import { raycastReaders } from "./input-source";
import { countRun, forgetItem, modelPinFor, prefs, usageStore } from "./storage";
import { OpenInEditor } from "./open-in-editor";
import { modelSections, PinModel } from "./pin-model";
import { downloadPatterns, StateList } from "./states";

/** Models are not a fabric object the user edits, so they are a Browse view only (lib/actions.ts never sees one). */
type View = BrowseView | "model";

const TITLES: Record<View, string> = {
  pattern: "Patterns",
  mine: "Custom Patterns",
  strategy: "Strategies",
  context: "Contexts",
  session: "Sessions",
  profile: "Configs",
  workflow: "Chains",
  model: "Models",
};

interface Item {
  id: string;
  name: string;
  type: ItemType;
  own: boolean;
  subtitle?: string;
  /** Own pattern that `fabric -l` doesn't list. */
  hidden?: boolean;
  /** A chain that can't run, and why; it can still be edited, opened or deleted. */
  refused?: string;
  /** A chain's own file: a refused foo.yaml is not foo.json. */
  path?: string;
}

export default function Command() {
  const p = prefs();
  const { push } = useNavigation();
  const store = useMemo(usageStore, []);
  // Read on each action, never cached: a reopened command keeps its first render.
  const readInput = useMemo(() => shared(() => resolveInput(raycastReaders)), []);
  const [view, setView] = useState<View>("pattern");
  const [usage, setUsage] = useState<Usage>({ pins: [], counts: {} });
  // The row Raycast has selected, mirrored without a re-render (an arrow key would otherwise rebuild
  // every row), so selectedItemId always names it and only an editor's save moves it.
  const selected = useRef<string | undefined>(undefined);
  /** A row an editor just saved, and the views it may show in, until a re-list holds it. */
  const [toSelect, setToSelect] = useState<string>();
  // Controlled only so a save can clear it: a leftover search hid the row just saved (manual test, 2026-10-20).
  const [search, setSearch] = useState("");
  /** Bumped on each view change and re-list, to re-read the lists kept in our own files; see `data`. */
  const [diskReads, setDiskReads] = useState(0);

  useEffect(() => {
    store.load().then(setUsage);
  }, []);

  const {
    data: loaded,
    isLoading,
    error,
    revalidate,
  } = usePromise(
    async () => {
      // The pattern list is the one load allowed to fail: its error picks the state shown (as in Search).
      const [patterns, strategies, contexts, sessions] = await Promise.all([
        loadPatterns(p.fabricPath, { myPatternsDir: p.myPatternsFolder }),
        orEmpty(loadStrategies(p.fabricPath)),
        orEmpty(loadContexts(p.fabricPath)),
        orEmpty(loadSessions(p.fabricPath)),
      ]);
      const fabricNames = new Set(patterns.map((x) => x.name));
      const lists: Record<Exclude<BrowseView, "workflow">, Item[]> = {
        pattern: patterns.map((x) => ({
          id: itemId("pattern", x.name),
          name: x.name,
          type: "pattern",
          own: x.own,
          subtitle: x.description,
        })),
        mine: listMyPatterns(p.myPatternsFolder).map((name) => ({
          id: itemId("pattern", name),
          name,
          type: "pattern",
          own: true,
          hidden: !fabricNames.has(name),
        })),
        strategy: strategies.map((name) => ({
          id: itemId("strategy", name),
          name,
          type: "strategy",
          own: !BUILT_IN_STRATEGIES.has(name),
          subtitle: readStrategy(name)?.description,
        })),
        context: contexts.map((name) => ({ id: itemId("context", name), name, type: "context", own: true })),
        session: sessions.map((s) => ({
          id: itemId("session", s.name),
          name: s.name,
          type: "session",
          own: true,
          subtitle: s.messages === undefined ? undefined : `${s.messages} messages`,
        })),
        profile: loadProfiles(PROFILES_DIR).map((x) => ({
          id: itemId("profile", x.name),
          name: x.name,
          type: "profile",
          own: true,
          subtitle: x.model,
        })),
      };
      return lists;
    },
    [],
    { onError: () => undefined },
  );
  // Chains are our own files, a readdir away, so they are re-read on every view change and re-list: a
  // chain edited in a text editor shows on the next visit (manual test, 2026-10-20). fabric's lists load once.
  const data = useMemo((): Record<BrowseView, Item[]> | undefined => {
    if (!loaded) return undefined;
    const workflow = listWorkflows(WORKFLOWS_DIR, new Set(loaded.pattern.map((x) => x.name))).map((c): Item => ({
      id: itemId("workflow", c.name),
      name: c.name,
      type: "workflow",
      own: true,
      subtitle: c.ok ? stepsLabel(c.workflow) : c.reason,
      refused: c.ok ? undefined : c.reason,
      path: c.path,
    }));
    return { ...loaded, workflow };
  }, [loaded, diskReads]);
  const showView = (v: View) => {
    setView(v);
    setDiskReads((n) => n + 1);
  };
  /** Every list, fabric's and our files'. */
  const relist = () => {
    revalidate();
    setDiskReads((n) => n + 1);
  };
  // After an editor saves: re-list, and re-read pins (a rename moves its pin).
  const refresh = () => {
    relist();
    store.load().then(setUsage);
  };
  /** onSaved for an editor of `type`: re-list, then select the saved row once the re-list holds it. */
  const savedAs = (type: ItemType) => (name: string) => {
    refresh();
    setSearch("");
    setToSelect(itemId(type, name));
  };
  useEffect(() => {
    if (!toSelect) return;
    // An id carries its type, so only that type's views can hold it: the current view first, then
    // Custom Patterns (a pattern fabric doesn't list yet), then any other.
    const home = ([view, "mine", ...Object.keys(TITLES)] as View[]).find(
      (v) => v !== "model" && data?.[v].some((x) => x.id === toSelect),
    );
    if (!home) return;
    selected.current = toSelect;
    setView(home);
    setToSelect(undefined);
  }, [data, toSelect, view]);

  // `fabric -L` takes 0.3–1 s (it asks each vendor), so models load the first time Models is shown,
  // never on open. Pin Model… reuses them once loaded.
  const [models, setModels] = useState<ModelRow[]>();
  useEffect(() => {
    if (view === "model" && !models) orEmpty(loadModelRows(p.fabricPath)).then(setModels);
  }, [view]);

  const items = (view !== "model" && data?.[view]) || [];
  const patternDir = (it: Item) => (it.own ? join(p.myPatternsFolder, it.name) : join(PATTERNS_ROOT, it.name));

  /** The one file behind a non-pattern item. */
  const fileOf = (it: Item): string => {
    switch (it.type) {
      case "strategy":
        return join(STRATEGIES_DIR, `${it.name}.json`);
      case "context":
        return join(CONTEXTS_DIR, it.name);
      case "session":
        return join(SESSIONS_DIR, `${it.name}.json`);
      case "profile":
        return join(PROFILES_DIR, `${it.name}.yaml`);
      case "workflow":
        return it.path ?? join(WORKFLOWS_DIR, `${it.name}.json`);
      case "pattern":
        return join(patternDir(it), "system.md");
    }
  };

  const fail = (title: string, e: unknown) => showToast({ style: Toast.Style.Failure, title, message: errorText(e) });

  async function continueSession(it: Item) {
    const got = await readInput();
    push(<ConfigureRun session={it.name} resolved={got} onRun={() => undefined} />);
  }

  function viewItem(it: Item) {
    if (it.type === "session") {
      // The view tracks a rename, so its actions get the session under its current name.
      const renamedTo = (name: string): Item => ({ ...it, id: itemId("session", name), name });
      push(
        <ViewSession
          name={it.name}
          onContinue={(name) => continueSession(renamedTo(name))}
          onRenamed={refresh}
          onDelete={(name) => confirmDelete(renamedTo(name))}
        />,
      );
      return;
    }
    let md: string;
    if (it.type === "pattern")
      md = readSystemPrompt(it.name, { myPatternsDir: p.myPatternsFolder }) ?? "_No system.md._";
    else if (it.type === "strategy" || it.type === "workflow") md = `\`\`\`json\n${readText(fileOf(it)) ?? ""}\n\`\`\``;
    else if (it.type === "profile") md = `\`\`\`yaml\n${readText(fileOf(it)) ?? ""}\n\`\`\``;
    else md = readText(fileOf(it)) ?? "_Empty._";
    push(<Detail navigationTitle={it.name} markdown={md} />);
  }

  async function run(it: Item) {
    if (it.type === "workflow") {
      const chain = recheckChain(fileOf(it), new Set(data?.pattern.map((x) => x.name)));
      if (!chain) return;
      const got = await readInput();
      return push(
        <ConfigureRun
          workflow={{ name: it.name, path: fileOf(it), steps: chain.steps }}
          resolved={got}
          onRun={() => countRun(store, it.id, setUsage)}
        />,
      );
    }
    const [got, pinned] = await Promise.all([readInput(), modelPinFor(it.name)]);
    push(
      <ConfigureRun pattern={it.name} pinned={pinned} resolved={got} onRun={() => countRun(store, it.id, setUsage)} />,
    );
  }

  function duplicate(it: Item) {
    if (it.type === "strategy") return push(<EditStrategy copyOf={it.name} onSaved={savedAs("strategy")} />);
    try {
      const copy = duplicatePattern(patternDir(it), p.myPatternsFolder, it.name, PATTERNS_ROOT);
      relist();
      push(<EditPattern name={copy} copiedFrom={it.name} onSaved={savedAs("pattern")} />);
    } catch (e) {
      fail("Couldn't duplicate", e);
    }
  }

  function edit(it: Item) {
    const editors: Record<ItemType, ReactNode> = {
      pattern: <EditPattern name={it.name} onSaved={savedAs("pattern")} />,
      strategy: <EditStrategy name={it.name} onSaved={savedAs("strategy")} />,
      context: <EditContext name={it.name} onSaved={savedAs("context")} />,
      profile: <EditProfile name={it.name} onSaved={savedAs("profile")} />,
      session: <RenameSession name={it.name} onSaved={savedAs("session")} />,
      workflow: <EditChain name={it.name} onSaved={savedAs("workflow")} />,
    };
    push(editors[it.type]);
  }

  // Every destructive action confirms first (ISC-37).
  /** True once it is deleted; false when the alert is cancelled or the delete fails. */
  async function confirmDelete(it: Item): Promise<boolean> {
    const ok = await confirmAlert({
      title: `Delete ${it.name}?`,
      message: "This removes it from your folder. It can't be undone.",
      primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
    });
    if (ok) return remove(it);
    return false;
  }

  async function remove(it: Item): Promise<boolean> {
    try {
      if (it.type === "pattern") deletePattern(p.myPatternsFolder, it.name, PATTERNS_ROOT);
      else {
        const file = fileOf(it);
        deleteOwnFile(dirname(file), basename(file), PATTERNS_ROOT);
      }
    } catch (e) {
      await fail("Couldn't delete", e);
      return false;
    }
    await showToast({ style: Toast.Style.Success, title: `Deleted ${it.name}` });
    relist();
    // A custom pattern can shadow a built-in of the same name; the built-in (and its pin) stays.
    const shadowed = it.type === "pattern" && data?.pattern.some((x) => x.name === it.name && !x.own);
    if (shadowed) return true;
    // The file is gone either way; a storage failure here only leaves a pin Search shows as gone
    // (unpin it by hand from the "Pinned pattern is gone" row).
    const u = await forgetItem(store, it.type, it.name);
    if (u) setUsage(u);
    return true;
  }

  const ACTION: Record<ActionId, (it: Item) => ReactNode> = {
    view: (it) => <Action key="view" title="View" icon={Icon.Eye} onAction={() => viewItem(it)} />,
    run: (it) => (
      <Action
        key="run"
        title="Configure Run"
        icon={Icon.Play}
        shortcut={{ modifiers: ["cmd"], key: "return" }}
        onAction={() => run(it)}
      />
    ),
    duplicate: (it) => (
      <Action
        key="duplicate"
        title="Duplicate to Edit"
        icon={Icon.CopyClipboard}
        shortcut={Keyboard.Shortcut.Common.Duplicate}
        onAction={() => duplicate(it)}
      />
    ),
    edit: (it) => (
      <Action
        key="edit"
        title="Edit"
        icon={Icon.Pencil}
        shortcut={Keyboard.Shortcut.Common.Edit}
        onAction={() => edit(it)}
      />
    ),
    open: (it) => <OpenInEditor key="open" target={fileOf(it)} shortcut={Keyboard.Shortcut.Common.Open} />,
    continue: (it) => (
      <Action key="continue" title="Continue" icon={Icon.Bubble} onAction={() => continueSession(it)} />
    ),
    rename: (it) => (
      <Action
        key="rename"
        title="Rename"
        icon={Icon.Pencil}
        shortcut={Keyboard.Shortcut.Common.Edit}
        onAction={() => push(<RenameSession name={it.name} onSaved={savedAs("session")} />)}
      />
    ),
    delete: (it) => (
      <Action
        key="delete"
        title="Delete"
        icon={Icon.Trash}
        style={Action.Style.Destructive}
        shortcut={Keyboard.Shortcut.Common.Remove}
        onAction={() => confirmDelete(it)}
      />
    ),
  };

  const newItems: Record<NewType, { title: string; form: () => ReactNode }> = {
    pattern: { title: "Pattern", form: () => <EditPattern onSaved={savedAs("pattern")} /> },
    strategy: { title: "Strategy", form: () => <EditStrategy onSaved={savedAs("strategy")} /> },
    context: { title: "Context", form: () => <EditContext onSaved={savedAs("context")} /> },
    profile: { title: "Config", form: () => <EditProfile onSaved={savedAs("profile")} /> },
    workflow: { title: "Chain", form: () => <EditChain onSaved={savedAs("workflow")} /> },
  };
  const newMenu = (shortcut?: Keyboard.Shortcut) => (
    <ActionPanel.Submenu title="New" icon={Icon.Plus} shortcut={shortcut}>
      {newMenuOrder(view === "model" ? "pattern" : view).map((t) => (
        <Action key={t} title={newItems[t].title} onAction={() => push(newItems[t].form())} />
      ))}
    </ActionPanel.Submenu>
  );
  // The empty view leads with a plain action for this view's type, as the chain editor's does: with the
  // submenu first, ⌘N, ⌘K and ↵ did nothing there (manual test, 2026-10-20), while the editor's ⌘N worked.
  const newHere = (newItems as Partial<Record<View, (typeof newItems)[NewType]>>)[view === "mine" ? "pattern" : view];

  const updatePatterns = (
    <Action
      title="Update Patterns"
      icon={Icon.Download}
      onAction={() => downloadPatterns(p.fabricPath, refresh, "update")}
    />
  );

  function actionsOf(it: Item) {
    // The chain editor reads and saves <name>.json, so a row refused for its file name (foo.yaml) has no Edit.
    const editable = it.type !== "workflow" || fileOf(it) === join(WORKFLOWS_DIR, `${it.name}.json`);
    return actionsFor(it.type, it.own, !!it.refused)
      .filter((a) => a.id !== "edit" || editable)
      .map((a) => ACTION[a.id](it));
  }

  const row = (it: Item) => {
    const pinned = usage.pins.includes(it.id);
    const runs = usage.counts[it.id] ?? 0;
    // Pin sits third: Raycast gives ↵ and ⌘↵ to View and Configure Run (a session's Continue).
    const [first, second, ...more] = actionsOf(it);
    const accessories: List.Item.Accessory[] = [];
    // The tack shows as in Run Fabric Pattern: an accessory, with the row's own icon kept.
    if (pinned) accessories.push({ icon: { source: Icon.Tack, tintColor: Color.Yellow }, tooltip: "Pinned" });
    if (it.hidden) accessories.push({ tag: { value: "fabric can't see it", color: Color.Orange } });
    if (it.refused) accessories.push({ tag: { value: "refused", color: Color.Orange } });
    if (runs) accessories.push({ tag: `${runs} run${runs === 1 ? "" : "s"}` });
    accessories.push({ text: it.own ? "custom" : "built-in" });
    return (
      <List.Item
        key={it.id}
        id={it.id}
        title={it.name}
        subtitle={it.subtitle}
        icon={Icon.Document}
        accessories={accessories}
        actions={
          <ActionPanel>
            <ActionPanel.Section>
              {first}
              {second}
              {canPin(it.type) && (
                <Action
                  title={pinned ? "Unpin" : "Pin"}
                  icon={pinned ? Icon.TackDisabled : Icon.Tack}
                  shortcut={Keyboard.Shortcut.Common.Pin}
                  onAction={async () => setUsage(await store.togglePin(it.id))}
                />
              )}
              {it.type === "pattern" && (
                <Action
                  title="Pin Model…"
                  icon={Icon.ComputerChip}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "m" }}
                  onAction={() => push(<PinModel pattern={it.name} rows={models} />)}
                />
              )}
              {more}
            </ActionPanel.Section>
            <ActionPanel.Section>
              {newMenu(Keyboard.Shortcut.Common.New)}
              {updatePatterns}
            </ActionPanel.Section>
          </ActionPanel>
        }
      />
    );
  };

  const sections =
    view === "model"
      ? modelSections({ rows: models ?? [] })
      : view === "pattern"
        ? (() => {
            const { pinned, used, unused: others } = orderItems(items, usage);
            return (
              <>
                <List.Section title="Pinned">{pinned.map(row)}</List.Section>
                <List.Section title="Most used">{used.map(row)}</List.Section>
                <List.Section title="All, A–Z">{others.map(row)}</List.Section>
              </>
            );
          })()
        : items.map(row);

  if (!existsSync(p.fabricPath))
    return (
      <StateList
        state={stateFor("fabric-missing", { fabricPath: p.fabricPath })}
        handlers={{ fabricPath: p.fabricPath }}
      />
    );
  if (error)
    return (
      <StateList
        state={stateFor(classifyFailure(error.message, error.message), {
          fabricPath: p.fabricPath,
          error: errorText(error),
        })}
        handlers={{
          fabricPath: p.fabricPath,
          command: `${p.fabricPath} --listpatterns`,
          error: errorText(error),
          onRetry: revalidate,
        }}
      />
    );
  if (data && data.pattern.length === 0)
    return <StateList state={stateFor("no-patterns")} handlers={{ fabricPath: p.fabricPath, onRetry: revalidate }} />;

  const noun = TITLES[view].toLowerCase();
  // Raycast shows the empty view only when no row is visible, so rows that exist were filtered out.
  const noMatch = (view === "model" ? (models?.length ?? 0) : items.length) > 0;
  const count = (v: View) => (v === "model" ? models : data?.[v])?.length ?? "…";
  return (
    <List
      isLoading={isLoading || (view === "model" && !models)}
      // Only a row this view has. After a dropdown switch to an empty view, ↵, ⌘N, ⌘K and the action
      // button were dead while reaching it by deleting the last row worked (re-check, 2026-10-20); the
      // likely cause, unconfirmed live, was the old view's row still passed here. Models has no `items`,
      // so it is left to Raycast.
      selectedItemId={items.some((x) => x.id === selected.current) ? selected.current : undefined}
      onSelectionChange={(id) => {
        selected.current = id || undefined;
      }}
      searchBarPlaceholder={`Search ${noun}…`}
      searchText={search}
      onSearchTextChange={(text) => {
        // A search can hide the selected row: drop it, as a view switch does.
        selected.current = undefined;
        setSearch(text);
      }}
      filtering
      searchBarAccessory={
        <List.Dropdown tooltip="Type" value={view} onChange={(v) => showView(v as View)}>
          {(Object.keys(TITLES) as View[]).map((v) => (
            <List.Dropdown.Item key={v} value={v} title={`${TITLES[v]} (${count(v)})`} />
          ))}
        </List.Dropdown>
      }
    >
      <List.EmptyView
        title={noMatch ? `No ${noun} match your search` : `No ${noun} yet`}
        description={
          !noMatch && view === "mine"
            ? "Press ⌘N for a blank pattern, or switch to Patterns and press ⌘D on one to copy it."
            : undefined
        }
        actions={
          <ActionPanel>
            {newHere && (
              <Action
                title={`New ${newHere.title}`}
                icon={Icon.Plus}
                shortcut={Keyboard.Shortcut.Common.New}
                onAction={() => push(newHere.form())}
              />
            )}
            {newMenu(newHere ? undefined : Keyboard.Shortcut.Common.New)}
            {updatePatterns}
          </ActionPanel>
        }
      />
      {sections}
    </List>
  );
}
