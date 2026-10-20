import { Action, ActionPanel, Alert, confirmAlert, Detail, environment, Icon } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useEffect, useRef, useState } from "react";
import { Diagnostics, getDiagnostics, startDiagnostics } from "./api";
import { progress, svgMarkdown } from "./illustration";

const POLL_INTERVAL_MS = 2000;
const MAX_FAILED_POLLS = 3;

const intro = `## Diagnostics

Checks that the motors and sensors of your MotionMount work correctly.

The TV moves from side to side and makes more noise than usual. Keep your Mac nearby until it finishes.`;

function markdown(diagnostics?: Diagnostics, lostContact?: string) {
  if (lostContact)
    return `## Lost Contact\n\n${lostContact}\n\nThe diagnostics may still be running. Check again once your Mac is within Bluetooth range.`;
  if (!diagnostics) return intro;
  switch (diagnostics.status) {
    case "running":
      return `## Running Diagnostics…\n\nStep ${diagnostics.step ?? 0} of ${diagnostics.totalSteps}\n\n${svgMarkdown(progress(diagnostics.step ?? 0, diagnostics.totalSteps, environment.appearance))}`;
    case "passed":
      return "## Diagnostics Passed\n\nYour MotionMount is working correctly.";
    case "failed":
      return `## Diagnostics Failed\n\nYour MotionMount reported error ${diagnostics.code}. If this keeps happening, contact Vogel's support.`;
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
