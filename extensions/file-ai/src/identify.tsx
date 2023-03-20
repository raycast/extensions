import { Detail, popToRoot, showToast, Toast, useUnstableAI } from "@raycast/api";
import { useEffect, useState } from "react";
import { getFileContents } from "./file-utils";

export default function Command() {
  const [commandError, setCommandError] = useState<string | undefined>();
  const [fileContents, setFileContents] = useState<string[]>([]);

  useEffect(() => {
    getFileContents(setCommandError).then(([, contents]) => {
      setFileContents(contents as string[]);
    });
  }, []);

  const basePrompt =
    'Identify the file type, primary purpose, and most significant defining features of the following files. Provide an assessment of the utility of each file. Format the response as a markdown list of no less than 3 items using "## File Type", "## Purpose", "## Defining Features", and "## Potential Usage" as headings. \n';
  const fileContentsString = fileContents.join("\n");

  const { data, isLoading } = useUnstableAI(basePrompt + fileContentsString, {
    execute: fileContents.length > 0,
  });

  if (commandError) {
    showToast({
      title: "Failed File Identification",
      message: commandError,
      style: Toast.Style.Failure,
    });
    popToRoot();
    return;
  }

  const text = `# File Identification\n${data ? data : "Loading..."}`;
  return <Detail isLoading={isLoading || fileContents.length == 0} markdown={text} />;
}
