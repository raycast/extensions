import { Action, ActionPanel, Form, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useEffect, useMemo, useRef, useState } from "react";
import { type Input, isPlainName, isThinking, type RunSpec } from "../lib/argv";
import { classifyFile, classifyText, describeInput, isLong } from "../lib/classify";
import { type Resolved, sourceLabel } from "../lib/input";
import {
  loadContexts,
  loadModelRows,
  loadProfiles,
  loadStrategies,
  loadTranscriptionModels,
  orEmpty,
} from "../lib/loaders";
import { groupByVendor, type ModelPair, pairKey, parsePairKey } from "../lib/models";
import { OUTPUT_LABEL, type OutputMode } from "../lib/output";
import {
  readWorkflow,
  stepsText,
  unionVariables,
  type Workflow,
  type WorkflowStep,
  workflowVariableValues,
} from "../lib/workflow";
import { errorText, PROFILES_DIR } from "./deliver";
import { startRun } from "./start-run";
import { pickerSeed, prefs, systemPromptFor } from "./storage";

/** A chain's file as it reads now (it may have changed since it was listed), or a toast saying why it can't run. */
export function recheckChain(path: string, installed: ReadonlySet<string>): Workflow | undefined {
  const parsed = readWorkflow(path, installed);
  if (parsed.ok) return parsed.workflow;
  void showToast({ style: Toast.Style.Failure, title: "Can't run this chain", message: parsed.reason });
}

/** The form's title for each error key; a variable's key is `var:<name>`. */
const FIELD_TITLE = { text: "URL or Text", file: "Or a File", session: "Session", thinking: "Thinking Tokens" };
/** Error keys whose field sits under Advanced Options. */
const ADVANCED = new Set(["session", "thinking"]);
const THINKING_LEVELS = ["off", "low", "medium", "high"];
const fieldTitle = (key: string) =>
  key.startsWith("var:") ? key.slice(4) : FIELD_TITLE[key as keyof typeof FIELD_TITLE];

/**
 * Runs a pattern, a chain (`workflow`, validated when the form opened and again at Run) or, with neither, continues a session
 * (fabric then just adds the new input to it). `pinned` is the pattern's pinned model, chosen when
 * the form opens; a chain has none.
 */
export function ConfigureRun({
  pattern,
  workflow,
  session: initialSession,
  pinned,
  resolved,
  onRun,
}: {
  pattern?: string;
  workflow?: { name: string; path: string; steps: WorkflowStep[] };
  session?: string;
  pinned?: ModelPair;
  resolved: Resolved;
  onRun: () => void;
}) {
  const p = prefs();
  const mode = workflow ? "workflow" : pattern ? "pattern" : "session";
  const { push } = useNavigation();
  const startText = resolved.source === "selection" || resolved.source === "clipboard" ? resolved.text : "";
  const [text, setText] = useState(startText);
  const [files, setFiles] = useState<string[]>(resolved.source === "finder" ? resolved.paths.slice(0, 1) : []);
  const [ytMode, setYtMode] = useState("transcript");
  const [comments, setComments] = useState(false);
  const [metadata, setMetadata] = useState(false);
  const [transcribeModel, setTranscribeModel] = useState("");
  const [vars, setVars] = useState<Record<string, string>>({});
  const [output, setOutput] = useState<OutputMode>(p.defaultOutput);
  const [advanced, setAdvanced] = useState(!!initialSession);
  const [profile, setProfile] = useState("");
  const [strategy, setStrategy] = useState("");
  const [context, setContext] = useState("");
  const [session, setSession] = useState(initialSession ?? "");
  // A `Vendor|model` key: the same model name under two vendors is two choices.
  const [model, setModel] = useState(pinned ? pairKey(pinned) : "");
  const [vendor, setVendor] = useState("");
  const [thinking, setThinking] = useState("");
  const [thinkingTokens, setThinkingTokens] = useState("");
  const [search, setSearch] = useState(false);
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  // Each error key's field, so a failed Run can move the cursor to the first one.
  const fields = useRef<Record<string, Form.ItemReference | null>>({});
  const fieldRef = (key: string) => (r: Form.ItemReference | null) => {
    fields.current[key] = r;
  };
  // Session lives under Advanced: when it is the field to fix and Advanced is closed, open it and
  // focus once the field is rendered.
  const [focusNext, setFocusNext] = useState<string>();
  useEffect(() => {
    if (!focusNext) return;
    fields.current[focusNext]?.focus();
    setFocusNext(undefined);
  }, [focusNext, advanced]);

  // A pattern run is a one-step chain as far as variables go; each system.md is read once per form.
  const steps = useMemo(() => workflow?.steps ?? (pattern ? [{ pattern }] : []), []);
  const systemFor = useMemo(() => {
    const mds = new Map(steps.map((s) => [s.pattern, systemPromptFor(s.pattern)]));
    return (name: string) => mds.get(name);
  }, [steps]);
  const variables = useMemo(() => unionVariables(steps, systemFor), [systemFor]);
  const profiles = useMemo(() => loadProfiles(PROFILES_DIR), []);
  const { data: lists } = usePromise(async () => {
    const [strategies, contexts, models, transcribeModels] = await Promise.all([
      orEmpty(loadStrategies(p.fabricPath)),
      orEmpty(loadContexts(p.fabricPath)),
      orEmpty(loadModelRows(p.fabricPath)),
      orEmpty(loadTranscriptionModels(p.fabricPath)),
    ]);
    return { strategies, contexts, models, transcribeModels };
  });

  const modelRows = lists?.models ?? [];
  const vendors = useMemo(() => [...new Set(modelRows.map((r) => r.vendor))], [lists]);
  const modelGroups = useMemo(
    () => groupByVendor(vendor ? modelRows.filter((r) => r.vendor === vendor) : modelRows),
    [lists, vendor],
  );

  // Split so typing in the text field never re-reads a chosen file.
  const fromFile = useMemo((): { input: Input; fileError?: string } | undefined => {
    if (!files[0]) return undefined;
    try {
      return { input: classifyFile(files[0]) };
    } catch (e) {
      return { input: { kind: "none" }, fileError: errorText(e) };
    }
  }, [files]);
  const fromText = useMemo((): Input => (text.trim() ? classifyText(text) : { kind: "none" }), [text]);
  const { input, fileError } = fromFile ?? { input: fromText };

  const longInput = isLong(input);
  const [backgroundChoice, setBackground] = useState<boolean | undefined>(undefined);
  const background = backgroundChoice ?? (longInput && p.longInputs === "background");
  // This run's Save Folder; Preferences hold the default. A picker can only show a folder that exists.
  const [runFolder, setRunFolder] = useState<string[]>(() => pickerSeed(p.outputFolder));

  const filledFrom =
    resolved.source === "none"
      ? "Nothing was selected or copied. Type, paste or choose a file."
      : `Filled from: ${sourceLabel(resolved)}.`;
  // Where the input in the form now comes from: the launch source only until the user changes it.
  const untouched = files[0]
    ? resolved.source === "finder" && files[0] === resolved.paths[0]
    : resolved.source !== "finder" && text === startText;
  const origin = untouched
    ? filledFrom
    : files[0]
      ? "Filled from: the file you chose."
      : text.trim()
        ? "Filled from: this box (you edited it)."
        : "";
  // A file wins over the text (fromFile above); say so on the form's face, not only in the file field's tooltip.
  const ignored = fromFile && fromText.kind !== "none" && "The text above isn't used while a file is chosen.";

  function spec(dryRun: boolean): RunSpec | undefined {
    const e: Record<string, string | undefined> = {};
    // A file fabric can't read is the file's error alone; the text field is fine.
    if (input.kind === "none" && !fileError) e.text = "Give a URL, some text or a file.";
    if (fileError) e.file = fileError;
    for (const v of variables) if (!vars[v]?.trim()) e[`var:${v}`] = "fabric needs a value for this";
    if (mode !== "workflow" && session && !isPlainName(session)) e.session = "Letters, digits, _ . - only";
    if (thinking === "tokens" && !isThinking(thinkingTokens.trim())) e.thinking = "A whole number from 1 to 999999";
    setErrors(e);
    const bad = Object.keys(e).filter((k) => e[k]);
    if (bad.length) {
      // The field can sit above the visible part of the form, so the cursor goes to the first one
      // (keys are set in form order) and the toast names them all.
      if (ADVANCED.has(bad[0]) && !advanced) {
        setAdvanced(true);
        setFocusNext(bad[0]);
      } else fields.current[bad[0]]?.focus();
      showToast({
        style: Toast.Style.Failure,
        title: "Can't run yet",
        message: `Check ${bad.map(fieldTitle).join(", ")}`,
      });
      return undefined;
    }

    let finalInput = input;
    if (input.kind === "youtube") finalInput = { ...input, timestamps: ytMode === "timestamps", comments, metadata };
    if (input.kind === "media" && transcribeModel) finalInput = { ...input, transcribeModel };
    const prof = profiles.find((x) => x.name === profile);
    // The vendor goes only with a chosen model: the Vendor dropdown alone just narrows the list.
    const pair = parsePairKey(model);
    return {
      input: finalInput,
      pattern: workflow ? undefined : pattern,
      workflow,
      variables: workflowVariableValues(steps, systemFor, vars),
      profile: prof ? { path: prof.path, model: prof.model, vendor: prof.vendor } : undefined,
      strategy: strategy || undefined,
      context: context || undefined,
      // fabric ignores --session beside --workflow; argv refuses the pair, so a chain never sends one.
      session: (mode !== "workflow" && session) || undefined,
      model: pair?.model,
      vendor: pair?.vendor,
      thinking: thinking === "tokens" ? thinkingTokens.trim() : thinking || undefined,
      search,
      dryRun,
    };
  }

  async function go(dryRun: boolean) {
    const s = spec(dryRun);
    if (!s) return;
    // The form can stay open for as long as the user likes: fabric reads the file at spawn, so it is read here too.
    // Only the steps this form was built from run; anything else (a path, a new variable) is refused.
    if (workflow) {
      const now = readWorkflow(workflow.path);
      const why = !now.ok
        ? now.reason
        : JSON.stringify(now.workflow.steps) !== JSON.stringify(workflow.steps)
          ? "the chain changed since this form opened; open it again"
          : undefined;
      if (why) return void showToast({ style: Toast.Style.Failure, title: "Can't run this chain", message: why });
    }
    // Same rule as the Detected row's origin: the launch source only while the box is untouched.
    const label = files[0]
      ? `File: ${files[0].split("/").pop()}`
      : untouched
        ? sourceLabel(resolved)
        : "Typed in the run form";
    await startRun(
      push,
      {
        fabricPath: p.fabricPath,
        spec: s,
        inputLabel: label,
        output,
        target: resolved.app,
        background,
        outputFolder: runFolder[0] ?? p.outputFolder,
      },
      onRun,
    );
  }

  return (
    <Form
      navigationTitle={
        mode === "session" ? `Continue ${initialSession ?? "session"}` : `Run ${workflow?.name ?? pattern}`
      }
      isLoading={!lists}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Run" icon={Icon.Play} onSubmit={() => go(false)} />
          <Action
            title="Preview Prompt"
            icon={Icon.Eye}
            shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
            onAction={() => go(true)}
          />
        </ActionPanel>
      }
    >
      <Form.Description
        title={mode === "session" ? "Continue" : "Run"}
        text={
          workflow
            ? `${workflow.name}: ${stepsText(workflow.steps)}`
            : (pattern ?? `Session ${initialSession}: your input is added to the conversation.`)
        }
      />
      <Form.TextArea
        id="text"
        ref={fieldRef("text")}
        title={FIELD_TITLE.text}
        placeholder="https://www.youtube.com/watch?v=… or any text"
        value={text}
        onChange={(v) => {
          setText(v);
          setErrors((e) => ({ ...e, text: undefined }));
        }}
        error={errors.text}
        info={filledFrom}
      />
      <Form.FilePicker
        id="file"
        ref={fieldRef("file")}
        title={FIELD_TITLE.file}
        allowMultipleSelection={false}
        value={files}
        onChange={(v) => {
          setFiles(v);
          setErrors((e) => ({ ...e, file: undefined, text: undefined }));
        }}
        error={errors.file ?? fileError}
        info="Text, image, audio or video. A file wins over the text above."
      />
      <Form.Description
        title="Detected"
        text={[`${describeInput(input)}.`, origin, ignored].filter(Boolean).join(" ")}
      />

      {input.kind === "youtube" && (
        <>
          <Form.Dropdown id="ytMode" title="YouTube" value={ytMode} onChange={setYtMode}>
            <Form.Dropdown.Item value="transcript" title="Transcript" />
            <Form.Dropdown.Item value="timestamps" title="Transcript with timestamps" />
          </Form.Dropdown>
          <Form.Checkbox id="comments" title="Also Include" label="Comments" value={comments} onChange={setComments} />
          <Form.Checkbox id="metadata" label="Metadata" value={metadata} onChange={setMetadata} />
          <Form.Description text="Comments and metadata need a YouTube API key in fabric." />
        </>
      )}
      {input.kind === "media" && (
        <Form.Dropdown
          id="transcribeModel"
          title="Transcription Model"
          value={transcribeModel}
          onChange={setTranscribeModel}
          info="Transcription needs an OpenAI or Gemini key in fabric."
        >
          <Form.Dropdown.Item value="" title="Let fabric choose" />
          {(lists?.transcribeModels ?? []).map((m) => (
            <Form.Dropdown.Item key={m} value={m} title={m} />
          ))}
        </Form.Dropdown>
      )}

      <Form.Separator />
      {variables.length === 0 ? (
        <Form.Description title="Variables" text={`None for this ${mode === "workflow" ? "chain" : "pattern"}.`} />
      ) : (
        variables.map((v) => (
          <Form.TextField
            key={v}
            id={`var:${v}`}
            ref={fieldRef(`var:${v}`)}
            title={v}
            placeholder={`Value for {{${v}}}`}
            value={vars[v] ?? ""}
            error={errors[`var:${v}`]}
            onChange={(val) => {
              setVars((s) => ({ ...s, [v]: val }));
              setErrors((e) => ({ ...e, [`var:${v}`]: undefined }));
            }}
          />
        ))
      )}

      <Form.Separator />
      <Form.Checkbox
        id="background"
        title="Run in Background"
        label="You can close Raycast"
        value={background}
        onChange={setBackground}
        info="On by default for web pages, YouTube and audio/video."
      />
      {background && (
        <Form.FilePicker
          id="runFolder"
          title="Save Folder"
          allowMultipleSelection={false}
          canChooseDirectories
          canChooseFiles={false}
          value={runFolder}
          onChange={setRunFolder}
          info="Where this run's answer is saved. Preferences › Save Folder is the default."
        />
      )}
      <Form.Dropdown
        id="output"
        title="When a Run Finishes"
        value={output}
        onChange={(v) => setOutput(v as OutputMode)}
      >
        {(Object.keys(OUTPUT_LABEL) as OutputMode[]).map((k) => (
          <Form.Dropdown.Item key={k} value={k} title={OUTPUT_LABEL[k]} />
        ))}
      </Form.Dropdown>

      <Form.Checkbox id="advanced" label="Show Advanced Options" value={advanced} onChange={setAdvanced} />
      {advanced && (
        <>
          <Form.Dropdown id="profile" title="Config" value={profile} onChange={setProfile}>
            <Form.Dropdown.Item value="" title="None" />
            {profiles.map((x) => (
              <Form.Dropdown.Item key={x.name} value={x.name} title={x.name} />
            ))}
          </Form.Dropdown>
          <Form.Dropdown id="strategy" title="Strategy" value={strategy} onChange={setStrategy}>
            <Form.Dropdown.Item value="" title="None" />
            {(lists?.strategies ?? []).map((s) => (
              <Form.Dropdown.Item key={s} value={s} title={s} />
            ))}
          </Form.Dropdown>
          <Form.Dropdown id="context" title="Context" value={context} onChange={setContext}>
            <Form.Dropdown.Item value="" title="None" />
            {(lists?.contexts ?? []).map((c) => (
              <Form.Dropdown.Item key={c} value={c} title={c} />
            ))}
          </Form.Dropdown>
          {mode !== "workflow" && (
            <Form.TextField
              id="session"
              ref={fieldRef("session")}
              title={FIELD_TITLE.session}
              placeholder="New or existing session name"
              value={session}
              error={errors.session}
              onChange={(v) => {
                setSession(v);
                setErrors((e) => ({ ...e, session: undefined }));
              }}
            />
          )}
          <Form.Dropdown
            id="vendor"
            title="Vendor"
            value={vendor}
            onChange={(v) => {
              setVendor(v);
              // A model under another vendor would no longer be in the list.
              if (v && parsePairKey(model)?.vendor !== v) setModel("");
            }}
            info="Narrows the Model list. Sent only with a model."
          >
            <Form.Dropdown.Item value="" title="Any vendor" />
            {vendors.map((v) => (
              <Form.Dropdown.Item key={v} value={v} title={v} />
            ))}
          </Form.Dropdown>
          <Form.Dropdown
            id="model"
            title="Model"
            value={model}
            onChange={setModel}
            info={
              workflow
                ? "Used by steps that set no model of their own; a step's model wins. A config's model wins over this."
                : `${pinned ? `Pinned for ${pattern}: ${pinned.model} (${pinned.vendor}). ` : ""}A config's model wins over this. "Let fabric choose" uses fabric's per-pattern setting, else its default.`
            }
          >
            <Form.Dropdown.Item value="" title="Let fabric choose" />
            {/* The pin is an item until the list holds it: while `-L` loads (up to ~1 s) and when fabric no
                longer lists it. A value with no matching item could be reset by Raycast (review, 2026-10-19). */}
            {pinned && !modelRows.some((r) => pairKey(r) === pairKey(pinned)) && (
              <Form.Dropdown.Item
                value={pairKey(pinned)}
                title={`${pinned.model} (pinned; ${pinned.vendor} doesn't list it)`}
              />
            )}
            {modelGroups.map(([v, rows]) => (
              <Form.Dropdown.Section key={v} title={v}>
                {rows.map((r) => (
                  <Form.Dropdown.Item key={pairKey(r)} value={pairKey(r)} title={r.model} />
                ))}
              </Form.Dropdown.Section>
            ))}
          </Form.Dropdown>
          <Form.Dropdown
            id="thinking"
            title="Thinking"
            value={thinking}
            onChange={(v) => {
              setThinking(v);
              setErrors((e) => ({ ...e, thinking: undefined }));
            }}
            info="How hard the model reasons. A token count works for Anthropic and Gemini models."
          >
            <Form.Dropdown.Item value="" title="Model default" />
            {THINKING_LEVELS.map((t) => (
              <Form.Dropdown.Item key={t} value={t} title={t[0].toUpperCase() + t.slice(1)} />
            ))}
            <Form.Dropdown.Item value="tokens" title="Token count…" />
          </Form.Dropdown>
          {thinking === "tokens" && (
            <Form.TextField
              id="thinkingTokens"
              ref={fieldRef("thinking")}
              title={FIELD_TITLE.thinking}
              placeholder="e.g. 4096"
              value={thinkingTokens}
              error={errors.thinking}
              onChange={(v) => {
                setThinkingTokens(v);
                setErrors((e) => ({ ...e, thinking: undefined }));
              }}
            />
          )}
          <Form.Checkbox
            id="search"
            title="Web Search"
            label="Let the model search the web"
            value={search}
            onChange={setSearch}
            info="Anthropic, OpenAI, Gemini and Grok models only."
          />
        </>
      )}
    </Form>
  );
}
