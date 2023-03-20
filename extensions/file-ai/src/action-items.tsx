import { Detail, popToRoot, showToast, Toast, useUnstableAI } from "@raycast/api";
import { ERRORTYPE, useFileContents } from "./file-utils";
import ResponseActions from "./ResponseActions";

export default function Command() {
  const { selectedFiles, contentPrompts, loading, errorType } = useFileContents(1, undefined, true, true);

  const basePrompt =
    "Generate a markdown list of action items from the following files, unique a unique identifier for each item as bold headings. If there are any errors in the files, make action items to fix them. In a sublist of each item, provide a description, priority, estimated level of difficulty, and reasonable duration for the task.";

  const contentPromptString = contentPrompts.join("\n");
  const fullPrompt = basePrompt + contentPromptString;
  const { data, isLoading, revalidate } = useUnstableAI(fullPrompt, { execute: contentPrompts.length > 0 });

  if (errorType) {
    let errorMessage = "";
    if (errorType == ERRORTYPE.FINDER_INACTIVE) {
      errorMessage = "Can't get selected files";
    } else if (errorType == ERRORTYPE.MIN_SELECTION_NOT_MET) {
      errorMessage = "Must select at least 1 file";
    } else if (errorType == ERRORTYPE.INPUT_TOO_LONG) {
      errorMessage = "Input too large";
    }

    showToast({
      title: "Failed Action Item Creation",
      message: errorMessage,
      style: Toast.Style.Failure,
    });
    popToRoot();
    return;
  }

  const text = `# Action Items\n${data ? data : "Generating flashcards..."}`;
  return (
    <Detail
      isLoading={loading || isLoading || contentPrompts.length == 0}
      markdown={text}
      actions={
        <ResponseActions
          commandSummary="Action Items"
          responseText={text}
          promptText={fullPrompt}
          reattempt={revalidate}
          files={selectedFiles}
        />
      }
    />
  );
}
