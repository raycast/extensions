import { Detail, popToRoot, showToast, Toast, useUnstableAI } from "@raycast/api";
import { useEffect, useState } from "react";
import { getAudioContents } from "./file-utils";

export default function Command() {
  const [commandError, setCommandError] = useState<string | undefined>();
  const [audioContents, setAudioContents] = useState<string[]>([]);

  useEffect(() => {
    getAudioContents(setCommandError).then(([, contents]) => setAudioContents(contents as string[]));
  }, []);

  const basePrompt =
    "Summarize and assess the the following audio transcriptions, using the provided file names as headings. Format the output as markdown. Here are the transcriptions:\n";

  const audioContentsString = audioContents.join("\n");

  const { data, isLoading } = useUnstableAI(basePrompt + audioContentsString, {
    execute: audioContents.length > 0,
  });

  if (commandError) {
    showToast({
      title: "Failed Audio Summarization",
      message: commandError,
      style: Toast.Style.Failure,
    });
    popToRoot();
    return;
  }

  const text = `# Audio Summarization\n${data ? data : "Loading..."}`;
  return <Detail isLoading={isLoading || audioContents.length == 0} markdown={text} />;
}
