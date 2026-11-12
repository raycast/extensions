import { Action, ActionPanel, Color, Icon, List, showToast, Toast, useNavigation } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useState } from "react";
import { useAnswerModel } from "../hooks/use-answer-model";
import { useUsedModels } from "../hooks/use-used-models";
import { isModelId } from "../lib/cli";

interface AnswerModelPickerProps {
  /**
   * Shown in place of the first answer, before any model was chosen. Choosing saves the model,
   * which makes the answer screen render instead, so the picker neither pops nor confirms with a toast.
   */
  isFirstChoice?: boolean;
  /** For the first choice, the title of the screen it stands in for; unset at a command's root. */
  navigationTitle?: string;
}

/** Lists Delta's default, the models used in recent threads, and a custom `provider/model-id`. */
export function AnswerModelPicker({ isFirstChoice = false, navigationTitle }: AnswerModelPickerProps) {
  const { pop } = useNavigation();
  const { model: current, setModel, isLoading: isLoadingCurrent } = useAnswerModel();
  const { data: usedModels, isLoading: isScanning, rescan } = useUsedModels();
  const [searchText, setSearchText] = useState("");
  const typed = searchText.trim();
  const query = typed.toLowerCase();

  async function choose(model: string | undefined) {
    try {
      await setModel(model);
    } catch (error) {
      await showFailureToast(error, { title: "Couldn't save answer model" });
      return;
    }
    if (!isFirstChoice) {
      await showToast({ style: Toast.Style.Success, title: "Answer model set", message: model ?? "Delta's default" });
      pop();
    }
  }

  const checkmark = (model: string | undefined): List.Item.Accessory[] =>
    !isFirstChoice && model === current
      ? [{ icon: { source: Icon.Checkmark, tintColor: Color.Green }, tooltip: "Current" }]
      : [];

  const actionsFor = (model: string | undefined) => (
    <ActionPanel>
      <Action
        title={isFirstChoice ? "Answer with Model" : "Use Model"}
        icon={Icon.Checkmark}
        onAction={() => choose(model)}
      />
      <Action title="Rescan Threads" icon={Icon.ArrowClockwise} onAction={rescan} />
    </ActionPanel>
  );

  const knownIds = (usedModels ?? []).map((usage) => usage.id);
  const matchingModels = (usedModels ?? []).filter((usage) => usage.id.toLowerCase().includes(query));
  const showTyped = isModelId(typed) && !knownIds.includes(typed) && typed !== current;
  // A custom model chosen earlier stays visible even though no recent thread used it.
  const showCurrentCustom = !!current && !knownIds.includes(current) && current.toLowerCase().includes(query);

  return (
    <List
      navigationTitle={isFirstChoice ? navigationTitle : "Answer Model"}
      isLoading={isLoadingCurrent || isScanning}
      searchBarPlaceholder="Filter models or type provider/model-id"
      filtering={false}
      onSearchTextChange={setSearchText}
    >
      {"delta's default".includes(query) && (
        <List.Section title="Default">
          <List.Item
            title="Delta's Default"
            subtitle={isFirstChoice ? "Delta picks the model · change it any time with ⌘⇧M" : "Delta picks the model"}
            icon={Icon.Stars}
            accessories={checkmark(undefined)}
            actions={actionsFor(undefined)}
          />
        </List.Section>
      )}
      {(showTyped || showCurrentCustom) && (
        <List.Section title="Custom">
          {showTyped && <List.Item title={typed} icon={Icon.Pencil} actions={actionsFor(typed)} />}
          {showCurrentCustom && (
            <List.Item
              title={current}
              icon={Icon.Pencil}
              accessories={checkmark(current)}
              actions={actionsFor(current)}
            />
          )}
        </List.Section>
      )}
      <List.Section title="Used in Your Threads" subtitle={isScanning ? "Scanning recent threads…" : undefined}>
        {matchingModels.map((usage) => (
          <List.Item
            key={usage.id}
            title={usage.id}
            icon={Icon.ComputerChip}
            accessories={[
              {
                text: `${usage.uses} ${usage.uses === 1 ? "answer" : "answers"}`,
                tooltip: "Answers in recent threads",
              },
              ...checkmark(usage.id),
            ]}
            actions={actionsFor(usage.id)}
          />
        ))}
      </List.Section>
      <List.EmptyView
        icon={Icon.ComputerChip}
        title="No Matching Models"
        description="Type a model as provider/model-id, for example anthropic/claude-opus-5-5."
      />
    </List>
  );
}
