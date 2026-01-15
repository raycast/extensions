// src/utils/input.ts
import { Clipboard } from "@raycast/api";

export async function getInputText(argText?: string): Promise<string> {
  if (argText && argText.trim().length > 0) {
    return argText;
  }

  const clipboard = await Clipboard.readText();
  if (!clipboard) {
    throw new Error("未提供文本，且剪贴板为空或不是文本类型");
  }
  return clipboard;
}
