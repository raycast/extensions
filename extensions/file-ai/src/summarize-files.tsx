import { Detail, popToRoot, showToast, Toast, useUnstableAI } from "@raycast/api";
import { useEffect, useState } from "react";
import { getFileContents } from "./file-utils";

export default function Command() {
  const [commandError, setCommandError] = useState<string | undefined>();
  const [fileContents, setFileContents] = useState<string[]>([]);

  useEffect(() => {
    getFileContents(setCommandError).then(([, contents]) => setFileContents(contents as string[]));
  }, []);

  const basePrompt =
    "Summarize the content of the following files, using the provided file names as headings. Each summary should be at most three sentences long. Format the output as markdown. Do not provide any other commentary. Additional instructions are provided surrounded by <>, like <this>. Here are the texts:\n";
  const fileContentsString = fileContents.join("\n");

  const { data, isLoading } = useUnstableAI(basePrompt + fileContentsString, {
    execute: fileContents.length > 0,
  });

  if (commandError) {
    showToast({
      title: "Failed File Summarization",
      message: commandError,
      style: Toast.Style.Failure,
    });
    popToRoot();
    return;
  }

  const text = `# File Summarization\n${data ? data : "Loading..."}`;
  return <Detail isLoading={isLoading || fileContents.length == 0} markdown={text} />;
}
