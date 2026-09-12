import { runAppleScriptSilentlyNoView } from "./utils";

export default async () => {
  await runAppleScriptSilentlyNoView('tell application "HazeOver" to set enabled to not enabled');
};
