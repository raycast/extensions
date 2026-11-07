import { Action, ActionPanel, Detail, Form, Icon, useNavigation } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useEffect, useRef, useState } from "react";
import { executeInstruction, prepareInstruction } from "./lib/automation";
import type { PreparedInstruction } from "./lib/automation";
import { formatInstructionPreview } from "./lib/instruction-preview";
import { describeRokuError } from "./lib/roku";
import InstructionsSettings from "./roku-instructions";
import RokuRoutines from "./roku-routines";

export default function RokuCommand() {
  const { push } = useNavigation();
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(false);
  const busy = useRef(false);
  async function preview(values: { instruction: string }) {
    if (busy.current) return;
    busy.current = true;
    setLoading(true);
    setError(undefined);
    try {
      const prepared = await prepareInstruction(values.instruction);
      push(<InstructionPreview prepared={prepared} preview={formatInstructionPreview(prepared)} />);
    } catch (cause) {
      setError(describeRokuError(cause));
    } finally {
      busy.current = false;
      setLoading(false);
    }
  }
  return (
    <Form
      isLoading={loading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Preview Instruction" icon={Icon.Eye} onSubmit={preview} />
          <Action.Push
            title="Edit Room and App Aliases"
            icon={Icon.Gear}
            target={<InstructionsSettings navigationTitle="Roku Instruction Settings" />}
          />
          <Action.Push
            title="Manage Routines"
            icon={Icon.List}
            target={<RokuRoutines navigationTitle="Roku Routines" />}
          />
        </ActionPanel>
      }
    >
      <Form.Description
        title="Free local commands"
        text="Use supported English commands or a saved routine name. Your instruction stays on this Mac. Review the resolved TVs and actions before running."
      />
      <Form.TextArea
        id="instruction"
        title="Instruction"
        placeholder="Open YouTube in the kitchen"
        error={error}
        onChange={() => setError(undefined)}
      />
      <Form.Description
        title="Examples"
        text={
          "Open Netflix on Living Room\nSwitch Living Room to PS5\nLower volume three steps on Living Room\nRun Gaming mode\nGo back to what was open\nToggle mute on Living Room"
        }
      />
      <Form.Description
        title="Multiple actions"
        text="Join commands with “then.” Name the TV in each command, or that command uses your default TV. Room aliases and apps must be configured or match saved names."
      />
    </Form>
  );
}

function InstructionPreview({ prepared, preview }: { prepared: PreparedInstruction; preview: string[] }) {
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState<string>();
  const [result, setResult] = useState<string>();
  const controller = useRef<AbortController | undefined>(undefined);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      controller.current?.abort();
    };
  }, []);
  async function run() {
    if (controller.current) return;
    const abort = new AbortController();
    controller.current = abort;
    setRunning(true);
    setResult(undefined);
    try {
      const outcome = await executeInstruction(prepared, {
        signal: abort.signal,
        onProgress: (message) => {
          if (mounted.current) setProgress(message);
        },
      });
      if (mounted.current)
        setResult(
          `**${outcome.status === "completed" ? "Completed" : outcome.status === "cancelled" ? "Cancelled" : outcome.status === "unconfirmed" ? "Stopped: outcome unconfirmed" : "Stopped after an error"}**\n\n${outcome.results.map((line) => `- ${line}`).join("\n")}`,
        );
    } catch (error) {
      if (mounted.current) setResult(`**Nothing further ran.**\n\n${describeRokuError(error)}`);
      await showFailureToast(describeRokuError(error), { title: "Instruction stopped" });
    } finally {
      controller.current = undefined;
      if (mounted.current) {
        setRunning(false);
        setProgress(undefined);
      }
    }
  }
  const displayedSteps = preview
    .map((block, index) => {
      const prefix = `${index + 1}. `;
      return prefix + block.replaceAll("\n", `\n${" ".repeat(prefix.length)}`);
    })
    .join("\n\n");
  const markdown = `# Instruction preview\n\n${displayedSteps}\n\n${running ? `**Running:** ${progress ?? "Checking current settings…"}` : (result ?? "Ready to run. No commands have been sent.")}`;
  return (
    <Detail
      navigationTitle="Roku Instruction"
      isLoading={running}
      markdown={markdown}
      actions={
        <ActionPanel>
          {running ? (
            <Action title="Cancel Remaining Actions" icon={Icon.Stop} onAction={() => controller.current?.abort()} />
          ) : (
            <Action title={result ? "Run Again" : "Run Instruction"} icon={Icon.Play} onAction={run} />
          )}
        </ActionPanel>
      }
    />
  );
}
