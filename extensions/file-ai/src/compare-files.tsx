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

  if (fileContents.length == 2 && !commandError) {
    setCommandError("Must select 2 or more files");
  }

  const basePrompt =
    "Compare and contrast the content, purpose, and significance of the following files. What are the similarities and differences between them? Format the response as one markdown paragraph.\n";
  const fileContentsString = fileContents.join("\n");

  const { data, isLoading } = useUnstableAI(basePrompt + fileContentsString, {
    execute: fileContents.length > 0,
  });

  if (commandError) {
    showToast({
      title: "Failed File Comparison",
      message: commandError,
      style: Toast.Style.Failure,
    });
    popToRoot();
    return;
  }

  const text = `# File Comparison\n${data ? data : "Loading..."}`;
  return <Detail isLoading={isLoading || fileContents.length == 0} markdown={text} />;
}
