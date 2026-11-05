import {
  Action,
  ActionPanel,
  Alert,
  confirmAlert,
  Form,
  getPreferenceValues,
  Icon,
  LocalStorage,
  useNavigation,
  Keyboard,
} from "@raycast/api";
import { useRef, useState } from "react";
import { useDevices } from "../hooks/use-devices";
import { client } from "../lib/ghosthand-client";
import { TaskRun } from "../lib/task-run";
import { canControl } from "../utils/device-status";
import { ErrorView, SetupActions } from "./Setup";
import { TaskProgress } from "./TaskProgress";

export function TaskForm({ phoneId, initialPrompt = "" }: { phoneId?: string; initialPrompt?: string }) {
  const { data, isLoading, error, refresh } = useDevices();
  const [selected, setSelected] = useState(phoneId ?? "");
  const [prompt, setPrompt] = useState(initialPrompt);
  const [validation, setValidation] = useState<string>();
  const [submitting, setSubmitting] = useState(false);
  const submitGuard = useRef(false);
  const { push } = useNavigation();
  const ready = data?.phones.filter((phone) => canControl(phone, data)) ?? [];
  const deviceId = selected || ready[0]?.id || "";

  async function submit() {
    if (submitGuard.current) return;
    if (!prompt.trim()) {
      setValidation("Describe what you want the iPhone to do.");
      return;
    }
    const phone = ready.find((item) => item.id === deviceId);
    if (!phone) {
      setValidation("Choose a ready iPhone. Refresh devices after completing setup or waiting for its lease.");
      return;
    }
    submitGuard.current = true;
    setSubmitting(true);
    try {
      if (!(await LocalStorage.getItem<boolean>("hosted-task-consent-v1"))) {
        const accepted = await confirmAlert({
          title: "Use Ghosthand-hosted AI?",
          message:
            "Ghosthand sends your instruction, screen text, and device information to its hosted agent. The agent can act in your iPhone apps. Local previews, OCR, and quick actions do not use this AI service.",
          primaryAction: { title: "Continue" },
          dismissAction: { title: "Cancel" },
        });
        if (!accepted) return;
        await LocalStorage.setItem("hosted-task-consent-v1", true);
      }
      // Confirm every prompt: high-impact intent cannot be reliably identified by keywords.
      if (
        !(await confirmAlert({
          title: `Run on ${phone.name}?`,
          message: `Instruction:\n${prompt.trim()}\n\nApprove any sending, deletion, purchase, or other consequential action this instruction requests. Stopping does not undo completed actions.`,
          primaryAction: { title: "Run Task", style: Alert.ActionStyle.Default },
          dismissAction: { title: "Cancel" },
        }))
      )
        return;
      const run = new TaskRun(
        client,
        phone,
        prompt.trim(),
        getPreferenceValues<Preferences>().taskResponseMode !== "json",
      );
      push(<TaskProgress run={run} />);
      void run.start();
    } catch (failure) {
      setValidation(failure instanceof Error ? failure.message : "Could not start the task.");
    } finally {
      submitGuard.current = false;
      setSubmitting(false);
    }
  }

  if (error) return <ErrorView error={error} retry={refresh} />;
  return (
    <Form
      isLoading={isLoading || submitting}
      navigationTitle="Run iPhone Task"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Run Task" icon={Icon.Play} onSubmit={submit} />
          <Action
            title="Refresh Devices"
            icon={Icon.ArrowClockwise}
            onAction={refresh}
            shortcut={Keyboard.Shortcut.Common.Refresh}
          />
          <SetupActions />
        </ActionPanel>
      }
    >
      <Form.Description
        title="Ghosthand-hosted AI"
        text="Your instruction and phone screen context are sent to Ghosthand's hosted agent. Review the instruction before running it."
      />
      <Form.Dropdown id="device" title="iPhone" value={deviceId} onChange={setSelected}>
        {selected && !ready.some((phone) => phone.id === selected) && (
          <Form.Dropdown.Item value={selected} title="Selected iPhone unavailable — refresh or choose another" />
        )}
        {ready.map((phone) => (
          <Form.Dropdown.Item
            key={phone.id}
            value={phone.id}
            title={`${phone.name} · ${data?.macName} · ${phone.id.slice(-6)}`}
          />
        ))}
      </Form.Dropdown>
      {!isLoading && !ready.length && (
        <Form.Description
          title="No Ready iPhone"
          text="Connect and unlock your iPhone, complete ghosthand setup, or wait for its current lease to finish. List iPhones shows device details."
        />
      )}
      <Form.TextArea
        id="instruction"
        title="Instruction"
        placeholder="Open Settings and enable Dark Mode."
        value={prompt}
        onChange={(value) => {
          setPrompt(value);
          setValidation(undefined);
        }}
        error={validation}
      />
    </Form>
  );
}
