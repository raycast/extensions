/**
 * Task text parser - TypeScript port from Swift
 * Parses task text for #tags, @priorities, /dates, and natural language
 */

import { parseDate } from "./dateParser";
import { extractTaskTitle } from "./taskExtractor";
import { Priority, Tag, ParsedTask } from "../types";

/**
 * Parses task text and extracts metadata
 */
export function parseTaskText(text: string, availableTags: Tag[]): ParsedTask {
  let cleanedText = text;
  let priority: Priority | undefined;
  let dueDate: Date | undefined;
  const tagIds: string[] = [];
  const detectedTags: string[] = [];
  const matchedKeywords: string[] = [];

  // First, use Natural Language processing for implicit priority and dates
  const nlResults = parseWithNaturalLanguage(text);
  if (nlResults.priority) {
    priority = nlResults.priority;
    matchedKeywords.push(...nlResults.matchedKeywords);
  }
  if (nlResults.dueDate) {
    dueDate = nlResults.dueDate;
  }

  // Parse for #tags
  const tagPattern = /#(\w+)/g;
  let tagMatch;
  while ((tagMatch = tagPattern.exec(text)) !== null) {
    const rawTagName = tagMatch[1];
    const tagName = rawTagName.toLowerCase();

    // Find matching tag
    const matchingTag = availableTags.find((t) => t.name.toLowerCase() === tagName);
    if (matchingTag && matchingTag.id) {
      tagIds.push(matchingTag.id);
      detectedTags.push(matchingTag.name);
    } else {
      detectedTags.push(rawTagName);
    }
  }

  // Remove #tags from cleaned text
  cleanedText = cleanedText.replace(/#(\w+)/g, "");

  // Parse for @priorities (explicit syntax overrides NL detection)
  const priorityPattern = /@(high|medium|low|h|m|l)\b/i;
  const priorityMatch = text.match(priorityPattern);
  if (priorityMatch) {
    const priorityStr = priorityMatch[1].toLowerCase();
    switch (priorityStr) {
      case "high":
      case "h":
        priority = Priority.High;
        break;
      case "medium":
      case "m":
        priority = Priority.Medium;
        break;
      case "low":
      case "l":
        priority = Priority.Low;
        break;
    }
  }

  // Remove @priorities from cleaned text
  cleanedText = cleanedText.replace(/@(high|medium|low|h|m|l)\b/gi, "");

  // Parse for /dates (explicit syntax overrides NL detection)
  const datePattern = /\/\s*([^@#\n]+?)(?=\s*[@#]|\s*$)/;
  const dateMatch = text.match(datePattern);
  if (dateMatch) {
    const dateStr = dateMatch[1].trim();
    const parsedDate = parseDate(dateStr);
    if (parsedDate) {
      dueDate = parsedDate;
    }
  }

  // Remove /dates from cleaned text
  cleanedText = cleanedText.replace(/\/\s*[^@#\n]+/g, "");

  // Use AI to intelligently extract the core task title
  const extraction = extractTaskTitle(cleanedText);
  cleanedText = extraction.taskTitle;

  return {
    cleanedText,
    priority,
    dueDate,
    tagIds,
    detectedTags,
    matchedKeywords,
  };
}

// MARK: - Natural Language Processing

interface NLParseResult {
  priority?: Priority;
  dueDate?: Date;
  matchedKeywords: string[];
  detectedDateString?: string;
}

/**
 * Parses text for explicit priority keywords and date information
 */
function parseWithNaturalLanguage(text: string): NLParseResult {
  let detectedPriority: Priority | undefined;
  let detectedDate: Date | undefined;
  const matchedKeywords: string[] = [];
  let detectedDateString: string | undefined;

  const lowercasedText = text.toLowerCase();

  // HIGH priority keywords - extensive list of urgency indicators
  const urgencyKeywords = [
    // Explicit urgency
    "urgent",
    "asap",
    "immediately",
    "critical",
    "important",
    "emergency",
    "priority",
    "crucial",
    "vital",
    "essential",
    "pressing",
    "imperative",

    // Action urgency
    "now",
    "right now",
    "right away",
    "stat",
    "pronto",
    "quick",
    "quickly",
    "hurry",
    "rush",
    "time sensitive",
    "deadline",

    // Severity
    "must",
    "have to",
    "need to",
    "got to",
    "gotta",
    "required",
    "mandatory",

    // Expressions
    "high priority",
    "top priority",
    "first priority",
    "drop everything",
  ];

  // MEDIUM priority keywords
  const moderateKeywords = [
    "soon",
    "when possible",
    "should",
    "eventually",
    "sometime",
    "moderately important",
    "medium priority",
    "fairly important",
    "would like to",
    "preferably",
    "ideally",
    "if possible",
  ];

  // LOW priority keywords
  const lowPriorityKeywords = [
    "low priority",
    "whenever",
    "no rush",
    "not urgent",
    "someday",
    "maybe",
    "if time permits",
    "nice to have",
    "optional",
  ];

  // Check for HIGH priority keywords
  for (const keyword of urgencyKeywords) {
    if (lowercasedText.includes(keyword)) {
      detectedPriority = Priority.High;
      matchedKeywords.push(keyword);
    }
  }

  // Check for MEDIUM priority keywords (only if not already HIGH)
  if (!detectedPriority) {
    for (const keyword of moderateKeywords) {
      if (lowercasedText.includes(keyword)) {
        detectedPriority = Priority.Medium;
        matchedKeywords.push(keyword);
      }
    }
  }

  // Check for LOW priority keywords (only if not already set)
  if (!detectedPriority) {
    for (const keyword of lowPriorityKeywords) {
      if (lowercasedText.includes(keyword)) {
        detectedPriority = Priority.Low;
        matchedKeywords.push(keyword);
      }
    }
  }

  // Parse natural language dates
  const dateKeywords: [string, number][] = [
    // Immediate
    ["today", 0],
    ["tonight", 0],
    ["this evening", 0],
    ["this afternoon", 0],
    ["this morning", 0],
    ["later today", 0],
    ["by end of day", 0],
    ["eod", 0],

    // Tomorrow variations
    ["tomorrow", 1],
    ["tmrw", 1],
    ["tmr", 1],
    ["tom", 1],
    ["tomorrow morning", 1],
    ["tomorrow afternoon", 1],
    ["tomorrow evening", 1],

    // Weekdays - full names
    ["monday", nextWeekday(2)],
    ["tuesday", nextWeekday(3)],
    ["wednesday", nextWeekday(4)],
    ["thursday", nextWeekday(5)],
    ["friday", nextWeekday(6)],
    ["saturday", nextWeekday(7)],
    ["sunday", nextWeekday(1)],

    // Weekdays - abbreviations
    ["mon", nextWeekday(2)],
    ["tue", nextWeekday(3)],
    ["tues", nextWeekday(3)],
    ["wed", nextWeekday(4)],
    ["thu", nextWeekday(5)],
    ["thur", nextWeekday(5)],
    ["thurs", nextWeekday(5)],
    ["fri", nextWeekday(6)],
    ["sat", nextWeekday(7)],
    ["sun", nextWeekday(1)],

    // Relative periods
    ["next week", 7],
    ["next month", 30],
    ["this weekend", daysUntilWeekend()],
    ["weekend", daysUntilWeekend()],
    ["end of week", daysUntilFriday()],
    ["end of month", daysUntilEndOfMonth()],

    // Days ahead
    ["day after tomorrow", 2],
    ["in 2 days", 2],
    ["in 3 days", 3],
    ["in a week", 7],
    ["in two weeks", 14],
  ];

  for (const [keyword, daysToAdd] of dateKeywords) {
    if (lowercasedText.includes(keyword)) {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + daysToAdd);
      futureDate.setHours(0, 0, 0, 0);
      detectedDate = futureDate;
      detectedDateString = keyword;
      break;
    }
  }

  return {
    priority: detectedPriority,
    dueDate: detectedDate,
    matchedKeywords,
    detectedDateString,
  };
}

// Helper to calculate days until next occurrence of a weekday (1 = Sunday, 2 = Monday, 7 = Saturday)
function nextWeekday(targetWeekday: number): number {
  const today = new Date();
  const currentWeekday = today.getDay(); // 0 = Sunday

  let daysToAdd = targetWeekday - currentWeekday;
  if (daysToAdd <= 0) {
    daysToAdd += 7; // Next week
  }

  return daysToAdd;
}

// Helper to calculate days until next weekend (Saturday)
function daysUntilWeekend(): number {
  return nextWeekday(7); // Saturday is 7
}

// Helper to calculate days until Friday
function daysUntilFriday(): number {
  return nextWeekday(6); // Friday is 6
}

// Helper to calculate days until end of current month
function daysUntilEndOfMonth(): number {
  const today = new Date();
  const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const currentDay = today.getDate();
  return lastDay - currentDay;
}
