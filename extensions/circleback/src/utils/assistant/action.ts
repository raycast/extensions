import { THINKING_WORDS } from "../../constants/assistant";
import type { getTurns } from "./chat";

type Action = ReturnType<typeof getTurns>[number]["actions"][number];

const VERB_TENSES: Record<string, { present: string; past: string }> = {
  Search: { present: "Searching", past: "Searched" },
  Read: { present: "Reading", past: "Read" },
  Get: { present: "Getting", past: "Got" },
  Find: { present: "Finding", past: "Found" },
  List: { present: "Listing", past: "Listed" },
  Draft: { present: "Drafting", past: "Drafted" },
  Create: { present: "Creating", past: "Created" },
  Update: { present: "Updating", past: "Updated" },
  Delete: { present: "Deleting", past: "Deleted" },
  Share: { present: "Sharing", past: "Shared" },
};

export const getThinkingWord = (seed: string) => {
  const wordIndex = [...seed].reduce((hash, character) => (hash * 31 + character.charCodeAt(0)) >>> 0, 0);
  return THINKING_WORDS[wordIndex % THINKING_WORDS.length] ?? "Thinking";
};

export const getThinkingDurationText = (durationMs: number) => {
  const seconds = Math.max(1, Math.ceil(durationMs / 1000));
  return `Thought for ${seconds} second${seconds === 1 ? "" : "s"}`;
};

const formatDate = (date: string) =>
  new Date(date).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });

const getDateDescription = (startDate?: string, endDate?: string) => {
  if (startDate && endDate) {
    return startDate === endDate
      ? `on ${formatDate(startDate)}`
      : `between ${formatDate(startDate)} and ${formatDate(endDate)}`;
  }
  if (startDate) return `after ${formatDate(startDate)}`;
  if (endDate) return `before ${formatDate(endDate)}`;
};

export const getActionDisplay = (
  { toolName, input = {} }: Action,
  isRunning: boolean,
): { text: string; icon?: "search" } => {
  const [verb = "", ...words] = toolName.split(/(?=[A-Z])/);
  const tenses = VERB_TENSES[verb] ?? { present: "Running", past: "Ran" };
  const subject = VERB_TENSES[verb] ? words.join(" ").toLowerCase() : toolName;
  const searchTerms = new Intl.ListFormat("en-US").format(input.searchTerms ?? []);
  const text = [
    isRunning ? tenses.present : tenses.past,
    subject,
    searchTerms ? `for ${searchTerms}` : undefined,
    getDateDescription(input.startDate, input.endDate),
  ]
    .filter(Boolean)
    .join(" ");
  return verb === "Search" ? { text, icon: "search" } : { text };
};
