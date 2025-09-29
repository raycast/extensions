import { Form, Detail, Action, ActionPanel, Clipboard, Icon, popToRoot, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import { StorageUtil } from "./storage";

export default function Command() {
  const [prompt, setPrompt] = useState<string | null>(null);
  const [cutAsDefault, setCutAsDefault] = useState<boolean>(true);

  const [promptsCount, setPromptsCount] = useState<number>(1);
  const [promptSelected, setPromptSelected] = useState<number>(0);

  async function copiedToastAndClose() {
    await showToast({
      style: Toast.Style.Success,
      title: "Prompt copied to clipboard",
    });
    popToRoot({ clearSearchBar: true });
  }

  async function cutToastAndClose() {
    await showToast({
      style: Toast.Style.Success,
      title: "Prompt cut to clipboard",
      // message: "Prompt cut to clipboard",
    });
    popToRoot({ clearSearchBar: true });
  }

  useEffect(() => {
    async function load() {
      // Load selected prompt index
      const promptSelectedIndex = await StorageUtil.getSelectedPromptIndex();
      setPromptSelected(promptSelectedIndex);

      // Load prompts count
      const count = await StorageUtil.getPromptsCount();
      setPromptsCount(count);

      // Load current prompt
      const savedPrompt = await StorageUtil.getPrompt(promptSelectedIndex);
      setPrompt(savedPrompt);

      // Load default action setting
      const isCutDefault = await StorageUtil.getDefaultAction();
      setCutAsDefault(isCutDefault);
    }
    load();
  }, []);

  if (prompt === null) {
    return <Detail markdown="Loading..." />;
  }

  async function copy() {
    await Clipboard.copy(prompt ?? "");
    await copiedToastAndClose();
  }

  async function cut() {
    await Clipboard.copy(prompt ?? "");
    await deletePrompt();
    await cutToastAndClose();
  }

  async function switchPrompt(index: number) {
    await StorageUtil.setSelectedPromptIndex(index);
    const promptText = await StorageUtil.getPrompt(index);
    setPrompt(promptText);
    setPromptSelected(index);
  }

  async function duplicatePrompt() {
    await StorageUtil.setSelectedPromptIndex(promptsCount);
    setPromptSelected(promptsCount);

    await StorageUtil.setPromptsCount(promptsCount + 1);
    setPromptsCount(promptsCount + 1);

    await StorageUtil.setPrompt(promptsCount, prompt as string);
  }

  async function reloadPrompt() {
    const promptText = await StorageUtil.getPrompt(promptSelected);
    setPrompt(promptText);
  }

  async function deletePrompt() {
    await StorageUtil.removePrompt(promptSelected);

    if (promptSelected + 1 < promptsCount) {
      for (let i = promptSelected + 1; i < promptsCount; i++) {
        const nextPrompt = await StorageUtil.getPrompt(i);
        await StorageUtil.removePrompt(i);
        await StorageUtil.setPrompt(i - 1, nextPrompt);
      }
    }

    await StorageUtil.setPromptsCount(promptsCount - 1);
    setPromptsCount(promptsCount - 1);

    if (promptSelected + 1 >= promptsCount) {
      await switchPrompt(promptSelected - 1);
    } else {
      await reloadPrompt();
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          {prompt !== "" && (
            <>
              <ActionPanel.Section title="Text">
                <Action
                  title={cutAsDefault ? "Cut to Clipboard" : "Copy to Clipboard"}
                  icon={cutAsDefault ? Icon.CopyClipboard : Icon.Clipboard}
                  shortcut={{ modifiers: ["cmd"], key: "return" }}
                  onAction={async () => {
                    if (cutAsDefault) {
                      await cut();
                    } else {
                      await copy();
                    }
                  }}
                />

                <Action
                  title={cutAsDefault ? "Copy to Clipboard" : "Cut to Clipboard"}
                  icon={cutAsDefault ? Icon.CopyClipboard : Icon.Clipboard}
                  shortcut={{ modifiers: ["ctrl"], key: cutAsDefault ? "c" : "x" }}
                  onAction={async () => {
                    if (cutAsDefault) {
                      await copy();
                    } else {
                      await cut();
                    }
                  }}
                />

                <Action
                  title={"Copy to Clipboard (Keep Open)"}
                  icon={Icon.CopyClipboard}
                  shortcut={{ modifiers: ["ctrl"], key: "[" }}
                  onAction={async () => {
                    await Clipboard.copy(prompt);
                    await showToast({
                      style: Toast.Style.Success,
                      title: "Current prompt copied to clipboard.",
                    });
                  }}
                />

                <Action
                  title="Duplicate"
                  icon={Icon.Duplicate}
                  shortcut={{ modifiers: ["ctrl"], key: "]" }}
                  onAction={async () => {
                    await duplicatePrompt();
                  }}
                />

                <Action
                  title="Clear Text"
                  icon={Icon.Trash}
                  shortcut={{ modifiers: ["ctrl"], key: "backspace" }}
                  onAction={async () => {
                    setPrompt("");
                  }}
                />
              </ActionPanel.Section>
            </>
          )}

          {(promptsCount > 1 || prompt !== "") && (
            <ActionPanel.Section title="Navigation">
              {promptSelected > 0 &&
                (prompt === "" ? (
                  <Action
                    title="Previous (Remove Blank)"
                    icon={Icon.ArrowLeft}
                    shortcut={{ modifiers: ["ctrl"], key: "," }}
                    onAction={async () => {
                      await deletePrompt();
                    }}
                  />
                ) : (
                  <Action
                    title="Previous (Switch)"
                    icon={Icon.ArrowLeft}
                    shortcut={{ modifiers: ["ctrl"], key: "," }}
                    onAction={async () => {
                      await switchPrompt(promptSelected - 1);
                    }}
                  />
                ))}

              {promptSelected < promptsCount - 1 ? (
                prompt === "" ? (
                  <Action
                    title="Next (Discard Blank)"
                    icon={Icon.ArrowRight}
                    shortcut={{ modifiers: ["ctrl"], key: "." }}
                    onAction={async () => {
                      await deletePrompt();
                    }}
                  />
                ) : (
                  <Action
                    title="Next (Switch)"
                    icon={Icon.ArrowRight}
                    shortcut={{ modifiers: ["ctrl"], key: "." }}
                    onAction={async () => {
                      await switchPrompt(promptSelected + 1);
                    }}
                  />
                )
              ) : (
                prompt !== "" && (
                  <Action
                    title="Next (Create New)"
                    icon={Icon.ArrowRight}
                    shortcut={{ modifiers: ["ctrl"], key: "." }}
                    onAction={async () => {
                      await switchPrompt(promptsCount);
                      await StorageUtil.setPromptsCount(promptsCount + 1);
                      setPromptsCount(promptsCount + 1);
                    }}
                  />
                )
              )}
            </ActionPanel.Section>
          )}

          {(prompt !== "" || promptsCount > 1) && (
            <>
              <ActionPanel.Section title="Storage">
                {prompt !== "" && (
                  <Action
                    title="Add"
                    icon={Icon.Plus}
                    shortcut={{ modifiers: ["ctrl"], key: "=" }}
                    onAction={async () => {
                      await switchPrompt(promptsCount);
                      await StorageUtil.setPromptsCount(promptsCount + 1);
                      setPromptsCount(promptsCount + 1);
                    }}
                  />
                )}

                {promptsCount > 1 && (
                  <Action
                    title="Delete"
                    icon={Icon.Minus}
                    shortcut={{ modifiers: ["ctrl"], key: "-" }}
                    onAction={async () => {
                      await deletePrompt();
                    }}
                  />
                )}
              </ActionPanel.Section>
            </>
          )}

          <ActionPanel.Section title="Settings">
            <Action
              title={`Set ${cutAsDefault ? "Copy" : "Cut"} as Default`}
              icon={Icon.Gear}
              onAction={async () => {
                setCutAsDefault(!cutAsDefault);
                await StorageUtil.setDefaultAction(!cutAsDefault);
              }}
            />

            <Action
              title="Reset"
              icon={Icon.Warning}
              onAction={async () => {
                await StorageUtil.clearAll();
                setPrompt("");
                setPromptSelected(0);
                setPromptsCount(1);

                await showToast({
                  style: Toast.Style.Success,
                  title: "All SimpleSnippet data has been reset",
                });
              }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    >
      <Form.Description text={promptsCount > 1 ? `${promptSelected + 1} of ${promptsCount}` : "   "} />

      <Form.TextArea
        id={"activePrompt"}
        value={prompt}
        onChange={async (value) => {
          setPrompt(value);
          await StorageUtil.setPrompt(promptSelected, value);
        }}
      />
      <Form.Description text={`characters: ${prompt?.length}`} />
    </Form>
  );
}
