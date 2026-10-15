import { Action, ActionPanel, Detail, getPreferenceValues, getSelectedText, Icon } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { ClipboardConversion } from "./components/ClipboardConversion";
import { ConversionForm } from "./components/ConversionForm";
import { ConversionResultView } from "./components/ConversionResult";
import type { StePreferences } from "./types";
import { isBlank } from "./utils/text";

async function readSelection(): Promise<string> {
  try {
    return await getSelectedText();
  } catch {
    return "";
  }
}

export default function Command() {
  const prefs = getPreferenceValues<StePreferences>();
  const { data: selected, isLoading } = usePromise(readSelection);

  if (isLoading || selected === undefined) return <Detail isLoading markdown="Reading the selected text…" />;

  if (isBlank(selected)) {
    return (
      <Detail
        markdown={
          "# No text selected\n\nSelect text in the frontmost application and run this command again.\n\nYou can also convert the text on your clipboard. The clipboard is read only if you choose that action."
        }
        actions={
          <ActionPanel>
            <Action.Push title="Use Clipboard Text Instead" icon={Icon.Clipboard} target={<ClipboardConversion />} />
            <Action.Push title="Enter Text Manually" icon={Icon.Pencil} target={<ConversionForm />} />
          </ActionPanel>
        }
      />
    );
  }

  return (
    <ConversionResultView
      request={{
        text: selected,
        contentType: prefs.defaultContentType ?? "auto",
        mode: prefs.defaultMode ?? "standard",
      }}
    />
  );
}
