import { useCallback, useState } from "react";
import { Form, Action, ActionPanel, useNavigation } from "@raycast/api";
import { DevelopmentTool, Filter } from "../interface";

function AddDrupalWebsiteForm(props: {
  defaultTitle?: string;
  defaultVersion?: string;
  defaultTool?: string;
  onCreate: (title: string, version: string, root: string, tool: DevelopmentTool) => void;
}) {
  const [titleError, setTitleError] = useState<string | undefined>();
  const [rootError, setRootError] = useState<string | undefined>();

  const { onCreate, defaultTitle = "", defaultVersion = Filter.Drupal10, defaultTool = DevelopmentTool.None } = props;
  const { pop } = useNavigation();

  const handleSubmit = useCallback(
    (values: { title: string; version: string; root: string; tool: DevelopmentTool }) => {
      if (values.title.length == 0) {
        setTitleError("The field should't be empty!");
        return;
      }

      if (values.root.length == 0) {
        setRootError("The field should't be empty!");
        return;
      }

      onCreate(values.title, values.version, values.root[0], values.tool);
      pop();
    },
    [onCreate, pop]
  );

  function dropTitleErrorIfNeeded() {
    if (titleError && titleError.length > 0) {
      setTitleError(undefined);
    }
  }

  function dropRootErrorIfNeeded() {
    if (rootError && rootError.length > 0) {
      setRootError(undefined);
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Add Drupal Website" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="title"
        defaultValue={defaultTitle}
        title="Title"
        info="Enter the Drupal project's title"
        error={titleError}
        onChange={dropTitleErrorIfNeeded}
        onBlur={(event) => {
          if (event.target.value?.length == 0) {
            setTitleError("The field should't be empty!");
          } else {
            dropTitleErrorIfNeeded();
          }
        }}
      />
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
        id="root"
        title="Project's Root Folder"
        info="Select the Drupal project's root folder"
        allowMultipleSelection={false}
        canChooseDirectories={true}
        error={rootError}
        onChange={dropRootErrorIfNeeded}
        onBlur={(event) => {
          if (event.target.value?.length == 0) {
            setRootError("The field should't be empty!");
          } else {
            dropRootErrorIfNeeded();
          }
        }}
      />
    </Form>
  );
}

export default AddDrupalWebsiteForm;
