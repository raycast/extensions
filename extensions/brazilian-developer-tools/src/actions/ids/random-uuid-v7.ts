import { Clipboard, closeMainWindow, showHUD } from "@raycast/api";
import { uuidv7 } from "uuidv7";

export class RandomUuidV7 {
  public name = "Generate UUID v7";

  public async action(): Promise<void> {
    await Clipboard.copy(uuidv7());
    await showHUD("UUID v7 copied to clipboard ⌘c");
    await closeMainWindow();
  }
}
