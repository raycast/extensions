import { getPreferenceValues, LocalStorage } from "@raycast/api";
import { exec } from "child_process";

const KEY_CODES = {
  up: "126",
  down: "125",
  left: "123",
  right: "124",
};

async function startAutoscroll(key: "up" | "down" | "left" | "right") {
  const pid = await LocalStorage.getItem("autoscrollID");
  if (pid) {
    await stopAutoscroll();
  }
  const interval = getPreferenceValues().autoscrollSpeed;
  const command = `while :; do osascript -e 'tell application "System Events" to keystroke (key code ${KEY_CODES[key]})'; sleep ${interval}; done`;
  const child_process = exec(command, (error, stderr) => {
    if (error) {
      console.log(`error: ${error.message}`);
      return;
    }
    if (stderr) {
      console.log(`stderr: ${stderr}`);
      return;
    }
  });
  await LocalStorage.setItem("autoscrollID", child_process.pid ? child_process.pid : -99);
}

async function stopAutoscroll() {
  const pid = await LocalStorage.getItem("autoscrollID");
  const command = `kill ${pid}`;
  exec(command, (error, stderr) => {
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

export { startAutoscroll, stopAutoscroll };
