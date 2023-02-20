import { LocalStorage, showHUD } from "@raycast/api";
import { currentPointer, runAppleScriptSilently } from "./utils";

export default async () => {
  const script = currentPointer();
  const pt = await runAppleScriptSilently(script);
  await LocalStorage.setItem("pt2", pt);
};
