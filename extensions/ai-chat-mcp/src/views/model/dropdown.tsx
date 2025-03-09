import { List } from "@raycast/api";
import { ChangeModelProp } from "../../type";

export const ModelDropdown = (props: ChangeModelProp) => {
  const { models, onModelChange, selectedModel } = props;
  return (
    <List.Dropdown
      tooltip="Select Model"
      storeValue={true}
      defaultValue={selectedModel || models[0]?.id}
      onChange={onModelChange}
    >
      {models.map((model) => (
        <List.Dropdown.Item
          key={model.id}
          title={`${model.name}${model.description ? ` - ${model.description}` : ""}`}
          value={model.id}
        />
      ))}
    </List.Dropdown>
  );
};
