import {
  Alert,
  Action,
  ActionPanel,
  confirmAlert,
  environment,
  Form,
  showHUD,
} from "@raycast/api";
import { spawn } from "node:child_process";
import { join } from "node:path";
import { useState } from "react";

type LockEvent = {
  phase: "preparing" | "locked" | "unlocking" | "ready" | "error";
  message: string;
  reason?: string;
};

const durations: Record<string, string> = {
  "600": "10 minutes",
  "1800": "30 minutes",
  "3600": "60 minutes",
  "7200": "2 hours",
  "18000": "5 hours",
  indefinite: "Indefinitely",
};

export async function lockInputs(selectedDuration: string | undefined) {
  if (
    typeof selectedDuration !== "string" ||
    !Object.hasOwn(durations, selectedDuration)
  ) {
    await showHUD("Choose a lock duration before starting Input Lock.");
    return;
  }
  console.log("Input Lock launch");
  const confirmed = await confirmAlert({
    title:
      selectedDuration === "indefinite"
        ? "Lock inputs indefinitely?"
        : `Lock inputs for ${durations[selectedDuration]}?`,
    message:
      "Your screen stays visible and scrolling stays enabled. Hold both Command keys for 3 seconds, release, then use Touch ID. Keep holding for 8 seconds to unlock directly. " +
      (selectedDuration === "indefinite"
        ? "There is no automatic duration release. If the unlock gesture fails, manual recovery may be needed. "
        : `Inputs unlock automatically after ${durations[selectedDuration]}. `) +
      "This is a temporary input guard. Use the macOS lock screen to protect private data.",
    primaryAction: { title: "Lock Inputs" },
    dismissAction: { title: "Cancel", style: Alert.ActionStyle.Cancel },
  });
  if (!confirmed) return;

  await showHUD("Preparing Input Lock…");
  const helper = spawn(
    join(environment.assetsPath, "input-lock"),
    ["--lock", selectedDuration],
    { stdio: ["ignore", "pipe", "pipe"] },
  );
  let pending = "";
  let stderr = "";
  let lastPhase: LockEvent["phase"] | undefined;
  let recovered = false;
  let feedback = Promise.resolve();
  const notify = (message: string) => {
    feedback = feedback
      .then(() => showHUD(message))
      .catch((error) =>
        console.error("Could not show Input Lock status", error),
      );
  };
  const handleRecord = (line: string) => {
    try {
      const event = JSON.parse(line) as LockEvent;
      console.log("Input Lock helper event", event);
      lastPhase = event.phase;
      recovered =
        event.phase === "ready" &&
        (event.reason === "timeout" || event.reason === "watchdog");
      if (event.phase === "locked")
        notify("Typing and clicks blocked. Hold both Command keys to unlock.");
      if (event.phase === "unlocking") notify("Waiting for Touch ID…");
      if (event.phase === "error")
        notify(`Input Lock failed: ${event.message}`);
      if (event.phase === "ready" && event.reason)
        notify(
          event.reason === "timeout"
            ? "Inputs unlocked automatically: duration ended"
            : event.reason === "watchdog"
              ? "Inputs unlocked automatically: helper recovery"
              : event.reason === "touchID"
                ? "Inputs unlocked with Touch ID"
                : "Inputs unlocked",
        );
    } catch {
      console.error("Invalid helper output", line);
    }
  };
  const flushPending = () => {
    if (!pending) return;
    const line = pending;
    pending = "";
    handleRecord(line);
  };

  helper.stdout.setEncoding("utf8");
  helper.stdout.on("data", (chunk: string) => {
    pending += chunk;
    const lines = pending.split("\n");
    pending = lines.pop() ?? "";
    for (const line of lines) handleRecord(line);
  });
  helper.stdout.on("end", flushPending);
  helper.stderr.setEncoding("utf8");
  helper.stderr.on("data", (chunk: string) => (stderr += chunk));

  await new Promise<void>((resolve) => {
    helper.on("error", async (error) => {
      helper.removeAllListeners("close");
      notify(`Input Lock failed: ${error.message}`);
      await feedback;
      resolve();
    });
    helper.on("close", async (code, signal) => {
      flushPending();
      console.log("Input Lock helper exit", {
        code,
        signal,
        lastPhase,
        stderr,
      });
      if (code !== 0 && lastPhase !== "error" && !recovered) {
        const exitReason = signal
          ? `helper terminated by ${signal}`
          : `helper exited ${code}`;
        notify(`Input Lock failed: ${stderr.trim() || exitReason}`);
      }
      await feedback;
      resolve();
    });
  });
}

export default function Command() {
  const [duration, setDuration] = useState("");
  const [error, setError] = useState<string>();
  return (
    <Form
      enableDrafts={false}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Lock Inputs"
            onSubmit={async () => {
              if (!Object.hasOwn(durations, duration)) {
                setError("Choose a duration.");
                return;
              }
              setDuration("");
              await lockInputs(duration);
            }}
          />
        </ActionPanel>
      }
    >
      <Form.Dropdown
        id="duration"
        title="Duration"
        value={duration}
        storeValue={false}
        error={error}
        onChange={(value) => {
          setDuration(value);
          setError(undefined);
        }}
      >
        <Form.Dropdown.Item value="" title="Choose duration" />
        {Object.entries(durations).map(([value, title]) => (
          <Form.Dropdown.Item key={value} value={value} title={title} />
        ))}
      </Form.Dropdown>
    </Form>
  );
}
