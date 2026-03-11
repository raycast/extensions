import { Clipboard, closeMainWindow, showHUD } from "@raycast/api";
import { nanoid } from "nanoid";

export class RandomNanoid {
  public name = "Generate Nanoid";

  public async action(): Promise<void> {
    await Clipboard.copy(nanoid());
    await showHUD("Nanoid copied to clipboard ⌘c");
    await closeMainWindow();
  }
}
