import { runAppleScriptSilentlyNoView } from "./utils";

export default async () => {
  await runAppleScriptSilentlyNoView('tell application "HazeOver" to set multiScreen to not multiScreen');
};
