import { useEffect, useState } from "react";
import {
  Action,
  ActionPanel,
  Form,
  getPreferenceValues,
  type LaunchProps,
  popToRoot,
  showToast,
  Toast,
} from "@raycast/api";
import {
  createNewSession,
  directoryExists,
  getAllSession,
  openSessionInTerminal,
  sendStartupCommand,
} from "./utils/sessionUtils";
import { getTerminalCapabilities, type OpenTarget, type TerminalCapabilities } from "./utils/terminalLaunchUtils";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

interface Preferences {
  defaultDirectory?: string;
  defaultStartupCommand?: string;
  createFolderByDefault?: boolean;
  openAfterCreate?: boolean;
}

export default function CreateNewTmuxSession(props: LaunchProps<{ arguments: { sessionName?: string } }>) {
  const preferences = getPreferenceValues<Preferences>();

  const [loading, setLoading] = useState<boolean>(false);
  const [sessionName, setSessionName] = useState<string>(props.arguments?.sessionName ?? "");
  const [sessionNameError, setSessionNameError] = useState<string>("");
  const [sessionDirectoryError, setSessionDirectoryError] = useState<string>("");
  const [createNewFolder, setCreateNewFolder] = useState<boolean>(Boolean(preferences.createFolderByDefault));
  const [folderName, setFolderName] = useState<string>("");
  const [folderNameEdited, setFolderNameEdited] = useState<boolean>(false);
  const [terminalCapabilities, setTerminalCapabilities] = useState<TerminalCapabilities | null>(null);
  const defaultDirectory = preferences.defaultDirectory ? [preferences.defaultDirectory] : ["/"];
  const folderRoot = preferences.defaultDirectory || os.homedir();

  useEffect(() => {
    (async () => {
      setTerminalCapabilities(await getTerminalCapabilities());
    })();
  }, []);

  const validateSessionName = (value: string) => {
    if (!value || value.length === 0) {
      return;
    }

    getAllSession((error, stdout, stderr) => {
      if (error || stderr) {
        console.error(`exec error: ${error}`);
        setLoading(false);
      }

      const lines = stdout.trim().split("\n");

      if (lines.includes(value)) {
        setSessionNameError("Session name already exists");
      } else {
        setSessionNameError("");
      }
    });
  };

  // Validate a name prefilled through the command argument
  useEffect(() => {
    validateSessionName(sessionName);
  }, []);

  const openTarget: OpenTarget | null = terminalCapabilities?.supportsTab
    ? "tab"
    : terminalCapabilities?.supportsWindow
      ? "window"
      : null;

  const handleSubmit = async (values: Form.Values, openAfterCreate: boolean) => {
    const name = values.newSessionName;
    setLoading(true);

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "",
    });

    if (!name) {
      const errorMessage = "Session name is required";
      setSessionNameError(errorMessage);
      toast.style = Toast.Style.Failure;
      toast.message = errorMessage;
      setLoading(false);
      return;
    }

    let sessionDirectory: string;

    if (createNewFolder) {
      const folder = (values.newFolderName || "").trim() || name;
      sessionDirectory = path.join(folderRoot, folder);

      try {
        fs.mkdirSync(sessionDirectory, { recursive: true });
      } catch (e) {
        toast.style = Toast.Style.Failure;
        toast.message = `Failed to create folder: ${e instanceof Error ? e.message : String(e)}`;
        setLoading(false);
        return;
      }
    } else {
      sessionDirectory = values.newSessionDirectory?.[0];

      if (sessionDirectory && !directoryExists(sessionDirectory)) {
        const errorMessage = "The directory you selected does not exist";
        setSessionDirectoryError(errorMessage);
        toast.style = Toast.Style.Failure;
        toast.message = errorMessage;
        setLoading(false);
        return;
      }

      sessionDirectory = sessionDirectory || preferences.defaultDirectory || "/";
    }

    const startupCommand = (values.startupCommand || "").trim();

    createNewSession(name, sessionDirectory, async (error, _stdout, stderr) => {
      if (error || stderr) {
        console.error(`exec error: ${error}`);
        setLoading(false);
        toast.style = Toast.Style.Failure;
        toast.message = "Failed to create new session";
        return;
      }

      const finishUp = async () => {
        toast.style = Toast.Style.Success;
        toast.message = `New session ${name} is setup successfully`;

        if (openAfterCreate && openTarget) {
          await openSessionInTerminal(name, openTarget, setLoading);
        }

        setLoading(false);
        popToRoot();
      };

      if (startupCommand) {
        sendStartupCommand(name, startupCommand, async (sendError, _sendStdout, sendStderr) => {
          if (sendError || sendStderr) {
            console.error(`exec error: ${sendError || sendStderr}`);
            setLoading(false);
            toast.style = Toast.Style.Failure;
            toast.message = "Session created, but running the startup command failed";
            return;
          }

          await finishUp();
        });
      } else {
        await finishUp();
      }
    });
  };

  return (
    <Form
      isLoading={loading}
      navigationTitle="Create New Tmux Session"
      actions={
        <ActionPanel>
          {preferences.openAfterCreate && openTarget ? (
            <>
              <Action.SubmitForm
                title={`Create and Open in New ${openTarget === "tab" ? "Tab" : "Window"}`}
                onSubmit={(values) => handleSubmit(values, true)}
              />
              <Action.SubmitForm title="Create New Session" onSubmit={(values) => handleSubmit(values, false)} />
            </>
          ) : (
            <>
              <Action.SubmitForm title="Create New Session" onSubmit={(values) => handleSubmit(values, false)} />
              {openTarget && (
                <Action.SubmitForm
                  title={`Create and Open in New ${openTarget === "tab" ? "Tab" : "Window"}`}
                  onSubmit={(values) => handleSubmit(values, true)}
                />
              )}
            </>
          )}
        </ActionPanel>
      }
    >
      <Form.TextField
        title="New Session Name"
        id="newSessionName"
        value={sessionName}
        error={sessionNameError}
        onChange={(value) => {
          setSessionName(value);
          validateSessionName(value);
        }}
      />
      <Form.Checkbox
        id="createNewFolder"
        title="Session Directory"
        label="Create New Folder"
        value={createNewFolder}
        onChange={setCreateNewFolder}
        info={`Create the session inside a new folder under ${folderRoot}`}
      />
      {createNewFolder ? (
        <Form.TextField
          title="Folder Name"
          id="newFolderName"
          placeholder={sessionName || "Defaults to the session name"}
          value={folderNameEdited ? folderName : sessionName}
          onChange={(value) => {
            setFolderName(value);
            setFolderNameEdited(value.length > 0);
          }}
          info={`Created at ${path.join(folderRoot, (folderNameEdited && folderName) || sessionName || "<session name>")}`}
        />
      ) : (
        <Form.FilePicker
          title="New Session Directory"
          id="newSessionDirectory"
          allowMultipleSelection={false}
          defaultValue={defaultDirectory}
          canChooseDirectories
          canChooseFiles={false}
          error={sessionDirectoryError}
          onChange={(value) => {
            if (!value || value.length === 0) {
              return;
            }
            setSessionDirectoryError("");
          }}
        />
      )}
      <Form.TextField
        title="Startup Command"
        id="startupCommand"
        placeholder="Optional command to run in the new session"
        defaultValue={preferences.defaultStartupCommand ?? ""}
        info="Typed into the session shell after creation, so the session survives when the command exits"
      />
    </Form>
  );
}
