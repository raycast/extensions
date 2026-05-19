import {
  Action,
  ActionPanel,
  Alert,
  closeMainWindow,
  confirmAlert,
  Detail,
  getSelectedText,
  Icon,
  List,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import React, { useEffect, useState } from "react";
import {
  CustomAction,
  CustomActionForm,
  loadCustomActions,
  saveCustomActions,
} from "./add-custom-action";
import { runStealthAction } from "./utils/action-runner";
import { LLMService } from "./utils/llm-service";

export default function RunActionCommand() {
  const [actions, setActions] = useState<CustomAction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchText, setSearchText] = useState("");
  const { push } = useNavigation();

  async function refresh() {
    setIsLoading(true);
    const loaded = await loadCustomActions();
    setActions(loaded);
    setIsLoading(false);
  }

  useEffect(() => {
    refresh();
  }, []);

  async function handleDelete(action: CustomAction) {
    const confirmed = await confirmAlert({
      title: `Delete "${action.title}"?`,
      primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;
    const updated = actions.filter((a) => a.id !== action.id);
    await saveCustomActions(updated);
    await showToast({ style: Toast.Style.Success, title: "Action Deleted" });
    setActions(updated);
  }

  async function handleMove(action: CustomAction, direction: "up" | "down") {
    const idx = actions.findIndex((a) => a.id === action.id);
    if (direction === "up" && idx === 0) return;
    if (direction === "down" && idx === actions.length - 1) return;
    const updated = [...actions];
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    [updated[idx], updated[swapIdx]] = [updated[swapIdx], updated[idx]];
    await saveCustomActions(updated);
    setActions(updated);
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search actions or type a custom prompt..."
      searchText={searchText}
      onSearchTextChange={setSearchText}
      filtering={true}
    >
      {actions.length === 0 && !isLoading && searchText.trim().length === 0 && (
        <List.EmptyView
          title="No Custom Actions"
          description="Use 'Add Custom Action' to create one."
          icon={Icon.Plus}
        />
      )}
      {searchText.trim().length > 0 && (
        <List.Section title="Custom Prompt">
          <List.Item
            key="__custom_prompt__"
            title={`Run: ${searchText}`}
            icon={Icon.Wand}
            actions={
              <ActionPanel>
                <Action
                  title="Run and Replace Selection"
                  icon={Icon.Play}
                  onAction={() =>
                    runCustomAction({
                      id: "__inline__",
                      title: "Custom Prompt",
                      prompt: searchText,
                      icon: Icon.Wand,
                    })
                  }
                />
                <Action
                  title="Run and Show Result"
                  icon={Icon.Eye}
                  shortcut={{ modifiers: ["cmd"], key: "return" }}
                  onAction={() =>
                    runAndShowResult(
                      {
                        id: "__inline__",
                        title: "Custom Prompt",
                        prompt: searchText,
                        icon: Icon.Wand,
                      },
                      push,
                    )
                  }
                />
              </ActionPanel>
            }
          />
        </List.Section>
      )}
      {actions.map((action) => {
        const mode = action.defaultMode ?? "replace";
        const isReplaceDefault = mode === "replace";
        const primaryAction = isReplaceDefault
          ? {
              title: "Run and Replace Selection",
              icon: Icon.Play,
              onAction: () => runCustomAction(action),
              shortcut: undefined,
            }
          : {
              title: "Run and Show Result",
              icon: Icon.Eye,
              onAction: () => runAndShowResult(action, push),
              shortcut: undefined,
            };
        const cmdReturn: {
          modifiers: import("@raycast/api").KeyModifier[];
          key: import("@raycast/api").KeyEquivalent;
        } = { modifiers: ["cmd"], key: "return" };
        const secondaryAction = isReplaceDefault
          ? {
              title: "Run and Show Result",
              icon: Icon.Eye,
              shortcut: cmdReturn,
              onAction: () => runAndShowResult(action, push),
            }
          : {
              title: "Run and Replace Selection",
              icon: Icon.Play,
              shortcut: cmdReturn,
              onAction: () => runCustomAction(action),
            };

        return (
          <List.Item
            key={action.id}
            title={action.title}
            icon={action.icon || Icon.Bolt}
            actions={
              <ActionPanel>
                <Action
                  title={primaryAction.title}
                  icon={primaryAction.icon}
                  onAction={primaryAction.onAction}
                />
                <Action
                  title={secondaryAction.title}
                  icon={secondaryAction.icon}
                  shortcut={secondaryAction.shortcut}
                  onAction={secondaryAction.onAction}
                />
                <Action
                  title="Edit Action"
                  icon={Icon.Pencil}
                  shortcut={{ modifiers: ["cmd"], key: "e" }}
                  onAction={() =>
                    push(
                      <CustomActionForm existing={action} onSave={refresh} />,
                    )
                  }
                />
                <Action
                  title="Move Up"
                  icon={Icon.ArrowUp}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "arrowUp" }}
                  onAction={() => handleMove(action, "up")}
                />
                <Action
                  title="Move Down"
                  icon={Icon.ArrowDown}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "arrowDown" }}
                  onAction={() => handleMove(action, "down")}
                />
                <Action
                  title="Delete Action"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  shortcut={{ modifiers: ["cmd"], key: "backspace" }}
                  onAction={() => handleDelete(action)}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}

async function runCustomAction(action: CustomAction) {
  await closeMainWindow();
  const { LocalStorage } = await import("@raycast/api");
  const saved = await LocalStorage.getItem<string>("action-configs");
  const configs = saved ? JSON.parse(saved) : {};
  configs["custom-run"] = { title: action.title, prompt: action.prompt };
  await LocalStorage.setItem("action-configs", JSON.stringify(configs));
  await runStealthAction("custom-run");
}

async function runAndShowResult(
  action: CustomAction,
  push: (component: React.ReactNode) => void,
) {
  let selectedText = "";
  try {
    selectedText = await getSelectedText();
  } catch (e) {
    await showToast({
      style: Toast.Style.Failure,
      title: "No text selected",
      message: "Please select text first",
    });
    return;
  }

  if (!selectedText || selectedText.trim().length === 0) {
    await showToast({
      style: Toast.Style.Failure,
      title: "No text selected",
      message: "Please select text first",
    });
    return;
  }

  const toast = await showToast({
    style: Toast.Style.Animated,
    title: `${action.title}...`,
  });

  try {
    const prompt = `${action.prompt}\n\n---\nText to format:\n${selectedText}`;
    const result = await LLMService.askAI(prompt);

    if (!result) throw new Error("Empty AI response");

    toast.hide();

    push(
      <ResultDetailView result={result.trim()} actionTitle={action.title} />,
    );
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Failed";
    toast.message = String(error);
  }
}

function ResultDetailView({
  result,
  actionTitle,
}: {
  result: string;
  actionTitle: string;
}) {
  return (
    <Detail
      markdown={`## Result\n\n${result}`}
      navigationTitle={actionTitle}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Result" content={result} />
          <Action.Paste title="Paste Result" content={result} />
        </ActionPanel>
      }
    />
  );
}
