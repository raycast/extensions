import React from "react";
import {
  Action,
  ActionPanel,
  List,
  Clipboard,
  showToast,
  Toast,
  getSelectedText,
  getPreferenceValues,
} from "@raycast/api";
import { useState, useEffect } from "react";
import { BoopScriptManager } from "./utils/scriptManager";
import { analyzeClipboardAndSuggestScripts, getScriptSuggestionTooltip } from "./utils/scriptSuggestions";

interface Preferences {
  showPreview: boolean;
}

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

/**
 * Main Raycast extension component for Ray Boop.
 *
 * Features:
 * - Automatically detects selected text from the current application
 * - Falls back to clipboard content if no text is selected
 * - Provides different primary actions based on input source:
 *   - Selected text: Transform and paste back (primary), copy to clipboard (secondary)
 *   - Clipboard: Copy to clipboard (primary), transform and paste (secondary)
 * - Smart script suggestions based on content analysis
 */

export default function BoopScriptsCommand() {
  const [scripts, setScripts] = useState<ScriptInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [inputSource, setInputSource] = useState<"clipboard" | "selection" | null>(null);
  const [currentInputText, setCurrentInputText] = useState<string>("");
  const [selectedScript, setSelectedScript] = useState<string | null>(null);
  const [currentPreview, setCurrentPreview] = useState<string>("Select a script to see preview");
  const [currentInfo, setCurrentInfo] = useState<string | undefined>(undefined);
  const [currentError, setCurrentError] = useState<string | undefined>(undefined);
  const preferences = getPreferenceValues<Preferences>();

  useEffect(() => {
    loadScripts();
  }, []);

  async function loadScripts() {
    try {
      // Try to get selected text first, fallback to clipboard
      let text: string = "";
      let source: "clipboard" | "selection" = "clipboard";

      const selectedText = await safeGetSelectedText();
      if (selectedText) {
        text = selectedText;
        source = "selection";
      } else {
        // Fallback to clipboard if no selection
        text = (await Clipboard.readText()) || "";
      }

      setInputSource(source);
      setCurrentInputText(text);

      // Get script suggestions if we have content
      const suggestions = text ? analyzeClipboardAndSuggestScripts(text) : [];
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

  /**
   * Safely attempts to get selected text without throwing
   */
  async function safeGetSelectedText(): Promise<string | null> {
    try {
      const selectedText = await getSelectedText();
      return selectedText && selectedText.trim().length > 0 ? selectedText : null;
    } catch {
      // getSelectedText can fail if there's no selection or no frontmost app
      return null;
    }
  }

  /**
   * Gets the current input text (selected text or clipboard)
   */
  async function getCurrentInputText(): Promise<{ text: string; source: "clipboard" | "selection" }> {
    const selectedText = await safeGetSelectedText();
    if (selectedText) {
      return { text: selectedText, source: "selection" };
    }

    const clipboardText = (await Clipboard.readText()) || "";
    return { text: clipboardText, source: "clipboard" };
  }

  /**
   * Executes a script and returns the result, optionally using cached preview
   */
  async function executeScriptWithResult(
    scriptName: string,
    inputText?: string,
  ): Promise<{ text: string; info?: string; error?: string }> {
    // If we have a valid preview for this script and no specific input text, use the preview
    if (
      !inputText &&
      selectedScript === scriptName &&
      currentPreview &&
      !String(currentPreview).startsWith("Error:") &&
      currentPreview !== "Generating preview..." &&
      currentPreview !== "Select a script to see preview" &&
      currentPreview !== "No input text available for preview"
    ) {
      return { text: String(currentPreview), info: currentInfo, error: currentError };
    }

    const text = inputText !== undefined ? inputText : currentInputText;
    return await BoopScriptManager.executeScript(scriptName, text);
  }

  /**
   * Runs a script and handles the output based on input source
   */
  async function runScriptWithSmartOutput(scriptName: string, displayName: string) {
    try {
      const { text: inputText, source } = await getCurrentInputText();

      await showToast({
        style: Toast.Style.Animated,
        title: `Running ${displayName}...`,
      });

      const result = await executeScriptWithResult(scriptName, inputText);

      if (source === "selection") {
        await Clipboard.paste(result.text);
        await showToast({
          style: Toast.Style.Success,
          title: "Success!",
          message: `Text transformed and pasted back`,
        });
      } else {
        await Clipboard.copy(result.text);
        await showToast({
          style: Toast.Style.Success,
          title: "Success!",
          message: `Result copied to clipboard`,
        });
      }
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Script failed",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  /**
   * Runs a script and always copies result to clipboard
   */
  async function runScriptAndCopyToClipboard(scriptName: string, displayName: string) {
    try {
      const { text: inputText } = await getCurrentInputText();

      await showToast({
        style: Toast.Style.Animated,
        title: `Running ${displayName}...`,
      });

      const result = await executeScriptWithResult(scriptName, inputText);

      await Clipboard.copy(result.text);
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

  /**
   * Runs a script and always pastes result to frontmost application
   */
  async function runScriptAndPaste(scriptName: string, displayName: string) {
    try {
      const { text: inputText } = await getCurrentInputText();

      await showToast({
        style: Toast.Style.Animated,
        title: `Running ${displayName}...`,
      });

      const result = await executeScriptWithResult(scriptName, inputText);

      await Clipboard.paste(result.text);
      await showToast({
        style: Toast.Style.Success,
        title: "Success!",
        message: `Text transformed and pasted`,
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Script failed",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  async function generatePreview(scriptName: string): Promise<{ text: string; info?: string; error?: string }> {
    try {
      const result = await BoopScriptManager.executeScript(scriptName, currentInputText);
      return result;
    } catch (error) {
      return { text: `Error: ${error instanceof Error ? error.message : "Unknown error"}` };
    }
  }

  async function handleSelectionChange(scriptId: string | null) {
    if (!scriptId || !preferences.showPreview) {
      setSelectedScript(null);
      setCurrentPreview("Select a script to see preview");
      setCurrentInfo(undefined);
      setCurrentError(undefined);
      return;
    }

    if (scriptId === selectedScript) {
      return; // No change
    }

    setSelectedScript(scriptId);
    setCurrentPreview("Generating preview...");
    setCurrentInfo(undefined);
    setCurrentError(undefined);

    try {
      const result = await generatePreview(scriptId);
      setCurrentPreview(result.text);
      setCurrentInfo(result.info);
      setCurrentError(result.error);
    } catch (error) {
      setCurrentPreview(`Error: ${error instanceof Error ? error.message : "Unknown error"}`);
      setCurrentInfo(undefined);
      setCurrentError(undefined);
    }
  }

  function getDetailMarkdown(script: ScriptInfo): string {
    const isSelected = selectedScript === script.filename;
    const previewText = isSelected ? currentPreview : "Select this script to see preview";
    const infoText = isSelected && currentInfo ? currentInfo : null;
    const errorText = isSelected && currentError ? currentError : null;

    // Hide preview if we have info/error and preview text is same as input (script didn't transform)
    const shouldShowPreview = !((infoText || errorText) && isSelected && String(currentPreview) === currentInputText);

    return `# ${script.name}\n\n${script.description}\n\n${script.isSuggested && script.suggestionConfidence ? `**Confidence:** ${Math.round(script.suggestionConfidence * 100)}%\n\n` : ""}${script.suggestionReasons && script.suggestionReasons.length > 0 ? `**Reasons:** ${script.suggestionReasons.join(", ")}\n\n` : ""}## Input\n\`\`\`\n${currentInputText || "No input text"}\n\`\`\`${shouldShowPreview ? `\n\n## Preview\n\`\`\`\n${previewText}\n\`\`\`` : ""}${infoText ? `\n\n## Info\n✅ **${infoText}**` : ""}${errorText ? `\n\n## Error\n❌ **${errorText}**` : ""}`;
  }

  const suggestedScripts = scripts.filter((s) => s.isSuggested);
  const otherScripts = scripts.filter((s) => !s.isSuggested);

  return React.createElement(
    List,
    {
      isLoading: isLoading,
      isShowingDetail: preferences.showPreview,
      searchBarPlaceholder: inputSource
        ? `Search Boop scripts... (Source: ${inputSource === "selection" ? "Selected Text" : "Clipboard"})`
        : "Search Boop scripts...",
      onSelectionChange: handleSelectionChange,
    },
    // Show suggested scripts section if there are any
    ...(suggestedScripts.length > 0
      ? [
          React.createElement(List.Section, {
            title: inputSource
              ? `💡 Suggested for your ${inputSource === "selection" ? "selected text" : "clipboard content"} (${suggestedScripts.length})`
              : `💡 Suggested (${suggestedScripts.length})`,
            children: suggestedScripts.map((script) =>
              React.createElement(List.Item, {
                id: script.filename,
                key: `${script.filename}-${selectedScript === script.filename ? String(currentPreview).substring(0, 20) : "unselected"}`,
                title: `⭐ ${script.name}`,
                subtitle: preferences.showPreview ? undefined : script.description,
                icon: script.icon,
                keywords: script.tags.split(",").map((tag) => tag.trim()),
                accessories:
                  !preferences.showPreview && script.suggestionConfidence
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
                detail: preferences.showPreview
                  ? React.createElement(List.Item.Detail, {
                      key: `${script.filename}-${selectedScript === script.filename ? currentPreview.length : 0}`,
                      markdown: getDetailMarkdown(script),
                    })
                  : undefined,
                actions: React.createElement(
                  ActionPanel,
                  {},
                  // Primary action based on input source
                  inputSource === "selection"
                    ? React.createElement(Action, {
                        title: "Transform and Paste Back",
                        onAction: () => runScriptWithSmartOutput(script.filename, script.name),
                        icon: "📝",
                      })
                    : React.createElement(Action, {
                        title: "Run Script on Text",
                        onAction: () => runScriptWithSmartOutput(script.filename, script.name),
                        icon: "🚀",
                      }),

                  // Secondary action - opposite of primary
                  inputSource === "selection"
                    ? React.createElement(Action, {
                        title: "Copy to Clipboard",
                        onAction: () => runScriptAndCopyToClipboard(script.filename, script.name),
                        icon: "📋",
                        shortcut: { modifiers: ["shift"], key: "enter" },
                      })
                    : React.createElement(Action, {
                        title: "Transform and Paste",
                        onAction: () => runScriptAndPaste(script.filename, script.name),
                        icon: "📝",
                        shortcut: { modifiers: ["shift"], key: "enter" },
                      }),

                  React.createElement(Action, {
                    title: "Refresh Suggestions",
                    onAction: () => loadScripts(),
                    icon: "🔄",
                    shortcut: { modifiers: ["cmd"], key: "r" },
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
          id: script.filename,
          key: `${script.filename}-${selectedScript === script.filename ? String(currentPreview).substring(0, 20) : "unselected"}`,
          title: script.name,
          subtitle: preferences.showPreview ? undefined : script.description,
          icon: script.icon,
          keywords: script.tags.split(",").map((tag) => tag.trim()),
          detail: preferences.showPreview
            ? React.createElement(List.Item.Detail, {
                key: `${script.filename}-${selectedScript === script.filename ? currentPreview.length : 0}`,
                markdown: getDetailMarkdown(script),
              })
            : undefined,
          actions: React.createElement(
            ActionPanel,
            {},
            // Primary action based on input source
            inputSource === "selection"
              ? React.createElement(Action, {
                  title: "Transform and Paste Back",
                  onAction: () => runScriptWithSmartOutput(script.filename, script.name),
                  icon: "📝",
                })
              : React.createElement(Action, {
                  title: "Run Script on Text",
                  onAction: () => runScriptWithSmartOutput(script.filename, script.name),
                  icon: "🚀",
                }),

            // Secondary action - opposite of primary
            inputSource === "selection"
              ? React.createElement(Action, {
                  title: "Copy to Clipboard",
                  onAction: () => runScriptAndCopyToClipboard(script.filename, script.name),
                  icon: "📋",
                  shortcut: { modifiers: ["shift"], key: "enter" },
                })
              : React.createElement(Action, {
                  title: "Transform and Paste",
                  onAction: () => runScriptAndPaste(script.filename, script.name),
                  icon: "📝",
                  shortcut: { modifiers: ["shift"], key: "enter" },
                }),

            React.createElement(Action, {
              title: "Refresh Suggestions",
              onAction: () => loadScripts(),
              icon: "🔄",
              shortcut: { modifiers: ["cmd"], key: "r" },
            }),
          ),
        }),
      ),
    }),
  );
}
