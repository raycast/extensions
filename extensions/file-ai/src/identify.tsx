import { Detail, popToRoot, showToast, Toast, useUnstableAI } from "@raycast/api";
import { useEffect } from "react";
import { ERRORTYPE, installDefaults, useFileContents } from "./file-utils";
import ResponseActions from "./ResponseActions";

export default function Command() {
  const { selectedFiles, contentPrompts, loading, errorType } = useFileContents();

  useEffect(() => {
    installDefaults();
  }, []);

  const basePrompt =
    'Identify the file type and most significant features of the following files based on their content. Discuss the primary purpose of the file based on its content. Categorize the content into relevant topics. Provide an assessment of the file\'s utility as well a list of relevant links and brief descriptions of them. Format the response as a markdown list using "## File Type", "## Topics", "## Defining Features", "## Purpose and Potential Usage", and "## Relevant Links" as headings.';

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
      actions={
        <ResponseActions
          commandSummary="Identification"
          responseText={text}
          promptText={fullPrompt}
          reattempt={revalidate}
        />
      }
    />
  );
}
