import { Action, ActionPanel, Form, Toast, showToast, useNavigation } from "@raycast/api";

import { useState } from "react";
import { getAllWindow, renameWindow } from "./utils/windowUtils";
import { ExecException } from "child_process";
import { renameSession } from "./utils/sessionUtils";

interface RenameTmuxProps {
  sessionName: string;
  windowName?: string;
  type: "Session" | "Window";
  callback?: () => void;
}

export const RenameTmux = ({ sessionName, windowName, type, callback }: RenameTmuxProps) => {
  const [loading, setLoading] = useState(false);
  const [renamedValueError, setRenamedValueError] = useState<string>("");
  const { pop } = useNavigation();

  return (
    <Form
      isLoading={loading}
      navigationTitle={`Rename Tmux ${type}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={`Rename ${type}`}
            onSubmit={async (values) => {
              const renamedValue = values.renamedValue;
              setLoading(true);

              const toast = await showToast({
                style: Toast.Style.Animated,
                title: "",
              });

              if (
                (renamedValue === windowName && type === "Window") ||
                (renamedValue === sessionName && type === "Session")
              ) {
                toast.style = Toast.Style.Failure;
                toast.message = `${type} name is not changed`;
                setLoading(false);
                return;
              }
              const renameCb = (error: ExecException | null, stdout: string, stderr: string) => {
                if (error || stderr) {
                  console.error(`exec error: ${error}`);
                  setLoading(false);
                  toast.style = Toast.Style.Failure;
                  toast.message = `Failed to rename ${type.toLowerCase()}`;
                  return;
                }

                toast.style = Toast.Style.Success;
                toast.message = `${type} has been renamed to ${renamedValue}`;
                setLoading(false);

                callback && callback();
                pop();
              };

              switch (type) {
                case "Session":
                  renameSession(sessionName, renamedValue, renameCb);
                  break;
                case "Window": {
                  if (!windowName) {
                    throw new Error("windowName is required for type Window");
                  }
                  renameWindow(sessionName, windowName, renamedValue, renameCb);
                  break;
                }
                default:
                  break;
              }
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        title={`Renamed ${type}`}
        id="renamedValue"
        error={renamedValueError}
        defaultValue={windowName}
        onChange={(value) => {
          if (!value || value.length === 0 || value === windowName) {
            return;
          }

          getAllWindow((error, stdout, stderr) => {
            if (error || stderr) {
              console.error(`exec error: ${error}`);
              setLoading(false);
            }

            const lines = stdout.trim().split("\n");

            if (lines.includes(value)) {
              setRenamedValueError(`${type} name already exists, you can not rename to`);
            } else {
              setRenamedValueError("");
            }
          });
        }}
      />
    </Form>
  );
};
