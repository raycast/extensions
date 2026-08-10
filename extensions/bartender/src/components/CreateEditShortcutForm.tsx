import {
  Action,
  ActionPanel,
  Detail,
  Form,
  getPreferenceValues,
  Icon,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { FormValidation, showFailureToast, useForm } from "@raycast/utils";
import { CLICK_TYPE_DISPLAY_NAME } from "../constants";
import { MenuBarShortcut, ShortcutFunctions } from "../hooks";
import { useMenuBarDetails } from "../hooks";
import { ActionType, Result, ShortcutKeyType, VALID_SHORTCUT_KEYS } from "../types";
import { getIconFromMenuBarDetail } from "../utils";

function isValidKey(key: string): key is ShortcutKeyType {
  return VALID_SHORTCUT_KEYS.includes(key as ShortcutKeyType);
}

function validateDelayValue(value: string | undefined, isEnabled: boolean, fieldName: string): string | undefined {
  if (!isEnabled) return undefined;

  if (!value) return `${fieldName} Delay is required when enabled`;

  const delay = parseInt(value, 10);
  if (value.trim() !== delay.toString()) {
    return `${fieldName} Delay should only contain whole numbers (no decimals, letters, or symbols)`;
  }

  if (isNaN(delay)) {
    return `${fieldName} Delay must be a number`;
  }

  if (delay < 0) {
    return `${fieldName} Delay must be at least 0 milliseconds`;
  }

  if (delay > 5000) {
    return `${fieldName} Delay cannot exceed 5000 milliseconds (5 seconds)`;
  }

  return undefined;
}

function parseKeySequence(keySequenceInput: string): Result<ShortcutKeyType[]> {
  const inputKeys = keySequenceInput
    .split(",")
    .map((key) => key.trim().toLowerCase())
    .filter(Boolean);

  const validatedKeys: ShortcutKeyType[] = [];

  for (const key of inputKeys) {
    if (!isValidKey(key)) {
      return {
        status: "error",
        error: `Invalid key: "${key}". Valid keys are: ${VALID_SHORTCUT_KEYS.join(", ")}`,
      };
    }
    validatedKeys.push(key);
  }

  return {
    status: "success",
    data: validatedKeys,
  };
}

type ShortcutFormValues = {
  name: string;
  menuBarId: string;
  actionType: ActionType;
  keySequenceInput: string;
  useCustomClickDelay: boolean;
  customClickDelay: string;
  useCustomKeypressDelay: boolean;
  customKeypressDelay: string;
};

type CreateShortcutFormProps = {
  type: "create";
} & Pick<ShortcutFunctions, "addShortcut">;
type UpdateShortcutFormProps = {
  type: "edit";
} & MenuBarShortcut &
  Pick<ShortcutFunctions, "updateShortcut">;
type DuplicateShortcutFormProps = {
  type: "duplicate";
} & MenuBarShortcut &
  Pick<ShortcutFunctions, "addShortcut">;
type Props = CreateShortcutFormProps | UpdateShortcutFormProps | DuplicateShortcutFormProps;

export function CreateEditShortcutForm(props: Props) {
  const { clickDelay, keyPressDelay } = getPreferenceValues<Preferences.MenuBarShortcuts>();
  const { type } = props;
  const { pop } = useNavigation();
  const { data, isLoading, error } = useMenuBarDetails();

  if (error) {
    return (
      <Detail
        markdown={`# Error Loading Menu Bar Items\n\n${error}`}
        actions={
          <ActionPanel>
            <Action title="Go Back" icon={Icon.ArrowLeft} onAction={pop} />
          </ActionPanel>
        }
      />
    );
  }

  const isEditing = type === "edit";
  const { handleSubmit, itemProps, values } = useForm<ShortcutFormValues>({
    initialValues:
      type === "edit" || type === "duplicate"
        ? {
            name: props.name,
            menuBarId: props.menuBarId,
            actionType: props.actionType,
            keySequenceInput: props.keySequence.map((key) => key.toLowerCase()).join(", "),
            useCustomClickDelay: props.customClickDelay !== undefined,
            customClickDelay: props.customClickDelay !== undefined ? props.customClickDelay.toString() : "",
            useCustomKeypressDelay: props.customKeypressDelay !== undefined,
            customKeypressDelay: props.customKeypressDelay !== undefined ? props.customKeypressDelay.toString() : "",
          }
        : {
            name: "",
            menuBarId: "",
            actionType: "left",
            keySequenceInput: "",
            useCustomClickDelay: false,
            customClickDelay: "",
            useCustomKeypressDelay: false,
            customKeypressDelay: "",
          },
    validation: {
      name: FormValidation.Required,
      menuBarId: FormValidation.Required,
      actionType: FormValidation.Required,
      keySequenceInput: (value): string | undefined => {
        if (!value) return undefined;

        const result = parseKeySequence(value);
        if (result.status === "error") {
          return result.error;
        }
        return undefined;
      },
      customClickDelay: (value): string | undefined => validateDelayValue(value, values.useCustomClickDelay, "Click"),
      customKeypressDelay: (value): string | undefined =>
        validateDelayValue(value, values.useCustomKeypressDelay, "Keypress"),
    },
    onSubmit: async (values) => {
      const keysResult = parseKeySequence(values.keySequenceInput);
      if (keysResult.status !== "success") {
        await showFailureToast(keysResult.error);
        return;
      }

      const newShortcut: MenuBarShortcut = {
        name: values.name,
        menuBarId: values.menuBarId,
        actionType: values.actionType,
        keySequence: keysResult.data,
        customKeypressDelay: values.useCustomKeypressDelay ? parseInt(values.customKeypressDelay, 10) : undefined,
        customClickDelay: values.useCustomClickDelay ? parseInt(values.customClickDelay, 10) : undefined,
      };

      const result =
        type === "edit" ? await props.updateShortcut(props.name, newShortcut) : await props.addShortcut(newShortcut);

      if (result.status === "error") {
        await showFailureToast(result.error, {
          title: `Failed to ${isEditing ? "update" : "add"} shortcut`,
        });
      } else {
        await showToast({
          title: `Shortcut ${isEditing ? "updated" : "added"}`,
          style: Toast.Style.Success,
        });
        pop();
      }
    },
  });

  return (
    <Form
      isLoading={isLoading}
      navigationTitle={`${isEditing ? "Edit" : "Create"} Menu Bar Shortcut`}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={`${isEditing ? "Update" : "Save"} Shortcut`}
            icon={Icon.Check}
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        title="Shortcut Name"
        placeholder="Enter a name for this shortcut"
        autoFocus
        info="A descriptive name for this shortcut"
        {...itemProps.name}
      />

      <Form.Dropdown
        title="Menu Bar Item ID"
        info="Select a menu bar item"
        isLoading={isLoading}
        /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
        {...(itemProps.menuBarId as any)}
      >
        {data?.map((item) => (
          <Form.Dropdown.Item
            key={item.menuBarId}
            value={item.menuBarId}
            title={item.name || item.menuBarId}
            icon={getIconFromMenuBarDetail(item.icon)}
          />
        ))}
      </Form.Dropdown>

      <Form.Dropdown
        title="Click Type"
        info="How to initially interact with the menu bar item"
        /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
        {...(itemProps.actionType as any)}
      >
        {(Object.entries(CLICK_TYPE_DISPLAY_NAME) as [ActionType, string][]).map(([value, title]) => (
          <Form.Dropdown.Item key={value} value={value} title={title} />
        ))}
      </Form.Dropdown>

      <Form.TextField
        title="Key Sequence"
        placeholder="down, down, return"
        info="Comma-separated list of keys to press after clicking (e.g., down, down, return)"
        {...itemProps.keySequenceInput}
      />

      <Form.Checkbox
        title="Custom Click Delay"
        label={!itemProps.useCustomClickDelay.value ? `(Default: ${clickDelay} ms)` : ""}
        info="Delay in milliseconds between clicking the menu bar item and sending key presses"
        {...itemProps.useCustomClickDelay}
      />

      {values.useCustomClickDelay && (
        <Form.TextField
          title="Custom Click Delay (ms)"
          placeholder="250"
          info="Delay in milliseconds between clicking the menu bar item and sending key presses"
          {...itemProps.customClickDelay}
        />
      )}

      <Form.Checkbox
        title="Custom Keypress Delay"
        label={!itemProps.useCustomKeypressDelay.value ? `(Default: ${keyPressDelay} ms)` : ""}
        info="Delay in milliseconds between consecutive key presses"
        {...itemProps.useCustomKeypressDelay}
      />

      {values.useCustomKeypressDelay && (
        <Form.TextField
          title="Custom Keypress Delay (ms)"
          placeholder="50"
          info="Delay in milliseconds between consecutive key presses"
          {...itemProps.customKeypressDelay}
        />
      )}

      <Form.Description
        title="Key Sequence Help"
        text={`Supported keys: [a-z], up, down, left, right, return, escape. Separate multiple keys with commas.`}
      />
    </Form>
  );
}
