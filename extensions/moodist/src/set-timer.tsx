import { Action, ActionPanel, Form, Icon, Keyboard, showHUD } from "@raycast/api";
import { showFailureToast, usePromise } from "@raycast/utils";
import { useState } from "react";
import {
  cancelTimer,
  formatMinutes,
  getMix,
  MAX_TIMER_MINUTES,
  playingCount,
  setTimer,
  timerRemaining,
} from "./player";

const DURATIONS = [15, 30, 45, 60, 90, 120];

export default function Command() {
  const { data: mix, isLoading } = usePromise(async () => getMix());
  const [duration, setDuration] = useState("30");
  const [customError, setCustomError] = useState<string>();
  const timer = mix?.timer;

  async function submit(values: { duration: string; custom?: string }) {
    const minutes = Number(values.duration === "custom" ? values.custom : values.duration);
    if (!Number.isInteger(minutes) || minutes < 1 || minutes > MAX_TIMER_MINUTES) {
      setCustomError(`Enter whole minutes from 1 to ${MAX_TIMER_MINUTES}`);
      return;
    }
    try {
      setTimer(minutes);
      await showHUD(`Sleep timer set for ${formatMinutes(minutes)}`);
    } catch (e) {
      await showFailureToast(e, { title: "Could not set timer" });
    }
  }

  return (
    <Form
      isLoading={isLoading}
      navigationTitle="Set Sleep Timer"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Start Timer" icon={Icon.Clock} onSubmit={submit} />
          {timer && (
            <Action
              title="Cancel Timer"
              icon={Icon.XMarkCircle}
              style={Action.Style.Destructive}
              shortcut={Keyboard.Shortcut.Common.Remove}
              onAction={async () => {
                cancelTimer();
                await showHUD("Sleep timer cancelled");
              }}
            />
          )}
        </ActionPanel>
      }
    >
      {timer && <Form.Description title="Current Timer" text={`${timerRemaining(timer)} left`} />}
      {mix && playingCount(mix) === 0 && (
        <Form.Description text="Nothing is playing right now. When the timer ends it pauses whatever is playing." />
      )}
      <Form.Dropdown id="duration" title="Duration" value={duration} onChange={setDuration}>
        {DURATIONS.map((m) => (
          <Form.Dropdown.Item key={m} value={String(m)} title={formatMinutes(m)} />
        ))}
        <Form.Dropdown.Item value="custom" title="Custom…" />
      </Form.Dropdown>
      {duration === "custom" && (
        <Form.TextField
          id="custom"
          title="Minutes"
          placeholder="25"
          error={customError}
          onChange={() => setCustomError(undefined)}
          autoFocus
        />
      )}
    </Form>
  );
}
