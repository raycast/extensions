/*
Script replicating the [startTimer] function in `timerUtils.ts`.

This allows isolated testing of the `osascript` notification system,
which has been shown to be unreliable on some systems.

Run using `node notif-test.mjs`. A banner notification should appear.
*/
import { exec } from "child_process";

async function fireNotif() {
  const timerName = "Test Notif";
  const cmdParts = [];
  cmdParts.push(
      `osascript -e 'display notification "Timer \\"${timerName}\\" complete" with title "Ding!"'`
  );

  exec(cmdParts.join(" && "), (error, stderr) => {
    if (error) {
      console.log(`error: ${error.message}`);
      return;
    }
    if (stderr) {
      console.log(`stderr: ${stderr}`);
      return;
    }
  });
}

fireNotif();
