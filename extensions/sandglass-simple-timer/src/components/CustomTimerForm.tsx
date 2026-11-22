import { Action, ActionPanel, Form, Icon, useNavigation } from "@raycast/api";
import { useState } from "react";
import { parseDuration } from "../lib/parse.ts";
import { startTimer } from "../lib/timer-service.ts";
import type { SandglassState } from "../lib/types.ts";

const HINT = "Try 25, 1h 30m, 10:00 or at 15:30";

export function CustomTimerForm({ onStarted }: { onStarted: (state: SandglassState) => void }) {
  const { pop } = useNavigation();
  const [error, setError] = useState<string | undefined>();

  const check = (value: string | undefined) => setError(value && !parseDuration(value) ? HINT : undefined);

  function submit(values: { duration: string; label: string }) {
    const parsed = parseDuration(values.duration);
    if (!parsed) {
      setError(HINT);
      return;
    }
    const label = values.label.trim() || parsed.label;
    const state = startTimer(parsed.ms, label, true);
    pop();
    onStarted(state);
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Start Timer" icon={Icon.Play} onSubmit={submit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="duration"
        title="Duration"
        placeholder="e.g. 25, 1h 30m, 10:00 or at 15:30"
        autoFocus
        error={error}
        onChange={check}
        onBlur={(event) => check(event.target.value)}
      />
      <Form.TextField id="label" title="Label" placeholder="e.g. Tea" />
    </Form>
  );
}
