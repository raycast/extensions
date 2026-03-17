import { Action, Clipboard, closeMainWindow, Icon, Keyboard } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { getRandomizedValue } from "../../lib/snippetUtils";

interface PasteActionProps {
  value: string;
  randomizedSnippetSeparator?: string;
  onPaste?: () => void;
}

export function PasteAction({ value, randomizedSnippetSeparator, onPaste }: PasteActionProps) {
  const handlePaste = async () => {
    try {
      const valueToInsert = getRandomizedValue(value, randomizedSnippetSeparator);
      await Clipboard.paste(valueToInsert);
      await closeMainWindow();
      onPaste?.();
    } catch (error) {
      showFailureToast(error, { title: "Error pasting value" });
    }
  };

  return (
    // add enter or return icon
    <Action title="Paste Value" icon={Icon.Reply} onAction={handlePaste} shortcut={Keyboard.Shortcut.Common.Open} />
  );
}
