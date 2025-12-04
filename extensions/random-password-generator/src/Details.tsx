import { List } from "@raycast/api";
import { ZxcvbnResult } from "@zxcvbn-ts/core";
import { CrackTimesDisplay, FeedbackType, MatchExtended } from "@zxcvbn-ts/core/dist/types";

interface Props {
  data: ZxcvbnResult | undefined;
}

const crackTimeLabels = {
  onlineThrottling100PerHour: "Throttled Online Attack(_100/hour_)",
  onlineNoThrottling10PerSecond: "UnThrottled Online Attack(_10/second_)",
  offlineSlowHashing1e4PerSecond: "Slow Offline Attack(_10k/sec_)",
  offlineFastHashing1e10PerSecond: "Fast Offline Attack(_10B/sec_)",
};

const getScoreMarkdown = (score: number): string => "## Strength `" + score * 25 + "%`\n";

const getWarningMarkdown = (warning?: string): string => (warning ? "## Warning `" + warning + "`\n" : "");

const getSuggestionMarkdown = (suggestions: string[]): string => {
  let markdown = "";
  suggestions.forEach((suggestion) => {
    markdown += "- " + suggestion + "\n";
  });
  return markdown ? "## Suggestions \n" + markdown : "";
};

const getCrackTimeMarkdown = (crackTimesDisplay: CrackTimesDisplay): string => {
  let markdown = "";
  const {
    onlineThrottling100PerHour,
    onlineNoThrottling10PerSecond,
    offlineSlowHashing1e4PerSecond,
    offlineFastHashing1e10PerSecond,
  } = crackTimesDisplay;

  if (onlineThrottling100PerHour) {
    markdown += "- " + crackTimeLabels.onlineThrottling100PerHour + " `" + onlineThrottling100PerHour + "`\n";
  }
  if (onlineNoThrottling10PerSecond) {
    markdown += "- " + crackTimeLabels.onlineNoThrottling10PerSecond + " `" + onlineNoThrottling10PerSecond + "`\n";
  }
  if (offlineSlowHashing1e4PerSecond) {
    markdown += "- " + crackTimeLabels.offlineSlowHashing1e4PerSecond + " `" + offlineSlowHashing1e4PerSecond + "`\n";
  }
  if (offlineFastHashing1e10PerSecond) {
    markdown += "- " + crackTimeLabels.offlineFastHashing1e10PerSecond + " `" + offlineFastHashing1e10PerSecond + "`\n";
  }

  return markdown ? "## Guess Times\n" + markdown : "";
};

const getMatchSequenceMarkdown = (match: MatchExtended[]): string => {
  let markdown = "";
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  match.forEach(({ i, j, guessesLog10, token, ...item }) => {
    markdown += "#### " + token + "\n";
    Object.entries(item).forEach(([key, value]) => {
      markdown += value ? "- " + key + " `" + value + "`\n" : "";
    });
  });

  return markdown ? "## Matched Sequence(s)\n" + markdown : "";
};

const getFeedbackMarkdown = (feedback: FeedbackType): string =>
  getWarningMarkdown(feedback.warning) + getSuggestionMarkdown(feedback.suggestions);

export function Details({ data }: Props) {
  let markdown = "Loading...";
  if (data) {
    markdown = getScoreMarkdown(data.score);
    markdown += getFeedbackMarkdown(data.feedback);
    markdown += getWarningMarkdown(data.feedback.warning);
    markdown += getCrackTimeMarkdown(data.crackTimesDisplay);
    markdown += getMatchSequenceMarkdown(data.sequence);
  }
  return <List.Item.Detail isLoading={!data} markdown={markdown} />;
}
