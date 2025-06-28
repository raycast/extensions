import React from "react";
import { Action, ActionPanel, List, Clipboard, showToast, Toast } from "@raycast/api";
import { useState, useEffect } from "react";
import { BoopScriptManager } from "./utils/scriptManager";
import { analyzeClipboardAndSuggestScripts, getScriptSuggestionTooltip } from "./utils/scriptSuggestions";

interface ScriptInfo {
  name: string;
  filename: string;
  description: string;
  tags: string;
  icon: string;
  category: string;
  isSuggested?: boolean;
  suggestionConfidence?: number;
  suggestionReasons?: string[];
}

export default function BoopScriptsCommand() {
  const [scripts, setScripts] = useState<ScriptInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadScripts();
  }, []);

  async function loadScripts() {
    try {
      // Get clipboard content for suggestions
      const clipboard = await Clipboard.readText();

      // Get script suggestions if clipboard has content
      const suggestions = clipboard ? analyzeClipboardAndSuggestScripts(clipboard) : [];
      const suggestionMap = new Map(suggestions.map((s) => [s.scriptKey, s]));

      const scriptNames = BoopScriptManager.getAvailableScripts();
      const scriptInfos: ScriptInfo[] = [];

      for (const scriptName of scriptNames) {
        const info = BoopScriptManager.getScriptInfo(scriptName);
        const suggestion = suggestionMap.get(scriptName);

        if (info) {
          scriptInfos.push({
            name: info.name,
            filename: scriptName,
            description: info.description,
            tags: info.tags,
            icon: info.icon || "⚡",
            category: info.category,
            isSuggested: !!suggestion,
            suggestionConfidence: suggestion?.confidence,
            suggestionReasons: suggestion?.reasons,
          });
        } else {
          // Fallback for scripts without metadata
          scriptInfos.push({
            name: scriptName.replace(/([A-Z])/g, " $1").trim(),
            filename: scriptName,
            description: `Run ${scriptName} script`,
            tags: "",
            icon: "⚡",
            category: "utility",
            isSuggested: !!suggestion,
            suggestionConfidence: suggestion?.confidence,
            suggestionReasons: suggestion?.reasons,
          });
        }
      }

      // Sort scripts: suggested first (by confidence), then alphabetically
      scriptInfos.sort((a, b) => {
        if (a.isSuggested && !b.isSuggested) return -1;
        if (!a.isSuggested && b.isSuggested) return 1;
        if (a.isSuggested && b.isSuggested) {
          return (b.suggestionConfidence || 0) - (a.suggestionConfidence || 0);
        }
        return a.name.localeCompare(b.name);
      });

      setScripts(scriptInfos);
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to load scripts",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function runScript(scriptName: string, displayName: string) {
    try {
      const clipboardText = await Clipboard.readText();

      if (!clipboardText) {
        await showToast({
          style: Toast.Style.Failure,
          title: "No clipboard content",
          message: "Copy some text to clipboard first",
        });
        return;
      }

      await showToast({
        style: Toast.Style.Animated,
        title: `Running ${displayName}...`,
      });

      const result = await BoopScriptManager.executeScript(scriptName, clipboardText);

      await Clipboard.copy(result);
      await showToast({
        style: Toast.Style.Success,
        title: "Success!",
        message: `Result copied to clipboard`,
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Script failed",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  const suggestedScripts = scripts.filter((s) => s.isSuggested);
  const otherScripts = scripts.filter((s) => !s.isSuggested);

  return React.createElement(
    List,
    {
      isLoading: isLoading,
      searchBarPlaceholder: "Search Boop scripts...",
    },
    // Show suggested scripts section if there are any
    ...(suggestedScripts.length > 0
      ? [
          React.createElement(List.Section, {
            title: `💡 Suggested for your clipboard content (${suggestedScripts.length})`,
            children: suggestedScripts.map((script) =>
              React.createElement(List.Item, {
                key: script.filename,
                title: `⭐ ${script.name}`,
                subtitle: script.description,
                icon: script.icon,
                keywords: script.tags.split(",").map((tag) => tag.trim()),
                accessories: script.suggestionConfidence
                  ? [
                      {
                        text: `${Math.round(script.suggestionConfidence * 100)}%`,
                        tooltip: getScriptSuggestionTooltip({
                          scriptKey: script.filename,
                          confidence: script.suggestionConfidence,
                          reasons: script.suggestionReasons || [],
                        }),
                      },
                    ]
                  : undefined,
                actions: React.createElement(
                  ActionPanel,
                  {},
                  React.createElement(Action, {
                    title: "Run Script on Clipboard",
                    onAction: () => runScript(script.filename, script.name),
                    icon: "🚀",
                  }),
                  React.createElement(Action, {
                    title: "Refresh Suggestions",
                    onAction: () => loadScripts(),
                    icon: "🔄",
                    shortcut: { modifiers: ["cmd"], key: "r" },
                  }),
                  React.createElement(Action.CopyToClipboard, {
                    title: "Copy Script Name",
                    content: script.name,
                    shortcut: { modifiers: ["cmd"], key: "c" },
                  }),
                ),
              }),
            ),
          }),
        ]
      : []),

    // Show all other scripts section
    React.createElement(List.Section, {
      title: suggestedScripts.length > 0 ? `All Scripts (${otherScripts.length})` : `Scripts (${scripts.length})`,
      children: (suggestedScripts.length > 0 ? otherScripts : scripts).map((script) =>
        React.createElement(List.Item, {
          key: script.filename,
          title: script.name,
          subtitle: script.description,
          icon: script.icon,
          keywords: script.tags.split(",").map((tag) => tag.trim()),
          actions: React.createElement(
            ActionPanel,
            {},
            React.createElement(Action, {
              title: "Run Script on Clipboard",
              onAction: () => runScript(script.filename, script.name),
              icon: "🚀",
            }),
            React.createElement(Action, {
              title: "Refresh Suggestions",
              onAction: () => loadScripts(),
              icon: "🔄",
              shortcut: { modifiers: ["cmd"], key: "r" },
            }),
            React.createElement(Action.CopyToClipboard, {
              title: "Copy Script Name",
              content: script.name,
              shortcut: { modifiers: ["cmd"], key: "c" },
            }),
          ),
        }),
      ),
    }),
  );
}
