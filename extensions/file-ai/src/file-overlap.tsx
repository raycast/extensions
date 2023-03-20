import { Detail, popToRoot, showToast, Toast, useUnstableAI } from "@raycast/api";
import { useEffect, useState } from "react";
import { getFileContents } from "./file-utils";

export default function Command() {
  const [commandError, setCommandError] = useState<string | undefined>();
  const [fileContents, setFileContents] = useState<string[]>([]);

  useEffect(() => {
    getFileContents(setCommandError).then(([, contents]) => setFileContents(contents as string[]));
  }, []);

  if (fileContents.length == 2 && !commandError) {
    setCommandError("Must select 2 or more files");
  }

  const basePrompt =
    "What overlaps in content or ideas exists between the following files? What are the similarities?\n";
  const fileContentsString = fileContents.join("\n");

  const { data, isLoading } = useUnstableAI(basePrompt + fileContentsString, {
    execute: fileContents.length > 2,
  });

  if (commandError) {
    showToast({
      title: "Failed Overlap Analysis",
      message: commandError,
      style: Toast.Style.Failure,
    });
    popToRoot();
    return;
  }

  const text = `# Overlap Analysis\n${data ? data : "Loading..."}`;
  return <Detail isLoading={isLoading || fileContents.length < 2} markdown={text} />;
}
