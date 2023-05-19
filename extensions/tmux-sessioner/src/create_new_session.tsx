import { useState } from "react";
import { Action, ActionPanel, Form, popToRoot, showToast, Toast } from "@raycast/api";
import { creatNewSession, getAllSession } from "./utils/sessionUtils";

export default function CreateNewTmuxSession() {
  const [loading, setLoading] = useState<boolean>(false);
  const [sessionNameError, setSessionNameError] = useState<string>("");

  return (
    <Form
      isLoading={loading}
      navigationTitle="Create New Tmux Session"
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Create New Session"
            onSubmit={async (values) => {
              const sessionName = values.newSessionName;
              setLoading(true);

              const toast = await showToast({
                style: Toast.Style.Animated,
                title: "",
              });

              creatNewSession(sessionName, (error, stdout, stderr) => {
                if (error || stderr) {
                  console.error(`exec error: ${error}`);
                  setLoading(false);
                  toast.style = Toast.Style.Failure;
                  toast.message = "Failed to create new session";
                  return;
                }

                toast.style = Toast.Style.Success;
                toast.style = Toast.Style.Success;
                toast.message = `New session ${sessionName} is setup successfully`;
                setLoading(false);
                popToRoot();
              });
            }}
          />
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
    </Form>
  );
}
