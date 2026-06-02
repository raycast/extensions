import { Detail, ActionPanel, Action, Icon } from "@raycast/api";
import type { ProsodyAnalysis } from "../types";
import {
  PROVIDER_LABELS,
  type ProviderName,
  type TtsProviderName,
} from "../llm/config";
import { renderAnalysis } from "../render/markdown";

export interface PickerOption<T extends string = string> {
  value: T;
  title: string;
  selected?: boolean;
}

export function AnalysisPlaceholder(props: {
  isLoading: boolean;
  failed?: boolean;
  onRetry?: () => void;
}) {
  const markdown = props.failed
    ? "# Could not analyze\n\nSomething went wrong (see the toast). Press **⌘R** to retry."
    : "# 🗣️ Analyzing…\n\nReading your text and asking the model.";
  return (
    <Detail
      isLoading={props.isLoading}
      markdown={markdown}
      actions={
        props.failed && props.onRetry ? (
          <ActionPanel>
            <Action
              title="Retry"
              icon={Icon.ArrowClockwise}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
              onAction={props.onRetry}
            />
          </ActionPanel>
        ) : undefined
      }
    />
  );
}

export interface AnalysisDetailProps {
  items: AnalysisPageItem[];
  provider: ProviderName;
  analysisModel: string;
  ttsProvider: TtsProviderName;
  ttsFollowsAnalysis: boolean;
  ttsModel: string;
  ttsVoice: string;
  isLoading: boolean;
  activeIndex: number;
  sentenceTotal: number;
  pageStart: number;
  pageEnd: number;
  onPlay: () => void;
  onSlow: () => void;
  onSlower: () => void;
  onLoop: () => void;
  onRepeat: () => void;
  onSave: () => void;
  onSwitchProvider: () => void;
  /** Label of the next provider in the cycle; omit to hide the switch action. */
  switchToLabel?: string;
  analysisProviderOptions: PickerOption<ProviderName>[];
  analysisModelOptions: PickerOption[];
  ttsProviderOptions: PickerOption<"follow-analysis" | TtsProviderName>[];
  ttsModelOptions: PickerOption[];
  ttsVoiceOptions: PickerOption[];
  onSelectAnalysisProvider: (provider: ProviderName) => void;
  onSelectAnalysisModel: (model: string) => void;
  onSelectTtsProvider: (provider: "follow-analysis" | TtsProviderName) => void;
  onSelectTtsModel: (model: string) => void;
  onSelectTtsVoice: (voice: string) => void;
  onRetryCurrent: () => void;
  onTranslateCurrent: () => void;
  onTranslatePage: () => void;
  activeTranslation?: string;
  onNewExample?: () => void;
  onSelectSentence: (index: number) => void;
  onNextSentence?: () => void;
  onPrevSentence?: () => void;
  onNextPage?: () => void;
  onPrevPage?: () => void;
}

export interface AnalysisPageItem {
  index: number;
  text: string;
  analysis?: ProsodyAnalysis;
  isLoading?: boolean;
  failed?: boolean;
  translation?: string;
  translationTarget?: string;
  translationLoading?: boolean;
  translationFailed?: boolean;
}

export function AnalysisDetail(props: AnalysisDetailProps) {
  const {
    items,
    provider,
    analysisModel,
    ttsProvider,
    ttsFollowsAnalysis,
    ttsModel,
    ttsVoice,
    isLoading,
    activeIndex,
    sentenceTotal,
    pageStart,
    pageEnd,
  } = props;
  const activeItem = items.find((item) => item.index === activeIndex);
  const markdown = renderPageMarkdown(items, activeIndex, sentenceTotal);
  const providerLabel = PROVIDER_LABELS[provider];
  const ttsProviderLabel = PROVIDER_LABELS[ttsProvider];
  return (
    <Detail
      isLoading={isLoading}
      navigationTitle={
        sentenceTotal > 1
          ? `Sentences ${pageStart + 1}-${pageEnd} / ${sentenceTotal}`
          : undefined
      }
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Analysis" text={providerLabel} />
          <Detail.Metadata.Label title="Analysis Model" text={analysisModel} />
          <Detail.Metadata.Label
            title="TTS"
            text={`${ttsProviderLabel}${ttsFollowsAnalysis ? " (auto)" : ""}`}
          />
          <Detail.Metadata.Label title="TTS Model" text={ttsModel} />
          <Detail.Metadata.Label title="Voice" text={ttsVoice} />
          <Detail.Metadata.Label title="Accent" text="General American" />
          {sentenceTotal > 1 ? (
            <Detail.Metadata.Label
              title="Page"
              text={`${pageStart + 1}-${pageEnd} / ${sentenceTotal}`}
            />
          ) : null}
          {sentenceTotal > 1 ? (
            <Detail.Metadata.Label
              title="Active"
              text={`${activeIndex + 1} / ${sentenceTotal}`}
            />
          ) : null}
          {activeItem?.analysis?.isGeneratedExample &&
          activeItem.analysis.sourceWord ? (
            <Detail.Metadata.Label
              title="Example for"
              text={activeItem.analysis.sourceWord}
            />
          ) : null}
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Playback">
            <Action title="Play" icon={Icon.Play} onAction={props.onPlay} />
            <Action
              title="Play Slow (0.75×)"
              icon={Icon.Gauge}
              shortcut={{ modifiers: ["cmd"], key: "s" }}
              onAction={props.onSlow}
            />
            <Action
              title="Play Slower (0.5×)"
              icon={Icon.Gauge}
              shortcut={{ modifiers: ["cmd", "shift"], key: "s" }}
              onAction={props.onSlower}
            />
            <Action
              title="Shadowing Loop"
              icon={Icon.Repeat}
              shortcut={{ modifiers: ["cmd", "shift"], key: "l" }}
              onAction={props.onLoop}
            />
            <Action
              title="Repeat Last"
              icon={Icon.ArrowClockwise}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
              onAction={props.onRepeat}
            />
          </ActionPanel.Section>
          <ActionPanel.Section title="Provider & Models">
            <ActionPanel.Submenu
              title="Choose Analysis Provider"
              icon={Icon.Switch}
            >
              {props.analysisProviderOptions.map((option) => (
                <Action
                  key={option.value}
                  title={option.title}
                  icon={option.selected ? Icon.CheckCircle : Icon.Circle}
                  onAction={() => props.onSelectAnalysisProvider(option.value)}
                />
              ))}
            </ActionPanel.Submenu>
            {props.analysisModelOptions.length > 1 ? (
              <ActionPanel.Submenu
                title="Choose Analysis Model"
                icon={Icon.Text}
              >
                {props.analysisModelOptions.map((option) => (
                  <Action
                    key={option.value}
                    title={option.title}
                    icon={option.selected ? Icon.CheckCircle : Icon.Circle}
                    onAction={() => props.onSelectAnalysisModel(option.value)}
                  />
                ))}
              </ActionPanel.Submenu>
            ) : null}
            <ActionPanel.Submenu
              title="Choose Speech Provider"
              icon={Icon.Play}
            >
              {props.ttsProviderOptions.map((option) => (
                <Action
                  key={option.value}
                  title={option.title}
                  icon={option.selected ? Icon.CheckCircle : Icon.Circle}
                  onAction={() => props.onSelectTtsProvider(option.value)}
                />
              ))}
            </ActionPanel.Submenu>
            {props.ttsModelOptions.length > 1 ? (
              <ActionPanel.Submenu
                title="Choose Speech Model"
                icon={Icon.Gauge}
              >
                {props.ttsModelOptions.map((option) => (
                  <Action
                    key={option.value}
                    title={option.title}
                    icon={option.selected ? Icon.CheckCircle : Icon.Circle}
                    onAction={() => props.onSelectTtsModel(option.value)}
                  />
                ))}
              </ActionPanel.Submenu>
            ) : null}
            {props.ttsVoiceOptions.length > 1 ? (
              <ActionPanel.Submenu title="Choose Voice" icon={Icon.Microphone}>
                {props.ttsVoiceOptions.map((option) => (
                  <Action
                    key={option.value}
                    title={option.title}
                    icon={option.selected ? Icon.CheckCircle : Icon.Circle}
                    onAction={() => props.onSelectTtsVoice(option.value)}
                  />
                ))}
              </ActionPanel.Submenu>
            ) : null}
            {props.switchToLabel ? (
              <Action
                title={`Switch Analysis Provider to ${props.switchToLabel}`}
                icon={Icon.Switch}
                shortcut={{ modifiers: ["cmd", "shift"], key: "o" }}
                onAction={props.onSwitchProvider}
              />
            ) : null}
          </ActionPanel.Section>
          {props.onNextSentence ||
          props.onPrevSentence ||
          props.onNextPage ||
          props.onPrevPage ? (
            <ActionPanel.Section title="Navigate">
              {props.onNextSentence ? (
                <Action
                  title="Next Sentence"
                  icon={Icon.ArrowRight}
                  shortcut={{ modifiers: ["cmd"], key: "]" }}
                  onAction={props.onNextSentence}
                />
              ) : null}
              {props.onPrevSentence ? (
                <Action
                  title="Previous Sentence"
                  icon={Icon.ArrowLeft}
                  shortcut={{ modifiers: ["cmd"], key: "[" }}
                  onAction={props.onPrevSentence}
                />
              ) : null}
              {props.onNextPage ? (
                <Action
                  title="Next Page"
                  icon={Icon.ArrowRightCircle}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "]" }}
                  onAction={props.onNextPage}
                />
              ) : null}
              {props.onPrevPage ? (
                <Action
                  title="Previous Page"
                  icon={Icon.ArrowLeftCircle}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "[" }}
                  onAction={props.onPrevPage}
                />
              ) : null}
            </ActionPanel.Section>
          ) : null}
          {items.length > 1 ? (
            <ActionPanel.Section title="Select Sentence">
              {items.map((item) => (
                <Action
                  key={item.index}
                  title={`Select Sentence ${item.index + 1}`}
                  icon={
                    item.index === activeIndex ? Icon.CheckCircle : Icon.Circle
                  }
                  onAction={() => props.onSelectSentence(item.index)}
                />
              ))}
            </ActionPanel.Section>
          ) : null}
          <ActionPanel.Section title="Tools">
            <Action
              title="Save Model Audio"
              icon={Icon.Download}
              shortcut={{ modifiers: ["cmd", "shift"], key: "e" }}
              onAction={props.onSave}
            />
            <Action
              title="Refresh Current Analysis"
              icon={Icon.ArrowClockwise}
              shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
              onAction={props.onRetryCurrent}
            />
            <Action
              title="Translate Current Sentence"
              icon={Icon.SpeechBubble}
              shortcut={{ modifiers: ["cmd"], key: "t" }}
              onAction={props.onTranslateCurrent}
            />
            <Action
              title="Translate Page"
              icon={Icon.Text}
              shortcut={{ modifiers: ["cmd", "shift"], key: "t" }}
              onAction={props.onTranslatePage}
            />
            {props.onNewExample ? (
              <Action
                title="New Example Sentence"
                icon={Icon.Stars}
                shortcut={{ modifiers: ["cmd"], key: "d" }}
                onAction={props.onNewExample}
              />
            ) : null}
            <Action.CopyToClipboard
              title="Copy Annotation"
              content={markdown}
              shortcut={{ modifiers: ["cmd"], key: "c" }}
            />
            <Action.CopyToClipboard
              title="Copy Translation"
              content={props.activeTranslation ?? ""}
              shortcut={{ modifiers: ["cmd", "opt"], key: "c" }}
            />
            <Action.CopyToClipboard
              // eslint-disable-next-line @raycast/prefer-title-case
              title="Copy IPA"
              content={activeItem?.analysis?.ipa ?? ""}
              shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

function renderPageMarkdown(
  items: AnalysisPageItem[],
  activeIndex: number,
  sentenceTotal: number,
): string {
  if (items.length === 0) return "# Nothing to practice";

  const first = items[0].index + 1;
  const last = items[items.length - 1].index + 1;
  const lines = [
    "# Say It Right",
    "",
    sentenceTotal > 1
      ? `Page ${first}-${last} of ${sentenceTotal}. Active sentence: ${activeIndex + 1}.`
      : "Single sentence.",
    "",
    "`⌘]` next sentence · `⌘[` previous sentence · `⌘⇧]` next page · `⌘⇧[` previous page",
  ];

  for (const item of items) {
    const activeMark = item.index === activeIndex ? "▶ " : "";
    lines.push("");
    lines.push("---");
    lines.push("");
    lines.push(`## ${activeMark}${item.index + 1}. ${item.text}`);
    lines.push("");
    if (item.analysis) {
      lines.push(
        renderAnalysis(item.analysis, {
          includeTitle: false,
          sectionHeadingLevel: 3,
        }),
      );
    } else if (item.failed) {
      lines.push(
        "_Could not analyze this sentence. Use Retry Current Sentence to try again._",
      );
    } else {
      lines.push("_Analyzing this sentence..._");
    }
    if (item.translation || item.translationLoading || item.translationFailed) {
      lines.push("");
      lines.push("### Translation");
      if (item.translation) {
        const target = item.translationTarget
          ? `_${item.translationTarget}_\n\n`
          : "";
        lines.push(`${target}> ${item.translation}`);
      } else if (item.translationFailed) {
        lines.push("_Could not translate this sentence._");
      } else {
        lines.push("_Translating..._");
      }
    }
  }

  return lines.join("\n");
}
