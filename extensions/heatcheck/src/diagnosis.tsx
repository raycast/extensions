import { AI, Action, ActionPanel, Detail, Icon } from "@raycast/api";
import { useEffect, useState } from "react";
import {
  buildVerdict,
  ChecksumMismatchError,
  collectSnapshot,
  formatStatsForAI,
  formatStatsForDisplay,
  type SystemSnapshot,
} from "./system";

const SYSTEM_PROMPT = `You are a concise macOS system diagnostics assistant.
Given real-time stats about a Mac's CPU, fan, temperature, and processes, explain in plain English:
1. What is causing the thermal load or fan activity (if any)
2. Whether it is a concern
3. One actionable suggestion if relevant

Apple Silicon Macs run at 90–100°C under load by design, so a high temperature alone is not a problem. Weigh CPU load, fan effort, and what the processes are doing. Be direct. No bullet points for short answers. Two to four sentences max.`;

type State =
  | { phase: "collecting" }
  | { phase: "analyzing"; stats: SystemSnapshot }
  | { phase: "done"; stats: SystemSnapshot; answer: string }
  | { phase: "error"; message: string; security: boolean };

export default function Diagnosis() {
  const [state, setState] = useState<State>({ phase: "collecting" });

  async function run() {
    setState({ phase: "collecting" });
    try {
      const stats = await collectSnapshot();
      setState({ phase: "analyzing", stats });

      const context = formatStatsForAI(stats, buildVerdict(stats));
      const answer = await AI.ask(
        `${SYSTEM_PROMPT}\n\nCurrent system stats:\n${context}\n\nWhat's going on?`,
        {
          creativity: "none",
        },
      );

      setState({ phase: "done", stats, answer });
    } catch (err) {
      const security = err instanceof ChecksumMismatchError;
      const message = err instanceof Error ? err.message : String(err);
      setState({ phase: "error", message, security });
    }
  }

  useEffect(() => {
    run();
  }, []);

  const actions = (
    <ActionPanel>
      <Action
        title="Run Again"
        icon={Icon.RotateClockwise}
        shortcut={{ modifiers: ["cmd"], key: "r" }}
        onAction={run}
      />
    </ActionPanel>
  );

  if (state.phase === "collecting") {
    return (
      <Detail
        isLoading
        markdown="## Collecting system stats…"
        navigationTitle="Heat Check: Diagnosis"
      />
    );
  }

  if (state.phase === "error") {
    const heading = state.security ? "Checksum mismatch" : "Error";
    const hint = state.security
      ? "The downloaded iSMC binary does not match its pinned hash, so Heat Check refused to run it. This points to a corrupted download or a tampered release. Sensor data stays off until a clean copy verifies."
      : "Make sure Raycast AI is enabled in your Raycast Pro settings.";
    return (
      <Detail
        markdown={`## ${heading}\n\n${state.message}\n\n${hint}`}
        navigationTitle="Heat Check: Diagnosis"
        actions={actions}
      />
    );
  }

  const isAnalyzing = state.phase === "analyzing";
  const answer = state.phase === "done" ? state.answer : "";
  const displayStats = formatStatsForDisplay(state.stats);

  const markdown = `
## ${isAnalyzing ? "Analyzing…" : "◆ Diagnosis"}

${isAnalyzing ? "*Reading temperatures, fans, and processes…*" : answer}

---

${displayStats}
`;

  return (
    <Detail
      markdown={markdown}
      isLoading={isAnalyzing}
      navigationTitle="Heat Check: Diagnosis"
      actions={actions}
    />
  );
}
