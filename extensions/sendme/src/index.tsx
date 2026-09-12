import { useState, useEffect } from "react";
import {
  Form,
  ActionPanel,
  Action,
  showToast,
  Toast,
  useNavigation,
  Icon,
} from "@raycast/api";
// Add the missing import for globalSessions
import { globalSessions } from "./sessionManager";
import { SessionsList } from "./components/SessionsList";
import { handleError } from "./utils/errors";
import { shareMultipleFiles, showShareResults } from "./utils/fileShareUtils";
import { ensureSendmeAvailable } from "./utils/sendmeInstaller";

export default function Command() {
  const [isLoading, setIsLoading] = useState(true);
  const [sessionCount, setSessionCount] = useState(0);
  const [sendmeInstalled, setSendmeInstalled] = useState(false);
  const { push } = useNavigation();

  // Check if sendme is installed and load persisted sessions
  useEffect(() => {
    async function init() {
      try {
        // First check if sendme is available
        const isSendmeAvailable = await ensureSendmeAvailable();
        console.log("Sendme available:", isSendmeAvailable);
        setSendmeInstalled(isSendmeAvailable);

        // Then load persisted sessions
        await globalSessions.loadSessions();
      } catch (error) {
        console.error("Init error:", error);
      } finally {
        setIsLoading(false);
      }
    }

    init();
  }, []);

  useEffect(() => {
    const unsubscribe = globalSessions.subscribe(() => {
      setSessionCount(globalSessions.getSessions().length);
    });
    return unsubscribe;
  }, []);

  const handleSubmit = async (values: { file: string[] }) => {
    try {
      // First check if sendme is installed - if not, try to install it
      if (!sendmeInstalled) {
        const isInstalled = await ensureSendmeAvailable();
        if (!isInstalled) {
          throw new Error("Sendme is required but not installed");
        }
        setSendmeInstalled(true);
      }

      setIsLoading(true);

      if (!values.file?.length) {
        throw new Error("No files selected");
      }

      const filePaths = values.file;

      // Show initial progress toast for multiple files
      if (filePaths.length > 1) {
        await showToast({
          style: Toast.Style.Animated,
          title: `Processing ${filePaths.length} files`,
          message: "Starting file sharing...",
        });
      }

      const result = await shareMultipleFiles(filePaths);

      // Show results toast
      await showShareResults(result);
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: handleError(error),
      });
    } finally {
      setIsLoading(false);
    }
  };

  const triggerSendmeInstall = async () => {
    try {
      setIsLoading(true);
      const isInstalled = await ensureSendmeAvailable();
      setSendmeInstalled(isInstalled);

      if (isInstalled) {
        await showToast({
          style: Toast.Style.Success,
          title: "Sendme installed successfully",
          message: "You can now share files",
        });
      }
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Installation failed",
        message: handleError(error),
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          {sendmeInstalled ? (
            <Action.SubmitForm title="Share File" onSubmit={handleSubmit} />
          ) : (
            <Action
              title="Install Sendme"
              icon={Icon.Download}
              onAction={triggerSendmeInstall}
            />
          )}

          {sessionCount > 0 && (
            <Action
              title={`Manage Sessions (${sessionCount})`}
              icon={Icon.List}
              onAction={() => push(<SessionsList />)}
              shortcut={{ modifiers: ["cmd", "shift"], key: "u" }}
            />
          )}
        </ActionPanel>
      }
    >
      <Form.FilePicker
        id="file"
        title="Select File or Folder"
        canChooseDirectories
        allowMultipleSelection={true}
        info="Select files or folders to share with sendme"
      />

      {sessionCount > 0 && (
        <Form.Description
          title={`Active Sessions (⌘⇧U to manage)`}
          text={`You have ${sessionCount} active sharing session(s)`}
        />
      )}

      {!sendmeInstalled && (
        <Form.Description
          title="Sendme Not Installed"
          text="Sendme is required to share files. Click 'Install Sendme' to set up the tool."
        />
      )}
    </Form>
  );
}
