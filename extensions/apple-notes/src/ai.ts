import { AI, closeMainWindow, LaunchProps, showToast, Toast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";

import { createNote } from "./api/applescript";

export default async (props: LaunchProps<{ arguments: Arguments.Ai }>) => {
  await closeMainWindow();

  await showToast({ style: Toast.Style.Animated, title: "Creating a note" });

  const text = props.fallbackText || props.arguments.text;

  const instructions = props.arguments.instructions;

  try {
    const result = await AI.ask(
      `Write a note based on this text: ${text}. 
      
Follow these instructions:
- The result should be formatted as HTML wrapped in a <div> tag. Don't enclose the results in backticks.
- The note should be clear and concise.
- The title should be short and descriptive and wrapped in an <h1> tag.
- Don't directly address the reader. Write the note from an objective point of view.
- Use the same language as the original text.
${instructions ? `- ${instructions}` : ""}
`,
      { model: AI.Model.OpenAI_GPT4o },
    );
    await createNote(result);
  } catch (error) {
    showFailureToast(error, { title: "Could not create a new note." });
  }
};
