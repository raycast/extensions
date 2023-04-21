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
import { useEffect, useState } from "react";
import { Application, Sequence } from "../types";

export default function SequenceForm(props: {
  sequence?: Sequence;
  setState?(apps: Application[], currApp?: Application): void;
}) {
  const { sequence, setState } = props;
  const [nameError, setNameError] = useState<string>();
  const [appNameError, setAppNameError] = useState<string>();
  const [appExistingNameError, setExistingAppNameError] = useState<string>();
  const [shortcutCount, setShortcutCount] = useState<number>(sequence ? sequence.shortcuts.length : 1);
  const [countError, setCountError] = useState<string>();
  const [shortcutKeys, setShortcutKeys] = useState<string[]>(
    sequence ? sequence.shortcuts.map((shortcut) => shortcut.keystrokes) : []
  );
  const [shortcutModifiers, setShortcutModifiers] = useState<string[][]>(
    sequence ? sequence.shortcuts.map((shortcut) => shortcut.modifiers) : [[]]
  );
  const [apps, setApps] = useState<Application[]>([]);
  const [newApp, setNewApp] = useState<boolean>(false);

  const { pop } = useNavigation();

  const updateNameError = (name?: string): boolean => {
    if (!name) {
      setNameError("Sequence name cannot be empty");
      return false;
    }
    setNameError(undefined);
    return true;
  };

  const updateAppNameError = (appName?: string): boolean => {
    if (!appName) {
      setAppNameError("App name cannot be empty");
      return false;
    }

    if (apps?.some((el) => el.name === appName)) {
      setAppNameError(`App: ${appName} already exists`);
      return false;
    }

    setAppNameError(undefined);
    return true;
  };

  const updateExistingAppNameError = (appName?: string): boolean => {
    if (!appName) {
      setExistingAppNameError("App name cannot be empty");
      return false;
    }

    setExistingAppNameError(undefined);
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

    const newShortcutKeys = [...shortcutKeys];
    const newShortcutModifiers = [...shortcutModifiers];
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
        info="The non-modifier keys to stroke as one contiguous string. For example, for the keyboard shortcut Command+A, the keystroke would be A. For Shift+Command+D, the keyboard would be D. This can also be an ASCII key code, e.g. 'ASCII character 31'"
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

  useEffect(() => {
    const init = async () => {
      const existingApps = await LocalStorage.allItems();
      if (existingApps) {
        const applications: Application[] = [];
        for (const key in existingApps) {
          applications.push(JSON.parse(existingApps[key]));
        }

        setApps(applications);
      } else {
        setApps([]);
      }
    };

    init();
  }, []);

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

              if (newApp) {
                if (!updateAppNameError(values.applicationNameField)) {
                  return;
                }
              } else {
                if (!updateExistingAppNameError(values.sequenceAppField)) {
                  return;
                }
              }

              const appName = newApp ? values.applicationNameField : values.sequenceAppField;

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
                parent: appName,
                shortcuts: shortcuts,
              };

              let app: Application | undefined = undefined;

              if (newApp) {
                app = {
                  name: appName,
                  sequences: [newSequence],
                };
                apps.push(app);
              } else {
                app = apps.find((el) => el.name === appName);
                if (app) {
                  const idx = app.sequences.findIndex((el) => el.name === newSequence.name);
                  if (idx >= 0) {
                    app.sequences[idx] = newSequence;
                  } else {
                    app.sequences.push(newSequence);
                  }
                }
              }

              await LocalStorage.setItem(appName, JSON.stringify(app));

              // clean up other app
              if (sequence && sequence.parent !== newSequence.parent) {
                const app = apps.find((el) => el.name === sequence.parent);
                if (app) {
                  app.sequences = app.sequences.filter((el) => el.name !== sequence.name);
                  await LocalStorage.setItem(app.name, JSON.stringify(app));
                }
              }

              if (setState) {
                setState(apps, app);
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

      <Form.Checkbox id="sequenceNewAppfield" label="New Application?" value={newApp} onChange={setNewApp} />
      {newApp ? (
        <Form.TextField
          id="applicationNameField"
          title="Application Name"
          info="New Application name."
          onChange={(value) => updateAppNameError(value)}
          error={appNameError}
        />
      ) : (
        <Form.Dropdown
          id="sequenceAppField"
          title="Application"
          defaultValue={sequence ? sequence.parent : undefined}
          info="The application this sequence will fall under."
          error={appExistingNameError}
        >
          {apps.map((app) => (
            <Form.Dropdown.Item title={app.name} value={app.name} key={app.name} />
          ))}
        </Form.Dropdown>
      )}

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
