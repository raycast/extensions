import { Action, ActionPanel, Detail, Form, Icon, Toast, confirmAlert, showToast, useNavigation } from "@raycast/api";
import { useEffect, useState, type JSX } from "react";
import { DateTimeFields, useDateTimeInput } from "./date-time-fields";
import { formatDuration, getDurationSeconds } from "../lib/duration";
import { showFailure } from "../lib/errors";
import { shiftTimeDraft, validateTimeDraft, type TimeDraft, type TimeEndpoint } from "../lib/time-editing";
import { timeEditingMarkdown } from "../lib/time-editing-preview";

export function TimeEditor({
  title,
  initialTimes,
  saveTitle,
  successTitle,
  onSave,
  metadata,
  extraActions,
  note,
}: {
  title: string;
  initialTimes: TimeDraft;
  saveTitle: string;
  successTitle: string;
  onSave: (times: TimeDraft) => Promise<void>;
  metadata?: JSX.Element;
  extraActions?: JSX.Element;
  note?: string;
}) {
  const { pop } = useNavigation();
  const [draft, setDraft] = useState(initialTimes);
  const [endpoint, setEndpoint] = useState<TimeEndpoint>("start");
  const [isSaving, setIsSaving] = useState(false);
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    if (draft.endedAt) return;
    const interval = setInterval(() => setNow(new Date()), 15000);
    return () => clearInterval(interval);
  }, [draft.endedAt]);
  function selectEndpoint(next: TimeEndpoint) {
    if (isSaving) return;
    setEndpoint(next);
  }

  async function adjust(minutes: number) {
    if (isSaving) return;
    try {
      const currentNow = new Date();
      const next = shiftTimeDraft(draft, endpoint, minutes, currentNow);
      const error = validateTimeDraft(next, currentNow);
      if (error) {
        await showToast({ style: Toast.Style.Failure, title: "Cannot adjust time", message: error });
        return;
      }
      setDraft(next);
      setNow(currentNow);
    } catch (error) {
      await showFailure("Could not adjust time", error);
    }
  }

  async function save() {
    if (isSaving) return;
    const error = validateTimeDraft(draft);
    if (error) {
      await showToast({ style: Toast.Style.Failure, title: "Cannot save work time", message: error });
      return;
    }
    setIsSaving(true);
    try {
      const durationMs = (draft.endedAt ? Date.parse(draft.endedAt) : Date.now()) - Date.parse(draft.startedAt);
      if (draft.endedAt ? durationMs > 24 * 60 * 60000 : durationMs >= 24 * 60 * 60000) {
        const confirmed = await confirmAlert({
          title: draft.endedAt ? "Save a log longer than 24 hours?" : "Set a start time at least 24 hours ago?",
          message: "Check the dates and times before continuing.",
          primaryAction: { title: "Save Anyway" },
        });
        if (!confirmed) return;
      }
      await onSave(draft);
      await showToast({ style: Toast.Style.Success, title: successTitle });
      pop();
    } catch (error) {
      await showFailure("Failed to save work time", error);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Detail
      navigationTitle={title}
      isLoading={isSaving}
      markdown={`${timeEditingMarkdown(draft, endpoint, now)}\n\n←/→ ±1m · ⇧←/→ ±1h\n\n${draft.endedAt ? "↑/↓ Start / End · " : ""}↵ Save\n\n${note ?? "Preview · Enter to save"}`}
      metadata={metadata ? <Detail.Metadata>{metadata}</Detail.Metadata> : undefined}
      actions={
        <ActionPanel>
          <Action key="save" title={saveTitle} icon={Icon.Checkmark} onAction={save} />
          {!isSaving ? (
            <>
              <Action.Push
                title="Enter Exact Time"
                icon={Icon.Pencil}
                target={<ExactTimeForm times={draft} onApply={setDraft} />}
              />
              {draft.endedAt ? (
                <ActionPanel.Section title="Choose Time">
                  <Action
                    title="Focus Start Time"
                    icon={Icon.ArrowUp}
                    shortcut={{ modifiers: [], key: "arrowUp" }}
                    onAction={() => selectEndpoint("start")}
                  />
                  <Action
                    title="Focus End Time"
                    icon={Icon.ArrowDown}
                    shortcut={{ modifiers: [], key: "arrowDown" }}
                    onAction={() => selectEndpoint("end")}
                  />
                  <Action
                    title={endpoint === "start" ? "Adjust End Time" : "Adjust Start Time"}
                    icon={Icon.Switch}
                    shortcut={{ modifiers: ["cmd"], key: "t" }}
                    onAction={() => selectEndpoint(endpoint === "start" ? "end" : "start")}
                  />
                </ActionPanel.Section>
              ) : null}
              <ActionPanel.Section title={`Adjust ${endpoint === "start" ? "Start" : "End"}`}>
                <Action
                  title="Move 1 Minute Earlier"
                  icon={Icon.ArrowLeft}
                  shortcut={{ modifiers: [], key: "arrowLeft" }}
                  onAction={() => adjust(-1)}
                />
                <Action
                  title="Move 1 Minute Later"
                  icon={Icon.ArrowRight}
                  shortcut={{ modifiers: [], key: "arrowRight" }}
                  onAction={() => adjust(1)}
                />
                <Action
                  title="Move 1 Hour Earlier"
                  icon={Icon.ArrowLeft}
                  shortcut={{ modifiers: ["shift"], key: "arrowLeft" }}
                  onAction={() => adjust(-60)}
                />
                <Action
                  title="Move 1 Hour Later"
                  icon={Icon.ArrowRight}
                  shortcut={{ modifiers: ["shift"], key: "arrowRight" }}
                  onAction={() => adjust(60)}
                />
              </ActionPanel.Section>
              {extraActions}
            </>
          ) : null}
        </ActionPanel>
      }
    />
  );
}

function ExactTimeForm({ times, onApply }: { times: TimeDraft; onApply: (times: TimeDraft) => void }) {
  const { pop } = useNavigation();
  const [initialTimes] = useState(times);
  const startInput = useDateTimeInput(new Date(initialTimes.startedAt));
  const endInput = useDateTimeInput(new Date(initialTimes.endedAt ?? Date.now()));
  const clearEndError = endInput.setRangeError;
  const startTime = startInput.value?.getTime();
  useEffect(() => clearEndError(undefined), [clearEndError, startTime]);
  const previewEnd = initialTimes.endedAt ? endInput.value : new Date();
  const duration =
    startInput.value && previewEnd && previewEnd >= startInput.value
      ? formatDuration(getDurationSeconds(startInput.value, previewEnd))
      : "—";

  function apply() {
    const startedAt = startInput.validate();
    const endedAt = initialTimes.endedAt ? endInput.validate() : undefined;
    if (!startedAt || (initialTimes.endedAt && !endedAt)) return;
    const next: TimeDraft = {
      startedAt: startedAt.toISOString(),
      ...(endedAt ? { endedAt: endedAt.toISOString() } : {}),
    };
    const error = validateTimeDraft(next);
    if (error) {
      (initialTimes.endedAt ? endInput : startInput).setRangeError(error);
      return;
    }
    onApply(next);
    pop();
  }

  return (
    <Form
      navigationTitle="Enter Exact Time"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Apply to Preview" onSubmit={apply} />
        </ActionPanel>
      }
    >
      <DateTimeFields id="start" title="Start" input={startInput} />
      {initialTimes.endedAt ? <DateTimeFields id="end" title="End" input={endInput} /> : null}
      <Form.Description title={initialTimes.endedAt ? "Duration" : "Elapsed After Change"} text={duration} />
      <Form.Description text="Apply returns to the numeric preview. Your record is updated only when you choose Save." />
    </Form>
  );
}
