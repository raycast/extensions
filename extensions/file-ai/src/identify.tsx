import { Detail, popToRoot, showToast, Toast, useUnstableAI } from "@raycast/api";
import { ERRORTYPE, useFileContents } from "./file-utils";
import ResponseActions from "./ResponseActions";

export default function Command() {
  const { selectedFiles, contentPrompts, loading, errorType } = useFileContents();

  const basePrompt =
    'Identify the file type, primary purpose, and most significant defining features of the following files. Provide an assessment of the utility of each file. Format the response as a markdown list of no less than 3 items using "## File Type", "## Purpose", "## Defining Features", and "## Potential Usage" as headings. Here are the files:';

  const contentPromptString = contentPrompts.join("\n");
  const fullPrompt = basePrompt + contentPromptString;
  const { data, isLoading } = useUnstableAI(fullPrompt, { execute: contentPrompts.length > 0 });

  if (errorType) {
    let errorMessage = ""
    if (errorType == ERRORTYPE.FINDER_INACTIVE) {
        errorMessage = "Can't get selected files"
    } else if (errorType == ERRORTYPE.MIN_SELECTION_NOT_MET) {
        errorMessage = "Must select at least 1 file"
    } else if (errorType == ERRORTYPE.INPUT_TOO_LONG) {
      errorMessage = "Input too large"
    }

    showToast({
      title: "Failed File Identification",
      message: errorMessage,
      style: Toast.Style.Failure,
    });
    popToRoot();
    return;
  }

  const text = `# File Identification\n${data ? data : "Identifying files..."}`;
  return (
    <Detail
      isLoading={loading || isLoading || contentPrompts.length == 0}
      markdown={text}
      actions={<ResponseActions commandSummary="Identification" responseText={text} promptText={fullPrompt} />}
    />
  );
}

