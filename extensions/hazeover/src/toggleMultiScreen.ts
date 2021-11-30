import { runAppleScriptSilently } from "./utils";

export default async () => {
  await runAppleScriptSilently('tell application "HazeOver" to set multiScreen to not multiScreen', false);
};
