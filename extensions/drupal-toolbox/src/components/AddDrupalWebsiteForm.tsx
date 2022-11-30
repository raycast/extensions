import { useCallback, useState } from "react";
import { Form, Action, ActionPanel, useNavigation, Icon } from "@raycast/api";
import { useForm, FormValidation } from "@raycast/utils";
import { AddDrupalFormValues } from "../interface";
import { DevelopmentTool, Filter } from "../interface";

function AddDrupalWebsiteForm(props: {
  defaultTitle?: string;
  defaultVersion?: string;
  defaultTool?: string;
  onCreate: (title: string, version: string, root: string, tool: DevelopmentTool) => void;
}) {
  const { onCreate, defaultTitle = "", defaultVersion = Filter.Drupal10, defaultTool = DevelopmentTool.None } = props;
  const { pop } = useNavigation();

  const { handleSubmit, itemProps } = useForm<AddDrupalFormValues>({
    onSubmit(values) {
      onCreate(values.title, values.version, values.root[0], values.tool);
      pop();
    },
    validation: {
      title: FormValidation.Required,
      version: FormValidation.Required,
      tool: FormValidation.Required,
      root: FormValidation.Required,
    },
    initialValues: {
      title: defaultTitle,
    },
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Add Drupal Website" icon={Icon.NewFolder} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField title="Title" info="Enter the Drupal project's title" {...itemProps.title} />

      <Form.Dropdown
        id="version"
        defaultValue={defaultVersion}
        title="Drupal Version"
        info="Select the Drupal project's version"
        autoFocus={defaultTitle != ""}
      >
        <Form.Dropdown.Item value={Filter.Drupal10} title="Drupal 10" />
        <Form.Dropdown.Item value={Filter.Drupal9} title="Drupal 9" />
        <Form.Dropdown.Item value={Filter.Drupal8} title="Drupal 8" />
      </Form.Dropdown>
      <Form.Dropdown
        id="tool"
        defaultValue={defaultTool}
        title="Development Tool"
        info="Select the Drupal project's development tool"
      >
        <Form.Dropdown.Item value={DevelopmentTool.None} title="None" />
        <Form.Dropdown.Item value={DevelopmentTool.DDEV} title="DDEV" />
        <Form.Dropdown.Item value={DevelopmentTool.Docksal} title="Docksal" />
        <Form.Dropdown.Item value={DevelopmentTool.Lando} title="Lando" />
      </Form.Dropdown>

      <Form.FilePicker
        title="Project's Root Folder"
        info="Select the Drupal project's root folder"
        allowMultipleSelection={false}
        canChooseDirectories={true}
        canChooseFiles={false}
        {...itemProps.root}
      />
    </Form>
  );
}

export default AddDrupalWebsiteForm;
