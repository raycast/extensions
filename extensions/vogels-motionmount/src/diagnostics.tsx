import { Action, ActionPanel, Alert, confirmAlert, Detail, Icon } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useEffect, useRef, useState } from "react";
import { Diagnostics, getDiagnostics, startDiagnostics } from "./api";

const POLL_INTERVAL_MS = 2000;
const MAX_FAILED_POLLS = 3;

const intro = `# Diagnostics

Run the diagnostics if your MotionMount is not working as expected.

During the diagnostics the MotionMount moves from side to side and makes more noise than during normal use. Do not interrupt it and keep your Mac within Bluetooth range.`;

function progressBar(step: number, total: number) {
  const filled = Math.round((Math.min(step, total) / total) * 20);
  return "▓".repeat(filled) + "░".repeat(20 - filled);
}

function markdown(diagnostics?: Diagnostics, lostContact?: string) {
  if (lostContact)
    return `# Lost contact with your MotionMount\n\n${lostContact}\n\nThe diagnostics may still be running on the mount. Check again once it is within Bluetooth range.`;
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
  const [lostContact, setLostContact] = useState<string>();
  const failedPolls = useRef(0);

  useEffect(() => {
    if (diagnostics?.status !== "running" || lostContact) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const next = await getDiagnostics();
        failedPolls.current = 0;
        if (!cancelled) setDiagnostics(next);
      } catch (error) {
        if (cancelled) return;
        failedPolls.current += 1;
        if (failedPolls.current >= MAX_FAILED_POLLS) setLostContact((error as Error).message);
        else setDiagnostics({ ...diagnostics });
      }
    }, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [diagnostics, lostContact]);

  function checkAgain() {
    failedPolls.current = 0;
    setLostContact(undefined);
  }

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

  const isRunning = diagnostics?.status === "running" && !lostContact;

  return (
    <Detail
      isLoading={isRunning}
      markdown={markdown(diagnostics, lostContact)}
      actions={
        lostContact ? (
          <ActionPanel>
            <Action title="Check Again" icon={Icon.RotateClockwise} onAction={checkAgain} />
          </ActionPanel>
        ) : (
          !isRunning && (
            <ActionPanel>
              <Action title="Start Diagnostics" icon={Icon.Heartbeat} onAction={start} />
            </ActionPanel>
          )
        )
      }
    />
  );
}
