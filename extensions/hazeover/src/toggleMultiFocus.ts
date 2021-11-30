import { runAppleScriptSilently } from "./utils";

export default async () => {
  await runAppleScriptSilently('tell application "HazeOver" to set multiFocus to not multiFocus', false);
};
