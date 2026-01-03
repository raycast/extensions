import { Action, ActionPanel, Form, Keyboard, Toast, showToast, Detail } from "@raycast/api";
import { useForm } from "@raycast/utils";
import { ActionType } from "./type";
import { addAction, readData, updateAction } from "./utils";

const modifierOptions = [
  { value: "cmd" as Keyboard.KeyModifier, label: "Cmd" },
  { value: "ctrl" as Keyboard.KeyModifier, label: "Ctrl" },
  { value: "opt" as Keyboard.KeyModifier, label: "Opt" },
  { value: "shift" as Keyboard.KeyModifier, label: "Shift" },
  { value: "alt" as Keyboard.KeyModifier, label: "Alt" },
  { value: "windows" as Keyboard.KeyModifier, label: "Windows" },
  { value: "fn" as Keyboard.KeyModifier, label: "Fn" },
];

const keyOptions = [
  ...Array.from({ length: 26 }, (_, i) => ({
    value: String.fromCharCode(97 + i) as Keyboard.KeyEquivalent,
    label: String.fromCharCode(65 + i),
  })),
  ...Array.from({ length: 10 }, (_, i) => ({
    value: i.toString() as Keyboard.KeyEquivalent,
    label: i.toString(),
  })),
];

interface FormData {
  name: string;
  code: string;
  hasShortcut: boolean;
  modifiers?: string[];
  key?: string;
}

interface FormActionProps {
  onUpdate: (values: FormData) => Promise<boolean>;
  initialValues?: Partial<FormData>;
  submitTitle: string;
}

function FormAction({ onUpdate, initialValues, submitTitle }: FormActionProps) {
  const { handleSubmit, itemProps, reset, values } = useForm<FormData>({
    initialValues: {
      name: "",
      code: "",
      hasShortcut: false,
      modifiers: [],
      key: "",
      ...initialValues,
    },
    onSubmit: async (values) => {
      const success = await onUpdate(values);
      if (success) {
        reset();
      }
    },
    validation: {
      name: (value: string | undefined) => {
        if (value === undefined || !value.trim()) return "Name is required";
      },
      code: (value: string | undefined) => {
        if (value === undefined || !value.trim()) return "Code is required";
      },
    },
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title={submitTitle} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField {...itemProps.name} title="Action Name" placeholder="e.g., Add hashtag" />
      <Form.TextArea {...itemProps.code} title="Transformation Code" placeholder="e.g., url + '#hash'" />
      <Form.Checkbox {...itemProps.hasShortcut} label="Has Shortcut" />
      {values.hasShortcut && (
        <>
          <Form.TagPicker {...itemProps.modifiers} title="Modifiers">
            {modifierOptions.map((option) => (
              <Form.TagPicker.Item key={option.value} value={option.value} title={option.label} />
            ))}
          </Form.TagPicker>
          <Form.Dropdown {...itemProps.key} title="Key">
            {keyOptions.map((option) => (
              <Form.Dropdown.Item key={option.value} value={option.value} title={option.label} />
            ))}
          </Form.Dropdown>
        </>
      )}
    </Form>
  );
}

export default function AddAction({ afterUpdate }: { afterUpdate?: () => void }) {
  const handleUpdate = async (values: FormData) => {
    if (values.hasShortcut) {
      if (!values.modifiers || values.modifiers.length === 0 || !values.key) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Modifiers and Key are required when Has Shortcut is checked",
        });
        return false;
      }
    }

    const newAction: ActionType = {
      id: Date.now().toString(),
      name: values.name,
      code: values.code,
      ...(values.hasShortcut
        ? {
            shortcut: {
              modifiers: values.modifiers!.map((s) => s as Keyboard.KeyModifier),
              key: values.key! as Keyboard.KeyEquivalent,
            },
          }
        : {}),
    };

    addAction(newAction);
    afterUpdate?.();
    await showToast({ style: Toast.Style.Success, title: "Action added successfully" });
    return true;
  };

  return <FormAction onUpdate={handleUpdate} submitTitle="Add Action" />;
}

export function EditAction({ id, afterUpdate }: { id: string; afterUpdate?: () => void }) {
  const data = readData();
  const action = data.actions.find((a) => a.id === id);

  if (!action) {
    return <Detail markdown="Action not found" />;
  }

  const handleUpdate = async (values: FormData) => {
    if (values.hasShortcut) {
      if (!values.modifiers || values.modifiers.length === 0 || !values.key) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Modifiers and Key are required when Has Shortcut is checked",
        });
        return false;
      }
    }

    updateAction(id, values.name, values.code, values.hasShortcut, values.modifiers, values.key);
    await showToast({ style: Toast.Style.Success, title: "Action updated successfully" });
    afterUpdate?.();
    return true;
  };

  return (
    <FormAction
      onUpdate={handleUpdate}
      initialValues={{
        name: action.name,
        code: action.code,
        hasShortcut: !!action.shortcut,
        modifiers: (action.shortcut as any)?.modifiers || [],
        key: (action.shortcut as any)?.key || "",
      }}
      submitTitle="Update Action"
    />
  );
}
