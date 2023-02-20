import { LocalStorage, showHUD } from "@raycast/api";
import { runAppleScript } from "run-applescript";
import { currentPointer, runAppleScriptSilently } from "./utils";

export default async () => {
  const script = currentPointer();
  const pt = await runAppleScriptSilently(script);
  await LocalStorage.setItem("pt3", pt);
};
