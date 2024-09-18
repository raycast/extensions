import { Logtail } from "./lib/logtail";

import { Action, ActionPanel, Icon, Form, Color, useNavigation } from "@raycast/api";
import { useState } from "react";
import { CustomMetadataTag, useMetadataTags } from "./hooks/useMetadataTags";

const colors = Object.keys(Color)
  .filter((colorName) => typeof Color[colorName as keyof typeof Color] === "string")
  .map((color) => {
    return <Form.Dropdown.Item title={color} key={color} value={color} />;
  });

type AddMetadataTagCommandProps = {
  isEditing?: boolean;
  tag?: CustomMetadataTag;
  onSubmit?: () => void;
};
const AddMetadataTagCommand = (props: AddMetadataTagCommandProps) => {
  const { addMetadataTag, updateMetadataTag, isExistingTag } = useMetadataTags();
  const { pop } = useNavigation();
  const [key, setKey] = useState<string>(props.tag?.key ?? "");
  const [label, setLabel] = useState<string>(props.tag?.label ?? "");
  const [color, setColor] = useState<keyof typeof Color>((props.tag?.color as keyof typeof Color) ?? "SecondaryText");
  const [error, setError] = useState<string>();

  const handleKeyChange = (text: string) => {
    if (isExistingTag(text) && !props.isEditing) {
      setError(`Tag already exists`);
    } else {
      setError(undefined);
    }

    setKey(text);
  };

  const handleColorChange = (color: string) => {
    setColor(color as keyof typeof Color);
  };

  const handleSaveTag = async () => {
    const _label = label ? label : key;
    setError(undefined);
    const tag = { key, label: _label, color };
    if (props.isEditing && props.tag) {
      await updateMetadataTag(tag);
    } else {
      if (isExistingTag(tag.key)) {
        setError(`Tag already exists`);
      } else {
        await addMetadataTag(tag);
      }
    }
    props.onSubmit?.();
    pop();
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Metadata Tag" icon={Icon.Lock} onSubmit={handleSaveTag} />
          <Action.OpenInBrowser url={Logtail.DOCS_URL} title="Open Logtail API Docs" />
        </ActionPanel>
      }
    >
      <Form.Description text="Add/Edit a metadata tag to display in log details" />
      <Form.TextField
        id="key"
        title="Key"
        onChange={handleKeyChange}
        value={key}
        error={error}
        autoFocus={!props.isEditing}
        placeholder="Enter the metadata key (e.g. fly.app.name)"
      />
      {key && (
        <Form.TextField
          id="label"
          title="Label (optional)"
          onChange={setLabel}
          value={label}
          autoFocus={props.isEditing}
          placeholder="Enter a friendly label"
        />
      )}
      {key && (
        <Form.Dropdown
          id="color"
          title="Color (optional)"
          onChange={handleColorChange}
          value={color as string}
          info="Colors are provided from the Raycast API."
          placeholder="Select a color"
        >
          {colors}
        </Form.Dropdown>
      )}
    </Form>
  );
};

export default AddMetadataTagCommand;
