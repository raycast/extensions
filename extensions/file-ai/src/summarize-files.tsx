import { Detail, popToRoot, showToast, Toast, useUnstableAI } from "@raycast/api";
import { ERRORTYPE, useFileContents } from "./file-utils";
import ResponseActions from "./ResponseActions";

export default function Command() {
  const { selectedFiles, contentPrompts, loading, errorType } = useFileContents();

  const basePrompt =
    "Summarize the content of the following files, using the file names as headings. Each summary should be at most four sentences long. If the file contains a list, describe the list instead of listing all elements. Infer other questions about the files and answer them without specifying the question. Format the response as markdown. Here are the files:";

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
      title: "Failed File Summarization",
      message: errorMessage,
      style: Toast.Style.Failure,
    });
    popToRoot();
    return;
  }

  const text = `# File Summarization\n${data ? data : "Summarizing files..."}`;
  return (
    <Detail
      isLoading={loading || isLoading || contentPrompts.length == 0}
      markdown={text}
      actions={<ResponseActions commandSummary="Summary" responseText={text} promptText={fullPrompt} />}
    />
  );
}
