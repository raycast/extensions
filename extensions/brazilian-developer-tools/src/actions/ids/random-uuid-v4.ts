import { Clipboard, closeMainWindow, showHUD } from "@raycast/api";
import { randomUUID } from "node:crypto";

export class RandomUuidV4 {
  public name = "Generate UUID v4";

  public async action(): Promise<void> {
    await Clipboard.copy(randomUUID());
    await showHUD("UUID v4 copied to clipboard ⌘c");
    await closeMainWindow();
  }
}
