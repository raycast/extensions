import { Action, ActionPanel, Form, Icon, LocalStorage, showToast, useNavigation } from "@raycast/api";
import { useEffect, useState } from "react";
import { Entry, FolderAction } from "./types";
import * as fs from "fs";

export default function EditActionForm(props: {
  oldData: Entry;
  setEntries?: React.Dispatch<React.SetStateAction<Entry[]>>;
}) {
  const { oldData, setEntries } = props;

  // Extract relevant info from old data object
  const oldNumActions = oldData.addActions.length + oldData.removeActions.length || 1;
  const oldAddActionTypes = oldData.addActions.map((action) => action.type);
  const oldRemoveActionTypes = oldData.removeActions.map((action) => action.type);
  const oldActionTypes = [...oldAddActionTypes, ...oldRemoveActionTypes] || [""];
  const oldActionValues = [...oldData.addActions, ...oldData.removeActions] || [{}];

  // Set up stateful vars with old data as initial values
  const [dirError, setDirError] = useState<string>();
  const [numActions, setNumActions] = useState<number>(oldNumActions);
  const [numActionsError, setNumActionsError] = useState<string>();
  const [actionTypes, setActionTypes] = useState<string[]>(oldActionTypes);
  const [actionValues, setActionValues] = useState<{ [key: string]: string | string[] }[]>(oldActionValues);
  const [actionErrors, setActionErrors] = useState<(string | undefined)[]>([undefined]);

  const { pop } = useNavigation();

  // Ensure all data arrays are the right size as number of actions changes
  useEffect(() => {
    if (actionTypes.length < numActions) {
      const newArr = [...actionTypes];
      while (newArr.length < numActions) {
        newArr.push("openPathAdd");
      }
      setActionTypes(newArr);
    }

    if (actionValues.length < numActions) {
      const newArr = [...actionValues];
      while (newArr.length < numActions) {
        newArr.push({});
      }
      setActionValues(newArr);
    }

    if (actionErrors.length < numActions) {
      const newArr = [...actionErrors];
      while (newArr.length < numActions) {
        newArr.push("");
      }
      setActionErrors(newArr);
    }
  }, [numActions]);

  // Convenience methods for updating data arrays
  const updateActionTypes = (index: number, value: string) => {
    const newArr = [...actionTypes];
    newArr[index] = value;
    setActionTypes(newArr);
  };

  const updateActionValues = (index: number, value: { [key: string]: string | string[] }) => {
    const newArr = [...actionValues];
    newArr[index] = value;
    setActionValues(newArr);
  };

  const updateActionErrors = (index: number, value: string | undefined) => {
    const newArr = [...actionErrors];
    newArr[index] = value;
    setActionErrors(newArr);
  };

  const checkDir = (paths: string[]): boolean => {
    // Ensures user selects some folder
    if (paths.length == 0) {
      setDirError("Must select a folder to watch for changes");
      return false;
    } else {
      setDirError(undefined);
      return true;
    }
  };

  const checkNumActions = (numActions: string): boolean => {
    // Ensures user configures >=1 action
    const numActionsInt = parseInt(numActions);
    if (numActionsInt) {
      if (numActionsInt < 1) {
        setNumActionsError("Action count must be positive");
        return false;
      }
      setNumActionsError(undefined);
      return true;
    } else {
      setNumActionsError("Invalid number");
      return false;
    }
  };

  const checkActionPaths = (paths: string[], actionIndex: number): boolean => {
    // Checks that at least one path has been selected for a path action, sets error message accordingly
    if (paths == undefined || paths.length == 0) {
      updateActionErrors(actionIndex, "Must select at least one item");
      return false;
    } else {
      updateActionErrors(actionIndex, undefined);
      return true;
    }
  };

  const checkActionURL = (url: string, actionIndex: number): boolean => {
    // Checks that a URL for an action is valid and sets the action's error message accordingly
    if (url.length == 0) {
      updateActionErrors(actionIndex, "URL must not be empty");
      return false;
    } else if (
      !url.match(/[A-Za-z]*:(\/\/)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.?[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&//=]*)/g)
    ) {
      updateActionErrors(actionIndex, "Invalid URL");
      return false;
    } else if (url.includes(" ")) {
      updateActionErrors(actionIndex, "URL must not contain spaces -- Add additional actions to open multiple URLs");
      return false;
    } else {
      updateActionErrors(actionIndex, undefined);
      return true;
    }
  };

  const handleSubmit = async (formInput: { [key: string]: string | string[] }) => {
    // Checks form validity, constructs and saves new folder action entry if applicable
    // Check main observed directory validity
    let valid = checkDir(formInput.dir as string[]);
    if (!valid) {
      return;
    }

    // Check validity of each action, using custom logic based on the action type
    actionTypes.forEach((type, index) => {
      if (type == "openPathAdd" || type == "openPathRemove") {
        valid = checkActionPaths(actionValues[index]["targets"] as string[], index);
      } else if (type == "openURLAdd" || type == "openURLRemove") {
        valid = checkActionURL(actionValues[index]["target"] as string, index);
      }
      if (!valid) {
        return;
      }
    });

    if (!valid) {
      return;
    }

    const entries = JSON.parse((await LocalStorage.getItem("entries")) || "[]");
    const updatedEntries = entries.filter((entry: Entry) => entry.dir != formInput.dir);

    // Construct lists of on-add and on-remove actions for the new entry
    const addActions: FolderAction[] = [];
    const removeActions: FolderAction[] = [];
    actionTypes.forEach((type, index) => {
      const newAction = {
        type: type,
        ...actionValues[index],
      };

      if (type.includes("Add")) {
        addActions.push(newAction);
      } else {
        removeActions.push(newAction);
      }
    });

    const newEntry: Entry = {
      dir: formInput.dir[0],
      addActions: addActions,
      removeActions: removeActions,
    };

    // Update stored entries and return to previous view
    updatedEntries.push(newEntry);
    await LocalStorage.setItem("entries", JSON.stringify(updatedEntries));
    if (setEntries != undefined) {
      // Update list view for Manage Folder Actions command
      setEntries(updatedEntries);
    }
    showToast({ title: "Folder Action Created" });
    pop();
  };

  // Create dynamic form
  const actionFields = [];
  for (let i = 0; i < numActions; i++) {
    // Separate each action for easy distinction
    actionFields.push(<Form.Separator key={`actionSeparator${i}`} />);

    // Label for each action (Action #)
    actionFields.push(<Form.Description key={`actionLabel${i}`} title={`Action #${i + 1}`} text="" />);

    // Action type selection
    actionFields.push(
      <Form.Dropdown
        key={`actionTypeDropdown${i}`}
        id={`actionType${i}`}
        title="Action Type"
        defaultValue={actionTypes[i]}
        onChange={(value) => updateActionTypes(i, value)}
      >
        {/* Actions run on file addition */}
        <Form.Dropdown.Item value="openPathAdd" title="Open Path On Add" icon={Icon.Document} />
        <Form.Dropdown.Item value="openURLAdd" title="Open URL On Add" icon={Icon.Link} />
        <Form.Dropdown.Item value="scriptAdd" title="Terminal Script On Add" icon={Icon.Terminal} />
        <Form.Dropdown.Item value="hudAdd" title="HUD On Add" icon={Icon.Desktop} />
        <Form.Dropdown.Item value="soundAdd" title="Sound On Add" icon={Icon.SpeakerHigh} />
        <Form.Dropdown.Item value="notificationAdd" title="Notification On Add" icon={Icon.Bell} />
        <Form.Dropdown.Item value="alertAdd" title="Alert On Add" icon={Icon.AlarmRinging} />

        {/* Actions run on file removal */}
        <Form.Dropdown.Item value="openPathRemove" title="Open Path On Remove" icon={Icon.Document} />
        <Form.Dropdown.Item value="openURLRemove" title="Open URL On Remove" icon={Icon.Link} />
        <Form.Dropdown.Item value="scriptRemove" title="Terminal Script On Remove" icon={Icon.Terminal} />
        <Form.Dropdown.Item value="hudRemove" title="HUD On Remove" icon={Icon.Desktop} />
        <Form.Dropdown.Item value="soundRemove" title="Sound On Remove" icon={Icon.SpeakerHigh} />
        <Form.Dropdown.Item value="notificationRemove" title="Notification On Remove" icon={Icon.Bell} />
        <Form.Dropdown.Item value="alertRemove" title="Alert On Remove" icon={Icon.AlarmRinging} />
      </Form.Dropdown>
    );

    // Display fields based on action type
    if (actionTypes.length < i) {
      continue;
    } else if (actionTypes[i] == "openPathAdd" || actionTypes[i] == "openPathRemove") {
      // Path configuration field -- File/Folder Selection
      actionFields.push(
        <Form.Description
          key={`actionDescription${i}`}
          text={
            actionTypes[i] == "openPathAdd"
              ? "Upon detecting a file addition, open the following paths with their default applications:"
              : "Upon detecting a file removal, open the following paths with their default applications:"
          }
        />
      );

      actionFields.push(
        <Form.FilePicker
          key={`actionFilePicker${i}`}
          id={`actionValue${i}`}
          title="File/Folder To Open"
          canChooseDirectories={true}
          defaultValue={"targets" in actionValues[i] ? (actionValues[i]["targets"] as string[]) : []}
          error={actionErrors[i]}
          onChange={(paths) => {
            if (checkActionPaths(paths, i)) {
              updateActionValues(i, {
                targets: paths,
              });
            }
          }}
        />
      );
    } else if (actionTypes[i] == "openURLAdd" || actionTypes[i] == "openURLRemove") {
      // URL configuration field -- URL Text
      actionFields.push(
        <Form.Description
          key={`actionDescription${i}`}
          text={
            actionTypes[i] == "openURLAdd"
              ? "Upon detecting a file addition, open the following URL with the default browser:"
              : "Upon detecting a file removal, open the following URL with the default browser:"
          }
        />
      );

      actionFields.push(
        <Form.TextField
          key={`actionTextField${i}`}
          id={`actionValue${i}`}
          title="URL To Open"
          placeholder="https://google.com"
          defaultValue={"target" in actionValues[i] ? (actionValues[i]["target"] as string) : ""}
          error={actionErrors[i]}
          onChange={(url) => {
            if (checkActionURL(url, i)) {
              updateActionValues(i, {
                target: url,
              });
            }
          }}
        />
      );
    } else if (actionTypes[i] == "scriptAdd" || actionTypes[i] == "scriptRemove") {
      // Script configuration field -- Script Text
      actionFields.push(
        <Form.Description
          key={`actionDescription${i}`}
          text={
            actionTypes[i] == "scriptAdd"
              ? "Upon detecting a file addition, run the following Terminal script:"
              : "Upon detecting a file removal, run the following Terminal script:"
          }
        />
      );

      actionFields.push(
        <Form.TextField
          key={`actionTextField${i}`}
          id={`actionValue${i}`}
          title="Script Text"
          placeholder="ping google.com -c 3"
          defaultValue={"value" in actionValues[i] ? (actionValues[i]["value"] as string) : ""}
          error={actionErrors[i]}
          onChange={(script) => {
            updateActionValues(i, {
              value: script,
            });
          }}
        />
      );
    } else if (actionTypes[i] == "hudAdd" || actionTypes[i] == "hudRemove") {
      // HUD configuration field -- HUD Text
      actionFields.push(
        <Form.Description
          key={`actionDescription${i}`}
          text={
            actionTypes[i] == "hudAdd"
              ? "Upon detecting a file addition, display the following HUD:"
              : "Upon detecting a file removal, display the following HUD:"
          }
        />
      );

      actionFields.push(
        <Form.TextField
          key={`actionTextField${i}`}
          id={`actionValue${i}`}
          title="HUD Text"
          defaultValue={"text" in actionValues[i] ? (actionValues[i]["text"] as string) : "Detected change in {dir}"}
          error={actionErrors[i]}
          onChange={(text) => {
            updateActionValues(i, {
              text: text,
            });
          }}
        />
      );
    } else if (actionTypes[i] == "soundAdd" || actionTypes[i] == "soundRemove") {
      // Sound configuration field -- Sound Selection
      actionFields.push(
        <Form.Description
          key={`actionDescription${i}`}
          text={
            actionTypes[i] == "soundAdd"
              ? "Upon detecting a file addition, play the following sound:"
              : "Upon detecting a file removal, play the following sound:"
          }
        />
      );

      actionFields.push(
        <Form.Dropdown
          key={`actionDropdown${i}`}
          id={`actionValue${i}`}
          title="Sound"
          defaultValue={"soundName" in actionValues[i] ? (actionValues[i]["soundName"] as string) : "Basso.aiff"}
          error={actionErrors[i]}
          onChange={(sound) => {
            updateActionValues(i, {
              soundName: sound,
            });
          }}
        >
          {fs.readdirSync("/System/Library/Sounds").map((file) => (
            <Form.Dropdown.Item key={file} value={file.split(".")[0]} title={file.split(".")[0]} />
          ))}
        </Form.Dropdown>
      );
    } else if (actionTypes[i] == "notificationAdd" || actionTypes[i] == "notificationRemove") {
      // Notification configuration fields -- Title, Subtitle, Text, and Sound
      actionFields.push(
        <Form.Description
          key={`actionDescription${i}`}
          text={
            actionTypes[i] == "notificationAdd"
              ? "Upon detecting a file addition, display the following notification:"
              : "Upon detecting a file removal, display the following notification:"
          }
        />
      );

      actionFields.push(
        <Form.TextField
          key={`actionTextField${i}a`}
          id={`actionValue${i}a`}
          title="Notification Title"
          defaultValue={"title" in actionValues[i] ? (actionValues[i]["title"] as string) : "Change Detected!"}
          onChange={(title) => {
            if (Object.keys(actionValues[i]).length == 0) {
              updateActionValues(i, {
                title: title,
                subtitle: "",
                text: "Detected change in {dir}",
                soundName: "Basso",
              });
            } else {
              const value = { ...actionValues[i] };
              (value as { [key: string]: string })["title"] = title;
              updateActionValues(i, value);
            }
          }}
        />
      );

      actionFields.push(
        <Form.TextField
          key={`actionTextField${i}b`}
          id={`actionValue${i}b`}
          title="Notification Subtitle"
          defaultValue={"subtitle" in actionValues[i] ? (actionValues[i]["subtitle"] as string) : ""}
          onChange={(subtitle) => {
            if (Object.keys(actionValues[i]).length == 0) {
              updateActionValues(i, {
                title: "Change Detected!",
                subtitle: subtitle,
                text: "Detected change in {dir}",
                soundName: "Basso",
              });
            } else {
              const value = { ...actionValues[i] };
              (value as { [key: string]: string })["subtitle"] = subtitle;
              updateActionValues(i, value);
            }
          }}
        />
      );

      actionFields.push(
        <Form.TextField
          key={`actionTextField${i}c`}
          id={`actionValue${i}c`}
          title="Notification Text"
          defaultValue={"text" in actionValues[i] ? (actionValues[i]["text"] as string) : "Detected change in {dir}"}
          onChange={(text) => {
            if (Object.keys(actionValues[i]).length == 0) {
              updateActionValues(i, {
                title: "Change Detected!",
                subtitle: "",
                text: text,
                soundName: "Basso",
              });
            } else {
              const value = { ...actionValues[i] };
              (value as { [key: string]: string })["text"] = text;
              updateActionValues(i, value);
            }
          }}
        />
      );

      actionFields.push(
        <Form.Dropdown
          key={`actionDropdown${i}`}
          id={`actionValue${i}d`}
          title="Sound"
          defaultValue={"soundName" in actionValues[i] ? (actionValues[i]["soundName"] as string) : "Basso.aiff"}
          onChange={(sound) => {
            if (Object.keys(actionValues[i]).length == 0) {
              updateActionValues(i, {
                title: "Change Detected!",
                subtitle: "",
                text: "Detected change in {dir}",
                soundName: sound,
              });
            } else {
              const value = { ...actionValues[i] };
              (value as { [key: string]: string })["soundName"] = sound;
              updateActionValues(i, value);
            }
          }}
        >
          {fs.readdirSync("/System/Library/Sounds").map((file) => (
            <Form.Dropdown.Item key={file} value={file.split(".")[0]} title={file.split(".")[0]} />
          ))}
        </Form.Dropdown>
      );
    } else if (actionTypes[i] == "alertAdd" || actionTypes[i] == "alertRemove") {
      // Alert configuration fields -- Title and Message
      actionFields.push(
        <Form.Description
          key={`actionDescription${i}`}
          text={
            actionTypes[i] == "alertAdd"
              ? "Upon detecting a file addition, display the following alert:"
              : "Upon detecting a file removal, display the following alert:"
          }
        />
      );

      actionFields.push(
        <Form.TextField
          key={`actionTextField${i}a`}
          id={`actionValue${i}a`}
          title="Alert Title"
          defaultValue={"title" in actionValues[i] ? (actionValues[i]["title"] as string) : "Change Detected!"}
          onChange={(title) => {
            if (Object.keys(actionValues[i]).length == 0) {
              updateActionValues(i, {
                title: title,
                message: "",
              });
            } else {
              const value = { ...actionValues[i] };
              (value as { [key: string]: string })["title"] = title;
              updateActionValues(i, value);
            }
          }}
        />
      );

      actionFields.push(
        <Form.TextField
          key={`actionTextField${i}b`}
          id={`actionValue${i}b`}
          title="Alert Message"
          defaultValue={"message" in actionValues[i] ? (actionValues[i]["message"] as string) : "{item}"}
          onChange={(message) => {
            if (Object.keys(actionValues[i]).length == 0) {
              updateActionValues(i, {
                title: "Change Detected!",
                message: message,
              });
            } else {
              const value = { ...actionValues[i] };
              (value as { [key: string]: string })["message"] = message;
              updateActionValues(i, value);
            }
          }}
        />
      );
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Submit" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.FilePicker
        id="dir"
        title="Folder Path"
        canChooseDirectories={true}
        canChooseFiles={false}
        defaultValue={[oldData.dir || ""]}
        allowMultipleSelection={false}
        error={dirError}
        onChange={(paths) => checkDir(paths)}
      />

      <Form.TextField
        id="numActions"
        title="Number of Actions"
        defaultValue={(oldData.addActions.length + oldData.removeActions.length || 1).toString()}
        onChange={(numActions) => {
          if (checkNumActions(numActions)) {
            setNumActions(parseInt(numActions));
          }
        }}
        error={numActionsError}
      />

      {actionFields}
    </Form>
  );
}
