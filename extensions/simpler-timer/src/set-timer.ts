import { showToast, Toast, LaunchProps } from "@raycast/api";
import { preparePrebuilds, notifierPath } from "raycast-notifier";
import { spawn } from "child_process";
import { addTimer, parseTimerInput } from "./utils";
import { randomUUID } from "crypto";

interface Arguments {
  input: string;
}

export default async function Command(props: LaunchProps<{ arguments: Arguments }>) {
  const { input } = props.arguments;
  const parsed = parseTimerInput(input);

  if (!parsed) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Invalid format",
      message: "Format: {time} [content] (e.g. 1h30m Focus)",
    });
    return;
  }

  const { durationInSeconds, originalTimePart, content } = parsed;
  const delayInSeconds = durationInSeconds;

  try {
    // 1. Prepare environment (ensure executable permissions)
    await preparePrebuilds();

    // 2. Escape quotes in content for shell command
    const safeContent = content.replace(/'/g, "'\\''");

    // 3. Construct command
    // Use sh -c to allow chaining sleep and notifier
    // We use nohup or just detached spawn to keep it running
    const commandString = `sleep ${delayInSeconds} && "${notifierPath}" -title "Simpler Timer" -message '${safeContent}'`;

    const child = spawn(commandString, {
      shell: true,
      detached: true,
      stdio: "ignore",
    });
    child.unref();

    if (child.pid) {
      addTimer({
        id: randomUUID(),
        pid: child.pid,
        createdAt: Date.now(),
        duration: delayInSeconds,
        originalInput: input,
        content: content,
        dueTime: Date.now() + delayInSeconds * 1000,
      });
    }

    await showToast({
      style: Toast.Style.Success,
      title: "Timer set",
      message: `Notifying in ${originalTimePart}: ${content}`,
    });
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to set timer",
      message: String(error),
    });
  }
}
