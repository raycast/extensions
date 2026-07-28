import { useEffect, useState } from "react";
import { Action, ActionPanel, Form, getPreferenceValues, popToRoot, showToast, Toast } from "@raycast/api";
import { createNewSession, directoryExists, getAllSession, openSessionInTerminal } from "./utils/sessionUtils";
import { getTerminalCapabilities, type OpenTarget, type TerminalCapabilities } from "./utils/terminalLaunchUtils";

export default function CreateNewTmuxSession() {
  const [loading, setLoading] = useState<boolean>(false);
  const [sessionNameError, setSessionNameError] = useState<string>("");
  const [sessionDirectoryError, setSessionDirectoryError] = useState<string>("");
  const [terminalCapabilities, setTerminalCapabilities] = useState<TerminalCapabilities | null>(null);
  const preferences = getPreferenceValues();
  const defaultDirectory = preferences.defaultDirectory ? [preferences.defaultDirectory] : ["/"];

  useEffect(() => {
    (async () => {
      setTerminalCapabilities(await getTerminalCapabilities());
    })();
  }, []);

  const openTarget: OpenTarget | null = terminalCapabilities?.supportsTab
    ? "tab"
    : terminalCapabilities?.supportsWindow
      ? "window"
      : null;

  const handleSubmit = async (values: Form.Values, openAfterCreate: boolean) => {
    const sessionName = values.newSessionName;
    const sessionDirectory = values.newSessionDirectory[0];
    setLoading(true);

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "",
    });

    if (!sessionName) {
      const errorMessage = "Session name is required";
      setSessionNameError(errorMessage);
      toast.style = Toast.Style.Failure;
      toast.message = errorMessage;
      setLoading(false);
      return;
    }

    if (sessionDirectory && !directoryExists(sessionDirectory)) {
      const errorMessage = "The directory you selected does not exist";
      setSessionDirectoryError(errorMessage);
      toast.style = Toast.Style.Failure;
      toast.message = errorMessage;
      setLoading(false);
      return;
    }

    createNewSession(
      sessionName,
      sessionDirectory || preferences.defaultDirectory || "/",
      async (error, _stdout, stderr) => {
        if (error || stderr) {
          console.error(`exec error: ${error}`);
          setLoading(false);
          toast.style = Toast.Style.Failure;
          toast.message = "Failed to create new session";
          return;
        }

        toast.style = Toast.Style.Success;
        toast.message = `New session ${sessionName} is setup successfully`;

        if (openAfterCreate && openTarget) {
          await openSessionInTerminal(sessionName, openTarget, setLoading);
        }

        setLoading(false);
        popToRoot();
      },
    );
  };

  return (
    <Form
      isLoading={loading}
      navigationTitle="Create New Tmux Session"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create New Session" onSubmit={(values) => handleSubmit(values, false)} />
          {openTarget && (
            <Action.SubmitForm
              title={`Create and Open in New ${openTarget === "tab" ? "Tab" : "Window"}`}
              onSubmit={(values) => handleSubmit(values, true)}
            />
          )}
        </ActionPanel>
      }
    >
      <Form.TextField
        title="New Session Name"
        id="newSessionName"
        error={sessionNameError}
        onChange={(value) => {
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
        }}
      />
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
    </Form>
  );
}
