import { Action, ActionPanel, List, getSelectedText, Clipboard, showToast, Toast, closeMainWindow } from "@raycast/api";
import { useState, useEffect } from "react";
import { toUnicodeVariant, VARIANTS } from "./lib/toUnicodeVariant";

export default function Command() {
  const [inputText, setInputText] = useState<string>("");
  const [selectedVariant, setSelectedVariant] = useState<string>(VARIANTS[1].key); // Default to bold
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Fetch currently selected text on every launch (not cached)
    const fetchSelectedText = async () => {
      try {
        const text = await getSelectedText();
        if (text) {
          setInputText(text);
        }
      } catch {
        // No selected text, that's fine
      } finally {
        setIsLoading(false);
      }
    };

    fetchSelectedText();
  }, []);

  const handlePaste = async (text: string) => {
    try {
      await Clipboard.paste(text);
      await closeMainWindow();
      await showToast({
        style: Toast.Style.Success,
        title: "Text pasted",
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to paste text",
        message: String(error),
      });
    }
  };

  const handleCopy = async (text: string) => {
    try {
      await Clipboard.copy(text);
      await showToast({
        style: Toast.Style.Success,
        title: "Copied to clipboard",
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to copy",
        message: String(error),
      });
    }
  };

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Enter text to style..."
      searchText={inputText}
      onSearchTextChange={setInputText}
      isShowingDetail={inputText.length > 0}
      selectedItemId={selectedVariant}
      onSelectionChange={(id) => {
        if (id) setSelectedVariant(id);
      }}
    >
      {VARIANTS.map((variant) => {
        const styled = inputText ? toUnicodeVariant(inputText, variant.key) : "";

        return (
          <List.Item
            key={variant.key}
            id={variant.key}
            title={variant.name}
            detail={<List.Item.Detail markdown={inputText ? `# ${styled}` : "# Enter text above to see preview"} />}
            actions={
              inputText && (
                <ActionPanel>
                  <Action title="Paste to Active App" onAction={() => handlePaste(styled)} />
                  <Action
                    title="Copy to Clipboard"
                    onAction={() => handleCopy(styled)}
                    shortcut={{ modifiers: ["cmd"], key: "c" }}
                  />
                  <Action.CopyToClipboard
                    title="Copy Original"
                    content={inputText}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                  />
                </ActionPanel>
              )
            }
          />
        );
      })}
    </List>
  );
}
