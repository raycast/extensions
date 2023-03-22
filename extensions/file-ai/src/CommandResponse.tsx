import { Detail, showToast, Toast, useUnstableAI } from "@raycast/api";
import { ERRORTYPE, useFileContents } from "./file-utils";
import ResponseActions from "./ResponseActions";
import * as os from "os";
import * as fs from "fs";
import { useState } from "react";

export default function CommandResponse(props: {
  commandName: string;
  prompt: string;
  minNumFiles?: number;
  acceptedFileExtensions?: string[];
  skipMetadata?: boolean;
  skipAudioDetails?: boolean;
}) {
  const { commandName, prompt, minNumFiles, acceptedFileExtensions, skipMetadata, skipAudioDetails } = props;
  const [date, setDate] = useState<Date>(new Date());
  const { selectedFiles, contentPrompts, loading, errorType } = useFileContents(
    minNumFiles,
    acceptedFileExtensions,
    skipMetadata,
    skipAudioDetails
  );

  const contentPromptString = contentPrompts.join("\n");
  const substitutedPrompt = prompt
    .replaceAll("{{files}}", selectedFiles ? selectedFiles?.join(", ") : "")
    .replaceAll("{{contents}}", contentPromptString)
    .replaceAll("{{user}}", os.userInfo().username)
    .replaceAll("{{fileNames}}", selectedFiles ? selectedFiles.map((path) => path.split("/").at(-1)).join(", ") : "")
    .replaceAll("{{date}}", date.toUTCString())
    .replace(
      "{{metadata}}",
      selectedFiles
        ? selectedFiles
            .map(
              (path) =>
                `${path}:\n${Object.entries(fs.lstatSync(path))
                  .map((entry) => `${entry[0]}:entry[1]`)
                  .join("\n")}`
            )
            .join("\n\n")
        : ""
    );
  const fullPrompt = (substitutedPrompt + contentPromptString).replace(/{{END}}(\n|.)*/, "");
  const { data, isLoading, revalidate } = useUnstableAI(fullPrompt, { execute: contentPrompts.length > 0 });

  if (errorType) {
    let errorMessage = "";
    if (errorType == ERRORTYPE.FINDER_INACTIVE) {
      errorMessage = "Can't get selected files";
    } else if (errorType == ERRORTYPE.MIN_SELECTION_NOT_MET) {
      errorMessage = `Must select at least ${minNumFiles} file${minNumFiles == 1 ? "" : "s"}`;
    } else if (errorType == ERRORTYPE.INPUT_TOO_LONG) {
      errorMessage = "Input too large";
    }

    showToast({
      title: "Failed Error Detection",
      message: errorMessage,
      style: Toast.Style.Failure,
    });
    return null;
  }

  console.log(fullPrompt.length);

  const text = `# ${commandName}\n${data ? data : "Analyzing files..."}`;
  return (
    <Detail
      isLoading={loading || isLoading || contentPrompts.length == 0}
      markdown={text}
      navigationTitle={commandName}
      actions={
        <ResponseActions
          commandSummary="Response"
          responseText={text}
          promptText={fullPrompt}
          reattempt={revalidate}
          files={selectedFiles}
        />
      }
    />
  );
}
