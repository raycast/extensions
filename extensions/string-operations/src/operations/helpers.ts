import { Clipboard, showHUD } from "@raycast/api";

export async function performsOnClipboard(func: (arg0: string) => string): Promise<() => Promise<void>> {
  return async function (): Promise<void> {
    const text = await Clipboard.readText();

    if (text !== undefined) {
      const textContent: Clipboard.Content = {
        text: func(text),
      };

      await Clipboard.copy(textContent);
      showHUD(`Operation performed on clipboard`);
    }
  };
}
