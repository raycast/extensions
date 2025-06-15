import { runAppleScript } from "run-applescript";

export const startPomodoro = async () => {
  const script = `tell application "JustFocus"
     start pomodoro
end tell`;

  try {
    await stop();
    await runAppleScript(script);
  } catch (e) {
    console.error(String(e));
  }
};

export const stop = async () => {
  const script = `tell application "JustFocus"
     stop
end tell`;

  try {
    await runAppleScript(script);
  } catch (e) {
    console.error(String(e));
  }
};

export const shortBreak = async () => {
  const script = `tell application "JustFocus"
     short break
end tell`;

  try {
    await stop();
    await runAppleScript(script);
  } catch (e) {
    console.error(String(e));
  }
};

export const longBreak = async () => {
  const script = `tell application "JustFocus"
     long break
end tell`;

  try {
    await stop();
    await runAppleScript(script);
  } catch (e) {
    console.error(String(e));
  }
};
