import { useEffect, useState } from "react";
import { setTimeout } from "timers/promises";
import {
  Action,
  ActionPanel,
  AI,
  Detail,
  Icon,
  List,
  Toast,
  confirmAlert,
  environment,
  getPreferenceValues,
  open,
  showToast,
} from "@raycast/api";
import { checkIfSayIsRunning, killRunningSay } from "mac-say";
import { fetchUnNewsDetail, fetchUnPressDetail } from "./api.js";
import { textToSpeech, useVoice } from "./utils.js";
import { LanguageCode, UnNews, UnPress } from "./types.js";

export const PlayTextToSpeech = ({
  languageCode,
  description,
  textContent,
}: {
  languageCode: LanguageCode;
  description: string;
  textContent?: string;
}) => {
  const voice = useVoice(languageCode);
  if (!languageCode) return null;

  const isProEnhanced = environment.canAccess(AI);
  const { hideUnsupportedProFeatures, newsSummerizeLength } = getPreferenceValues<Preferences>();
  const content = [description, textContent ?? ""].join("\n");

  return (
    <>
      <Action
        icon={Icon.SpeechBubbleActive}
        title="Play Text-to-Speech"
        onAction={() => {
          textToSpeech(content, voice);
        }}
      />
      {(isProEnhanced || !hideUnsupportedProFeatures) && (
        <Action
          icon={Icon.Stars}
          title="Play AI-Summarized"
          shortcut={{ modifiers: ["opt"], key: "enter" }}
          onAction={async () => {
            if (!isProEnhanced) {
              const confirmed = await confirmAlert({
                title: "Pro Feature Required",
                message:
                  "This feature requires Raycast Pro subscription. Do you want to open Raycast Pro page? (You can hide this Pro feature in preferences)",
              });
              if (confirmed) open("https://raycast.com/pro");
              return;
            }

            const toast = await showToast({
              title: "",
              message: "Summarizing with AI...",
              style: Toast.Style.Animated,
            });
            const languageName = new Intl.DisplayNames(["en"], { type: "language" }).of(languageCode.slice(0, 2));
            const summary = await AI.ask(
              [
                `Use ${languageName} language to summarize the text below in ${newsSummerizeLength} words:`,
                content,
              ].join("\n"),
            );
            toast.hide();
            textToSpeech(summary, voice);
          }}
        />
      )}
    </>
  );
};

export const StopTextToSpeech = () => {
  const [isPlaying, setIsPlaying] = useState(false);

  const checkRunning = async () => {
    const isRunning = await checkIfSayIsRunning();
    setIsPlaying(Boolean(isRunning));
    await setTimeout(1000);
    checkRunning();
  };

  useEffect(() => {
    checkRunning();
  }, []);

  if (!isPlaying) return null;
  return (
    <Action icon={Icon.Stop} style={Action.Style.Destructive} title="Stop Text-to-Speech" onAction={killRunningSay} />
  );
};

export const NewsDetail = ({ news }: { news: UnNews }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [markdownContent, setMarkdownContent] = useState<string>();
  const [textContent, setTextContent] = useState<string>();
  const { newsLanguageCode } = getPreferenceValues<Preferences>();

  const loadUnNewsDetail = async (news: UnNews) => {
    setIsLoading(true);
    const { markdownContent, textContent } = await fetchUnNewsDetail(news.link).catch(() => ({
      markdownContent: "",
      textContent: "",
    }));
    setMarkdownContent(markdownContent);
    setTextContent(textContent);
    setIsLoading(false);
  };

  useEffect(() => {
    loadUnNewsDetail(news);
  }, [news]);

  const detailMarkdown = [
    `## ${news.title}`,
    `*${news.source} (${new Date(news.pubDate).toLocaleString(newsLanguageCode)})*`,
    `> ${news.description}`,
    news.image ? `![](${news.image})` : "",
    ...(markdownContent === undefined
      ? ["> Loading content..."]
      : markdownContent.split("\n").map((line) => line.trim())),
    `*Source: [${news.link}](${news.link})*`,
  ]
    .filter(Boolean)
    .join("\n".repeat(2));

  return (
    <Detail
      isLoading={isLoading}
      markdown={detailMarkdown}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser title="View on Website" url={news.link} />
          <PlayTextToSpeech
            languageCode={newsLanguageCode as LanguageCode}
            description={news.description}
            textContent={textContent}
          />
          <StopTextToSpeech />
        </ActionPanel>
      }
    />
  );
};

export const PressDetail = ({ press, onToggleDetail }: { press: UnPress; onToggleDetail: () => void }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [markdownContent, setMarkdownContent] = useState<string>();
  const [textContent, setTextContent] = useState<string>();

  const loadPressDetail = async (press: UnPress) => {
    setIsLoading(true);
    const { markdownContent, textContent } = await fetchUnPressDetail(press.link).catch(() => ({
      markdownContent: "",
      textContent: "",
    }));
    setMarkdownContent(markdownContent);
    setTextContent(textContent);
    setIsLoading(false);
  };

  useEffect(() => {
    loadPressDetail(press);
  }, [press]);

  return (
    <List.Item
      title={press.title}
      accessories={[{ text: new Date(press.pubDate).toLocaleDateString() }]}
      detail={
        <List.Item.Detail
          isLoading={isLoading}
          markdown={[
            `# ${press.title}`,
            `*${press.creator}*`,
            `> ${press.description}`,
            ...(markdownContent === undefined
              ? ["> Loading content..."]
              : markdownContent.split("\n").map((line) => line.trim())),
            `*Source: [${press.link}](${press.link})*`,
          ].join("\n".repeat(2))}
        />
      }
      actions={
        <ActionPanel>
          <Action title="Toggle Detail" onAction={onToggleDetail} />
          <PlayTextToSpeech
            languageCode={"en" as LanguageCode}
            description={press.description}
            textContent={textContent}
          />
          <StopTextToSpeech />
          <Action.OpenInBrowser title="View on Website" url={press.link} />
        </ActionPanel>
      }
    />
  );
};
