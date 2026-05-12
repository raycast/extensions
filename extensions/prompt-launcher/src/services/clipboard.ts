import { Clipboard, showHUD } from "@raycast/api";
import fs from "fs/promises";
import type { PromptFile } from "../types";
import { expandDynamicPlaceholders } from "./dynamicPlaceholders";

export async function copyPromptFile(file: PromptFile, options: { expand: boolean }): Promise<void> {
  const rawContent = await fs.readFile(file.path, "utf8");
  const content = options.expand ? await expandDynamicPlaceholders(rawContent) : rawContent;

  await Clipboard.copy(content);
  await showHUD(`Copied ${file.name}`);
}
