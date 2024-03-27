import { Toast, environment, showToast } from "@raycast/api";
import { createNotification, getTimers, updateTimer } from "./utils";

import { LaunchType } from "@raycast/api";
import { exec } from "child_process";

export default async function Command() {
  const timers = await getTimers();
  const timerCount = timers.length;
  for (const { timeMS, id, inputStr } of timers) {
    // check if timer is still running
    exec(`ps ${id}`, (error, stdout) => {
      if (error) {
        console.error(`exec error: ${error}`);
        return;
      }

      if (!stdout.includes(id.toString())) {
        // timer process is not running, create a new one and update the pid
        const secondsRemaining = 1 + Math.floor((timeMS - new Date().getTime()) / 1000);
        const pid = createNotification(secondsRemaining, inputStr);
        updateTimer(id, { id: pid });
      }
    });
  }

  if (environment.launchType === LaunchType.UserInitiated)
    await showToast(Toast.Style.Success, `${timerCount} alarm${timerCount === 1 ? "" : "s"} refreshed`);
}
