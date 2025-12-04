import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { SelectModel } from "../actions/select-model";
import { useCachedState } from "@raycast/utils";

export const EmptyView = ({ preferences }: { preferences: Preferences }) => {
  const [selectedModels] = useCachedState<string[]>("selected-models", []);

  return (
    <List.EmptyView
      title={selectedModels.length === 0 ? "No model selected" : "Ask Not Diamond"}
      description={
        selectedModels.length === 0 ? "Select a model to use Not Diamond" : "Write a message to use Not Diamond"
      }
      icon={selectedModels.length === 0 ? Icon.Warning : Icon.QuestionMark}
      actions={
        selectedModels.length === 0 ? (
          <ActionPanel>
            <Action.Push title="Select Model" target={<SelectModel preferences={preferences} />} />
          </ActionPanel>
        ) : null
      }
    />
  );
};
