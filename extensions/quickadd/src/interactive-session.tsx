import {
  Action,
  ActionPanel,
  Detail,
  Form,
  Icon,
  List,
  open,
  Keyboard,
} from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useEffect, useRef, useState } from "react";
import { FieldControl, customItemId } from "./form-field";
import {
  type FieldSpec,
  fieldSpecFromForm,
  fieldSpecFromPrompt,
  readField,
} from "./lib/fields";
import {
  type Handoff,
  type InteractiveSession,
  type PendingPrompt,
  type PromptSpec,
  type ReplyValue,
  type SessionDriver,
  type SessionEnd,
  type SessionState,
  driveSession,
  initialState,
} from "./lib/interactive";
import { obsidianOpenUrl } from "./lib/obsidianCli";
import type { Vault } from "./lib/vaults";

export const STALL_MS = 3000;

export function InteractiveSessionView({
  vault,
  choiceName,
  session,
  handoff,
  onEnd,
}: {
  vault: Vault;
  choiceName: string;
  session: InteractiveSession;
  handoff?: Handoff;
  onEnd: (end: SessionEnd) => void;
}) {
  const [phase, setPhase] = useState(() => initialState(handoff));
  const [stalled, setStalled] = useState(handoff?.kind === "poll");
  const driverRef = useRef<SessionDriver | null>(null);

  useEffect(() => {
    let driver: SessionDriver | undefined;
    // Raycast runs effects twice in development. Starting after a tick keeps the
    // throwaway first mount's cleanup from aborting the run.
    const timer = setTimeout(() => {
      driver = driveSession(session, {
        handoff,
        onChange: (state) => {
          setPhase(state);
          setStalled(false);
          if (state.state === "done" || state.state === "cancelled") {
            onEnd(state);
          }
          if (state.state === "failed") {
            showFailureToast(new Error(state.message), {
              title: `${choiceName} failed`,
            });
          }
        },
      });
      driverRef.current = driver;
    });
    return () => {
      clearTimeout(timer);
      driver?.cancelQuietly();
    };
  }, [session]);

  const waiting = phase.state === "connecting" || phase.state === "working";
  useEffect(() => {
    if (stalled || !waiting) return;
    const timer = setTimeout(() => setStalled(true), STALL_MS);
    return () => clearTimeout(timer);
  }, [phase, stalled]);

  const onCancel = () => driverRef.current?.cancel();

  if (phase.state === "prompt") {
    return (
      <PromptView
        key={phase.pending.requestId}
        pending={phase.pending}
        vault={vault}
        choiceName={choiceName}
        onAnswer={(value) => driverRef.current?.answer(value)}
        onCancel={onCancel}
      />
    );
  }

  return (
    <List
      isLoading={waiting && !stalled}
      navigationTitle={choiceName}
      searchBarPlaceholder={`Running ${choiceName}...`}
      actions={
        waiting ? (
          <ActionPanel>
            <Action
              title="Open Obsidian"
              icon={Icon.AppWindow}
              shortcut={Keyboard.Shortcut.Common.Open}
              onAction={() => open(obsidianOpenUrl(vault))}
            />
            <CancelAction onCancel={onCancel} />
          </ActionPanel>
        ) : undefined
      }
    >
      <List.EmptyView
        icon={phase.state === "failed" ? Icon.ExclamationMark : Icon.Wand}
        title={emptyTitle(phase)}
        description={
          phase.state === "failed"
            ? phase.message
            : waiting && stalled
              ? "QuickAdd may be asking something in Obsidian, such as a Templater prompt."
              : undefined
        }
      />
    </List>
  );
}

function emptyTitle(phase: Exclude<SessionState, { state: "prompt" }>): string {
  switch (phase.state) {
    case "connecting":
      return "Starting...";
    case "working":
      return "Working...";
    case "failed":
      return "Run failed";
    case "done":
      return "Done";
    case "cancelled":
      return "Canceled";
  }
}

interface PromptProps {
  pending: PendingPrompt;
  vault: Vault;
  choiceName: string;
  onAnswer: (value: ReplyValue) => void;
  onCancel: () => void;
}

function PromptView(props: PromptProps) {
  const { prompt } = props.pending;
  switch (prompt.type) {
    case "suggester":
      return <SuggesterPrompt {...props} prompt={prompt} />;
    case "input":
    case "date":
    case "multiselect": {
      const spec = fieldSpecFromPrompt(prompt);
      return (
        <FormPrompt
          vault={props.vault}
          choiceName={props.choiceName}
          onCancel={props.onCancel}
          specs={[spec]}
          onSubmit={(values) => props.onAnswer(values[spec.id])}
        />
      );
    }
    case "confirm":
      return <ConfirmPrompt {...props} prompt={prompt} />;
    case "checkbox":
      return <CheckboxPrompt {...props} prompt={prompt} />;
    case "info":
      return <InfoPrompt {...props} prompt={prompt} />;
    case "form":
      return (
        <FormPrompt
          vault={props.vault}
          choiceName={props.choiceName}
          onCancel={props.onCancel}
          specs={prompt.fields.map(fieldSpecFromForm)}
          onSubmit={props.onAnswer}
        />
      );
    case "unknown":
      return <UnsupportedPrompt {...props} prompt={prompt} />;
  }
}

function CancelAction({ onCancel }: { onCancel: () => void }) {
  return (
    <Action
      title="Cancel Run"
      icon={Icon.XMarkCircle}
      style={Action.Style.Destructive}
      shortcut={{ modifiers: ["cmd", "shift"], key: "backspace" }}
      onAction={onCancel}
    />
  );
}

function SuggesterPrompt({
  prompt,
  choiceName,
  onAnswer,
  onCancel,
}: PromptProps & { prompt: Extract<PromptSpec, { type: "suggester" }> }) {
  const [search, setSearch] = useState("");
  const trimmed = search.trim();
  const canUseCustom =
    prompt.allowCustomInput &&
    trimmed.length > 0 &&
    !prompt.items.some(
      (item) => item.title === trimmed || item.value === trimmed,
    );

  return (
    <List
      navigationTitle={choiceName}
      searchBarPlaceholder={prompt.placeholder ?? "Select an option"}
      onSearchTextChange={setSearch}
      filtering
    >
      {canUseCustom && (
        <List.Item
          icon={Icon.Plus}
          title={`Use "${trimmed}"`}
          actions={
            <ActionPanel>
              <Action
                title="Use Custom Value"
                icon={Icon.Plus}
                onAction={() => onAnswer(trimmed)}
              />
              <CancelAction onCancel={onCancel} />
            </ActionPanel>
          }
        />
      )}
      <List.Section title={prompt.placeholder ?? "Options"}>
        {prompt.items.map((item, index) => (
          <List.Item
            key={`${item.value}-${index}`}
            icon={Icon.Dot}
            title={item.title}
            actions={
              <ActionPanel>
                <Action
                  title="Select"
                  icon={Icon.Check}
                  onAction={() => onAnswer(item.value)}
                />
                <CancelAction onCancel={onCancel} />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}

function ConfirmPrompt({
  prompt,
  choiceName,
  onAnswer,
  onCancel,
}: PromptProps & { prompt: Extract<PromptSpec, { type: "confirm" }> }) {
  return (
    <List navigationTitle={choiceName} searchBarPlaceholder={prompt.header}>
      <List.Section title={prompt.header} subtitle={prompt.text}>
        <List.Item
          icon={Icon.CheckCircle}
          title="Yes"
          actions={
            <ActionPanel>
              <Action
                title="Yes"
                icon={Icon.CheckCircle}
                onAction={() => onAnswer(true)}
              />
              <CancelAction onCancel={onCancel} />
            </ActionPanel>
          }
        />
        <List.Item
          icon={Icon.Circle}
          title="No"
          actions={
            <ActionPanel>
              <Action
                title="No"
                icon={Icon.Circle}
                onAction={() => onAnswer(false)}
              />
              <CancelAction onCancel={onCancel} />
            </ActionPanel>
          }
        />
      </List.Section>
    </List>
  );
}

function CheckboxPrompt({
  prompt,
  choiceName,
  onAnswer,
  onCancel,
}: PromptProps & { prompt: Extract<PromptSpec, { type: "checkbox" }> }) {
  return (
    <Form
      navigationTitle={choiceName}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Submit"
            icon={Icon.Check}
            onSubmit={(values: Record<string, boolean>) =>
              onAnswer(
                prompt.items
                  .filter((_item, index) => values[`item-${index}`])
                  .map((item) => item.value),
              )
            }
          />
          <CancelAction onCancel={onCancel} />
        </ActionPanel>
      }
    >
      {prompt.header ? <Form.Description text={prompt.header} /> : null}
      {prompt.items.map((item, index) => (
        <Form.Checkbox
          key={`${item.value}-${index}`}
          id={`item-${index}`}
          label={item.title}
          defaultValue={item.checked}
        />
      ))}
    </Form>
  );
}

function InfoPrompt({
  prompt,
  choiceName,
  onAnswer,
  onCancel,
}: PromptProps & { prompt: Extract<PromptSpec, { type: "info" }> }) {
  const markdown = `# ${prompt.header}\n\n${prompt.text.join("\n\n")}`;
  return (
    <Detail
      navigationTitle={choiceName}
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action
            title="Continue"
            icon={Icon.ArrowRight}
            onAction={() => onAnswer(true)}
          />
          <CancelAction onCancel={onCancel} />
        </ActionPanel>
      }
    />
  );
}

function UnsupportedPrompt({
  prompt,
  choiceName,
  onCancel,
}: PromptProps & { prompt: Extract<PromptSpec, { type: "unknown" }> }) {
  return (
    <Detail
      navigationTitle={choiceName}
      markdown={`# Update the extension\n\nQuickAdd asked for a \`${prompt.wireType}\` prompt, which this version of the extension cannot show. Update the extension to answer it.`}
      actions={
        <ActionPanel>
          <CancelAction onCancel={onCancel} />
        </ActionPanel>
      }
    />
  );
}

function FormPrompt({
  specs,
  vault,
  choiceName,
  onSubmit,
  onCancel,
}: {
  specs: FieldSpec[];
  vault: Vault;
  choiceName: string;
  onSubmit: (values: Record<string, string | string[]>) => void;
  onCancel: () => void;
}) {
  const [errors, setErrors] = useState<(string | undefined)[]>([]);

  function handleSubmit(values: Record<string, unknown>) {
    const reads = specs.map((spec, index) => {
      const id = formItemId(index);
      return readField(spec, values[id], values[customItemId(id)]);
    });
    setErrors(reads.map((read) => (read.ok ? undefined : read.error)));
    const reply: Record<string, string | string[]> = {};
    for (const [index, read] of reads.entries()) {
      if (!read.ok) return;
      reply[specs[index].id] = read.value;
    }
    onSubmit(reply);
  }

  return (
    <Form
      navigationTitle={choiceName}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Submit"
            icon={Icon.Check}
            onSubmit={handleSubmit}
          />
          <CancelAction onCancel={onCancel} />
        </ActionPanel>
      }
    >
      {specs.map((spec, index) => (
        <FieldControl
          key={formItemId(index)}
          id={formItemId(index)}
          spec={spec}
          vault={vault}
          error={errors[index]}
          onChange={() =>
            setErrors((current) =>
              current[index] ? current.with(index, undefined) : current,
            )
          }
        />
      ))}
    </Form>
  );
}

/**
 * Form item ids are positional: QuickAdd field ids such as a {{FILE:...}}
 * token's contain characters that stop Raycast from submitting the form.
 */
function formItemId(index: number): string {
  return `field-${index}`;
}
