import {
  Action,
  ActionPanel,
  closeMainWindow,
  getPreferenceValues,
  Icon,
  LaunchProps,
  List,
  LocalStorage,
  showHUD,
  showToast,
  Toast,
  useNavigation,
  Keyboard,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { existsSync, readdirSync, statSync } from "node:fs";
import { basename, join } from "node:path";
import { useEffect, useRef, useState } from "react";
import { fail } from "./actions";
import { listBranches, makeWorktree } from "./git";
import { showSession, terminalFor } from "./terminal";
import {
  cleanName,
  expandHome,
  listAgents,
  listPanes,
  listSessions,
  listWorkspaces,
  startAgent,
  tildify,
} from "./tuios";

// Start Agent is three quick pickers, each opening on its most likely choice:
//   ① project  →  ② where (session and tab)  →  ③ first prompt (and agent)
// Enter moves on; ⌘Enter starts at once with the defaults for the steps left.

const LAST_SESSION = "lastSession";
const RECENT_PROMPTS = "recentPrompts";
const MAX_RECENT = 12;

/** Where the pane opens. No workspace means the tab that session is showing. */
interface Where {
  session: string;
  workspace?: number;
  label: string;
}

interface Launch {
  cwd: string;
  where: Where;
  agent: string;
  prompt?: string;
  worktreeBranch?: string;
}

const prefs = () => getPreferenceValues<Preferences>();
const defaultAgent = () => prefs().defaultAgent?.trim() || "claude";
const agentChoices = () => {
  const list = (prefs().agentChoices || "").split(",").map((a) => a.trim());
  return [...new Set([defaultAgent(), ...list].filter(Boolean))];
};

/** Folders to offer: where agents run now (most recent first), then git repos under the project folders. */
async function loadProjects(): Promise<string[]> {
  const seen = new Set<string>();
  const out: string[] = [];
  const add = (p: string) => {
    if (p && !seen.has(p) && existsSync(p)) {
      seen.add(p);
      out.push(p);
    }
  };
  try {
    const agents = await listAgents(true);
    agents.sort((a, b) => b.agent_state_at - a.agent_state_at).forEach((a) => add(a.cwd));
  } catch {
    /* tuios down: still offer the project folders */
  }
  const roots = (prefs().projectRoots || "")
    .split(",")
    .map((r) => expandHome(r.trim()))
    .filter((r) => r && existsSync(r));
  for (const root of roots) {
    for (const entry of readdirSync(root).sort()) {
      const dir = join(root, entry);
      if (!entry.startsWith(".") && existsSync(join(dir, ".git")) && statSync(dir).isDirectory()) add(dir);
    }
  }
  return out;
}

/** The session to start in when none is picked: the setting, else the last one used, else the most recent on screen. */
async function defaultSession(): Promise<string> {
  const sessions = (await listSessions()).sort((a, b) => b.last_active - a.last_active);
  const names = sessions.map((s) => s.name);
  const last = await LocalStorage.getItem<string>(LAST_SESSION);
  return (
    prefs().defaultSession?.trim() ||
    (last && names.includes(last) ? last : undefined) ||
    sessions.find((s) => s.attached)?.name ||
    names[0] ||
    "main"
  );
}

async function defaultWhere(): Promise<Where> {
  const session = await defaultSession();
  return { session, label: session };
}

async function recentPrompts(): Promise<string[]> {
  try {
    return JSON.parse((await LocalStorage.getItem<string>(RECENT_PROMPTS)) ?? "[]");
  } catch {
    return [];
  }
}

async function rememberPrompt(prompt: string) {
  const list = [prompt, ...(await recentPrompts()).filter((p) => p !== prompt)].slice(0, MAX_RECENT);
  await LocalStorage.setItem(RECENT_PROMPTS, JSON.stringify(list));
}

async function waitForSession(name: string, ms = 5000) {
  for (let t = 0; t < ms; t += 250) {
    if ((await listSessions().catch(() => [])).some((s) => s.name === name)) return;
    await new Promise((r) => setTimeout(r, 250));
  }
}

/** Start the agent, bring its terminal forward and close Raycast. */
async function launch(o: Launch) {
  const toast = await showToast({ style: Toast.Style.Animated, title: `Starting ${o.agent}…` });
  try {
    const cwd = o.worktreeBranch ? await makeWorktree(o.cwd, o.worktreeBranch) : o.cwd;
    startAgent({ session: o.where.session, workspace: o.where.workspace, cwd, agent: o.agent, prompt: o.prompt });
    await LocalStorage.setItem(LAST_SESSION, o.where.session);
    if (o.prompt) await rememberPrompt(o.prompt);
    await waitForSession(o.where.session);
    await new Promise((r) => setTimeout(r, 600)); // let the pane open and take focus
    const app = await showSession(o.where.session);
    await closeMainWindow({ clearRootSearch: true });
    await showHUD(`${o.agent} · ${basename(cwd)} → ${o.where.label} · ${app}`);
  } catch (e) {
    toast.style = Toast.Style.Failure;
    toast.title = "Could not start the agent";
    toast.message = e instanceof Error ? e.message : String(e);
  }
}

async function launchWithDefaults(cwd: string, prompt?: string) {
  await launch({ cwd, where: await defaultWhere(), agent: defaultAgent(), prompt });
}

// ① Project ------------------------------------------------------------------

export default function Command(props: LaunchProps<{ arguments: Arguments.StartAgent }>) {
  const query = props.arguments.project?.trim() ?? "";
  const argPrompt = props.arguments.prompt?.trim() || undefined;
  const { push } = useNavigation();
  const [search, setSearch] = useState(query);
  const projects = usePromise(loadProjects, [], { onError: (e) => fail("Could not list projects", e) });

  // From root search: "Start Agent  api" opens ② for api; "Start Agent  api  fix the tests" starts at once.
  const tried = useRef(false);
  useEffect(() => {
    if (!query || !projects.data || tried.current) return;
    tried.current = true;
    const q = query.toLowerCase();
    const hits = projects.data.filter((p) => basename(p).toLowerCase().includes(q));
    const exact = hits.filter((p) => basename(p).toLowerCase() === q);
    const pick = exact.length === 1 ? exact[0] : hits.length === 1 ? hits[0] : undefined;
    if (!pick) return;
    if (argPrompt) launchWithDefaults(pick, argPrompt);
    else push(<WhereStep cwd={pick} />);
  }, [projects.data]);

  // A typed path that exists is offered as a project too.
  const typed = expandHome(search.trim());
  const typedDir =
    /^[~/]/.test(search.trim()) && existsSync(typed) && statSync(typed).isDirectory() ? typed : undefined;
  const items = [...(typedDir ? [typedDir] : []), ...(projects.data ?? []).filter((p) => p !== typedDir)];

  return (
    <List
      isLoading={projects.isLoading}
      searchText={search}
      onSearchTextChange={setSearch}
      navigationTitle="Start Agent · Project"
      searchBarPlaceholder="Pick a project, or type a folder path…"
    >
      <List.EmptyView
        icon={Icon.Folder}
        title="No project matches"
        description="Type a full folder path (~/code/app), or add project folders in the extension settings."
      />
      {items.map((p) => (
        <List.Item
          key={p}
          icon={p === typedDir ? Icon.NewFolder : Icon.Folder}
          title={basename(p)}
          subtitle={tildify(p)}
          keywords={[p]}
          actions={
            <ActionPanel>
              <Action.Push
                title="Choose Where…"
                icon={Icon.ArrowRight}
                target={<WhereStep cwd={p} prompt={argPrompt} />}
              />
              <Action
                title={`Start ${defaultAgent()} Now`}
                icon={Icon.Play}
                onAction={() => launchWithDefaults(p, argPrompt)}
              />
              <Action.ShowInFinder path={p} shortcut={Keyboard.Shortcut.Common.Open} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

// ② Where: session and tab -----------------------------------------------------

interface TabRow {
  where: Where;
  title: string;
  panes: string[];
  current: boolean;
  isNew: boolean;
}

interface SessionBlock {
  name: string;
  app?: string;
  rows: TabRow[];
}

async function loadWhere(): Promise<{ blocks: SessionBlock[]; preferred: string }> {
  const [sessions, panes, preferred] = await Promise.all([listSessions(), listPanes(), defaultSession()]);
  sessions.sort((a, b) => (a.name === preferred ? -1 : b.name === preferred ? 1 : b.last_active - a.last_active));
  const blocks = await Promise.all(
    sessions.map(async (s) => {
      const [all, app] = await Promise.all([
        listWorkspaces(s.name).catch(() => []),
        terminalFor(s.name)
          .then((t) => t?.app)
          .catch(() => undefined),
      ]);
      // tuios lists empty tabs too; offer the ones with panes, and the one on screen.
      const workspaces = all.filter((w) => w.window_count > 0 || w.current);
      // The tab on screen first: that is where you are looking.
      workspaces.sort((a, b) => Number(b.current) - Number(a.current) || a.workspace - b.workspace);
      const rows: TabRow[] = workspaces.map((w) => {
        const tab = w.name || `Tab ${w.workspace}`;
        return {
          where: { session: s.name, workspace: w.workspace, label: `${s.name} · ${tab}` },
          title: tab,
          panes: panes
            .filter((p) => p.session === s.name && p.workspace === w.workspace)
            .map((p) => cleanName(p.name || p.title || p.command)),
          current: w.current,
          isNew: false,
        };
      });
      const used = new Set(all.filter((w) => w.window_count > 0).map((w) => w.workspace));
      const free = Array.from({ length: 9 }, (_, i) => i + 1).find((n) => !used.has(n)) ?? Math.max(0, ...used) + 1;
      rows.push({
        where: { session: s.name, workspace: free, label: `${s.name} · new tab ${free}` },
        title: "New tab",
        panes: [],
        current: false,
        isNew: true,
      });
      return { name: s.name, app, rows };
    }),
  );
  return { blocks, preferred };
}

function WhereStep(props: { cwd: string; prompt?: string }) {
  const [search, setSearch] = useState("");
  const where = usePromise(loadWhere, [], { onError: (e) => fail("tuios is not answering", e) });
  const project = basename(props.cwd);
  const newName = search.trim();

  const next = (w: Where) => (
    <ActionPanel>
      <Action.Push
        title="Choose Prompt…"
        icon={Icon.ArrowRight}
        target={<PromptStep cwd={props.cwd} where={w} prompt={props.prompt} />}
      />
      <Action
        title={`Start ${defaultAgent()} Now`}
        icon={Icon.Play}
        onAction={() => launch({ cwd: props.cwd, where: w, agent: defaultAgent(), prompt: props.prompt })}
      />
    </ActionPanel>
  );

  return (
    <List
      isLoading={where.isLoading}
      searchText={search}
      onSearchTextChange={setSearch}
      navigationTitle={`Start Agent · ${project} · Where`}
      searchBarPlaceholder="Pick a session and tab, or type a new session name…"
    >
      {(where.data?.blocks ?? []).map((b) => (
        <List.Section
          key={b.name}
          title={b.name}
          subtitle={`${b.app ?? "not open in a terminal"}${b.name === where.data?.preferred ? " · default" : ""}`}
        >
          {b.rows.map((r) => (
            <List.Item
              key={`${b.name}:${r.where.workspace}`}
              icon={r.isNew ? Icon.Plus : r.current ? Icon.Eye : Icon.AppWindow}
              title={r.title}
              subtitle={r.panes.join(", ")}
              keywords={[b.name, ...r.panes]}
              accessories={[
                ...(r.current ? [{ tag: "on screen" }] : []),
                ...(r.isNew ? [] : [{ text: `${r.panes.length} pane${r.panes.length === 1 ? "" : "s"}` }]),
              ]}
              actions={next(r.where)}
            />
          ))}
        </List.Section>
      ))}
      {newName && !where.data?.blocks.some((b) => b.name === newName) && (
        <List.Section title="New session">
          <List.Item
            icon={Icon.PlusCircle}
            title={`New session "${newName}"`}
            subtitle="Opens in your detached-session terminal"
            actions={next({ session: newName, label: newName })}
          />
        </List.Section>
      )}
    </List>
  );
}

// ③ Prompt and agent -------------------------------------------------------------

function PromptStep(props: { cwd: string; where: Where; prompt?: string }) {
  const [text, setText] = useState(props.prompt ?? "");
  const [agent, setAgent] = useState(defaultAgent());
  const recent = usePromise(recentPrompts);
  const typed = text.trim();
  const go = (prompt?: string, worktreeBranch?: string) =>
    launch({ cwd: props.cwd, where: props.where, agent, prompt, worktreeBranch });

  const actions = (prompt?: string) => (
    <ActionPanel>
      <Action
        title={prompt ? "Start with This Prompt" : "Start Without a Prompt"}
        icon={Icon.Play}
        onAction={() => go(prompt)}
      />
      <Action.Push
        title="Start in a New Worktree…"
        icon={Icon.Tree}
        shortcut={{ modifiers: ["cmd"], key: "b" }}
        target={<WorktreeStep cwd={props.cwd} where={props.where} agent={agent} prompt={prompt} />}
      />
      {prompt && prompt !== typed && (
        <Action
          title="Edit This Prompt"
          icon={Icon.Pencil}
          shortcut={Keyboard.Shortcut.Common.Edit}
          onAction={() => setText(prompt)}
        />
      )}
    </ActionPanel>
  );

  const matching = (recent.data ?? []).filter((p) => !typed || p.toLowerCase().includes(typed.toLowerCase()));

  return (
    <List
      isLoading={recent.isLoading}
      filtering={false}
      searchText={text}
      onSearchTextChange={setText}
      navigationTitle={`Start Agent · ${basename(props.cwd)} → ${props.where.label}`}
      searchBarPlaceholder="Type the first prompt, or press Enter to start without one…"
      searchBarAccessory={
        <List.Dropdown tooltip="Agent" defaultValue={defaultAgent()} onChange={setAgent} storeValue>
          {agentChoices().map((a) => (
            <List.Dropdown.Item key={a} title={a} value={a} />
          ))}
        </List.Dropdown>
      }
    >
      {typed ? (
        <List.Item icon={Icon.Play} title={typed} subtitle={`Start ${agent} with this`} actions={actions(typed)} />
      ) : (
        <List.Item icon={Icon.Play} title="Start without a prompt" subtitle={agent} actions={actions()} />
      )}
      {matching.length > 0 && (
        <List.Section title="Recent prompts">
          {matching.map((p) => (
            <List.Item key={p} icon={Icon.Clock} title={p} actions={actions(p)} />
          ))}
        </List.Section>
      )}
      {typed && (
        <List.Section title="Or">
          <List.Item icon={Icon.Play} title="Start without a prompt" subtitle={agent} actions={actions()} />
        </List.Section>
      )}
    </List>
  );
}

// Worktree: branch ------------------------------------------------------------------

function WorktreeStep(props: { cwd: string; where: Where; agent: string; prompt?: string }) {
  const [branch, setBranch] = useState("");
  const branches = usePromise(listBranches, [props.cwd]);
  const typed = branch.trim();
  const go = (b: string) =>
    launch({ cwd: props.cwd, where: props.where, agent: props.agent, prompt: props.prompt, worktreeBranch: b });
  const existing = (branches.data ?? []).filter((b) => !typed || b.toLowerCase().includes(typed.toLowerCase()));
  const repo = basename(props.cwd);

  return (
    <List
      isLoading={branches.isLoading}
      filtering={false}
      searchText={branch}
      onSearchTextChange={setBranch}
      navigationTitle={`Start Agent · ${repo} · Worktree`}
      searchBarPlaceholder="New branch name (feat/retry), or pick an existing branch…"
    >
      {typed && !(branches.data ?? []).includes(typed) && (
        <List.Item
          icon={Icon.Plus}
          title={`New branch "${typed}"`}
          subtitle={`Checkout at ../${repo}-${typed.replace(/[^\w.-]+/g, "-")}`}
          actions={
            <ActionPanel>
              <Action title="Create Worktree and Start" icon={Icon.Play} onAction={() => go(typed)} />
            </ActionPanel>
          }
        />
      )}
      {existing.length > 0 && (
        <List.Section title="Existing branches">
          {existing.map((b) => (
            <List.Item
              key={b}
              icon={Icon.Tree}
              title={b}
              actions={
                <ActionPanel>
                  <Action title="Use in a Worktree and Start" icon={Icon.Play} onAction={() => go(b)} />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}
      <List.EmptyView
        icon={Icon.Tree}
        title={branches.data?.length === 0 && !typed ? "Not a git repository, or no branches" : "Type a branch name"}
        description="The worktree is made next to the repo and reused if it already exists."
      />
    </List>
  );
}
