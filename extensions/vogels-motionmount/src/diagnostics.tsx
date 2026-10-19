import { Action, ActionPanel, Alert, confirmAlert, Detail, Icon } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useEffect, useState } from "react";
import { Diagnostics, getDiagnostics, startDiagnostics } from "./api";

const POLL_INTERVAL_MS = 2000;

const intro = `# Diagnostics

Run the diagnostics if your MotionMount is not working as expected.

During the diagnostics the MotionMount moves from side to side and makes more noise than during normal use. Do not interrupt it and keep your Mac within Bluetooth range.`;

function progressBar(step: number, total: number) {
  const filled = Math.round((Math.min(step, total) / total) * 20);
  return "▓".repeat(filled) + "░".repeat(20 - filled);
}

function markdown(diagnostics?: Diagnostics) {
  if (!diagnostics) return intro;
  switch (diagnostics.status) {
    case "running":
      return `# Running diagnostics…\n\n\`${progressBar(diagnostics.step ?? 0, diagnostics.totalSteps)}\` step ${diagnostics.step ?? 0} of ${diagnostics.totalSteps}\n\nThe MotionMount is moving. Do not interrupt it.`;
    case "passed":
      return "# ✅ Diagnostics passed\n\nYour MotionMount is working correctly.";
    case "failed":
      return `# ❌ Diagnostics failed\n\nThe MotionMount reported error code ${diagnostics.code}. Contact Vogel's support if the problem persists.`;
  }
}

export default function Command() {
  const [diagnostics, setDiagnostics] = useState<Diagnostics>();

  useEffect(() => {
    if (diagnostics?.status !== "running") return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const next = await getDiagnostics();
        if (!cancelled) setDiagnostics(next);
      } catch {
        if (!cancelled) setDiagnostics({ ...diagnostics });
      }
    }, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [diagnostics]);

  async function start() {
    const confirmed = await confirmAlert({
      title: "Start diagnostics?",
      message: "The MotionMount will move from side to side. Make sure nothing is in its way.",
      primaryAction: { title: "Start", style: Alert.ActionStyle.Default },
    });
    if (!confirmed) return;
    try {
      await startDiagnostics();
      setDiagnostics({ status: "running", step: 0, totalSteps: 15 });
    } catch (error) {
      await showFailureToast(error, { title: "Could not start diagnostics" });
    }
  }

  const isRunning = diagnostics?.status === "running";

  return (
    <Detail
      isLoading={isRunning}
      markdown={markdown(diagnostics)}
      actions={
        !isRunning && (
          <ActionPanel>
            <Action title="Start Diagnostics" icon={Icon.Heartbeat} onAction={start} />
          </ActionPanel>
        )
      }
    />
  );
}
