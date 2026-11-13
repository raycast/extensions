import { getSelectedText, LaunchProps, showHUD } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { errorMessage } from "./api";
import { addDictionaryTerm } from "./dictionary-forms";

async function selectedText(): Promise<string> {
  try {
    return (await getSelectedText()).trim();
  } catch {
    return "";
  }
}

export default async function Command(
  props: LaunchProps<{ arguments: Arguments.AddDictionaryTerm }>,
) {
  const term = props.arguments.term?.trim() || (await selectedText());
  if (!term) {
    await showFailureToast(
      "Type a term after the command or select text first.",
      { title: "Nothing to add" },
    );
    return;
  }
  if (term.includes("\n") || term.length > 100) {
    await showFailureToast("Select a single word or name, not a passage.", {
      title: "Selection too long",
    });
    return;
  }

  try {
    await addDictionaryTerm(term);
    await showHUD(`Added "${term}" to the TypeWhisper dictionary`);
  } catch (error) {
    await showFailureToast(errorMessage(error, "Failed to add term"), {
      title: "TypeWhisper",
    });
  }
}
