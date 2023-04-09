import { Model } from "../types";
import { List } from "@raycast/api";

export const DEFAULT_MODEL_NAME = "gpt-3.5-turbo";

export interface ChangeModelProp {
  models: Model[];
  selectedModel: string;
  onModelChange: React.Dispatch<React.SetStateAction<string>>;
}
export const ModelDropdown = (props: ChangeModelProp) => {
  const { models, onModelChange, selectedModel } = props;
  const separateDefaultModel = models.filter((x) => x.name !== DEFAULT_MODEL_NAME);
  const defaultModel = models.find((x) => x.name === DEFAULT_MODEL_NAME);
  return (
    <List.Dropdown
      tooltip="Select Model"
      storeValue={true}
      defaultValue={selectedModel}
      onChange={(name) => {
        onModelChange(name);
      }}
    >
      {defaultModel && (
        <List.Dropdown.Item key={defaultModel.name} title={defaultModel.name} value={defaultModel.name} />
      )}
      <List.Dropdown.Section title="Models">
        {separateDefaultModel.map((model) => (
          <List.Dropdown.Item key={model.name} title={model.name} value={model.name} />
        ))}
      </List.Dropdown.Section>
    </List.Dropdown>
  );
};
