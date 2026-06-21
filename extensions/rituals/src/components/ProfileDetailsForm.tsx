import { Action, ActionPanel, Form, Icon, useNavigation } from "@raycast/api";
import { useState } from "react";

interface Props {
  name: string;
  icon?: string;
  onSave: (name: string, icon?: string) => void;
}

// All built-in Raycast icons, sorted by name, for the icon dropdown.
const ICONS = Object.entries(Icon).sort(([a], [b]) => a.localeCompare(b));

export default function ProfileDetailsForm({ name, icon, onSave }: Props) {
  const { pop } = useNavigation();
  const [nameError, setNameError] = useState<string | undefined>();

  function handleSubmit(values: { name: string; icon: string }) {
    if (!values.name.trim()) {
      setNameError("Name is required");
      return;
    }
    onSave(values.name.trim(), values.icon || undefined);
    pop();
  }

  // If the saved icon is an emoji (legacy) or anything not in the icon set,
  // keep it as a selectable option so it isn't silently lost.
  const isBuiltIn = icon ? ICONS.some(([, value]) => value === icon) : false;

  return (
    <Form
      navigationTitle="Ritual Details"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save" icon={Icon.Check} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Name"
        placeholder="Work"
        defaultValue={name}
        error={nameError}
        onChange={() => nameError && setNameError(undefined)}
      />
      <Form.Dropdown id="icon" title="Icon" defaultValue={icon ?? Icon.Layers}>
        {icon && !isBuiltIn && <Form.Dropdown.Item value={icon} title={`Current (${icon})`} icon={icon} />}
        {ICONS.map(([iconName, value]) => (
          <Form.Dropdown.Item key={value} value={value} title={iconName} icon={value} />
        ))}
      </Form.Dropdown>
    </Form>
  );
}
