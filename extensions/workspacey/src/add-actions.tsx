import { Form, ActionPanel, Action, showToast, getApplications, Application, popToRoot, Toast } from "@raycast/api";
import { ACTIONS } from "./data/actions";
import { ActionType } from "./data/actionType";
import { useEffect, useState } from "react";
import { Workspace } from "./data/workspace";
import { editAction, saveWorkspacesData } from "./data/util/storage";
import { WorkspaceData } from "./data/workspace-data";
import { randomUUID } from "crypto";
import { getActionIcon } from "./data/util/getActionIcon";
import { ActionData } from "./data/action-data";

type Values = {
  name: string;
  actionType: string;
  folderPicker: string;
  filePicker: string;
  checkbox: boolean;
  dropdown: string;
  command: string;
  dropDownApp: string;
  note: string;
  link: string;
};

export default function AddActionsForm(props: { workspace: Workspace; action?: ActionData }) {
  const { workspace, action: currentAction } = props;
  const [currentActionType, setCurrentActionType] = useState<ActionType>(currentAction?.type ?? ActionType.OpenFile);
  const [applications, setApplications] = useState<Application[]>([]);
  const [customApp, setCustomApp] = useState<boolean>(currentAction?.useCustomApp ?? false);

  const [nameError, setNameError] = useState<string | undefined>();
  const [folderError, setFolderError] = useState<string | undefined>();
  const [fileError, setFileError] = useState<string | undefined>();
  const [terminalError, setTerminalError] = useState<string | undefined>();
  const [noteError, setNoteError] = useState<string | undefined>();
  const [linkError, setLinkError] = useState<string | undefined>();

  useEffect(() => {
    getApplications().then((apps) => {
      setApplications(apps);
    });
  }, []);

  async function handleSubmit(values: Values) {
    if (!validateForm(values)) {
      showToast({
        title: "Missing Values",
        message: "Please fill all the required fields",
        style: Toast.Style.Failure,
      });
      return;
    }
    const getActionTarget = () => {
      switch (values.actionType) {
        case ActionType.OpenFolder:
          return values.folderPicker[0];
        case ActionType.OpenFile:
          return values.filePicker[0];
        case ActionType.TerminalCommand:
          return values.command;
        case ActionType.OpenApp:
          return values.dropDownApp;
        case ActionType.Note:
          return values.note;
        case ActionType.Link:
          return values.link;
        default:
          return "";
      }
    };
    const argument = values.checkbox ? values.dropDownApp : undefined;

    const workspaceData: WorkspaceData = {
      workspace: {
        id: workspace.id,
        name: workspace.name,
      },
      actions: [
        {
          id: currentAction?.id ?? randomUUID().toString(),
          useCustomApp: values.checkbox,
          name: values.name,
          type: values.actionType as ActionType, // Convert string to ActionType enum value
          target: getActionTarget(),
          argument,
        },
      ],
    };
    if (currentAction) {
      await editAction(workspace.id, workspaceData.actions[0]);
    } else {
      await saveWorkspacesData(workspaceData);
    }
    showToast({ title: "Action Saved" });
    await popToRoot();
  }
  const onDropdownChange = (newValue: string) => {
    const type = newValue as ActionType;
    setCurrentActionType(type);
  };

  return (
    <Form
      navigationTitle={currentAction ? "Edit Action" : "Add Action"}
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} title="Save" />
        </ActionPanel>
      }
    >
      <Form.Description text={`${workspace.name}`} />
      <Form.TextField
        id="name"
        title="Name"
        placeholder="Start My Server"
        defaultValue={currentAction?.name}
        error={nameError}
        onChange={(newValue) => validateName(newValue)}
        onBlur={(event) => {
          validateName(event.target.value);
        }}
      />
      <Form.Separator />

      <Form.Dropdown id="actionType" title="Action Type" onChange={onDropdownChange} defaultValue={currentAction?.type}>
        {ACTIONS.map((action) => (
          <Form.Dropdown.Item
            icon={getActionIcon(action.type)}
            value={action.type}
            title={action.name}
            key={action.type}
          />
        ))}
      </Form.Dropdown>

      {currentActionType === ActionType.OpenFile && (
        <>
          <Form.FilePicker
            id={"filePicker"}
            title={"File"}
            allowMultipleSelection={false}
            canChooseDirectories={false}
            canChooseFiles={true}
            defaultValue={
              currentAction?.target && currentAction.type === ActionType.OpenFile ? [currentAction.target] : undefined
            }
            onChange={(newValue) => {
              validateFile(newValue);
            }}
            onBlur={(newValue) => {
              validateFile(newValue.target.value);
            }}
            error={fileError}
          />
          {useCustomAppItem(ActionType.OpenFile)}
          {customApp && selectAppItem(ActionType.OpenFile)}
        </>
      )}

      {currentActionType === ActionType.OpenFolder && (
        <Form.FilePicker
          id={"folderPicker"}
          title={"Folder"}
          allowMultipleSelection={false}
          canChooseDirectories={true}
          defaultValue={
            currentAction?.target && currentAction.type === ActionType.OpenFolder ? [currentAction.target] : undefined
          }
          canChooseFiles={false}
          onChange={(newValue) => {
            validateFolder(newValue);
          }}
          onBlur={(event) => {
            validateFolder(event.target.value);
          }}
          error={folderError}
        />
      )}

      {currentActionType === ActionType.OpenApp && selectAppItem(ActionType.OpenApp)}

      {currentActionType === ActionType.Link && (
        <>
          <Form.TextField
            id="link"
            title="Link"
            placeholder="https://raycast.com"
            defaultValue={currentAction?.type === ActionType.Link ? currentAction?.target : undefined}
            error={linkError}
            onChange={(newValue) => {
              validateLink(newValue);
            }}
            onBlur={(event) => {
              validateLink(event.target.value);
            }}
          />
          {useCustomAppItem(ActionType.Link)}
          {customApp && selectAppItem(ActionType.Link)}
        </>
      )}

      {currentActionType === ActionType.TerminalCommand && (
        <Form.TextField
          id="command"
          title="Command"
          placeholder="mysql.server start"
          defaultValue={currentAction?.type === ActionType.TerminalCommand ? currentAction?.target : undefined}
          error={terminalError}
          onChange={(newValue) => {
            validateTerminalCommand(newValue);
          }}
          onBlur={(event) => {
            validateTerminalCommand(event.target.value);
          }}
        />
      )}

      {currentActionType === ActionType.Note && (
        <Form.TextArea
          id="note"
          title="Note"
          placeholder="Design Thumbnails"
          error={noteError}
          onChange={(newValue) => {
            validateNote(newValue);
          }}
          onBlur={(event) => {
            validateNote(event.target?.value);
          }}
          defaultValue={currentAction?.type === ActionType.Note ? currentAction?.target : undefined}
        />
      )}
    </Form>
  );

  function validateName(value?: string) {
    if (value?.trim()?.length === 0) {
      setNameError("Name shouldn't be empty");
    } else {
      setNameError(undefined);
    }
  }

  function validateFile(values?: string[]) {
    if (values?.length === 0) {
      setFileError("No File selected!");
    } else {
      setFileError(undefined);
    }
  }

  function validateFolder(values?: string[]) {
    if (values?.length === 0) {
      setFolderError("No Folder selected!");
    } else {
      setFolderError(undefined);
    }
  }

  function validateTerminalCommand(value?: string) {
    if (value?.trim()?.length === 0) {
      setTerminalError("Command shouldn't be empty.");
    } else {
      setTerminalError(undefined);
    }
  }

  function validateNote(value?: string) {
    if (value?.trim()?.length === 0) {
      setNoteError("Note shouldn't be empty.");
    } else {
      setNoteError(undefined);
    }
  }

  function validateLink(value?: string) {
    if (value?.trim()?.length === 0) {
      setLinkError("Link shouldn't be empty.");
    } else {
      setLinkError(undefined);
    }
  }

  function useCustomAppItem(type: ActionType) {
    return (
      <Form.Checkbox
        id="checkbox"
        title="Use Custom App"
        label="Use Custom App"
        onChange={setCustomApp}
        defaultValue={currentAction?.type === type ? currentAction?.useCustomApp : undefined}
      />
    );
  }

  function selectAppItem(type: ActionType) {
    let defaultValue = undefined;
    if (type === ActionType.OpenFile || type === ActionType.Link) {
      defaultValue = currentAction?.argument;
    } else if (type === ActionType.OpenApp) {
      defaultValue = currentAction?.target;
    }
    return (
      <Form.Dropdown id="dropDownApp" title="Open Using" defaultValue={defaultValue}>
        {applications.map((app) => (
          <Form.Dropdown.Item icon={{ fileIcon: app.path }} value={app.path} title={app.name} key={app.bundleId} />
        ))}
      </Form.Dropdown>
    );
  }
}

function validateForm(values: Values) {
  if (values.name.trim().length == 0) {
    return false;
  }
  if (values.actionType === ActionType.OpenFolder && values.folderPicker.length === 0) {
    return false;
  }
  if (values.actionType === ActionType.OpenFile && values.filePicker.length === 0) {
    return false;
  }
  if (values.actionType === ActionType.TerminalCommand && values.command.trim().length === 0) {
    return false;
  }
  if (values.actionType === ActionType.OpenApp && values.dropDownApp.trim().length === 0) {
    return false;
  }
  if (values.actionType === ActionType.Note && values.note.trim().length === 0) {
    return false;
  }
  if (values.actionType === ActionType.Link && values.link.trim().length === 0) {
    return false;
  }
  if (values.checkbox && values.dropDownApp.trim().length === 0) {
    return false;
  }
  return true;
}
