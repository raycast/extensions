import { AI, closeMainWindow, LaunchProps, showToast, Toast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";

import { appendNoteBody, createNote } from "./api/applescript";
import { getNotes } from "./api/getNotes";

export default async (props: LaunchProps<{ arguments: Arguments.Ai }>) => {
  await closeMainWindow();

  const text = props.fallbackText || props.arguments.text;
  const instructions = props.arguments.instructions;
  const noteQuery = props.arguments.note?.trim();

  let targetNote: Awaited<ReturnType<typeof getNotes>>[number] | undefined;
  if (noteQuery) {
    await showToast({ style: Toast.Style.Animated, title: "Looking for note" });

    // Exact title match is verified with Unicode-aware comparison, so it can't be missed
    // regardless of how many notes exist or what script the title uses.
    const exactMatches = await getNotes(10, [], noteQuery, true);

    if (exactMatches.length === 1) {
      targetNote = exactMatches[0];
    }

    if (exactMatches.length > 1) {
      await showFailureToast(
        new Error(`Multiple notes titled "${noteQuery}" were found. Please use a more specific title.`),
        {
          title: "Note title is ambiguous",
        },
      );
      return;
    }

    if (!targetNote) {
      await showFailureToast(new Error(`No note matching "${noteQuery}" was found.`), {
        title: "Could not find note",
      });
      return;
    }
  }

  await showToast({
    style: Toast.Style.Animated,
    title: targetNote ? "Adding to note" : "Creating a note",
  });

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
    );

    if (targetNote) {
      await appendNoteBody(targetNote.id, result);
    } else {
      await createNote(result);
    }
  } catch (error) {
    await showFailureToast(error, {
      title: targetNote ? "Could not add to the note." : "Could not create a new note.",
    });
  }
};
