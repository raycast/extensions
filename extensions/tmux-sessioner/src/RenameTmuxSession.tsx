import { Action, ActionPanel, Form, Toast, showToast, useNavigation } from "@raycast/api";

import { useState } from "react";
import { getAllSession, renameSession } from "./utils/sessionUtils";

export const RenameTmuxSession = ({ session, callback }: { session: string; callback?: () => void }) => {
  const [loading, setLoading] = useState(false);
  const [renamedSessionError, setRenamedSessionError] = useState<string>("");
  const { pop } = useNavigation();

  return (
    <Form
      isLoading={loading}
      navigationTitle="Rename Tmux Session"
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Rename Session"
            onSubmit={async (values) => {
              const renamedSession = values.renamedSession;
              setLoading(true);

              const toast = await showToast({
                style: Toast.Style.Animated,
                title: "",
              });

              if (renamedSession === session) {
                toast.style = Toast.Style.Failure;
                toast.message = "Session name is not changed";
                setLoading(false);
                return;
              }

              // session is an oldSessionName
              // renamedSession is a newSessionName
              renameSession(session, renamedSession, (error, stdout, stderr) => {
                if (error || stderr) {
                  console.error(`exec error: ${error}`);
                  setLoading(false);
                  toast.style = Toast.Style.Failure;
                  toast.message = "Failed to rename session";
                  return;
                }

                toast.style = Toast.Style.Success;
                toast.style = Toast.Style.Success;
                toast.message = `Session has been renamed to ${renamedSession}`;
                setLoading(false);

                callback && callback();
                pop();
              });
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        title="Renamed Session"
        id="renamedSession"
        error={renamedSessionError}
        defaultValue={session}
        onChange={(value) => {
          if (!value || value.length === 0 || value === session) {
            return;
          }

          getAllSession((error, stdout, stderr) => {
            if (error || stderr) {
              console.error(`exec error: ${error}`);
              setLoading(false);
            }

            const lines = stdout.trim().split("\n");

            if (lines.includes(value)) {
              setRenamedSessionError("Session name already exists, you can not rename to");
            } else {
              setRenamedSessionError("");
            }
          });
        }}
      />
    </Form>
  );
};
