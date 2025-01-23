import { List } from "@raycast/api";
import { ChangeModelProp } from "../../type";

export const ModelDropdown = (props: ChangeModelProp) => {
  const { models, onModelChange, selectedModel } = props;
  const separateDefaultModel = models.filter((x) => x.id !== "default");
  const defaultModel = models.find((x) => x.id === "default");
  return (
    <List.Dropdown tooltip="Select Model" storeValue={true} defaultValue={selectedModel} onChange={onModelChange}>
      {defaultModel && <List.Dropdown.Item key={defaultModel.id} title={defaultModel.name} value={defaultModel.id} />}
      <List.Dropdown.Section title="Custom Models">
        {separateDefaultModel.map((model) => (
          <List.Dropdown.Item key={model.id} title={model.name} value={model.id} />
        ))}
      </List.Dropdown.Section>
    </List.Dropdown>
  );
};
