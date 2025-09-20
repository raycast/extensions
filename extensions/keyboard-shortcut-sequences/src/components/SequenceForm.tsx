import {
  Action,
  ActionPanel,
  Color,
  Form,
  Icon,
  launchCommand,
  LaunchType,
  LocalStorage,
  showToast,
  useNavigation,
} from "@raycast/api";
import { useState } from "react";
import { Sequence } from "../types";

export default function SequenceForm(props: {
  sequence?: Sequence;
  setSequences?: React.Dispatch<React.SetStateAction<Sequence[] | undefined>>;
}) {
  const { sequence, setSequences } = props;
  const [nameError, setNameError] = useState<string>();
  const [shortcutCount, setShortcutCount] = useState<number>(sequence ? sequence.shortcuts.length : 1);
  const [countError, setCountError] = useState<string>();
  const [shortcutKeys, setShortcutKeys] = useState<string[]>(
    sequence ? sequence.shortcuts.map((shortcut) => shortcut.keystrokes) : []
  );
  const [shortcutModifiers, setShortcutModifiers] = useState<string[][]>(
    sequence ? sequence.shortcuts.map((shortcut) => shortcut.modifiers) : [[]]
  );

  const { pop } = useNavigation();

  const updateNameError = (name?: string): boolean => {
    if (!name) {
      setNameError("Name cannot be empty");
      return false;
    }
    setNameError(undefined);
    return true;
  };

  const updateCount = (count?: string): boolean => {
    if (!count?.length) {
      setCountError("Must configure at least 1 shortcut");
      return false;
    } else if (!parseInt(count) || parseInt(count) < 1) {
      setCountError("Count must be a positive integer");
      return false;
    }
    setCountError(undefined);

    const intValue = parseInt(count);
    setShortcutCount(intValue);
    const newShortcutKeys = [...shortcutKeys.slice(0, intValue)];
    const newShortcutModifiers = [...shortcutModifiers.slice(0, intValue)];
    while (newShortcutKeys.length < intValue) {
      newShortcutKeys.push("");
      newShortcutModifiers.push([]);
    }
    setShortcutKeys(newShortcutKeys);
    setShortcutModifiers(newShortcutModifiers);
    return true;
  };

  const shortcutFormFields: React.ReactElement[] = [];
  for (let index = 0; index < shortcutCount; index++) {
    shortcutFormFields.push(<Form.Separator key={`separator${index}`} />);
    shortcutFormFields.push(
      <Form.Description
        key={`description${index}`}
        title={`Shortcut #${index + 1}:`}
        text={index == 0 ? "The first keyboard shortcut to execute" : ""}
      />
    );

    shortcutFormFields.push(
      <Form.TextField
        id={`shortcutKeys${index}`}
        key={`keystrokes${index}`}
        title="Keystrokes"
        placeholder="Keys to stroke"
        defaultValue={shortcutKeys[index]}
        info="The non-modifier keys to stroke as one contiguous string. For example, for the keyboard shortcut Command+A, the keystroke would be A. For Shift+Command+D, the keyboard would be D. This can also be an ASCII key code, e.g. 'ASCII character 31' (no quotes in input). You could also use key codes, e.g. 'key code 123' for left d-pad keystroke."
        onChange={(value) => {
          const newShortcutKeys = [...shortcutKeys];
          newShortcutKeys[index] = value || "";
          setShortcutKeys(newShortcutKeys);
        }}
      />
    );

    shortcutFormFields.push(
      <Form.TagPicker
        id={`shortcutModifiers${index}`}
        key={`modifiers${index}`}
        title="Modifiers"
        defaultValue={shortcutModifiers[index]}
        info="The modifier keys to stroke"
        onChange={(value) => {
          const newShortcutModifiers = [...shortcutModifiers];
          newShortcutModifiers[index] = value;
          setShortcutModifiers(newShortcutModifiers);
        }}
      >
        <Form.TagPicker.Item
          value="command down"
          title="command down"
          icon={{ source: Icon.Circle, tintColor: Color.Red }}
        />
        <Form.TagPicker.Item
          value="control down"
          title="control down"
          icon={{ source: Icon.Circle, tintColor: Color.Blue }}
        />
        <Form.TagPicker.Item
          value="option down"
          title="option down"
          icon={{ source: Icon.Circle, tintColor: Color.Green }}
        />
        <Form.TagPicker.Item
          value="shift down"
          title="shift down"
          icon={{ source: Icon.Circle, tintColor: Color.Yellow }}
        />
      </Form.TagPicker>
    );
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Save Shortcut Sequence"
            icon={Icon.Link}
            onSubmit={async (values) => {
              if (!updateNameError(values.sequenceNameField)) {
                return;
              }

              const shortcuts = shortcutKeys.map((keys, index) => {
                return {
                  keystrokes: keys,
                  modifiers: shortcutModifiers[index],
                };
              });

              const newSequence = {
                name: values.sequenceNameField,
                description: values.sequenceDescriptionField,
                icon: values.sequenceIconField,
                shortcuts: shortcuts,
              };

              if (sequence) {
                await LocalStorage.removeItem(sequence.name);
              }

              await LocalStorage.setItem(values.sequenceNameField, JSON.stringify(newSequence));
              if (setSequences) {
                const items = await LocalStorage.allItems();
                setSequences(Object.values(items).map((value) => JSON.parse(value)));
              }

              showToast({ title: "Added Shortcut Sequence" });
              if (!sequence) {
                launchCommand({
                  name: "run-shortcut-sequence",
                  type: LaunchType.UserInitiated,
                  arguments: { sequenceName: "" },
                });
              } else {
                pop();
              }
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="sequenceNameField"
        title="Sequence Name"
        placeholder="Name of shortcut sequence"
        defaultValue={sequence ? sequence.name : undefined}
        info="The name that will appear in list of shortcut sequences. This name is also the default provided when using the 'Save As Quicklink' action."
        onChange={(value) => updateNameError(value)}
        error={nameError}
      />

      <Form.Dropdown
        id="sequenceIconField"
        title="Icon"
        defaultValue={sequence ? sequence.icon : undefined}
        info="The icon that will appear next to this sequence in the list of shortcut sequences."
      >
        {Object.entries(Icon).map((entry) => (
          <Form.Dropdown.Item title={entry[0]} value={entry[1]} icon={entry[1]} key={entry[0]} />
        ))}
      </Form.Dropdown>

      <Form.TextArea
        id="sequenceDescriptionField"
        title="Description (Optional)"
        defaultValue={sequence ? sequence.description : undefined}
        placeholder="This shortcut sequence is for..."
        info="A description of this shortcut sequence to help you and others know what it does."
      />

      <Form.TextField
        id="sequenceShortcutCount"
        title="Number of Shortcuts"
        defaultValue={shortcutCount.toString()}
        info="The number of shortcuts that this shortcut sequence will run sequentially."
        error={countError}
        onChange={(value) => updateCount(value)}
      />

      {shortcutFormFields}
    </Form>
  );
}
