import { List } from "@raycast/api";
import { useEffect, useMemo } from "react";
import { ChangeModelProp } from "../../type";
import { CacheAdapter } from "../../utils/cache";
import { orderModelsForSelection } from "../../utils/model-support";

export const ModelDropdown = (props: ChangeModelProp) => {
  const { models, onModelChange, selectedModel } = props;
  const orderedModels = useMemo(() => orderModelsForSelection(models), [models]);
  const separateDefaultModel = orderedModels.filter((x) => x.id !== "default");
  const defaultModel = orderedModels.find((x) => x.id === "default");

  const cache = new CacheAdapter("select_model");

  function getFallbackModelId() {
    if (defaultModel) {
      return defaultModel.id;
    }

    return separateDefaultModel[0]?.id ?? "default";
  }

  // it should same as `DropDown.storeValue`
  useEffect(() => {
    const selectModel = cache.get();

    if (selectModel && orderedModels.some((model) => model.id === selectModel)) {
      onModelChange(selectModel);
      return;
    }

    onModelChange(getFallbackModelId());
  }, [orderedModels]);

  useEffect(() => {
    if (orderedModels.length === 0) {
      return;
    }

    if (!orderedModels.some((model) => model.id === selectedModel)) {
      onModelChange(getFallbackModelId());
    }
  }, [orderedModels, selectedModel]);

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
