import { DailyLog } from "../domain/dailyLog/DailyLog";
import { StandupLogs } from "../domain/dailyLog/useCases/GetDailyLogsForStandupSpeechUseCase";
import { formatLongDate, formatMonth, formatShortDate } from "../shared/dates";
import { logsGroupedByDayToMarkdown, logsToMarkdownList } from "../shared/markdown";
import { ChatMessage } from "./llm";

function systemMessage(instructions?: string): ChatMessage {
  const base =
    "You help a person make sense of their personal work log. " +
    "Each log entry is something they did, with the time they logged it. " +
    "Answer in Markdown, be concise and specific, write in the first person as if you were them, " +
    "and only use information that is present in the log: never invent tasks, names or results.";
  return { role: "system", content: instructions ? `${base}\n\nAdditional instructions: ${instructions}` : base };
}

function conversation(prompt: string, instructions?: string): ChatMessage[] {
  return [systemMessage(instructions), { role: "user", content: prompt }];
}

export function daySummaryPrompt(date: Date, logs: DailyLog[], instructions?: string): ChatMessage[] {
  return conversation(
    `Summarize what I did on ${formatLongDate(date)}. Group related entries into a few themes, ` +
      `highlight the most important accomplishments and finish with a one sentence takeaway.\n\n` +
      `My log:\n${logsToMarkdownList(logs)}`,
    instructions,
  );
}

export function weekSummaryPrompt(start: Date, end: Date, logs: DailyLog[], instructions?: string): ChatMessage[] {
  return conversation(
    `Write my weekly report for the week from ${formatShortDate(start)} to ${formatShortDate(end)}. ` +
      `Use these sections: "Highlights" (the most important accomplishments), "Worked on" (the core topics, ` +
      `grouping related entries) and "Follow-ups" (anything that looks unfinished; omit the section if there is nothing).\n\n` +
      `My log:\n${logsGroupedByDayToMarkdown(logs)}`,
    instructions,
  );
}

export function monthSummaryPrompt(month: Date, logs: DailyLog[], instructions?: string): ChatMessage[] {
  return conversation(
    `Was I productive in ${formatMonth(month)}? Make a quick summary grouping the core things I worked on ` +
      `during the whole month, mention the most significant achievements and any recurring themes.\n\n` +
      `My log:\n${logsGroupedByDayToMarkdown(logs, { includeTime: false })}`,
    instructions,
  );
}

export function standupPrompt(standup: StandupLogs, instructions?: string): ChatMessage[] {
  const previous = standup.previousDay
    ? `What I did on ${formatLongDate(standup.previousDay.date)}:\n${logsToMarkdownList(standup.previousDay.logs)}`
    : "";
  const today = standup.today.length > 0 ? `What I have done so far today:\n${logsToMarkdownList(standup.today)}` : "";
  return conversation(
    `Create a short speech (under a minute when read aloud) that I can read in my daily standup meeting. ` +
      `Talk about what I did since the last standup and, if it can be inferred from the log, what I'll focus on next. ` +
      `Keep a natural, spoken tone and avoid reading every entry one by one.\n\n${[previous, today]
        .filter(Boolean)
        .join("\n\n")}`,
    instructions,
  );
}
