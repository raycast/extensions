import {
  ActionPanel,
  Action,
  Detail,
  Form,
  getSelectedText,
  Clipboard,
  showToast,
  Toast,
  getPreferenceValues,
  useNavigation,
} from "@raycast/api";
import { useState, useEffect } from "react";

// Add a form component to edit text
function EditTextForm({ text, onSave }) {
  const [textValue, setTextValue] = useState(text);
  const { pop } = useNavigation();

  function handleSubmit() {
    onSave(textValue);
    pop();
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Changes" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="text"
        title="Text"
        placeholder="Edit your text"
        value={textValue}
        onChange={setTextValue}
        autoFocus
      />
    </Form>
  );
}

export default function Command() {
  const [text, setText] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [issues, setIssues] = useState([]);
  const [correctedText, setCorrectedText] = useState("");
  const [markdownContent, setMarkdownContent] = useState("");
  const { push, pop } = useNavigation();

  const preferences = getPreferenceValues();

  useEffect(() => {
    async function initialize() {
      let textContent = "";

      try {
        // Try to get selected text first
        const selectedText = await getSelectedText();
        if (selectedText) {
          setText(selectedText);
          textContent = selectedText;
          setMarkdownContent("```\n" + selectedText + "\n```");
        } else {
          // Fall back to clipboard content
          try {
            const clipboard = await Clipboard.readText();
            if (clipboard) {
              setText(clipboard);
              textContent = clipboard;
              setMarkdownContent("```\n" + clipboard + "\n```");
            } else {
              // Provide default content if no text is available
              setMarkdownContent("```\nPaste or enter text to check\n```");
              setIsLoading(false);
              return;
            }
          } catch (error) {
            console.error("Error reading clipboard:", error);
            setMarkdownContent("```\nPaste or enter text to check\n```");
            setIsLoading(false);
            return;
          }
        }
      } catch (error) {
        console.error("Error getting selected text:", error);

        // Try clipboard as fallback
        try {
          const clipboard = await Clipboard.readText();
          if (clipboard) {
            setText(clipboard);
            textContent = clipboard;
            setMarkdownContent("```\n" + clipboard + "\n```");
          } else {
            // Provide default content if no text is available
            setMarkdownContent("```\nPaste or enter text to check\n```");
            setIsLoading(false);
            return;
          }
        } catch (error) {
          console.error("Error reading clipboard:", error);
          setMarkdownContent("```\nPaste or enter text to check\n```");
          setIsLoading(false);
          return;
        }
      }

      // Automatically perform spell checking if we have text
      if (textContent.trim()) {
        await handleCheckSpelling(textContent);
      } else {
        setIsLoading(false);
      }
    }

    initialize();
  }, []);

  async function handleCheckSpelling(initialText = null) {
    const textToCheck = initialText || text;

    if (!textToCheck.trim()) {
      showToast({
        style: Toast.Style.Failure,
        title: "No text to check",
      });
      return;
    }

    setIsLoading(true);
    setIssues([]);
    setCorrectedText("");

    try {
      const apiKey = preferences.apiKey || null;
      const language = preferences.preferredLanguage || "auto";
      const endpoint = preferences.endpoint || "https://api.languagetool.org/v2/check";
      const preferredVariants = [
        preferences.languageVarietyEnglish,
        preferences.languageVarietyGerman,
        preferences.languageVarietyPortuguese,
        preferences.languageVarietyCatalan,
      ].filter(Boolean).filter((variant) => variant !== "-").join(",");

      const level = preferences.level || "default";

      const params = new URLSearchParams();
      params.append("text", textToCheck);
      params.append("language", language);
      if (preferredVariants) {
        params.append("preferredVariants", preferredVariants);
      }
      if (level !== "default") {
        params.append("level", level);
      }

      const headers = {
        "Content-Type": "application/x-www-form-urlencoded",
      };

      if (apiKey) {
        headers["Authorization"] = `Bearer ${apiKey}`;
      }

      const response = await fetch(endpoint, {
        method: "POST",
        headers,
        body: params,
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();

      if (data.matches && data.matches.length > 0) {
        // Sort matches by their position in reverse order
        // (to prevent offset changes when applying corrections)
        const sortedMatches = [...data.matches].sort((a, b) => b.offset - a.offset);

        // Create a copy of the original text to apply corrections
        let textWithCorrections = textToCheck;

        // Apply corrections from end to beginning to avoid offset issues
        sortedMatches.forEach((match) => {
          const replacement =
            match.replacements.length > 0
              ? match.replacements[0].value
              : match.context.text.substring(match.context.offset, match.context.offset + match.context.length);

          textWithCorrections =
            textWithCorrections.substring(0, match.offset) +
            replacement +
            textWithCorrections.substring(match.offset + match.length);
        });

        setCorrectedText(textWithCorrections);

        // Sort matches by their position (from start to end for display)
        const displayMatches = [...data.matches].sort((a, b) => a.offset - b.offset);
        setIssues(displayMatches);

        // Create interactive markdown with highlighted issues
        createInteractiveMarkdown(textToCheck, displayMatches);

        showToast({
          style: Toast.Style.Success,
          title: `Found ${data.matches.length} issue(s)`,
          message: "Select an issue to see suggestions",
        });
      } else {
        setMarkdownContent("```\n" + textToCheck + "\n```\n\n✅ **No issues found - your text looks good!**");
        showToast({
          style: Toast.Style.Success,
          title: "No issues found",
          message: "Your text looks good!",
        });
      }
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Error checking spelling",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsLoading(false);
    }
  }

  // Create interactive markdown with highlighted issues and links to fix them
  function createInteractiveMarkdown(originalText, matches) {
    let markdown = "";
    let lastIndex = 0;

    // Create issue index for quick reference
    markdown += "## Selected Text\n\n";
    markdown += "```\n";

    // Insert text with issue markers
    matches.forEach((match) => {
      // Add text before this match
      markdown += originalText.substring(lastIndex, match.offset);

      // Add the issue with special highlighting
      const issueText = originalText.substring(match.offset, match.offset + match.length);
      markdown += `[${issueText}]`;

      // Update last index
      lastIndex = match.offset + match.length;
    });

    // Add any remaining text
    markdown += originalText.substring(lastIndex);
    markdown += "\n```\n\n";

    if (matches.length > 0) {
      // Add interactive section with issues and fixes
      markdown += "## Issues Found\n\n";

      matches.forEach((match, index) => {
        const issueText = originalText.substring(match.offset, match.offset + match.length);

        markdown += `### \`${index + 1}\`&nbsp;&nbsp;${match.message}\n\n`;
        markdown += `**Context:** "${match.context.text}"\n\n`;
        markdown += `**Issue:** "${issueText}"\n\n`;

        if (match.replacements && match.replacements.length > 0) {
          markdown += "**Suggestions:** ";

          // Only show the top 3 suggestions inline
          const topSuggestions = match.replacements.slice(0, 3);
          topSuggestions.forEach((replacement, repIndex) => {
            if (repIndex > 0) markdown += ", ";
            markdown += `${replacement.value}`;
          });

          markdown += `\n\n_Press \`${index + 1}\` or use the Action menu to apply fixes_\n\n`;
        }
      });
    } else {
      markdown += "### ✅ **No issues found - your text looks good!**";
      markdown += "\n\n_Copy or Press `Enter` to paste the text_\n\n";
    }

    setMarkdownContent(markdown);
  }

  // Handle updating text after editing
  function handleTextEdit(newText) {
    setText(newText);
    setMarkdownContent("```\n" + newText + "\n```");
    setIssues([]);
    setCorrectedText("");

    // Automatically check spelling after editing if there's text
    if (newText.trim()) {
      handleCheckSpelling(newText);
    }
  }

  // Handle fixing a specific issue with a selected replacement
  function handleFixIssue(issueIndex, replacement) {
    if (!issues[issueIndex]) {
      return;
    }

    const issue = issues[issueIndex];

    // Create new text with this specific fix applied
    const newText = text.substring(0, issue.offset) + replacement + text.substring(issue.offset + issue.length);

    // Update text state and recreate markdown
    setText(newText);

    // Update remaining issues by adjusting offsets
    const lengthDiff = replacement.length - issue.length;

    const updatedIssues = issues
      .filter((_, index) => index !== issueIndex) // Remove the fixed issue
      .map((issue) => {
        // Only adjust offsets for issues that come after the fixed one
        if (issue.offset > issues[issueIndex].offset) {
          return {
            ...issue,
            offset: issue.offset + lengthDiff,
          };
        }
        return issue;
      });

    setIssues(updatedIssues);

    // Recreate the markdown with updated issues
    createInteractiveMarkdown(newText, updatedIssues);

    showToast({
      style: Toast.Style.Success,
      title: "Fixed issue",
      message: `Replaced "${issues[issueIndex].context.text.substring(
        issues[issueIndex].context.offset,
        issues[issueIndex].context.offset + issues[issueIndex].context.length,
      )}" with "${replacement}"`,
    });

    // Return to main screen
    pop();
  }

  async function handlePasteResult() {
    if (!text.trim()) {
      showToast({
        style: Toast.Style.Failure,
        title: "No text to process",
      });
      return;
    }

    setIsLoading(true);

    try {
      if (!correctedText && issues.length > 0) {
        // If we haven't generated corrected text but we have issues,
        // run the check spelling again to generate corrected text
        await handleCheckSpelling();
      }

      await Clipboard.paste(text);

      showToast({
        style: Toast.Style.Success,
        title: correctedText ? "Corrected Text Pasted" : "Original Text Pasted",
      });
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Error Pasting Result",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Detail
      markdown={markdownContent}
      isLoading={isLoading}
      navigationTitle="LanguageTool Checker"
      actions={
        <ActionPanel>
          <Action title="Paste Result" shortcut={{ modifiers: ["cmd"], key: "enter" }} onAction={handlePasteResult} />
          <Action
            title="Copy Result"
            shortcut={{ modifiers: ["cmd"], key: "c" }}
            onAction={() => Clipboard.copy(correctedText || text)}
          />
          <Action
            title="Apply All Corrections"
            shortcut={{ modifiers: ["cmd", "shift"], key: "enter" }}
            onAction={() => {
              if (correctedText) {
                setText(correctedText);
                setMarkdownContent("```\n" + correctedText + "\n```\n\n✅ **All corrections applied**");
                setIssues([]);
              }
            }}
          />
          <Action
            title="Edit Text"
            shortcut={{ modifiers: ["cmd"], key: "e" }}
            onAction={() => push(<EditTextForm text={text} onSave={handleTextEdit} />)}
          />
          <Action
            title="Check Spelling Again"
            shortcut={{ modifiers: ["cmd"], key: "r" }}
            onAction={handleCheckSpelling}
          />

          {issues.length > 0 && (
            <ActionPanel.Section title="Fix Issues">
              {issues.map((issue, index) => {
                const issueNumber = index + 1;
                const shortcutKey = issueNumber <= 9 ? `${issueNumber}` : undefined;

                return (
                  <Action.Push
                    key={`issue-${index}`}
                    title={`Fix Issue ${issueNumber}: ${issue.message.substring(0, 30)}${issue.message.length > 30 ? "..." : ""}`}
                    shortcut={shortcutKey ? { modifiers: [], key: shortcutKey } : undefined}
                    target={
                      <Detail
                        markdown={`## Issue ${issueNumber}: ${issue.message}\n\n**Context:** "${issue.context.text}"\n\n**Issue:** "${text.substring(issue.offset, issue.offset + issue.length)}"\n\n**Suggestions:**\n\n${
                          issue.replacements && issue.replacements.length > 0
                            ? issue.replacements
                                .slice(0, 5)
                                .map((r, i) => `${i + 1}. ${r.value}`)
                                .join("\n\n")
                            : "No suggestions available"
                        }`}
                        actions={
                          <ActionPanel>
                            {issue.replacements && issue.replacements.length > 0 ? (
                              <>
                                {issue.replacements.slice(0, 5).map((replacement, repIndex) => (
                                  <Action
                                    key={`fix-${index}-${repIndex}`}
                                    title={`Replace with "${replacement.value}"`}
                                    shortcut={{ modifiers: [], key: `${repIndex + 1}` }}
                                    onAction={() => handleFixIssue(index, replacement.value)}
                                  />
                                ))}
                              </>
                            ) : (
                              <Action title="No Suggestions Available" />
                            )}
                            <Action
                              title="Go Back"
                              shortcut={{ modifiers: [], key: "escape" }}
                              onAction={() => pop()}
                            />
                          </ActionPanel>
                        }
                      />
                    }
                  />
                );
              })}
            </ActionPanel.Section>
          )}
        </ActionPanel>
      }
    />
  );
}
