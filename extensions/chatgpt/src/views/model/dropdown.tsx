import { List } from "@raycast/api";
import { useEffect } from "react";
import { ChangeModelProp } from "../../type";
import { CacheAdapter } from "../../utils/cache";

export const ModelDropdown = (props: ChangeModelProp) => {
  const { models, onModelChange, selectedModel } = props;
  const separateDefaultModel = models.filter((x) => x.id !== "default");
  const defaultModel = models.find((x) => x.id === "default");

  const cache = new CacheAdapter("select_model");

  // it should same as `DropDown.storeValue`
  useEffect(() => {
    const selectModel = cache.get();
    onModelChange(selectModel ?? "default");
  }, []);

  useEffect(() => {
    cache.set(selectedModel);
  }, [selectedModel]);

  /**
   * fix https://github.com/raycast/extensions/issues/10391#issuecomment-19131903
   *
   * we can't use `DropDown.storeValue`, because it will reset `selectedModel` to default when the component rerender.
   */
  return (
    <List.Dropdown tooltip="Select Model" value={selectedModel} onChange={onModelChange}>
      {defaultModel && <List.Dropdown.Item key={defaultModel.id} title={defaultModel.name} value={defaultModel.id} />}
      <List.Dropdown.Section title="Pinned">
        {separateDefaultModel
          .filter((x) => x.pinned)
          .map((model) => (
            <List.Dropdown.Item key={model.id} title={model.name} value={model.id} />
          ))}
      </List.Dropdown.Section>
      <List.Dropdown.Section title="Models">
        {separateDefaultModel
          .filter((x) => !x.pinned)
          .map((model) => (
            <List.Dropdown.Item key={model.id} title={model.name} value={model.id} />
          ))}
      </List.Dropdown.Section>
    </List.Dropdown>
  );
};
