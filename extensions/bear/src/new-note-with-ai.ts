import { LaunchProps, closeMainWindow, showToast, Toast, popToRoot, AI, getPreferenceValues } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import open from "open";

async function CreateAiText(text: string, instructions: string) {
  const { newNoteAiModel } = getPreferenceValues();

  console.log(newNoteAiModel);

  try {
    const result = await AI.ask(
      `Write a note based on this text: ${text}.

    Follow these instructions:
    - Return response in markdown fomrat

    Additonal Instructions: ${instructions}
`,
      { model: newNoteAiModel }
    );

    const data = await result;

    return data;
  } catch (error) {
    showFailureToast(error, { title: "Could not create a new note." });
  }
}

export default async (props: LaunchProps) => {
  const text = props.fallbackText || props.arguments.text;
  const { instructions, tags } = props.arguments;

  await closeMainWindow();
  await showToast({ style: Toast.Style.Animated, title: "Creating a note with AI" });

  const aiText = await CreateAiText(text, instructions);

  open(
    `bear://x-callback-url/create?text=${encodeURIComponent(
      String(aiText)
    )}&open_note=yes&show_window=no&new_window=yes&tags=${encodeURIComponent(tags)}`
  );

  await popToRoot({ clearSearchBar: true });
};
