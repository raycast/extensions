import { buildScriptEnsuringBobIsRunning, runAppleScriptSilently } from "./utils";

export default async () => {
  const script = buildScriptEnsuringBobIsRunning(
    `tell application "Bob"
    launch
    translate " "
end tell
`
  );
  await runAppleScriptSilently(script);
};
