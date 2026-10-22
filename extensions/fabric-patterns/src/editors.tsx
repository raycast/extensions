import {
  Action,
  ActionPanel,
  Color,
  Detail,
  Form,
  Icon,
  Keyboard,
  List,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { join } from "node:path";
import { useMemo, useRef, useState } from "react";
import {
  CONTEXTS_DIR,
  listNames,
  loadModels,
  orEmpty,
  profileKey,
  readStrategy,
  readText,
  SESSIONS_DIR,
  STRATEGIES_DIR,
} from "../lib/loaders";
import { lastAnswer, messageCount, parseSession, renderTranscript } from "../lib/session";
import { isModelName, isVendorName, modelLabel, readWorkflow, stepsText, type WorkflowStep } from "../lib/workflow";
import {
  checkName,
  profileYaml,
  renameSession,
  saveChain,
  saveOwnFile,
  saveStrategy,
  visibility,
} from "../lib/writers";
import { errorText, PATTERNS_ROOT, PROFILES_DIR, shownPath, WORKFLOWS_DIR } from "./deliver";
import { movePin, prefs } from "./storage";
import { OpenInEditor } from "./open-in-editor";

/** Saves, then confirms fabric lists the name; says so either way. */
async function savedAndListed(name: string, flag: string, what: string) {
  let names: string[];
  try {
    names = await listNames(prefs().fabricPath, flag);
  } catch (e) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Saved, but fabric didn't answer",
      message: errorText(e),
    });
    return;
  }
  if (visibility(name, names) === "visible")
    await showToast({ style: Toast.Style.Success, title: "Saved", message: `fabric lists ${name}` });
  else
    await showToast({
      style: Toast.Style.Failure,
      title: `Saved, but fabric doesn't list this ${what}`,
      message: `Check ${flag}`,
    });
}

/** A save error also shows on Name, the first field, which a long body scrolls out of view. */
export const saveFailed = (e: unknown) =>
  showToast({ style: Toast.Style.Failure, title: "Couldn't save", message: errorText(e) });

/**
 * `fn` saves (and moves a renamed item's pin) before `onSaved` re-lists, re-reads pins and selects
 * the saved row. A failure lands on Name, so the cursor goes there; `nameRef` is that field's ref.
 */
function useSave(savedName: () => string, onSaved?: (name: string) => void) {
  const { pop } = useNavigation();
  const [error, setError] = useState<string>();
  const nameRef = useRef<Form.TextField>(null);
  const run = async (fn: () => void | Promise<void>, after: () => Promise<void>) => {
    try {
      await fn();
    } catch (e) {
      setError(errorText(e));
      nameRef.current?.focus();
      await saveFailed(e);
      return;
    }
    onSaved?.(savedName());
    await after();
    pop();
  };
  return { error, setError, run, nameRef };
}

export function EditStrategy({
  name,
  copyOf,
  onSaved,
}: {
  name?: string;
  copyOf?: string;
  onSaved?: (name: string) => void;
}) {
  const src = name ?? copyOf;
  const [json] = useState(() => (src ? readStrategy(src) : {}));
  const [newName, setNewName] = useState(name ?? (copyOf ? `${copyOf}_copy` : ""));
  const [description, setDescription] = useState(json?.description ?? "");
  const [prompt, setPrompt] = useState(json?.prompt ?? "");
  const { error, setError, run, nameRef } = useSave(() => newName.trim(), onSaved);
  const file = join(STRATEGIES_DIR, `${newName || "…"}.json`);
  // Opening a malformed file blank would let Save write the blanks over it.
  if (!json)
    return (
      <Detail
        navigationTitle={`Strategy · ${src}`}
        markdown={`## Couldn't read this strategy\n\n\`${shownPath(join(STRATEGIES_DIR, `${src}.json`))}\` isn't valid JSON, so it isn't opened here (saving would replace it). Fix it in an editor, then try again.`}
        actions={
          <ActionPanel>
            <OpenInEditor target={join(STRATEGIES_DIR, `${src}.json`)} />
          </ActionPanel>
        }
      />
    );
  return (
    <Form
      navigationTitle={name ? `Edit Strategy · ${name}` : "New Strategy"}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Save"
            icon={Icon.SaveDocument}
            onSubmit={() =>
              run(
                async () => {
                  saveStrategy(STRATEGIES_DIR, PATTERNS_ROOT, {
                    name: newName.trim(),
                    description,
                    prompt,
                    previousName: name,
                  });
                  await movePin("strategy", name, newName.trim());
                },
                () => savedAndListed(newName.trim(), "--liststrategies", "strategy"),
              )
            }
          />
          {name && <OpenInEditor target={file} shortcut={Keyboard.Shortcut.Common.Open} />}
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        ref={nameRef}
        title="Name"
        value={newName}
        error={error}
        onChange={(v) => {
          setNewName(v);
          setError(undefined);
        }}
      />
      <Form.TextField id="description" title="Description" value={description} onChange={setDescription} />
      <Form.TextArea
        id="prompt"
        title="Prompt"
        value={prompt}
        onChange={setPrompt}
        placeholder="Text fabric adds to the prompt of any run that uses this strategy."
      />
      <Form.Description title="Saved in" text={shownPath(file)} />
    </Form>
  );
}

export function EditContext({ name, onSaved }: { name?: string; onSaved?: (name: string) => void }) {
  const [newName, setNewName] = useState(name ?? "");
  const [text, setText] = useState(() => (name ? (readText(join(CONTEXTS_DIR, name)) ?? "") : ""));
  const { error, setError, run, nameRef } = useSave(() => newName.trim(), onSaved);
  return (
    <Form
      navigationTitle={name ? `Edit Context · ${name}` : "New Context"}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Save"
            icon={Icon.SaveDocument}
            onSubmit={() =>
              run(
                async () => {
                  saveOwnFile(CONTEXTS_DIR, checkedName(newName), text, PATTERNS_ROOT, name);
                  await movePin("context", name, newName.trim());
                },
                () => savedAndListed(newName.trim(), "--listcontexts", "context"),
              )
            }
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        ref={nameRef}
        title="Name"
        value={newName}
        error={error}
        onChange={(v) => {
          setNewName(v);
          setError(undefined);
        }}
      />
      <Form.TextArea
        id="text"
        title="Text"
        value={text}
        onChange={setText}
        placeholder="Background fabric puts in front of the pattern on every run that uses this context: your role, house style, domain facts."
      />
      <Form.Description title="Saved in" text={shownPath(join(CONTEXTS_DIR, newName || "…"))} />
    </Form>
  );
}

const checkedName = (v: string) => checkName(v.trim());

function readProfile(name: string) {
  const yaml = readText(join(PROFILES_DIR, `${name}.yaml`)) ?? "";
  return {
    model: profileKey(yaml, "model") ?? "",
    temperature: profileKey(yaml, "temperature") ?? "",
    topp: profileKey(yaml, "topp") ?? "",
    suppressThink: profileKey(yaml, "suppressThink") === "true",
  };
}

export function EditProfile({ name, onSaved }: { name?: string; onSaved?: (name: string) => void }) {
  const [start] = useState(() =>
    name ? readProfile(name) : { model: "", temperature: "", topp: "", suppressThink: false },
  );
  const [newName, setNewName] = useState(name ?? "");
  const [model, setModel] = useState(start.model);
  const [temperature, setTemperature] = useState(start.temperature);
  const [topp, setTopp] = useState(start.topp);
  const [suppressThink, setSuppressThink] = useState(start.suppressThink);
  const { error, setError, run, nameRef } = useSave(() => newName.trim(), onSaved);
  const { data: models } = usePromise(() => orEmpty(loadModels(prefs().fabricPath)));
  return (
    <Form
      navigationTitle={name ? `Config · ${name}` : "New Config"}
      isLoading={!models}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Save"
            icon={Icon.SaveDocument}
            onSubmit={() =>
              run(
                async () => {
                  saveOwnFile(
                    PROFILES_DIR,
                    `${checkedName(newName)}.yaml`,
                    profileYaml({ model, temperature, topp, suppressThink }),
                    PATTERNS_ROOT,
                    name && `${name}.yaml`,
                  );
                  await movePin("profile", name, newName.trim());
                },
                async () => void (await showToast({ style: Toast.Style.Success, title: "Saved" })),
              )
            }
          />
          {name && (
            <OpenInEditor target={join(PROFILES_DIR, `${name}.yaml`)} shortcut={Keyboard.Shortcut.Common.Open} />
          )}
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        ref={nameRef}
        title="Name"
        value={newName}
        error={error}
        onChange={(v) => {
          setNewName(v);
          setError(undefined);
        }}
      />
      <Form.Dropdown id="model" title="Model" value={model} onChange={setModel}>
        <Form.Dropdown.Item value="" title="Let fabric choose" />
        {(models ?? []).map((m) => (
          <Form.Dropdown.Item key={m} value={m} title={m} />
        ))}
      </Form.Dropdown>
      <Form.TextField
        id="temperature"
        title="Temperature"
        placeholder="0.7"
        value={temperature}
        onChange={setTemperature}
      />
      <Form.TextField id="topp" title="Top P" placeholder="0.9" value={topp} onChange={setTopp} />
      <Form.Checkbox
        id="suppressThink"
        title="Options"
        label="Strip <think> tags from the answer"
        value={suppressThink}
        onChange={setSuppressThink}
      />
      <Form.Description text="A config holds model settings only, never a pattern, and is used only by runs you pick it for (Config on the Run form). It is saved as a fabric --config file; blank fields are left out." />
    </Form>
  );
}

export function ViewSession({
  name: initialName,
  onContinue,
  onRenamed,
  onDelete,
}: {
  name: string;
  onContinue: (name: string) => void;
  onRenamed: () => void;
  /** Resolves true once the session is deleted; the view then closes, so nothing can act on it. */
  onDelete: (name: string) => Promise<boolean>;
}) {
  // A rename pops back here, so this view tracks the name the session has now.
  const [name, setName] = useState(initialName);
  const { push, pop } = useNavigation();
  const file = join(SESSIONS_DIR, `${name}.json`);
  let md: string;
  let count = "unknown";
  let last: string | undefined;
  try {
    const msgs = parseSession(readText(file) ?? "[]");
    md = renderTranscript(msgs);
    const c = messageCount(msgs);
    count = `${c.turns}${c.system ? " plus the system prompt" : ""}`;
    last = lastAnswer(msgs);
  } catch (e) {
    md = `_Couldn't read this session: ${errorText(e)}_`;
  }
  return (
    <Detail
      navigationTitle={`Session · ${name}`}
      markdown={md}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Messages" text={count} />
          <Detail.Metadata.Label title="File" text={shownPath(file)} />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action title="Continue" icon={Icon.Bubble} onAction={() => onContinue(name)} />
          {last && (
            <Action.CopyToClipboard title="Copy Last Answer" content={last} shortcut={Keyboard.Shortcut.Common.Copy} />
          )}
          <Action
            title="Rename"
            icon={Icon.Pencil}
            shortcut={Keyboard.Shortcut.Common.Edit}
            onAction={() =>
              push(
                <RenameSession
                  name={name}
                  onSaved={(renamed) => {
                    setName(renamed);
                    onRenamed();
                  }}
                />,
              )
            }
          />
          <Action
            title="Delete"
            icon={Icon.Trash}
            style={Action.Style.Destructive}
            shortcut={Keyboard.Shortcut.Common.Remove}
            onAction={async () => {
              // Staying open would leave Continue to recreate the session, empty.
              if (await onDelete(name)) pop();
            }}
          />
        </ActionPanel>
      }
    />
  );
}

export function RenameSession({ name, onSaved }: { name: string; onSaved?: (newName: string) => void }) {
  const [newName, setNewName] = useState(name);
  const { error, setError, run, nameRef } = useSave(() => newName.trim(), onSaved);
  return (
    <Form
      navigationTitle={`Rename Session · ${name}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Rename"
            onSubmit={() =>
              run(
                async () => {
                  try {
                    renameSession(SESSIONS_DIR, name, newName.trim(), PATTERNS_ROOT);
                  } catch (e) {
                    if ((e as NodeJS.ErrnoException).code === "EEXIST")
                      throw new Error("A session with that name exists");
                    throw e;
                  }
                  await movePin("session", name, newName.trim());
                },
                () => savedAndListed(newName.trim(), "--listsessions", "session"),
              )
            }
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        ref={nameRef}
        title="New Name"
        value={newName}
        error={error}
        onChange={(v) => {
          setNewName(v);
          setError(undefined);
        }}
      />
    </Form>
  );
}

// ---- chains: fabric workflow JSON, edited as a list of steps ----

/** A chain's file read for editing: its steps, or why it can't be opened here. Patterns are checked on Save. */
function readChain(name: string): { steps: WorkflowStep[] } | { error: string } {
  // No installed list: a chain whose pattern was deleted still opens to be fixed.
  const parsed = readWorkflow(join(WORKFLOWS_DIR, `${name}.json`));
  return parsed.ok ? { steps: parsed.workflow.steps } : { error: parsed.reason };
}

export function EditChain({ name, onSaved }: { name?: string; onSaved?: (name: string) => void }) {
  const { push, pop } = useNavigation();
  const [start] = useState(() => (name ? readChain(name) : { steps: [] }));
  const [steps, setSteps] = useState<WorkflowStep[]>("steps" in start ? start.steps : []);
  const { data: patterns } = usePromise(() => orEmpty(listNames(prefs().fabricPath, "--listpatterns")));
  const installed = useMemo(() => new Set(patterns ?? []), [patterns]);
  const file = join(WORKFLOWS_DIR, `${name}.json`);
  // Opening a file that isn't a chain blank would let Save write the blanks over it.
  if ("error" in start)
    return (
      <Detail
        navigationTitle={`Chain · ${name}`}
        markdown={`## Couldn't open this chain\n\n\`${shownPath(file)}\`: ${start.error}. Fix it in an editor, then try again.`}
        actions={
          <ActionPanel>
            <OpenInEditor target={file} />
          </ActionPanel>
        }
      />
    );

  const stepForm = (at: number, step?: WorkflowStep) =>
    push(
      <StepForm
        step={step}
        patterns={patterns ?? []}
        onSubmit={(s) => setSteps((all) => (step ? all.map((x, i) => (i === at ? s : x)) : [...all, s]))}
      />,
    );
  const move = (i: number, by: -1 | 1) =>
    setSteps((all) => {
      const j = i + by;
      if (j < 0 || j >= all.length) return all;
      const next = [...all];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  const add = (
    <Action
      title="Add Step"
      icon={Icon.Plus}
      shortcut={Keyboard.Shortcut.Common.New}
      onAction={() => stepForm(steps.length)}
    />
  );
  const save = (
    <Action
      title="Save Chain"
      icon={Icon.SaveDocument}
      shortcut={Keyboard.Shortcut.Common.Save}
      onAction={() =>
        push(
          <SaveChainAs
            steps={steps}
            installed={installed}
            previousName={name}
            onSaved={(n) => {
              onSaved?.(n);
              pop(); // closes Save chain as…; useSave's own pop then closes the editor
            }}
          />,
        )
      }
    />
  );
  return (
    <List navigationTitle={name ? `Edit Chain · ${name}` : "New Chain"} isLoading={!patterns}>
      <List.EmptyView
        title="No steps yet"
        description="Press ⌘N to add the first pattern. Each step's answer is the next step's input."
        actions={<ActionPanel>{patterns && add}</ActionPanel>}
      />
      {steps.map((s, i) => (
        <List.Item
          key={`${i}:${s.pattern}`}
          title={s.pattern}
          subtitle={[s.model && modelLabel(s.model, s.vendor), s.input !== undefined && "own input"]
            .filter(Boolean)
            .join(" · ")}
          icon={{ source: Icon.Document, tintColor: Color.Blue }}
          accessories={[
            ...(patterns && !installed.has(s.pattern)
              ? [{ tag: { value: "not installed", color: Color.Orange } }]
              : []),
            { text: `${i + 1}/${steps.length}` },
          ]}
          actions={
            <ActionPanel>
              <Action title="Edit Step" icon={Icon.Pencil} onAction={() => stepForm(i, s)} />
              {/* Both need the pattern list: a step form with no patterns, or a Save that calls every step
                  "not installed", is what ⌘N or ⌘S would give in the first second. */}
              {patterns && save}
              {patterns && add}
              <Action
                title="Move Earlier"
                icon={Icon.ArrowUp}
                shortcut={Keyboard.Shortcut.Common.MoveUp}
                onAction={() => move(i, -1)}
              />
              <Action
                title="Move Later"
                icon={Icon.ArrowDown}
                shortcut={Keyboard.Shortcut.Common.MoveDown}
                onAction={() => move(i, 1)}
              />
              <Action
                title="Remove Step"
                icon={Icon.Trash}
                // Not Destructive: nothing on disk changes until Save Chain.
                shortcut={Keyboard.Shortcut.Common.Remove}
                onAction={() => setSteps((all) => all.filter((_, j) => j !== i))}
              />
              {name && <OpenInEditor target={file} shortcut={Keyboard.Shortcut.Common.Open} />}
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

/** One step: its pattern, and optionally its own model, vendor and input. Variables in the file are kept. */
export function StepForm({
  step,
  patterns,
  onSubmit,
}: {
  step?: WorkflowStep;
  patterns: string[];
  onSubmit: (step: WorkflowStep) => void;
}) {
  const { pop } = useNavigation();
  const [pattern, setPattern] = useState(step?.pattern ?? patterns[0] ?? "");
  const [model, setModel] = useState(step?.model ?? "");
  const [vendor, setVendor] = useState(step?.vendor ?? "");
  const [input, setInput] = useState(step?.input ?? "");
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const names = patterns.includes(pattern) || !pattern ? patterns : [pattern, ...patterns];
  return (
    <Form
      navigationTitle={step ? `Edit Step · ${step.pattern}` : "Add Step"}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Done"
            icon={Icon.Check}
            onSubmit={() => {
              const e = {
                pattern: pattern ? undefined : "Choose a pattern",
                model: model.trim() && !isModelName(model.trim()) ? "Not a model name" : undefined,
                vendor: vendor.trim() && !isVendorName(vendor.trim()) ? "Not a vendor name" : undefined,
                input: input.includes("\0") ? "Can't hold a NUL byte" : undefined,
              };
              setErrors(e);
              if (Object.values(e).some(Boolean)) return;
              // A step's variables belong to its pattern; another pattern has other variables.
              const variables = step?.pattern === pattern ? step.variables : undefined;
              onSubmit({
                pattern,
                ...(input ? { input } : {}),
                ...(variables ? { variables } : {}),
                ...(model.trim() ? { model: model.trim() } : {}),
                ...(vendor.trim() ? { vendor: vendor.trim() } : {}),
              });
              pop();
            }}
          />
        </ActionPanel>
      }
    >
      <Form.Dropdown id="pattern" title="Pattern" value={pattern} onChange={setPattern} error={errors.pattern}>
        {names.map((n) => (
          <Form.Dropdown.Item key={n} value={n} title={n} />
        ))}
      </Form.Dropdown>
      <Form.TextField
        id="model"
        title="Model"
        placeholder="Blank: the run's model, else fabric's"
        value={model}
        error={errors.model}
        onChange={setModel}
        info="This step's own model wins over the one picked when the chain runs."
      />
      <Form.TextField
        id="vendor"
        title="Vendor"
        placeholder="e.g. Ollama"
        value={vendor}
        error={errors.vendor}
        onChange={setVendor}
      />
      <Form.TextArea
        id="input"
        title="Own Input"
        placeholder="Blank: the previous step's answer (the run's input for step 1)"
        value={input}
        error={errors.input}
        onChange={setInput}
      />
    </Form>
  );
}

/** Names the chain and saves it; a refusal (a repeat, a path, a missing pattern) lands on Name. */
export function SaveChainAs({
  steps,
  installed,
  previousName,
  onSaved,
}: {
  steps: WorkflowStep[];
  installed: ReadonlySet<string>;
  previousName?: string;
  onSaved?: (name: string) => void;
}) {
  const [newName, setNewName] = useState(previousName ?? "");
  const { error, setError, run, nameRef } = useSave(() => newName.trim(), onSaved);
  return (
    <Form
      navigationTitle="Save Chain As"
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Save"
            icon={Icon.SaveDocument}
            onSubmit={() =>
              run(
                async () => {
                  saveChain(WORKFLOWS_DIR, PATTERNS_ROOT, { name: newName.trim(), steps, previousName }, installed);
                  await movePin("workflow", previousName, newName.trim());
                },
                async () => void (await showToast({ style: Toast.Style.Success, title: "Saved" })),
              )
            }
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        ref={nameRef}
        title="Name"
        value={newName}
        error={error}
        onChange={(v) => {
          setNewName(v);
          setError(undefined);
        }}
      />
      <Form.Description title="Steps" text={stepsText(steps) || "None"} />
      <Form.Description title="Saved in" text={shownPath(join(WORKFLOWS_DIR, `${newName || "…"}.json`))} />
    </Form>
  );
}
