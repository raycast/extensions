import * as chrono from "chrono-node";
import { useMemo } from "react";

import { Project, Label } from "../api";

export type ParsedData = {
  cleanedTitle: string;
  priority?: number;
  projectId?: string;
  dateString?: string;
  deadlineString?: string;
  parsedDate?: Date;
  parsedDeadline?: Date;
  labels?: string[];
};

/**
 * Hook for real-time NLP parsing of task content
 * Parses priority patterns (p1-p4), project names (#project or #"Project Name"),
 * labels (@label or @"Label Name"), dates (natural language), and deadlines ({date})
 *
 * Supports spaces in project and label names using quotes or natural spacing:
 * - #"Project Name" or #Project Name for projects with spaces
 * - @"Label Name" or @Label Name for labels with spaces
 *
 * NOTE: This hook does NOT modify the original content - it only extracts
 * information to populate other form fields. The title remains unchanged.
 *
 * Uses chrono-node for date parsing, which supports the same patterns as Todoist:
 * - Simple dates: "tomorrow", "next monday", "march 15"
 * - Times: "tomorrow at 3pm", "monday at 12:30"
 * - Relative: "in 3 days", "in 2 weeks"
 * - Complex: "next friday at 2pm", "monday morning"
 *
 * Date parsing excludes content within labels and projects to prevent conflicts
 * (e.g., "@This Month" won't be parsed as a date, only as a label)
 */
export function useNLPParser(content: string, projects?: Project[], allLabels?: Label[]): ParsedData {
  return useMemo(() => {
    if (!content) {
      return { cleanedTitle: content };
    }

    // We keep the original content unchanged for the title field
    let priority: number | undefined;
    let projectId: string | undefined;
    let dateString: string | undefined;
    let deadlineString: string | undefined;
    let parsedDate: Date | undefined;
    let parsedDeadline: Date | undefined;
    let labels: string[] = [];

    // Parse deadline patterns - use the LAST occurrence ({date expression})
    const deadlineMatches = Array.from(content.matchAll(/\{([^}]+)\}/g));
    if (deadlineMatches.length > 0) {
      // Use the last deadline pattern found
      const lastDeadlineMatch = deadlineMatches[deadlineMatches.length - 1];
      deadlineString = lastDeadlineMatch[1];

      // Parse the deadline using chrono with enhanced configuration
      const deadlineResults = chrono.casual.parse(deadlineString, new Date(), { forwardDate: true });
      if (deadlineResults.length > 0) {
        parsedDeadline = deadlineResults[0].start.date();
      }
    }

    // Parse labels (@label) - extract all labels using smart shortest-first matching
    // Use the same approach as projects: capture all text then validate against actual labels
    const labelMatches = Array.from(
      content.matchAll(/@(?:"([^"]+)"|([a-zA-Z0-9_\u00A0-\uFFFF]+(?:\s+[a-zA-Z0-9_\u00A0-\uFFFF]+)*))/g),
    );
    if (labelMatches.length > 0 && allLabels) {
      const validLabels: string[] = [];

      // Process each label match to find valid labels
      for (const match of labelMatches) {
        const candidateName = match[1] || match[2]; // match[1] is quoted, match[2] is unquoted

        // For unquoted matches, try shortest possible matches first
        if (!match[1] && match[2]) {
          // Only for unquoted matches
          const words = candidateName.split(/\s+/);

          // Try progressively longer combinations starting from single word
          for (let wordCount = 1; wordCount <= words.length; wordCount++) {
            const testName = words.slice(0, wordCount).join(" ");

            const matchingLabel = findBestLabelMatch(allLabels, testName);

            if (matchingLabel) {
              validLabels.push(matchingLabel.name);
              break; // Found a match, stop looking for longer combinations
            }
          }
        } else {
          // For quoted matches, use the full quoted content
          const matchingLabel = findBestLabelMatch(allLabels, candidateName);

          if (matchingLabel) {
            validLabels.push(matchingLabel.name);
          }
        }
      }

      // Remove duplicates, keeping the last occurrence of each unique label
      const uniqueLabels = [...new Set(validLabels.reverse())].reverse();
      labels = uniqueLabels;
    }

    // Parse priority patterns - use the LAST occurrence (p1, p2, p3, p4)
    const priorityMatches = Array.from(content.matchAll(/\bp([1-4])\b/gi));
    if (priorityMatches.length > 0) {
      // Use the last priority pattern found
      const lastPriorityMatch = priorityMatches[priorityMatches.length - 1];
      const priorityNumber = parseInt(lastPriorityMatch[1], 10);

      // Convert user input to Todoist priority values
      // p1 (user) -> priority 4 (todoist), p4 (user) -> priority 1 (todoist)
      const priorityMap: Record<number, number> = {
        1: 4, // p1 -> highest priority (4)
        2: 3, // p2 -> high priority (3)
        3: 2, // p3 -> medium priority (2)
        4: 1, // p4 -> lowest priority (1)
      };

      priority = priorityMap[priorityNumber];
    }

    // Parse project patterns - use the LAST occurrence (#ProjectName)
    // Simple approach: capture minimal words and validate against project list
    const projectMatches = Array.from(
      content.matchAll(/#(?:"([^"]+)"|([a-zA-Z0-9_\u00A0-\uFFFF]+(?:\s+[a-zA-Z0-9_\u00A0-\uFFFF]+)*))/g),
    );
    if (projectMatches.length > 0 && projects) {
      // Try each match from last to first to get the most recent one
      for (let i = projectMatches.length - 1; i >= 0; i--) {
        const match = projectMatches[i];
        const candidateName = match[1] || match[2]; // match[1] is quoted, match[2] is unquoted

        // For unquoted matches, try shortest possible matches first
        if (!match[1] && match[2]) {
          // Only for unquoted matches
          const words = candidateName.split(/\s+/);

          // Try progressively longer combinations starting from single word
          for (let wordCount = 1; wordCount <= words.length; wordCount++) {
            const testName = words.slice(0, wordCount).join(" ");

            const matchingProject = findBestProjectMatch(projects, testName);

            if (matchingProject) {
              projectId = matchingProject.id;
              break; // Found a match, stop looking
            }
          }

          if (projectId) break; // Found match, exit outer loop
        } else {
          // For quoted matches, use the full quoted content
          const matchingProject = findBestProjectMatch(projects, candidateName);

          if (matchingProject) {
            projectId = matchingProject.id;
            break; // Found a match, stop looking
          }
        }
      }
    }

    // Enhanced natural language date parsing using chrono-node
    // We parse from the original content to find dates - use the LAST/MOST RECENT date found
    // BUT exclude any dates that are inside curly braces (deadline patterns), labels (@), or actual projects (#)
    const customChrono = chrono.casual.clone();

    // Create a version of content with patterns removed to avoid date parsing conflicts
    let contentForDateParsing = content;

    // Remove complete deadline patterns {date} from date parsing
    contentForDateParsing = contentForDateParsing.replace(/\{[^}]+\}/g, "");

    // Also remove incomplete deadline patterns {partial to avoid parsing dates inside them
    contentForDateParsing = contentForDateParsing.replace(/\{[^}]*$/g, "");

    // Remove label patterns to prevent date parsing within labels (@"This Month" or @ThisMonth)
    contentForDateParsing = contentForDateParsing.replace(
      /@(?:"[^"]+"|[a-zA-Z0-9_\u00A0-\uFFFF]+(?:\s+[a-zA-Z0-9_\u00A0-\uFFFF]+)*)/g,
      "",
    );

    // Smart project removal: Only remove actual project names that exist in the projects list
    if (projects && projects.length > 0) {
      const projectMatches = Array.from(
        content.matchAll(/#(?:"([^"]+)"|([a-zA-Z0-9_\u00A0-\uFFFF]+(?:\s+[a-zA-Z0-9_\u00A0-\uFFFF]+)*?)(?=\s|$))/g),
      );

      for (const match of projectMatches) {
        const userProjectName = match[1] || match[2];

        // Check if this is actually a project name that exists
        const matchingProject = findBestProjectMatch(projects, userProjectName);

        // Only remove if it's an actual project name
        if (matchingProject) {
          const fullMatch = match[0]; // The complete match like "#VISA" or "#"Project Name""
          const escapedMatch = fullMatch.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
          contentForDateParsing = contentForDateParsing.replace(new RegExp(escapedMatch, "g"), "");
        }
      }
    }

    // Parse dates with enhanced options for better coverage
    const dateResults = customChrono.parse(contentForDateParsing, new Date(), {
      forwardDate: true, // Prefer future dates when ambiguous (like Todoist does)
    });

    if (dateResults.length > 0) {
      // Use the LAST date found (most recent in the text)
      const lastDateResult = dateResults[dateResults.length - 1];

      dateString = lastDateResult.text;
      parsedDate = lastDateResult.start.date();
    }

    // Return the original content as cleanedTitle (no cleaning applied)
    return {
      cleanedTitle: content, // Keep original content unchanged
      priority,
      projectId,
      dateString,
      deadlineString,
      parsedDate,
      parsedDeadline,
      labels,
    };
  }, [content, projects, allLabels]);
}

/**
 * Normalizes project name by converting to lowercase and removing emojis
 */
function normalizeProjectName(name: string): string {
  // Remove emojis using regex that matches most emoji ranges
  const emojiRegex =
    /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu;

  return name
    .replace(emojiRegex, "") // Remove emojis
    .toLowerCase() // Convert to lowercase
    .trim(); // Remove leading/trailing whitespace
}

/**
 * Normalizes label name by converting to lowercase and removing emojis
 * Same logic as normalizeProjectName for consistency
 */
function normalizeLabelName(name: string): string {
  // Remove emojis using regex that matches most emoji ranges
  const emojiRegex =
    /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu;

  return name
    .replace(emojiRegex, "") // Remove emojis
    .toLowerCase() // Convert to lowercase
    .trim(); // Remove leading/trailing whitespace
}

/**
 * Finds the best matching project using tiered matching strategy:
 * 1. Exact match (case-sensitive, with emojis)
 * 2. Case-insensitive match (with emojis)
 * 3. Emoji-insensitive match (case-sensitive)
 * 4. Fully normalized match (case-insensitive, no emojis)
 */
function findBestProjectMatch(projects: Project[], userInput: string): Project | undefined {
  const trimmedInput = userInput.trim();

  // Tier 1: Exact match (case-sensitive, with emojis)
  let match = projects.find((project) => project.name === trimmedInput);
  if (match) return match;

  // Tier 2: Case-insensitive match (with emojis)
  match = projects.find((project) => project.name.toLowerCase() === trimmedInput.toLowerCase());
  if (match) return match;

  // Tier 3: Emoji-insensitive match (case-sensitive)
  const inputWithoutEmojis = removeEmojis(trimmedInput);
  match = projects.find((project) => removeEmojis(project.name) === inputWithoutEmojis);
  if (match) return match;

  // Tier 4: Fully normalized match (case-insensitive, no emojis)
  const normalizedInput = normalizeProjectName(trimmedInput);
  match = projects.find((project) => normalizeProjectName(project.name) === normalizedInput);

  return match;
}

/**
 * Finds the best matching label using tiered matching strategy:
 * 1. Exact match (case-sensitive, with emojis)
 * 2. Case-insensitive match (with emojis)
 * 3. Emoji-insensitive match (case-sensitive)
 * 4. Fully normalized match (case-insensitive, no emojis)
 */
function findBestLabelMatch(labels: Label[], userInput: string): Label | undefined {
  const trimmedInput = userInput.trim();

  // Tier 1: Exact match (case-sensitive, with emojis)
  let match = labels.find((label) => label.name === trimmedInput);
  if (match) return match;

  // Tier 2: Case-insensitive match (with emojis)
  match = labels.find((label) => label.name.toLowerCase() === trimmedInput.toLowerCase());
  if (match) return match;

  // Tier 3: Emoji-insensitive match (case-sensitive)
  const inputWithoutEmojis = removeEmojis(trimmedInput);
  match = labels.find((label) => removeEmojis(label.name) === inputWithoutEmojis);
  if (match) return match;

  // Tier 4: Fully normalized match (case-insensitive, no emojis)
  const normalizedInput = normalizeLabelName(trimmedInput);
  match = labels.find((label) => normalizeLabelName(label.name) === normalizedInput);

  return match;
}

/**
 * Removes emojis from a string using the same regex as normalization functions
 */
function removeEmojis(text: string): string {
  const emojiRegex =
    /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu;

  return text.replace(emojiRegex, "").trim();
}
