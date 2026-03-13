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
import { useEffect, useRef, useState } from "react";
import { Sequence, specialKeys } from "../types";

export default function SequenceForm(props: {
  sequence?: Sequence;
  setSequences?: React.Dispatch<React.SetStateAction<Sequence[] | undefined>>;
}) {
  const { sequence, setSequences } = props;
  const [nameError, setNameError] = useState<string>();
  const [shortcutCount, setShortcutCount] = useState<number>(sequence ? sequence.shortcuts.length : 1);
  const [shortcutKeys, setShortcutKeys] = useState<string[]>(
    sequence ? sequence.shortcuts.map((shortcut) => shortcut.keystrokes) : []
  );
  const [shortcutModifiers, setShortcutModifiers] = useState<string[][]>(
    sequence ? sequence.shortcuts.map((shortcut) => shortcut.modifiers) : [[]]
  );
  const [shortcutSpecials, setShortcutSpecials] = useState<string[][]>(
    sequence ? sequence.shortcuts.map((shortcut) => shortcut.specials) : [[]]
  );
  const [shortcutDelays, setShortcutDelays] = useState<(number | undefined)[]>(
    sequence ? sequence.shortcuts.map((shortcut) => shortcut.delay) : [undefined]
  );
  const [delayErrors, setDelayErrors] = useState<(string | undefined)[]>([]);
  const [focusDelayIndex, setFocusDelayIndex] = useState<number | null>(null);

  const { pop } = useNavigation();
  const dropdownShortcutsRef = useRef<Form.ItemReference | null>(null);
  const delayRefs = useRef<(Form.ItemReference | null)[]>([]);

  // Focus the newest delay field when a new shortcut is added
  useEffect(() => {
    if (focusDelayIndex !== null && delayRefs.current[focusDelayIndex]) {
      delayRefs.current[focusDelayIndex]?.focus();
      setFocusDelayIndex(null);
    }
  }, [focusDelayIndex, shortcutCount]);

  const updateNameError = (name?: string): boolean => {
    if (!name) {
      setNameError("Name cannot be empty");
      return false;
    }
    setNameError(undefined);
    return true;
  };

  const shortcutFormFields: React.ReactElement[] = [];
  for (let index = 0; index < shortcutCount; index++) {
    shortcutFormFields.push(<Form.Separator key={`separator${index}`} />);

    shortcutFormFields.push(
      <Form.TextField
        id={`delay${index}`}
        key={`delay${index}`}
        title={`Shortcut #${index + 1} – Delay (ms)`}
        placeholder="… delay before execution"
        defaultValue={shortcutDelays[index]?.toString()}
        info="The delay in milliseconds before the next shortcut in the sequence is run."
        ref={(ref) => (delayRefs.current[index] = ref)}
        onChange={(value) => {
          if (value.length > 0 && !/^\d+$/.test(value))
            return setDelayErrors((prev) => {
              const newErrors = [...prev];
              newErrors[index] = "Delay must be a positive integer";
              return newErrors;
            });
          setDelayErrors((prev) => {
            const newErrors = [...prev];
            newErrors[index] = undefined;
            return newErrors;
          });

          const newShortcutDelays = [...shortcutDelays];
          newShortcutDelays[index] = parseInt(value) || undefined;
          setShortcutDelays(newShortcutDelays);
        }}
        error={delayErrors[index]}
      />
    );

    {
      !shortcutSpecials[index]?.length &&
        shortcutFormFields.push(
          <Form.TextField
            id={`shortcutKeys${index}`}
            key={`keystrokes${index}`}
            title="Keystrokes"
            placeholder={`Keystrokes, "ASCII character ..." or "key code ..."`}
            defaultValue={shortcutKeys[index]}
            info="The non-modifier keys to stroke as one contiguous string. For example, for the keyboard shortcut Command+A, the keystroke would be A. For Shift+Command+D, the keyboard would be D. This can also be an ASCII key code, e.g. 'ASCII character 31' (no quotes in input). You could also use key codes, e.g. 'key code 123' for left d-pad keystroke."
            onChange={(value) => {
              const newShortcutKeys = [...shortcutKeys];
              newShortcutKeys[index] = value || "";
              setShortcutKeys(newShortcutKeys);
            }}
          />
        );
    }

    {
      !shortcutKeys[index]?.length &&
        shortcutFormFields.push(
          <Form.TagPicker
            id={`shortcutSpecials${index}`}
            key={`specials${index}`}
            title="Special Keys"
            defaultValue={shortcutSpecials[index]}
            placeholder="Special Keys, based on key codes"
            info="The special keys to stroke"
            onChange={(value) => {
              const newShortcutSpecials = [...shortcutSpecials];
              newShortcutSpecials[index] = value;
              setShortcutSpecials(newShortcutSpecials);
            }}
          >
            {specialKeys && Object.keys(specialKeys).length
              ? Object.entries(specialKeys).map((entry) => (
                  <Form.TagPicker.Item
                    value={entry[0]}
                    title={entry[0]}
                    icon={{ source: Icon.Circle, tintColor: Color.Magenta }}
                    key={entry[0]}
                  />
                ))
              : null}
          </Form.TagPicker>
        );
    }
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
        <Form.TagPicker.Item value="fn down" title="fn down" icon={{ source: Icon.Circle, tintColor: Color.Purple }} />
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

              const shortcuts = [];
              for (let index = 0; index < shortcutCount; index++) {
                shortcuts.push({
                  keystrokes: shortcutKeys[index] || "",
                  modifiers: shortcutModifiers[index] || [],
                  specials: shortcutSpecials[index] || [],
                  delay: shortcutDelays[index],
                });
              }

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

      {shortcutFormFields}

      <Form.Separator />
      <Form.Dropdown
        title="Add/Remove Shortcuts"
        id="editShortcuts"
        value="placeholder"
        info="Use the selection to add or remove shortcuts from the sequence. Press Enter to expand."
        ref={dropdownShortcutsRef}
        onChange={(value) => {
          if (value == "placeholder") return;

          let newIndex = 0;

          if (value === "add") {
            newIndex = shortcutCount;
            setShortcutCount(shortcutCount + 1);
            setShortcutKeys([...shortcutKeys, ""]);
            setShortcutModifiers([...shortcutModifiers, []]);
            setShortcutSpecials([...shortcutSpecials, []]);
            setShortcutDelays([...shortcutDelays, undefined]);
          } else if (value === "remove" && shortcutCount > 1) {
            newIndex = shortcutCount - 2;
            setShortcutCount(shortcutCount - 1);
            setShortcutKeys(shortcutKeys.slice(0, -1));
            setShortcutModifiers(shortcutModifiers.slice(0, -1));
            setShortcutSpecials(shortcutSpecials.slice(0, -1));
            setShortcutDelays(shortcutDelays.slice(0, -1));
          }

          // Set focus to the new delay field after state updates
          setTimeout(() => setFocusDelayIndex(newIndex), 100);

          // Reset to initial value
          setTimeout(() => {
            dropdownShortcutsRef.current?.reset();
          }, 0);
        }}
      >
        <Form.Dropdown.Item title="Edit Shortcuts" value="placeholder" />
        <Form.Dropdown.Item title="Add new" value="add" icon={Icon.Plus} />
        {shortcutCount > 1 && (
          <Form.Dropdown.Item title={`Remove last (Shortcut #${shortcutCount})`} value="remove" icon={Icon.Trash} />
        )}
      </Form.Dropdown>
    </Form>
  );
}
