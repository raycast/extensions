import React, { useState, useEffect } from "react";
import {
  List,
  ActionPanel,
  Action,
  Clipboard,
  showToast,
  Toast,
  showHUD,
  popToRoot,
  Icon,
  getSelectedText,
} from "@raycast/api";
import {
  getTranslatorConfig,
  getPreferredLanguages,
  expandContent,
  ContentExpansionResult,
} from "./translator";

export default function Command() {
  const [inputText, setInputText] = useState("");
  const [result, setResult] = useState<ContentExpansionResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { primary, secondary } = getPreferredLanguages();

  // Auto-load from clipboard or selected text on mount
  useEffect(() => {
    async function loadContent() {
      try {
        // Try to get selected text first
        let text = "";
        try {
          text = await getSelectedText();
        } catch {
          // Fallback to clipboard
          const clipboardText = await Clipboard.readText();
          text = clipboardText || "";
        }

        if (text.trim()) {
          setInputText(text.trim());
          await handleExpand(text.trim());
        }
      } catch (error) {
        console.error("Failed to load content:", error);
      }
    }
    loadContent();
  }, []);

  async function handleExpand(text?: string) {
    const textToExpand = text || inputText;
    if (!textToExpand.trim()) {
      showToast({
        style: Toast.Style.Failure,
        title: "No Content",
        message: "Please enter or copy some bullet points first.",
      });
      return;
    }

    const config = getTranslatorConfig();

    if (!config.apiKey || !config.apiURL) {
      showToast({
        style: Toast.Style.Failure,
        title: "Configuration Error",
        message: "Please configure API Key and URL in preferences.",
      });
      return;
    }

    setIsLoading(true);

    try {
      const expansionResult = await expandContent(textToExpand.trim(), config);
      setResult(expansionResult);
    } catch (error) {
      console.error("Expansion error:", error);
      showToast({
        style: Toast.Style.Failure,
        title: "Expansion Failed",
        message:
          error instanceof Error
            ? error.message
            : "An unexpected error occurred.",
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function handlePastePrimary() {
    if (!result) return;
    await Clipboard.paste(result.primaryContent);
    await showHUD(`✓ Pasted ${result.primaryLanguage} content`);
    await popToRoot();
  }

  async function handlePasteSecondary() {
    if (!result) return;
    await Clipboard.paste(result.secondaryContent);
    await showHUD(`✓ Pasted ${result.secondaryLanguage} content`);
    await popToRoot();
  }

  async function handleCopyPrimary() {
    if (!result) return;
    await Clipboard.copy(result.primaryContent);
    await showHUD(`✓ Copied ${result.primaryLanguage} content`);
  }

  async function handleCopySecondary() {
    if (!result) return;
    await Clipboard.copy(result.secondaryContent);
    await showHUD(`✓ Copied ${result.secondaryLanguage} content`);
  }

  function handleSearchTextChange(text: string) {
    setInputText(text);
  }

  // Format markdown for detail view
  const detailMarkdown = result
    ? `## 📝 Expanded Content

---

### ${result.primaryLanguage}

${result.primaryContent}

---

### ${result.secondaryLanguage}

${result.secondaryContent}

---

### 📌 Original Input

\`\`\`
${result.originalText}
\`\`\``
    : inputText
      ? `## ⏳ Expanding...

**Original notes:**
\`\`\`
${inputText}
\`\`\``
      : `## 📝 Content Expander

Paste or type your bullet points to transform them into professional content.

**Tips:**
- Use bullet points or short notes
- Works best with 3-10 items
- Press Enter to expand manually`;

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Enter bullet points to expand..."
      onSearchTextChange={handleSearchTextChange}
      isShowingDetail={true}
    >
      {result ? (
        <>
          <List.Item
            title={`${result.primaryLanguage} Version`}
            subtitle={`Paste ${result.primaryLanguage}`}
            icon={Icon.Document}
            detail={<List.Item.Detail markdown={detailMarkdown} />}
            actions={
              <ActionPanel>
                <ActionPanel.Section title={result.primaryLanguage}>
                  <Action
                    title={`Paste ${result.primaryLanguage}`}
                    icon={Icon.Clipboard}
                    onAction={handlePastePrimary}
                  />
                  <Action
                    title={`Copy ${result.primaryLanguage}`}
                    icon={Icon.CopyClipboard}
                    shortcut={{ modifiers: ["cmd"], key: "c" }}
                    onAction={handleCopyPrimary}
                  />
                </ActionPanel.Section>
                <ActionPanel.Section title={result.secondaryLanguage}>
                  <Action
                    title={`Paste ${result.secondaryLanguage}`}
                    icon={Icon.Clipboard}
                    shortcut={{ modifiers: ["cmd"], key: "e" }}
                    onAction={handlePasteSecondary}
                  />
                  <Action
                    title={`Copy ${result.secondaryLanguage}`}
                    icon={Icon.CopyClipboard}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                    onAction={handleCopySecondary}
                  />
                </ActionPanel.Section>
                <ActionPanel.Section title="Re-expand">
                  <Action
                    title="Re-Expand Content"
                    icon={Icon.ArrowClockwise}
                    shortcut={{ modifiers: ["cmd"], key: "r" }}
                    onAction={() => handleExpand()}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
          <List.Item
            title={`${result.secondaryLanguage} Version`}
            subtitle={`Paste ${result.secondaryLanguage}`}
            icon={Icon.Globe}
            detail={<List.Item.Detail markdown={detailMarkdown} />}
            actions={
              <ActionPanel>
                <ActionPanel.Section title={result.secondaryLanguage}>
                  <Action
                    title={`Paste ${result.secondaryLanguage}`}
                    icon={Icon.Clipboard}
                    onAction={handlePasteSecondary}
                  />
                  <Action
                    title={`Copy ${result.secondaryLanguage}`}
                    icon={Icon.CopyClipboard}
                    shortcut={{ modifiers: ["cmd"], key: "c" }}
                    onAction={handleCopySecondary}
                  />
                </ActionPanel.Section>
                <ActionPanel.Section title={result.primaryLanguage}>
                  <Action
                    title={`Paste ${result.primaryLanguage}`}
                    icon={Icon.Clipboard}
                    shortcut={{ modifiers: ["cmd"], key: "v" }}
                    onAction={handlePastePrimary}
                  />
                  <Action
                    title={`Copy ${result.primaryLanguage}`}
                    icon={Icon.CopyClipboard}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                    onAction={handleCopyPrimary}
                  />
                </ActionPanel.Section>
                <ActionPanel.Section title="Re-expand">
                  <Action
                    title="Re-Expand Content"
                    icon={Icon.ArrowClockwise}
                    shortcut={{ modifiers: ["cmd"], key: "r" }}
                    onAction={() => handleExpand()}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        </>
      ) : inputText ? (
        <List.Item
          title="Expanding content..."
          subtitle={
            inputText.length > 50
              ? inputText.substring(0, 50) + "..."
              : inputText
          }
          icon={Icon.Clock}
          detail={<List.Item.Detail markdown={detailMarkdown} />}
          actions={
            <ActionPanel>
              <Action
                title="Expand Now"
                icon={Icon.Wand}
                onAction={() => handleExpand()}
              />
            </ActionPanel>
          }
        />
      ) : (
        <List.EmptyView
          title="Content Expander"
          description={`Paste or type bullet points to transform into ${primary} and ${secondary} content`}
          icon={Icon.Wand}
        />
      )}
    </List>
  );
}
