import { useEffect, useState } from "react";
import { YoutubeTranscript } from "youtube-transcript";
import { Action, ActionPanel, Detail, Icon, popToRoot, showToast, Toast, AI, environment } from "@raycast/api";
import ytdl from "ytdl-core";
import { useAI } from "@raycast/utils";

export async function getVideoSections(text: string) {
  const chunks = text.match(/.{1,5000}/g) || [];
  const jobs = chunks.map((chunk) => {
    return AI.ask(`${chunk}\n\n---\n\nSummarize the above segment of YouTube video transcriptions.`);
  });
  const sections = await Promise.all(jobs);
  return sections.join("\n\n");
}

async function summarizeVideo(url: string) {
  const captions = await YoutubeTranscript.fetchTranscript(url);
  const fullTranscript = captions
    .map((item) => item.text)
    .join(" ")
    .replaceAll("\n", " ");

  if (fullTranscript.length < 5000) {
    return fullTranscript;
  }

  return getVideoSections(fullTranscript);
}

async function getVideoInfo(url: string) {
  const information = await ytdl.getBasicInfo(url);
  const title = information.videoDetails.title;
  const author = information.videoDetails.author.name;
  return { title, author };
}

export default function Command(props: { arguments: { url: string } }) {
  if (!environment.canAccess(AI)) {
    popToRoot();
    showToast({
      title: "AI not available",
      message: "This extension requires access to Raycast AI. To use it, subscribe to Raycast Pro.",
      style: Toast.Style.Failure,
    });
    return;
  }

  const [sections, setSections] = useState("");
  const [metadata, setMetadata] = useState<null | { title: string; author: string }>(null);
  const isGenerating = !!sections && !!metadata;
  const {
    data: summary,
    isLoading,
    revalidate,
  } = useAI(
    `${sections}---\n\nSummarize the above YouTube video segments from a video titled "${metadata?.title}" by ${metadata?.author}.`,
    {
      execute: isGenerating,
    }
  );

  if (!props.arguments.url || !ytdl.validateURL(props.arguments.url)) {
    showToast({
      title: "Invalid URL",
      message: "Please provide a valid YouTube URL",
      style: Toast.Style.Failure,
    });
    popToRoot();
    return;
  }

  useEffect(() => {
    summarizeVideo(props.arguments.url).then(setSections);
    getVideoInfo(props.arguments.url).then(setMetadata);
  }, []);

  return (
    <Detail
      markdown={`# ${metadata?.title ?? ""}\n\n${summary}`}
      isLoading={!isGenerating || isLoading}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Summary" content={summary} />
          <Action.Paste content={summary} />
          <Action
            title="Regenerate Summary"
            onAction={revalidate}
            icon={Icon.ArrowCounterClockwise}
            shortcut={{ key: "r", modifiers: ["cmd"] }}
          />
        </ActionPanel>
      }
    />
  );
}
