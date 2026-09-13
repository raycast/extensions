import { Icon, List } from "@raycast/api";
import type { PromptProps } from "../managers/prompt-manager";
import {
  SpecificReplacements,
  placeholderFormatter,
  resolvePlaceholders,
  getPropertyByPath,
} from "./placeholder-formatter";
import promptManager from "../managers/prompt-manager";

const IDENTIFIER_PREFIX = "quickgpt-";

const placeholderIcons: { [key: string]: Icon } = {
  input: Icon.TextInput,
  clipboard: Icon.Clipboard,
  selection: Icon.TextCursor,
  currentApp: Icon.AppWindow,
  allApp: Icon.AppWindowGrid2x2,
  browserContent: Icon.Globe,
  promptTitles: Icon.List,
  file: Icon.Document,
  diff: Icon.CodeBlock,
};

export function generatePlaceholders(keysList: string | undefined, position: "prefix" | "suffix"): string {
  let activeKeys: string[] = [];
  const providedKeysTrimmed = keysList?.trim();

  if (providedKeysTrimmed && providedKeysTrimmed.length > 0) {
    activeKeys = providedKeysTrimmed
      .split(",")
      .map((key) => key.trim())
      .filter((key) => key.length > 0);

    activeKeys = Array.from(new Set(activeKeys));
  }

  const placeholderString = activeKeys.map((key) => `{{${key}}}`).join("\n");

  if (position === "prefix") {
    return placeholderString + (placeholderString.length > 0 ? "\n" : "");
  } else {
    return (placeholderString.length > 0 ? "\n" : "") + placeholderString;
  }
}

export function generatePrefixPlaceholders(prefix: string | undefined): string {
  return generatePlaceholders(prefix, "prefix");
}

export function generateSuffixPlaceholders(suffix: string | undefined): string {
  return generatePlaceholders(suffix, "suffix");
}

export function getQuickPrompt(
  selectionText: string,
  identifier?: string,
  filePath?: string,
): [PromptProps | undefined, string] {
  let foundPrompt;
  let cleanedText = selectionText;

  if (identifier) {
    foundPrompt = promptManager.findPrompt((prompt) => `${IDENTIFIER_PREFIX}${prompt.identifier}` === identifier);
    if (foundPrompt && filePath) {
      foundPrompt.filePath = filePath;
    }
  } else {
    const targetIdentifierPrefix = `${IDENTIFIER_PREFIX}`;
    const trimmedSelectionText = selectionText.trimStart();
    let identifierStartIndexInOriginal = -1;

    foundPrompt = promptManager.findPrompt((prompt) => {
      if (prompt.identifier) {
        const fullIdentifier = `${targetIdentifierPrefix}${prompt.identifier}`;
        if (trimmedSelectionText.startsWith(fullIdentifier)) {
          const leadingWhitespaceLength = selectionText.length - trimmedSelectionText.length;
          identifierStartIndexInOriginal = leadingWhitespaceLength;
          return true;
        }
      }
      return false;
    });

    if (foundPrompt?.identifier && identifierStartIndexInOriginal !== -1) {
      const fullIdentifier = `${targetIdentifierPrefix}${foundPrompt.identifier}`;
      cleanedText = selectionText.substring(identifierStartIndexInOriginal + fullIdentifier.length).trim();
    } else {
      cleanedText = selectionText;
    }
  }

  return [foundPrompt, cleanedText];
}

export function buildFormattedPromptContent(
  prompt: PromptProps,
  replacements: SpecificReplacements,
  relativeRootDir?: string,
): string {
  const currentContent = prompt.content || "";

  const prefixPlaceholderString = generatePrefixPlaceholders(prompt.prefix);

  const suffixPlaceholderString = generateSuffixPlaceholders(prompt.suffix);

  const contentWithPlaceholders = prefixPlaceholderString + currentContent + suffixPlaceholderString;

  const mergedReplacements = {
    ...prompt,
    ...replacements,
    promptTitles: replacements.promptTitles || getIndentedPromptTitles(),
    prompts: replacements.prompts || getIndentedPromptsWithContent(),
  };

  const formattedContent = placeholderFormatter(contentWithPlaceholders, mergedReplacements, relativeRootDir, {
    resolveFile: true,
  });

  return formattedContent;
}

export function getPlaceholderIcons(
  content: string | undefined,
  replacements: Omit<SpecificReplacements, "clipboard">,
): List.Item.Accessory[] {
  if (!content) return [];

  const usedPlaceholders = resolvePlaceholders(content, replacements);

  const placeholderIconsArray: List.Item.Accessory[] = [];
  usedPlaceholders.forEach((placeholder) => {
    const icon = placeholderIcons[placeholder];
    if (icon) {
      placeholderIconsArray.push({ icon });
    }
  });

  const fileRegex = /{{(file|content):[^}]+}}/g;
  if (fileRegex.test(content)) {
    placeholderIconsArray.push({ icon: placeholderIcons.file });
  }

  return placeholderIconsArray;
}

export function getIndentedPromptTitles(): string {
  const rootPrompts = promptManager.getRootPrompts();
  const result: string[] = [];

  function processPrompt(prompt: PromptProps, level: number = 0) {
    const indent = "  ".repeat(level);

    let contentSummary = "";
    if (prompt.content) {
      let processedContent = prompt.content;

      const prefixPlaceholders = generatePrefixPlaceholders(prompt.prefix);
      const suffixPlaceholders = generateSuffixPlaceholders(prompt.suffix);
      processedContent = prefixPlaceholders + processedContent + suffixPlaceholders;

      const cleanContent = processedContent
        .replace(/{{.*?}}\n/g, "")
        .replace(/\n/g, " ")
        .trim();

      contentSummary = cleanContent.length > 20 ? cleanContent.substring(0, 20) + "..." : cleanContent;

      if (contentSummary) {
        contentSummary = ` - ${contentSummary}`;
      }
    }

    result.push(`${indent}${prompt.title}${contentSummary}`);

    if (prompt.subprompts && prompt.subprompts.length > 0) {
      prompt.subprompts.forEach((subprompt) => {
        processPrompt(subprompt, level + 1);
      });
    }
  }

  rootPrompts.forEach((prompt) => {
    processPrompt(prompt);
  });

  return result.join("\n");
}

export function getIndentedPromptsWithContent(): string {
  const rootPrompts = promptManager.getRootPrompts();
  const result: string[] = [];

  function processPrompt(prompt: PromptProps, level: number = 0) {
    const indent = "  ".repeat(level);
    const icon = prompt.icon ? `${prompt.icon} ` : "";
    result.push(`${indent}${icon}${prompt.title}`);

    if (prompt.content) {
      const contentIndent = "  ".repeat(level + 1);
      const formattedContent = prompt.content
        .split("\n")
        .map((line) => `${contentIndent}${line}`)
        .join("\n");
      result.push(formattedContent);
    }

    if (prompt.subprompts && prompt.subprompts.length > 0) {
      prompt.subprompts.forEach((subprompt) => {
        processPrompt(subprompt, level + 1);
      });
    }
  }

  rootPrompts.forEach((prompt) => {
    processPrompt(prompt);
  });

  return result.join("\n");
}

export function findOptionPlaceholders(prompt: PromptProps): string[] {
  const optionKeys: string[] = [];
  if (!prompt.content) return optionKeys;

  const regex = /{{option:([^}]+)}}/g;
  let match;

  while ((match = regex.exec(prompt.content)) !== null) {
    const propertyName = match[1].trim();
    const propValue = getPropertyByPath(prompt, propertyName);
    if (
      (Array.isArray(propValue) && propValue.length > 0) ||
      (propValue && typeof propValue === "object" && !Array.isArray(propValue) && Object.keys(propValue).length > 0)
    ) {
      optionKeys.push(propertyName);
    }
  }

  return Array.from(new Set(optionKeys));
}
