import { Clipboard, showHUD } from "@raycast/api";
import fs from "fs/promises";
import type { BlockFile } from "../types";
import { expandDynamicPlaceholders } from "./dynamicPlaceholders";

export async function copyBlockFile(file: BlockFile, options: { expand: boolean }): Promise<void> {
  const rawContent = await fs.readFile(file.path, "utf8");
  const content = options.expand ? await expandDynamicPlaceholders(rawContent) : rawContent;

  await Clipboard.copy(content);
  await showHUD(`Copied ${file.name}`);
}
