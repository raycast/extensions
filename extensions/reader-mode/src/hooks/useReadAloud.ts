import { execFile } from "child_process";
import { showError } from "@chrismessina/raycast-kit/toast";
import { crossLaunchCommand } from "raycast-cross-extension";
import { useEffect, useState } from "react";
import { LaunchType, open, showToast, Toast } from "@raycast/api";
import { isMacOS } from "../utils/host-api";
import { isSayRunning, readAloudText, SAY_EXTENSION } from "../utils/read-aloud";

const POLL_MS = 1000;
// Say can take seconds to start speaking, as it loads voices and resolves the audio device.
const STARTUP_TIMEOUT_MS = 10_000;

function checkSayRunning(): Promise<boolean> {
  return new Promise((resolve) => {
    execFile("/bin/ps", ["-axo", "command="], { maxBuffer: 16 * 1024 * 1024 }, (error, stdout) =>
      resolve(!error && isSayRunning(stdout)),
    );
  });
}

function launchSay(name: string, args?: { content: string }) {
  return crossLaunchCommand({
    name,
    type: LaunchType.Background,
    extensionName: SAY_EXTENSION.name,
    ownerOrAuthorName: SAY_EXTENSION.owner,
    arguments: args,
  });
}

/**
 * Read Aloud and Stop Reading Aloud, through the Say extension.
 *
 * On macOS, whether Say is speaking is observed, never remembered: while the reader is open it
 * checks Say's speech process every second, as Say's own Text to Say view does. So Stop shows
 * exactly while Say speaks, including speech that starts late, began before a re-import remounted
 * this view, or was started outside Reader. Windows has no such check: there "speaking" is set by
 * Read Aloud and cleared by Stop.
 */
export function useReadAloud(title: string, bodyMarkdown: string) {
  const [speaking, setSpeaking] = useState(false);
  // Launched, not yet heard. Nothing to stop yet (Say's Stop only ends speech that has begun), so
  // neither action shows.
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    if (!isMacOS) return;
    let active = true;
    let timer: ReturnType<typeof setTimeout>;
    const check = async () => {
      const running = await checkSayRunning();
      if (!active) return;
      setSpeaking(running);
      timer = setTimeout(check, POLL_MS);
    };
    check();
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    if (!starting) return;
    if (speaking) {
      setStarting(false);
      return;
    }
    // Speech that begins after this still gets its Stop action, from the observation above.
    // A fresh toast, not the launch toast: by now another toast may hold the slot.
    const timer = setTimeout(() => {
      setStarting(false);
      showError(new Error("Speech didn't start within 10 seconds."), {
        title: "Read Aloud Didn't Start",
      });
    }, STARTUP_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [starting, speaking]);

  async function stop(): Promise<void> {
    try {
      await launchSay(SAY_EXTENSION.stopCommand);
      setSpeaking(false);
    } catch (error) {
      await showError(error, { title: "Couldn't Stop Read Aloud" });
    }
  }

  async function start(): Promise<void> {
    // Fresh toasts only: the launch can wait on Raycast's permission alert for as long as the user
    // leaves it open, so a toast shown before it could have lost the slot by the time it resolves.
    try {
      await launchSay(SAY_EXTENSION.speakCommand, { content: readAloudText(title, bodyMarkdown) });
      await showToast({ style: Toast.Style.Success, title: "Sent to Read Aloud" });
      if (isMacOS) setStarting(true);
      else setSpeaking(true);
    } catch (error) {
      // launchCommand throws when Say isn't installed, so offer the Store page.
      await showError(error, {
        title: "Couldn't Start Read Aloud",
        action: {
          title: "Install Say",
          onAction: () => open(`raycast://extensions/${SAY_EXTENSION.owner}/${SAY_EXTENSION.name}`),
        },
      });
    }
  }

  return { isReading: speaking && !starting, isIdle: !speaking && !starting, start, stop };
}
