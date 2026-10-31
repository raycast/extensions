import { Action, ActionPanel, Detail, Icon, Keyboard } from "@raycast/api";
import { useCallback, useEffect, useState } from "react";
import { clearTimer, pauseTimer, resumeTimer, settleExpired, startTimer } from "./lib/actions";
import { loadState } from "./lib/store";
import { DURATIONS, formatRemaining, KIND_LABEL, remaining, TimerState } from "./lib/timer";

export default function Command() {
  const [state, setState] = useState<TimerState | null | undefined>(undefined);
  const [now, setNow] = useState(Date.now());

  const refresh = useCallback(async () => setState(await loadState()), []);

  useEffect(() => {
    refresh();
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [refresh]);

  // Fire the notification the moment the countdown hits zero while the view is open.
  useEffect(() => {
    if (state?.status === "running" && state.endsAt <= now) {
      settleExpired().then(setState);
    }
  }, [state, now]);

  const run = (action: () => Promise<unknown>) => async () => {
    await action();
    await refresh();
  };

  const startActions = (
    <ActionPanel.Section title="Start">
      <Action
        title="Start Focus (25 Min)"
        icon={Icon.Clock}
        onAction={run(() => startTimer("focus", DURATIONS.focus))}
      />
      <Action title="Start Break (5 Min)" icon={Icon.Mug} onAction={run(() => startTimer("break", DURATIONS.break))} />
      <Action
        title="Start Long Break (15 Min)"
        icon={Icon.Moon}
        onAction={run(() => startTimer("long-break", DURATIONS["long-break"]))}
      />
    </ActionPanel.Section>
  );

  if (state === undefined) return <Detail isLoading />;

  if (!state) {
    return (
      <Detail
        markdown={"# No timer\n\nStart a focus or break session from the actions."}
        actions={<ActionPanel>{startActions}</ActionPanel>}
      />
    );
  }

  const label = KIND_LABEL[state.kind];
  const left = formatRemaining(remaining(state, now));
  const statusText = { running: "Running", paused: "Paused", finished: "Finished" }[state.status];
  const markdown =
    state.status === "finished" ? `# ${label} finished\n\n## 00:00` : `# ${left}\n\n## ${label} · ${statusText}`;

  return (
    <Detail
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Timer" text={label} />
          <Detail.Metadata.Label title="Status" text={statusText} />
          <Detail.Metadata.Label title="Length" text={formatRemaining(state.durationMs)} />
          {state.status === "running" && (
            <Detail.Metadata.Label title="Ends at" text={new Date(state.endsAt).toLocaleTimeString()} />
          )}
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          {state.status === "running" && <Action title="Pause" icon={Icon.Pause} onAction={run(pauseTimer)} />}
          {state.status === "paused" && <Action title="Resume" icon={Icon.Play} onAction={run(resumeTimer)} />}
          {startActions}
          <Action
            title="Clear Timer"
            icon={Icon.XMarkCircle}
            style={Action.Style.Destructive}
            shortcut={Keyboard.Shortcut.Common.Remove}
            onAction={run(clearTimer)}
          />
        </ActionPanel>
      }
    />
  );
}
