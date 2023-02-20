import { LocalStorage, showHUD } from "@raycast/api";
import { movePointer, runAppleScriptSilently, Point } from "./utils";

export default async () => {
  const value = await LocalStorage.getItem("pt3");
  if (typeof value === "string") {
    const pt = value as any as Point;
    const script = movePointer(pt);
    await runAppleScriptSilently(script);
  } else {
    showHUD("ポイントが設定されていません");
  }
};
