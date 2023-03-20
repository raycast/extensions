import { Detail, popToRoot, showToast, Toast, useUnstableAI } from "@raycast/api";
import { ERRORTYPE, useFileContents } from "./file-utils";
import ResponseActions from "./ResponseActions";

export default function Command() {
  const { selectedFiles, contentPrompts, loading, errorType } = useFileContents();

  const basePrompt =
    "Compare and contrast the content, purpose, and significance of the following files. What are the similarities and differences between them? Format the response as one markdown paragraph.";

  const contentPromptString = contentPrompts.join("\n");
  const fullPrompt = basePrompt + contentPromptString;
  const { data, isLoading } = useUnstableAI(fullPrompt, { execute: contentPrompts.length > 0 });

  if (errorType) {
    let errorMessage = "";
    if (errorType == ERRORTYPE.FINDER_INACTIVE) {
      errorMessage = "Can't get selected files";
    } else if (errorType == ERRORTYPE.MIN_SELECTION_NOT_MET) {
      errorMessage = "Must select at least 2 files";
    } else if (errorType == ERRORTYPE.INPUT_TOO_LONG) {
      errorMessage = "Input too large";
    }

    showToast({
      title: "Failed File Comparison",
      message: errorMessage,
      style: Toast.Style.Failure,
    });
    popToRoot();
    return;
  }

  const text = `# File Comparison\n${data ? data : "Comparing files..."}`;
  return (
    <Detail
      isLoading={loading || isLoading || contentPrompts.length == 0}
      markdown={text}
      actions={<ResponseActions commandSummary="Comparison" responseText={text} promptText={fullPrompt} />}
    />
  );
}
