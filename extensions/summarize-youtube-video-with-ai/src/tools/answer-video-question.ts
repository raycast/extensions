import { AI, BrowserExtension, Clipboard, environment, getPreferenceValues } from "@raycast/api";
import nodeFetch from "node-fetch";
import type { VideoDataTypes } from "../utils/getVideoData";
import { getVideoData } from "../utils/getVideoData";
import { getVideoQuestionAnswerSnippet } from "../utils/getAiInstructionSnippets";
import { fetchTranscript } from "../utils/transcriptFetcher";
import {
  getYouTubeVideoUrl,
  getYouTubeVideoUrlFromText,
  removeYouTubeVideoReferenceFromText,
} from "../utils/youtubeUrl";

(globalThis.fetch as typeof globalThis.fetch) = nodeFetch as never;

type Input = {
  /**
   * The user's question about the YouTube video.
   */
  question: string;
  /**
   * Optional YouTube video URL or video ID. If omitted, the tool reads a YouTube URL from the clipboard.
   */
  video?: string;
};

type VideoResolution = {
  url: string;
  question: string;
};

async function getActiveBrowserVideoUrl(): Promise<string | undefined> {
  if (!environment.canAccess(BrowserExtension)) return undefined;

  const tabs = await BrowserExtension.getTabs();
  const activeTabUrl = tabs.find((tab) => tab.active)?.url;

  return getYouTubeVideoUrl(activeTabUrl);
}

async function resolveVideo(input: Input): Promise<VideoResolution> {
  const clipboardText = await Clipboard.readText();
  const activeBrowserVideoUrl = await getActiveBrowserVideoUrl();
  const videoUrl =
    getYouTubeVideoUrl(input.video) ??
    getYouTubeVideoUrlFromText(input.question) ??
    activeBrowserVideoUrl ??
    getYouTubeVideoUrl(clipboardText);

  if (!videoUrl) {
    throw new Error("Please provide a YouTube URL in your prompt or copy one to the clipboard.");
  }

  const question = removeYouTubeVideoReferenceFromText(input.question);

  if (!question) {
    throw new Error("Please ask a question about the YouTube video.");
  }

  return { question, url: videoUrl };
}

function formatAnswer(answer: string, videoData: VideoDataTypes) {
  return [`# ${videoData.title}`, "", `Source: ${videoData.video_url}`, "", answer.trim()].join("\n");
}

function formatError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return `I couldn't answer that from the video transcript: ${message}`;
}

/**
 * Answer a question about a YouTube video by fetching its transcript and asking Raycast AI to answer from that transcript.
 */
export default async function tool(input: Input): Promise<string> {
  try {
    if (!environment.canAccess(AI)) {
      return "Raycast Pro is required to answer questions about YouTube videos with Raycast AI.";
    }

    const preferences = getPreferenceValues<Preferences>();
    const language = preferences.language || "english";
    const creativity = Number.parseFloat(preferences.creativity || "0.5");
    const { question, url } = await resolveVideo(input);
    const [videoData, transcript] = await Promise.all([getVideoData(url), fetchTranscript(url)]);

    const answer = await AI.ask(
      getVideoQuestionAnswerSnippet({
        channelName: videoData.ownerChannelName,
        language,
        question,
        transcript,
        videoTitle: videoData.title,
      }),
      { creativity },
    );

    return formatAnswer(answer, videoData);
  } catch (error) {
    return formatError(error);
  }
}
