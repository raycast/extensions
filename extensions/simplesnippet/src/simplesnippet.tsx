import {
  Form,
  Detail,
  LocalStorage,
  Action,
  ActionPanel,
  Clipboard,
  Icon,
  popToRoot,
  showToast,
  Toast,
} from "@raycast/api";
import { useEffect, useState } from "react";

const DEFAULT_ACTION_KEY = "defaultAction";
const PROMPT_KEY = "prompt";
const PROMPT_SELECTED_KEY = "promptSelected";
const PROMPTS_COUNT_KEY = "promptsCount";

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
      let promptSelectedAux = await LocalStorage.getItem(PROMPT_SELECTED_KEY);
      promptSelectedAux = typeof promptSelectedAux === "number" ? promptSelectedAux : 0;

      setPromptSelected(promptSelectedAux);

      let promptsCountAux = await LocalStorage.getItem(PROMPTS_COUNT_KEY);
      promptsCountAux = typeof promptsCountAux === "number" ? promptsCountAux : 1;
      setPromptsCount(promptsCountAux);

      let savedPrompt = await LocalStorage.getItem(PROMPT_KEY + promptSelectedAux);
      savedPrompt = typeof savedPrompt === "string" ? savedPrompt : "";

      setPrompt(savedPrompt);

      const savedCutAsDefault = await LocalStorage.getItem(DEFAULT_ACTION_KEY);

      switch (savedCutAsDefault) {
        case 1:
          setCutAsDefault(true);
          break;
        case 0:
          setCutAsDefault(false);
          break;
        default:
          await LocalStorage.setItem(DEFAULT_ACTION_KEY, 1);
          break;
      }
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
    await LocalStorage.setItem(PROMPT_SELECTED_KEY, index);
    const promptAux = await LocalStorage.getItem(PROMPT_KEY + index);
    setPrompt(typeof promptAux === "string" ? promptAux : "");
    setPromptSelected(index);
  }

  async function duplicatePrompt() {
    await LocalStorage.setItem(PROMPT_SELECTED_KEY, promptsCount);
    setPromptSelected(promptsCount);

    await LocalStorage.setItem(PROMPTS_COUNT_KEY, promptsCount + 1);
    setPromptsCount(promptsCount + 1);

    await LocalStorage.setItem(PROMPT_KEY + promptsCount, prompt as string);
  }

  async function reloadPrompt() {
    const aux = await LocalStorage.getItem(PROMPT_KEY + promptSelected);
    setPrompt(aux as string);
  }

  async function deletePrompt() {
    await LocalStorage.removeItem(PROMPT_KEY + promptSelected);

    if (promptSelected + 1 < promptsCount) {
      for (let i = promptSelected + 1; i < promptsCount; i++) {
        const aux = await LocalStorage.getItem(PROMPT_KEY + i);
        await LocalStorage.removeItem(PROMPT_KEY + i);
        await LocalStorage.setItem(PROMPT_KEY + (i - 1), aux as string);
      }
    }

    await LocalStorage.setItem(PROMPTS_COUNT_KEY, promptsCount - 1);
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
                      await LocalStorage.setItem(PROMPTS_COUNT_KEY, promptsCount + 1);
                      setPromptsCount(promptsCount + 1);
                    }}
                  />
                )
              )}

              {/* {
                                    Array.from({ length: promptsCount }, (_, index) => {
                                        // Skip the currently selected prompt
                                        if (index === promptSelected) {
                                            return null;
                                        }

                                        // Only show actions up to index 8 (prompt 9)
                                        if (index > 8) {
                                            return null;
                                        }

                                        return <Action
                                            key={`prompt-action-${index}`}
                                            title={`${(index + 1).toString()}${prompt === "" ? ` (discard ${promptSelected})` : " (switch)"}`}
                                            icon={Icon.Switch}
                                            shortcut={{ modifiers: ["cmd"], key: (index + 1).toString() as KeyEquivalent }}
                                            onAction={async () => {
                                                await switchPrompt(index);
                                            }}
                                        />
                                    }).filter(Boolean)
                                } */}
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
                      await LocalStorage.setItem(PROMPTS_COUNT_KEY, promptsCount + 1);
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
                await LocalStorage.setItem(DEFAULT_ACTION_KEY, !cutAsDefault);
                await LocalStorage.setItem(DEFAULT_ACTION_KEY, !cutAsDefault);
              }}
            />

            <Action
              title="Reset"
              icon={Icon.Warning}
              onAction={async () => {
                await LocalStorage.clear();
                setPrompt("");
                setPromptSelected(0);
                setPromptsCount(1);

                await showToast({
                  style: Toast.Style.Success,
                  title: "All PrompStore data has been reset",
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
          await LocalStorage.setItem(PROMPT_KEY + promptSelected, value);
        }}
      />
      <Form.Description text={`characters: ${prompt?.length}`} />
    </Form>
  );
}
