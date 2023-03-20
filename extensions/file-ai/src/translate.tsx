import { Detail, popToRoot, showToast, Toast, useUnstableAI } from "@raycast/api";
import { ERRORTYPE, useFileContents } from "./file-utils";
import ResponseActions from "./ResponseActions";

export default function Command(props: { arguments: { language: string } }) {
  const { language } = props.arguments;
  const { selectedFiles, contentPrompts, loading, errorType } = useFileContents(1, undefined, true, true);

  const basePrompt = `Translate the following files into ${language}, using the file names as headings.`;

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
      title: "Failed File Translation",
      message: errorMessage,
      style: Toast.Style.Failure,
    });
    popToRoot();
    return;
  }

  const text = `# File Translation\n${data ? data : "Translating files..."}`;
  return (
    <Detail
      isLoading={loading || isLoading || contentPrompts.length == 0}
      markdown={text}
      actions={
        <ResponseActions
          commandSummary="Translations"
          responseText={text}
          promptText={fullPrompt}
          reattempt={revalidate}
          files={selectedFiles}
        />
      }
    />
  );
}
