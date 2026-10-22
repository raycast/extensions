import { Action, ActionPanel, Color, Icon, Keyboard, List, showToast, Toast, useNavigation } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { type ReactElement, useEffect, useMemo, useState } from "react";
import type { Input, RunSpec } from "../lib/argv";
import {
  itemId,
  type PatternActionId,
  searchActionsFor,
  type SessionActionId,
  type WorkflowActionId,
} from "../lib/actions";
import { classifyFile, classifyText, isLong } from "../lib/classify";
import { type Resolved, resolveInput, shared, sourceLabel } from "../lib/input";
import { loadPatterns, loadSessions, type PatternItem, readSystemPrompt, type SessionItem } from "../lib/loaders";
import { OUTPUT_LABEL } from "../lib/output";
import { classifyFailure, stateFor } from "../lib/states";
import { missingPins, orderItems, type Usage } from "../lib/store";
import { StateList } from "./states";
import { existsSync } from "node:fs";
import { ConfigureRun, recheckChain } from "./configure";
import { raycastReaders } from "./input-source";
import { startRun } from "./start-run";
import type { ModelPins } from "../lib/models";
import { countRun, modelPinFor, modelStore, prefs, systemPromptFor, usageStore } from "./storage";
import { errorText, shownText, WORKFLOWS_DIR } from "./deliver";
import { listWorkflows, unionVariables, type Workflow, type WorkflowItem } from "../lib/workflow";

// Distinct, uncommon words from the description, so a query can match on meaning.
const COMMON = new Set([
  "about",
  "based",
  "content",
  "create",
  "from",
  "given",
  "into",
  "their",
  "these",
  "using",
  "with",
]);
function keywords(description?: string): string[] {
  const words = (description ?? "").toLowerCase().match(/[a-z]{5,}/g) ?? [];
  return [...new Set(words.filter((w) => !COMMON.has(w)))].slice(0, 8);
}

type Entry =
  | { id: string; name: string; kind: "pattern"; pattern: PatternItem }
  | { id: string; name: string; kind: "session"; session: SessionItem }
  | { id: string; name: string; kind: "workflow"; chain: WorkflowItem };
type Runnable = Entry & { kind: "pattern" | "workflow" };

export default function Command() {
  const p = prefs();
  const store = useMemo(usageStore, []);
  const [usage, setUsage] = useState<Usage>({ pins: [], counts: {} });
  // For the row tags only; a run reads its pin fresh (modelPinFor).
  const [modelPins, setModelPins] = useState<ModelPins>({});
  const [selected, setSelected] = useState<string | null>(null);
  const [input, setInput] = useState<Resolved>();
  // Read fresh on every action: Raycast reopens a still-open command without re-rendering it,
  // so anything cached at mount (the selection, the preferences) would be the first launch's.
  const read = useMemo(() => shared(() => resolveInput(raycastReaders)), []);
  const readInput = async () => {
    const got = await read();
    setInput(got);
    return got;
  };
  const { push } = useNavigation();

  useEffect(() => {
    store.load().then(setUsage);
    modelStore()
      .load()
      .then(setModelPins, () => undefined);
    readInput();
  }, []);

  const { data, isLoading, error, revalidate } = usePromise(
    async () => {
      const [patterns, sessions] = await Promise.all([
        loadPatterns(p.fabricPath, { myPatternsDir: p.myPatternsFolder }),
        loadSessions(p.fabricPath),
      ]);
      return { patterns, sessions };
    },
    [],
    { onError: () => undefined },
  );

  const installed = useMemo(() => new Set((data?.patterns ?? []).map((pt) => pt.name)), [data]);
  // Read from the folder whenever the pattern list lands: a chain is checked against what fabric lists.
  const chains = useMemo(() => (data ? listWorkflows(WORKFLOWS_DIR, installed) : []), [installed]);
  const entries: Entry[] = useMemo(
    () => [
      ...(data?.patterns ?? []).map((pt) => ({
        id: itemId("pattern", pt.name),
        name: pt.name,
        kind: "pattern" as const,
        pattern: pt,
      })),
      ...(data?.sessions ?? []).map((s) => ({
        id: itemId("session", s.name),
        name: s.name,
        kind: "session" as const,
        session: s,
      })),
      ...chains.map((c) => ({ id: itemId("workflow", c.name), name: c.name, kind: "workflow" as const, chain: c })),
    ],
    [data, chains],
  );
  const { pinned, used, others, sessions, workflows } = useMemo(() => {
    const o = orderItems(entries, usage);
    return {
      pinned: o.pinned,
      used: o.used.filter((e) => e.kind === "pattern"),
      others: o.unused.filter((e) => e.kind === "pattern"),
      sessions: o.rest.filter((e) => e.kind === "session"),
      workflows: o.rest.filter((e) => e.kind === "workflow"),
    };
  }, [entries, usage]);

  const togglePin = async (e: Entry) => setUsage(await store.togglePin(e.id));
  const quickRun = async (e: Runnable) => {
    let workflow: RunSpec["workflow"];
    if (e.kind === "workflow") {
      const chain = recheckChain(e.chain.path, installed);
      if (!chain) return;
      // fabric refuses a run with a variable unset, so a chain that needs any opens the form.
      if (unionVariables(chain.steps, systemPromptFor).length) return configure(e, chain);
      workflow = { name: e.name, path: e.chain.path, steps: chain.steps };
    }
    const [got, pin] = await Promise.all([readInput(), e.kind === "pattern" ? modelPinFor(e.name) : undefined]);
    if (got.source === "none") {
      const st = stateFor("nothing-selected");
      return showToast({
        style: Toast.Style.Failure,
        title: st.title,
        message: st.description && shownText(st.description),
        primaryAction: { title: "Configure Run", onAction: () => configure(e) },
      });
    }
    let runInput: Input;
    try {
      runInput = got.source === "finder" ? classifyFile(got.paths[0]) : classifyText(got.text);
    } catch (err) {
      return showToast({
        style: Toast.Style.Failure,
        title: "Can't run on that file",
        message: errorText(err),
      });
    }
    if (got.source === "finder" && got.paths.length > 1)
      await showToast({
        style: Toast.Style.Success,
        title: `Running on the first of ${got.paths.length} files`,
        message: got.paths[0].split("/").pop(),
      });
    await startRun(
      push,
      {
        fabricPath: p.fabricPath,
        spec: workflow
          ? { workflow, input: runInput }
          : { pattern: e.name, input: runInput, model: pin?.model, vendor: pin?.vendor },
        inputLabel: sourceLabel(got),
        output: p.defaultOutput,
        target: got.app,
        background: isLong(runInput) && p.longInputs === "background",
        outputFolder: p.outputFolder,
      },
      () => countRun(store, e.id, setUsage),
    );
  };
  const configure = async (e: Runnable, checked?: Workflow) => {
    const onRun = () => countRun(store, e.id, setUsage);
    if (e.kind === "workflow") {
      const chain = checked ?? recheckChain(e.chain.path, installed);
      if (!chain) return;
      const got = await readInput();
      return push(
        <ConfigureRun
          workflow={{ name: e.name, path: e.chain.path, steps: chain.steps }}
          resolved={got}
          onRun={onRun}
        />,
      );
    }
    const [got, pinned] = await Promise.all([readInput(), modelPinFor(e.name)]);
    push(<ConfigureRun pattern={e.name} pinned={pinned} resolved={got} onRun={onRun} />);
  };
  const continueSession = async (name: string) => {
    const got = await readInput();
    push(<ConfigureRun session={name} resolved={got} onRun={() => undefined} />);
  };

  const item = (e: Entry) => {
    const isPinned = usage.pins.includes(e.id);
    const runs = usage.counts[e.id] ?? 0;
    const accessories: List.Item.Accessory[] = [];
    if (isPinned) accessories.push({ icon: { source: Icon.Tack, tintColor: Color.Yellow }, tooltip: "Pinned" });
    const pinnedModel = e.kind === "pattern" ? modelPins[e.name] : undefined;
    if (pinnedModel)
      accessories.push({
        tag: { value: pinnedModel.model, color: Color.Blue },
        tooltip: `Pinned model (${pinnedModel.vendor}); ↵ runs on it`,
      });
    if (e.kind !== "session" && runs > 0) accessories.push({ tag: `${runs} run${runs === 1 ? "" : "s"}` });
    if (e.kind === "session" && e.session.messages !== undefined)
      accessories.push({ tag: `${e.session.messages} messages` });
    const pin = (
      <Action
        key="pin"
        title={isPinned ? "Unpin" : "Pin"}
        icon={isPinned ? Icon.TackDisabled : Icon.Tack}
        shortcut={Keyboard.Shortcut.Common.Pin}
        onAction={() => togglePin(e)}
      />
    );
    const copyName = (
      <Action.CopyToClipboard
        key="copyName"
        title="Copy Name"
        content={e.name}
        shortcut={Keyboard.Shortcut.Common.CopyName}
      />
    );
    // Rendered in searchActionsFor's order (lib/actions.ts), which keeps Pin out of ⌘↵'s slot. Each
    // kind's record covers exactly its table's ids, so every listed id renders an action.
    const configureAction = (onAction: () => void) => (
      <Action
        key="configure"
        title="Configure Run"
        icon={Icon.Gear}
        shortcut={{ modifiers: ["cmd"], key: "return" }}
        onAction={onAction}
      />
    );
    const actions =
      e.kind === "workflow"
        ? e.chain.ok
          ? searchActionsFor("workflow").map(
              (id) =>
                (
                  ({
                    run: <Action key="run" title="Run Chain" icon={Icon.Play} onAction={() => quickRun(e)} />,
                    configure: configureAction(() => configure(e)),
                    pin,
                    copyName,
                  }) satisfies Record<WorkflowActionId, ReactElement>
                )[id],
            )
          : // A refused chain never runs: fix it in Manage Fabric › Chains.
            [copyName, pin]
        : e.kind === "pattern"
          ? searchActionsFor("pattern").map(
              (id) =>
                (
                  ({
                    // A fixed ↵ title that names no source: a reopened command keeps its last read, so a
                    // source in the title could name an input the run won't use (review, 2026-10-18), and
                    // the run may fall back to the clipboard. The run reads fresh.
                    run: <Action key="run" title="Run Pattern" icon={Icon.Play} onAction={() => quickRun(e)} />,
                    configure: configureAction(() => configure(e)),
                    pin,
                    copyName,
                  }) satisfies Record<PatternActionId, ReactElement>
                )[id],
            )
          : searchActionsFor("session").map(
              (id) =>
                (
                  ({
                    continue: (
                      <Action
                        key="continue"
                        title="Continue Session"
                        icon={Icon.Bubble}
                        onAction={() => continueSession(e.name)}
                      />
                    ),
                    pin,
                    copyName,
                  }) satisfies Record<SessionActionId, ReactElement>
                )[id],
            );

    return (
      <List.Item
        key={e.id}
        id={e.id}
        title={e.name}
        // No step count on the row: beside the detail panel the row is narrow, and as a tag or a subtitle it
        // cut the run tag off (manual tests, 2026-10-20). The detail panel lists the steps.
        subtitle={e.kind === "workflow" && !e.chain.ok ? e.chain.reason : undefined}
        icon={iconOf(e)}
        keywords={e.kind === "pattern" ? keywords(e.pattern.description) : []}
        accessories={accessories}
        detail={
          selected === e.id ? (
            <Detail
              entry={e}
              output={OUTPUT_LABEL[p.defaultOutput]}
              myDir={p.myPatternsFolder}
              input={input && sourceLabel(input)}
            />
          ) : undefined
        }
        actions={<ActionPanel>{actions}</ActionPanel>}
      />
    );
  };

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
        handlers={{ fabricPath: p.fabricPath, command: `${p.fabricPath} --listpatterns`, error: errorText(error) }}
      />
    );
  if (data && data.patterns.length === 0)
    return <StateList state={stateFor("no-patterns")} handlers={{ fabricPath: p.fabricPath, onRetry: revalidate }} />;

  const gone = [
    ...missingPins(entries, usage).map((id) => [id, "pinned-gone"] as const),
    ...missingPins(entries, usage, "workflow:").map((id) => [id, "pinned-chain-gone"] as const),
  ].map(([id, state]) => {
    const name = id.slice(id.indexOf(":") + 1);
    const st = stateFor(state, { pattern: name });
    return (
      <List.Item
        key={id}
        id={id}
        title={name}
        subtitle={st.title}
        icon={{ source: Icon.Warning, tintColor: Color.Orange }}
        detail={<List.Item.Detail markdown={`## ${st.title}\n\n${shownText(st.description ?? "")}`} />}
        actions={
          <ActionPanel>
            <Action
              title="Unpin"
              icon={Icon.TackDisabled}
              shortcut={Keyboard.Shortcut.Common.Pin}
              onAction={async () => setUsage(await store.togglePin(id))}
            />
          </ActionPanel>
        }
      />
    );
  });

  return (
    <List
      isLoading={isLoading}
      isShowingDetail
      filtering={{ keepSectionOrder: false }}
      searchBarPlaceholder="Search patterns, chains and sessions…"
      onSelectionChange={setSelected}
    >
      <List.Section title="Pinned">
        {pinned.map(item)}
        {gone}
      </List.Section>
      <List.Section title="Patterns · most used">{used.map(item)}</List.Section>
      {/* Sessions sit above the long A–Z list so they are never buried under 255 patterns. */}
      <List.Section title="Sessions · ↵ continues">{sessions.map(item)}</List.Section>
      <List.Section title="Chains · ↵ runs every step">{workflows.map(item)}</List.Section>
      <List.Section title="All patterns, A–Z" subtitle={data ? `${data.patterns.length} total` : undefined}>
        {others.map(item)}
      </List.Section>
    </List>
  );
}

function iconOf(e: Entry): List.Item.Props["icon"] {
  if (e.kind === "pattern") return { source: Icon.Document, tintColor: Color.Blue };
  if (e.kind === "session") return { source: Icon.Bubble, tintColor: Color.Purple };
  return e.chain.ok ? { source: Icon.Link, tintColor: Color.Green } : { source: Icon.Warning, tintColor: Color.Orange };
}

function Detail({
  entry,
  output,
  myDir,
  input,
}: {
  entry: Entry;
  output: string;
  myDir: string;
  /** Undefined until the first read lands. */
  input?: string;
}) {
  if (entry.kind === "workflow") {
    const c = entry.chain;
    const body = c.ok
      ? c.workflow.steps.map((s, i) => `${i + 1}. ${s.pattern}${s.model ? ` (${s.model})` : ""}`).join("\n")
      : `**Refused:** ${c.reason}\n\nFix it in Manage Fabric › Chains.`;
    return (
      <List.Item.Detail
        markdown={`# ${entry.name}\n\n${body}`}
        metadata={
          <List.Item.Detail.Metadata>
            <List.Item.Detail.Metadata.Label title="Type" text="Chain" />
            {input !== undefined && <List.Item.Detail.Metadata.Label title="Last read" text={input} />}
            <List.Item.Detail.Metadata.Label title="When a Run Finishes" text={`${output} (your default)`} />
          </List.Item.Detail.Metadata>
        }
      />
    );
  }
  if (entry.kind === "session") {
    return (
      <List.Item.Detail
        markdown={`# ${entry.name}\n\nA saved fabric session. ↵ continues it with a new input.`}
        metadata={
          <List.Item.Detail.Metadata>
            <List.Item.Detail.Metadata.Label title="Type" text="Session" />
            <List.Item.Detail.Metadata.Label title="Messages" text={String(entry.session.messages ?? "unknown")} />
          </List.Item.Detail.Metadata>
        }
      />
    );
  }
  const system = readSystemPrompt(entry.name, { myPatternsDir: myDir }) ?? "";
  const preview = system.split("\n").slice(0, 30).join("\n");
  return (
    <List.Item.Detail
      markdown={`# ${entry.name}\n\n${entry.pattern.description ?? ""}\n\n\`\`\`markdown\n${preview}\n\`\`\``}
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label
            title="Type"
            text={entry.pattern.own ? "Pattern (custom)" : "Pattern (built-in)"}
          />
          {/* One value per row: the sidebar truncates a long one. */}
          {/* Not rendered until the read lands: a "Reading…" placeholder fixed the row's width, and the
              real value then showed as "Noth…ted" (manual test 2026-10-19). A React key would not help:
              Raycast's label sends only title, text, color and icon to the native side. */}
          {input !== undefined && <List.Item.Detail.Metadata.Label title="Last read" text={input} />}
          <List.Item.Detail.Metadata.Label title="Strategy, Context" text="None (⌘↵ sets)" />
          <List.Item.Detail.Metadata.Label title="When a Run Finishes" text={`${output} (your default)`} />
        </List.Item.Detail.Metadata>
      }
    />
  );
}
