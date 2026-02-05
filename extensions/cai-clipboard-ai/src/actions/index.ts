import { Clipboard, showToast, Toast, open, getPreferenceValues } from "@raycast/api";
import { createElement } from "react";
import { ContentResult } from "../detection/types";
import { LLMStatus } from "../services/llm";
import { summarize, translate, define, explain } from "../services/llm";
import { searchWeb, searchWikipedia } from "./search";
import { openInMaps } from "./maps";
import { createCalendarEvent } from "./calendar";
import { ActionItem } from "../detection/types";
import { AIResultView } from "../components/AIResultView";
import { TranslateForm } from "../components/TranslateForm";
import { ResultView } from "../components/ResultView";

/**
 * Get actions for detected content
 */
export function getActionsForContent(
  text: string,
  detection: ContentResult,
  llmStatus: LLMStatus | null,
): ActionItem[] {
  const actions: ActionItem[] = [];

  switch (detection.type) {
    case "word":
      actions.push(...getWordActions(text, llmStatus));
      break;
    case "short":
      actions.push(...getShortTextActions(text, llmStatus));
      break;
    case "long":
      actions.push(...getLongTextActions(text, llmStatus));
      break;
    case "meeting":
      actions.push(...getMeetingActions(text, detection));
      break;
    case "address":
      actions.push(...getAddressActions(text));
      break;
    case "url":
      actions.push(...getUrlActions(text));
      break;
    case "json":
      actions.push(...getJsonActions(text));
      break;
  }

  return actions;
}

function getWordActions(text: string, llmStatus: LLMStatus | null): ActionItem[] {
  const actions: ActionItem[] = [];
  let shortcutNumber = 1;

  // Define (if LLM available)
  if (llmStatus?.running) {
    actions.push({
      id: "define",
      title: "Define Word",
      subtitle: `Get definition of "${text}"`,
      icon: "📖",
      shortcut: shortcutNumber++,
      component: createElement(AIResultView, {
        title: `Definition: ${text}`,
        text: text,
        generator: define,
        loadingMessage: "Defining",
      }),
    });

    // Explain
    actions.push({
      id: "explain",
      title: "Explain",
      subtitle: `Get detailed explanation of "${text}"`,
      icon: "💡",
      shortcut: shortcutNumber++,
      component: createElement(AIResultView, {
        title: `Explanation: ${text}`,
        text: text,
        generator: explain,
        loadingMessage: "Explaining",
      }),
    });
  }

  // Translate
  if (llmStatus?.running) {
    const { translationLanguage1, translationLanguage2 } = getPreferenceValues<Preferences>();
    const languages = [translationLanguage1, translationLanguage2];

    languages.forEach((lang) => {
      actions.push({
        id: `translate-${lang.toLowerCase()}`,
        title: `Translate to ${lang}`,
        icon: "🌍",
        shortcut: shortcutNumber++,
        component: createElement(AIResultView, {
          title: `Translation to ${lang}`,
          text: text,
          generator: (text: string) => translate(text, lang),
          loadingMessage: `Translating to ${lang}`,
        }),
      });
    });

    // Add "Translate to other language" option
    actions.push({
      id: "translate-other",
      title: "Translate to other language...",
      subtitle: "Enter any language name",
      icon: "🌐",
      shortcut: shortcutNumber++,
      component: createElement(TranslateForm, { text }),
    });
  }

  // Search Web
  actions.push({
    id: "search-web",
    title: "Search Web",
    icon: "🔍",
    shortcut: shortcutNumber++,
    execute: async () => {
      await searchWeb(text);
    },
  });

  return actions;
}

function getShortTextActions(text: string, llmStatus: LLMStatus | null): ActionItem[] {
  const actions: ActionItem[] = [];
  let shortcutNumber = 1;

  // Explain
  if (llmStatus?.running) {
    actions.push({
      id: "explain",
      title: "Explain",
      subtitle: `Get detailed explanation`,
      icon: "💡",
      shortcut: shortcutNumber++,
      component: createElement(AIResultView, {
        title: `Explanation: ${text.substring(0, 50)}${text.length > 50 ? "..." : ""}`,
        text: text,
        generator: explain,
        loadingMessage: "Explaining",
      }),
    });
  }

  // Translate
  if (llmStatus?.running) {
    const { translationLanguage1, translationLanguage2 } = getPreferenceValues<Preferences>();
    const languages = [translationLanguage1, translationLanguage2];

    languages.forEach((lang) => {
      actions.push({
        id: `translate-${lang.toLowerCase()}`,
        title: `Translate to ${lang}`,
        icon: "🌍",
        shortcut: shortcutNumber++,
        component: createElement(AIResultView, {
          title: `Translation to ${lang}`,
          text: text,
          generator: (text: string) => translate(text, lang),
          loadingMessage: `Translating to ${lang}`,
        }),
      });
    });

    // Add "Translate to other language" option
    actions.push({
      id: "translate-other",
      title: "Translate to other language...",
      subtitle: "Enter any language name",
      icon: "🌐",
      shortcut: shortcutNumber++,
      component: createElement(TranslateForm, { text }),
    });
  }

  // Search Web
  actions.push({
    id: "search-web",
    title: "Search Web",
    icon: "🔍",
    shortcut: shortcutNumber++,
    execute: async () => {
      await searchWeb(text);
    },
  });

  // Search Wikipedia
  actions.push({
    id: "search-wikipedia",
    title: "Search Wikipedia",
    icon: "📚",
    shortcut: shortcutNumber++,
    execute: async () => {
      await searchWikipedia(text);
    },
  });

  return actions;
}

function getLongTextActions(text: string, llmStatus: LLMStatus | null): ActionItem[] {
  const actions: ActionItem[] = [];
  let shortcutNumber = 1;

  // Summarize (if LLM available)
  if (llmStatus?.running) {
    actions.push({
      id: "summarize",
      title: "Summarize",
      subtitle: "Get 2-3 sentence summary",
      icon: "📝",
      shortcut: shortcutNumber++,
      component: createElement(AIResultView, {
        title: "Summary",
        text: text,
        generator: summarize,
        loadingMessage: "Summarizing",
      }),
    });
  }

  // Translate
  if (llmStatus?.running) {
    const { translationLanguage1, translationLanguage2 } = getPreferenceValues<Preferences>();
    const languages = [translationLanguage1, translationLanguage2];

    languages.forEach((lang) => {
      actions.push({
        id: `translate-${lang.toLowerCase()}`,
        title: `Translate to ${lang}`,
        icon: "🌍",
        shortcut: shortcutNumber++,
        component: createElement(AIResultView, {
          title: `Translation to ${lang}`,
          text: text,
          generator: (text: string) => translate(text, lang),
          loadingMessage: `Translating to ${lang}`,
        }),
      });
    });

    // Add "Translate to other language" option
    actions.push({
      id: "translate-other",
      title: "Translate to other language...",
      subtitle: "Enter any language name",
      icon: "🌐",
      shortcut: shortcutNumber++,
      component: createElement(TranslateForm, { text }),
    });
  }

  // Search Web
  actions.push({
    id: "search-web",
    title: "Search Web",
    icon: "🔍",
    shortcut: shortcutNumber++,
    execute: async () => {
      await searchWeb(text);
    },
  });

  return actions;
}

function getMeetingActions(text: string, detection: ContentResult): ActionItem[] {
  const actions: ActionItem[] = [];
  let shortcutNumber = 1;

  // Create Calendar Event
  actions.push({
    id: "calendar",
    title: "Create Calendar Event",
    subtitle: detection.entities.dateText,
    icon: "📅",
    shortcut: shortcutNumber++,
    execute: async () => {
      await createCalendarEvent(text, detection);
    },
  });

  // Open in Maps (if location detected)
  if (detection.entities.location) {
    actions.push({
      id: "maps",
      title: "Open in Maps",
      subtitle: detection.entities.location,
      icon: "📍",
      shortcut: shortcutNumber++,
      execute: async () => {
        await openInMaps(detection.entities.location!);
      },
    });
  }

  // Search Web
  actions.push({
    id: "search-web",
    title: "Search Web",
    icon: "🔍",
    shortcut: shortcutNumber++,
    execute: async () => {
      await searchWeb(text);
    },
  });

  return actions;
}

function getAddressActions(text: string): ActionItem[] {
  return [
    {
      id: "maps",
      title: "Open in Maps",
      icon: "📍",
      shortcut: 1,
      execute: async () => {
        await openInMaps(text);
      },
    },
    {
      id: "copy",
      title: "Copy Address",
      icon: "📋",
      shortcut: 2,
      execute: async () => {
        await Clipboard.copy(text);
        await showToast({ style: Toast.Style.Success, title: "Address copied" });
      },
    },
    {
      id: "search-web",
      title: "Search Web",
      icon: "🔍",
      shortcut: 3,
      execute: async () => {
        await searchWeb(text);
      },
    },
  ];
}

function getUrlActions(text: string): ActionItem[] {
  return [
    {
      id: "open",
      title: "Open in Browser",
      icon: "🌐",
      shortcut: 1,
      execute: async () => {
        const url = text.match(/https?:\/\/[^\s]+/)?.[0];
        if (url) {
          await open(url);
        }
      },
    },
    {
      id: "copy-markdown",
      title: "Copy as Markdown",
      subtitle: `[Link](${text})`,
      icon: "📋",
      shortcut: 2,
      execute: async () => {
        await Clipboard.copy(`[Link](${text})`);
        await showToast({ style: Toast.Style.Success, title: "Markdown link copied" });
      },
    },
    {
      id: "search-web",
      title: "Search Web",
      icon: "🔍",
      shortcut: 3,
      execute: async () => {
        await searchWeb(text);
      },
    },
  ];
}

function getJsonActions(text: string): ActionItem[] {
  // Format the JSON for preview
  let formattedJson: string;
  try {
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      // Try removing trailing comma (common when copying from code)
      const cleaned = text.replace(/([}\]])\s*,\s*$/, "$1");
      parsed = JSON.parse(cleaned);
    }
    formattedJson = JSON.stringify(parsed, null, 2);
  } catch {
    formattedJson = text; // Fallback to original if parsing fails
  }

  return [
    {
      id: "pretty-print",
      title: "Pretty Print JSON",
      icon: "✨",
      shortcut: 1,
      component: createElement(ResultView, {
        title: "Formatted JSON",
        content: "```json\n" + formattedJson + "\n```",
      }),
    },
    {
      id: "minify",
      title: "Minify JSON",
      icon: "🗜️",
      shortcut: 2,
      execute: async () => {
        try {
          let parsed;
          try {
            parsed = JSON.parse(text);
          } catch {
            const cleaned = text.replace(/([}\]])\s*,\s*$/, "$1");
            parsed = JSON.parse(cleaned);
          }
          const minified = JSON.stringify(parsed);
          await Clipboard.copy(minified);
          await showToast({ style: Toast.Style.Success, title: "Minified JSON copied" });
        } catch {
          await showToast({ style: Toast.Style.Failure, title: "Invalid JSON" });
        }
      },
    },
  ];
}
