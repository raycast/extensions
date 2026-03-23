import { useEffect, useState } from "react";
import {
  Detail,
  Action,
  ActionPanel,
  Icon,
  Color,
  showHUD,
  useNavigation,
  Form,
} from "@raycast/api";
import { formatElapsed } from "./utils";
import {
  TimerEntry,
  readState,
  writeState,
  pauseTimer,
  resumeTimer,
  cancelTimer,
} from "./timer-state";

interface Props {
  stopwatchId: string;
}

export function StopwatchRunning({ stopwatchId }: Props) {
  const [sw, setSw] = useState<TimerEntry | null>(null);
  const { pop, push } = useNavigation();

  function refresh() {
    const state = readState();
    const t = state.timers.find((t) => t.id === stopwatchId) ?? null;
    if (!t) {
      pop();
      return;
    }
    setSw((prev) => {
      if (!prev) return t;
      if (prev.elapsed === t.elapsed && prev.status === t.status) return prev;
      return t;
    });
  }

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 500);
    return () => clearInterval(interval);
  }, []);

  async function handleStop() {
    const state = readState();
    const t = state.timers.find((t) => t.id === stopwatchId);
    if (t) {
      const historyEntry = {
        id: t.id,
        label: `Stopwatch ${formatElapsed(t.elapsed)}`,
        note: t.note,
        totalSeconds: t.elapsed,
        dismissedAt: Date.now(),
      };
      state.history = [historyEntry, ...state.history].slice(0, 10);
      state.timers = state.timers.filter((t) => t.id !== stopwatchId);
      writeState(state);
    } else {
      cancelTimer(stopwatchId);
    }
    showHUD("⏹ Stopwatch stopped");
    pop();
  }

  function handlePause() {
    pauseTimer(stopwatchId);
    refresh();
    showHUD("⏸ Stopwatch paused");
  }

  function handleResume() {
    resumeTimer(stopwatchId);
    refresh();
    showHUD("▶ Stopwatch resumed");
  }

  if (!sw) return <Detail markdown="Loading..." />;

  const noteSection = `\n\n---\n\n${sw.note ? sw.note : "> *You can add a note via Actions (Ctrl+K).*"}`;

  const markdown =
    sw.status === "paused"
      ? `<div align="center">\n\n&nbsp;\n\n# ⏸ ${formatElapsed(sw.elapsed)}\n\n&nbsp;\n\n</div>${noteSection}`
      : `<div align="center">\n\n&nbsp;\n\n# ${formatElapsed(sw.elapsed)}\n\n&nbsp;\n\n</div>${noteSection}`;

  return (
    <Detail
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label
            title="Stopwatch"
            text={sw.status === "paused" ? "Paused" : "Running"}
            icon={{
              source: sw.status === "paused" ? Icon.Pause : Icon.Play,
              tintColor: sw.status === "paused" ? Color.Yellow : Color.Green,
            }}
          />
          <Detail.Metadata.Label
            title="Elapsed"
            text={formatElapsed(sw.elapsed)}
            icon={{ source: Icon.Clock, tintColor: Color.Blue }}
          />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action title="Back" icon={Icon.ArrowLeft} onAction={pop} />
          <Action
            title="Stop"
            icon={{ source: Icon.Stop, tintColor: Color.Red }}
            style={Action.Style.Destructive}
            shortcut={{ modifiers: ["ctrl"], key: "return" }}
            onAction={handleStop}
          />
          <ActionPanel.Section>
            <Action
              title={sw.note ? "Edit Note" : "Add Note"}
              icon={sw.note ? Icon.Pencil : Icon.Plus}
              onAction={() =>
                push(
                  <Form
                    navigationTitle={sw.note ? "Edit Note" : "Add Note"}
                    actions={
                      <ActionPanel>
                        <Action.SubmitForm
                          title="Save"
                          onSubmit={(v: { note: string }) => {
                            const state = readState();
                            const t = state.timers.find((t) => t.id === sw.id);
                            if (t) {
                              t.note = v.note;
                              writeState(state);
                            }
                            pop();
                            refresh();
                          }}
                        />
                      </ActionPanel>
                    }
                  >
                    <Form.TextField
                      id="note"
                      title="Note"
                      placeholder="What are you tracking?"
                      defaultValue={sw.note}
                    />
                  </Form>,
                )
              }
            />
          </ActionPanel.Section>
          {sw.status === "running" ? (
            <Action
              title="Pause"
              icon={{ source: Icon.Pause, tintColor: Color.Yellow }}
              shortcut={{ modifiers: [], key: "space" }}
              onAction={handlePause}
            />
          ) : (
            <Action
              title="Resume"
              icon={{ source: Icon.Play, tintColor: Color.Green }}
              shortcut={{ modifiers: [], key: "space" }}
              onAction={handleResume}
            />
          )}
        </ActionPanel>
      }
    />
  );
}
