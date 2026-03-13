import { ChangeTemplateModelProp } from "../../type";
import { List } from "@raycast/api";
import { uniqBy } from "lodash";

export const ModelDropdown = (props: ChangeTemplateModelProp & { disableChange: boolean }) => {
  const { templateModels, onTemplateModelChange, selectedTemplateModelId, disableChange = false } = props;
  const defaultTemplateModel = templateModels.find((x) => x.template_id.toString() === "0");
  const separateDefaultModel = templateModels.filter((x) => x.template_id.toString() !== "0");
  const selectedTemplateModel = templateModels.filter(
    (x) => x.template_id.toString() === selectedTemplateModelId.toString()
  );
  return (
    <List.Dropdown
      tooltip="Select Model"
      storeValue={false}
      placeholder={disableChange ? "Can not Change the Value" : "Search"}
      defaultValue={selectedTemplateModelId.toString()}
      onChange={(id) => {
        onTemplateModelChange(Number(id));
      }}
    >
      {disableChange && (
        <>
          {uniqBy(selectedTemplateModel, "template_id").map((model, index) => (
            <List.Dropdown.Item
              key={model.template_id.toString() + index}
              title={model.template_name}
              value={model.template_id.toString()}
            />
          ))}
        </>
      )}
      {!disableChange && defaultTemplateModel && (
        <List.Dropdown.Section title="Common Template Models">
          <List.Dropdown.Item
            key={defaultTemplateModel.template_id.toString() + "-D"}
            title={defaultTemplateModel.template_name}
            value={defaultTemplateModel.template_id.toString()}
          />
        </List.Dropdown.Section>
      )}
      {!disableChange && (
        <List.Dropdown.Section title="My Template Models">
          {uniqBy(separateDefaultModel, "template_id").map((model, index) => (
            <List.Dropdown.Item
              key={model.template_id.toString() + "-F-" + index}
              title={model.template_name}
              value={model.template_id.toString()}
            />
          ))}
        </List.Dropdown.Section>
      )}
    </List.Dropdown>
  );
};
