import { Action, ActionPanel, Form, Icon, useNavigation } from "@raycast/api";
import { useState } from "react";
import { IconSettings } from "../lib/settings";

export type TextSetting = "fileName" | "backgroundStartColor" | "backgroundEndColor" | "iconColor";

export function IconSettingField(props: {
  title: string;
  field: TextSetting;
  settings: IconSettings;
  onSubmit: (settings: IconSettings) => void;
}) {
  const { pop } = useNavigation();
  const [error, setError] = useState<string>();
  const isColor = props.field !== "fileName";

  function submit(values: { value: string }) {
    const value = values.value.trim();
    if (isColor ? !/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(value) : !value) {
      setError(isColor ? "Enter a hex color, such as #FF8800" : "Enter a file name");
      return;
    }
    props.onSubmit({
      ...props.settings,
      [props.field]: value,
      selectedPresetIndex: isColor ? null : props.settings.selectedPresetIndex,
    });
    pop();
  }

  return (
    <Form
      navigationTitle={`Edit ${props.title}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Apply" icon={Icon.Check} onSubmit={submit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="value"
        title={props.title}
        defaultValue={props.settings[props.field]}
        placeholder={isColor ? "#FF8800" : "extension_icon"}
        error={error}
        onChange={() => setError(undefined)}
        autoFocus
      />
    </Form>
  );
}
