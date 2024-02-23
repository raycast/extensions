import { List, LocalStorage } from "@raycast/api";
import { useEffect } from "react";
import { ChangeModelProp } from "../../type";

export const ModelDropdown = (props: ChangeModelProp) => {
  const { models, onModelChange, selectedModel } = props;
  const separateDefaultModel = models.filter((x) => x.id !== "default");
  const defaultModel = models.find((x) => x.id === "default");

  // it should same as `DropDown.storeValue`
  useEffect(() => {
    (async () => {
      const selectModel = await LocalStorage.getItem<string>("select_model");
      onModelChange(selectModel ?? "default");
    })();
  }, [onModelChange]);

  useEffect(() => {
    (async () => {
      await LocalStorage.setItem("select_model", selectedModel);
    })();
  }, [selectedModel]);

  /**
   * fix https://github.com/raycast/extensions/issues/10391#issuecomment-19131903
   *
   * we can't use `DropDown.storeValue`, because it will reset `selectedModel` to default when the component rerender.
   */
  return (
    <List.Dropdown
      tooltip="Select Model"
      value={selectedModel}
      onChange={(id) => {
        onModelChange(id);
      }}
    >
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
