import { List } from "@raycast/api";
import { ChangeModelProp } from "../../type";
import { chatModelLabel, isProviderChatModel } from "../../utils/model-selection";

export const ModelDropdown = (props: ChangeModelProp) => {
  const { models, onModelChange, selectedModel } = props;
  const separateDefaultModel = models.filter((x) => x.id !== "default");
  const customModels = separateDefaultModel.filter((model) => !isProviderChatModel(model));
  const providerModels = separateDefaultModel.filter(isProviderChatModel);
  const defaultModel = models.find((x) => x.id === "default");

  return (
    <List.Dropdown tooltip="Select Model" value={selectedModel} onChange={onModelChange}>
      {defaultModel && <List.Dropdown.Item key={defaultModel.id} title={defaultModel.name} value={defaultModel.id} />}
      <List.Dropdown.Section title="Pinned">
        {customModels
          .filter((x) => x.pinned)
          .map((model) => (
            <List.Dropdown.Item key={model.id} title={chatModelLabel(model)} value={model.id} />
          ))}
      </List.Dropdown.Section>
      <List.Dropdown.Section title="Custom Models">
        {customModels
          .filter((x) => !x.pinned)
          .map((model) => (
            <List.Dropdown.Item key={model.id} title={chatModelLabel(model)} value={model.id} />
          ))}
      </List.Dropdown.Section>
      <List.Dropdown.Section title="Available Models">
        {providerModels.map((model) => (
          <List.Dropdown.Item key={model.id} title={model.name} value={model.id} />
        ))}
      </List.Dropdown.Section>
    </List.Dropdown>
  );
};
