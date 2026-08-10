import { Action, ActionPanel, Detail, showToast, Toast } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { getPreferenceValues } from "@raycast/api";
import { useEffect, useState } from "react";
import { formatTime } from "./utils/format-time";
import ytdl from "ytdl-core";
import getVideoData, { VideoDataTypes } from "./utils/get-video-data";

const BACKEND_API_URL = "https://gist.ly/api/v1";

export function QueryContent({
  video,
  type = "transcript",
}: {
  video: string;
  type: "transcript" | "insights" | "summary";
}) {
  if (!ytdl.validateURL(video) && !ytdl.validateID(video)) {
    showToast({
      style: Toast.Style.Failure,
      title: "Invalid video URL/ID",
      message: "The entered video URL/ID is invalid. Please check your input and try again!",
    });
    return;
  }

  const preferences = getPreferenceValues<ExtensionPreferences>();
  const [markdown, setMarkdown] = useState<string>("");
  const [videoData, setVideoData] = useState<VideoDataTypes>();
  const {
    isLoading,
  }: {
    isLoading: boolean;
  } = useFetch(`${BACKEND_API_URL}/public?type=${type}&url=${video}`, {
    method: "GET",
    headers: {
      "Content-Type": `application/json`,
      Authorization: `Bearer ${preferences.apiKey}`,
    },
    keepPreviousData: false,
    initialData: "",
    parseResponse: async (response) => {
      let output;
      if (response.status === 200) {
        const responseBody = await response.json();
        output = await parseResult(responseBody, type, videoData);
      } else {
        const responseBody = await response.json();
        output = parseError(response.status, responseBody);
        showToast(Toast.Style.Failure, output);
      }
      setMarkdown(output);
    },
    onWillExecute: () => {
      showToast(Toast.Style.Animated, "Working...");
    },
    onData: () => {
      showToast(Toast.Style.Success, "Done!");
    },
    onError: (error) => {
      showToast(Toast.Style.Failure, "Failed to generate content", error.message);
    },
  });

  useEffect(() => {
    getVideoData(video).then(setVideoData);
  }, [video]);

  return (
    <Detail
      actions={
        videoData && (
          <ActionPanel title="Video Actions">
            <Action.CopyToClipboard title="Copy to Clipboard" content={markdown ?? ""} />
            <Action.OpenInBrowser title="Go to Video" url={videoData.video_url} />
            <Action.OpenInBrowser title="Go to Channel" url={videoData.ownerProfileUrl} />
          </ActionPanel>
        )
      }
      isLoading={isLoading}
      markdown={markdown}
      metadata={
        videoData && (
          <Detail.Metadata>
            <Detail.Metadata.Label title="Title" text={videoData.title} />
            <Detail.Metadata.Link
              title="Channel"
              target={videoData.ownerProfileUrl}
              text={videoData.ownerChannelName}
            />
            <Detail.Metadata.Separator />
            <Detail.Metadata.Label title="Published" text={videoData.publishDate} />
            <Detail.Metadata.Label title="Duration" text={videoData.duration} />
            <Detail.Metadata.Label title="Views" text={videoData.viewCount} />
          </Detail.Metadata>
        )
      }
      navigationTitle={videoData && `${videoData.title} by ${videoData.ownerChannelName}`}
    />
  );
}

const getOutputTitle = (type: "transcript" | "insights" | "summary") => {
  if (type === "transcript") {
    return "# Transcript";
  } else if (type === "insights") {
    return "# Insights";
  } else if (type === "summary") {
    return "# Summary";
  }
  return "";
};

const parseResult = async (
  json: { content: Array<{ offset: number; text: string }> | string[] },
  type: "transcript" | "insights" | "summary",
  videoData?: VideoDataTypes,
) => {
  let output: string;
  if (type === "transcript" || type === "summary") {
    output = (json.content as Array<{ offset: number; text: string }>)
      .map((chunk) => `**${formatTime(chunk.offset)}**: ${chunk.text}`)
      .join("\n\n");
  } else {
    output = (json.content as string[]).join("\n\n");
  }
  return getOutputTitle(type) + "\n\n" + output + `\n\n<img src="${videoData?.thumbnail}">`;
};

const parseError = (status: number, errorBody: { error: string; message: string }) => {
  if (status === 429) {
    return "## ℹ️ Daily limit reached\n\nYou've hit your daily limit of 5 videos. Please try again tomorrow or add your Gistly+ API key in the extension preferences.";
  } else if (status === 206) {
    if (errorBody.error === "transcript-unavailable") {
      return "## ☕️ Transcript not available\n\nUnfortunately a small percentage (10%) of videos doesn't have transcriptions and we can't create summaries for them. Please choose a different video.";
    }
    if (errorBody.error === "insights-unavailable") {
      return "## 🐞 Insights not available\n\nCould not come up with insights for this video. Please try again or choose a different video.";
    }
  }
  return `## ❌An error occurred.\n\n${errorBody.message}`;
};
