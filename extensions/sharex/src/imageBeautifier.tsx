import {
  ActionPanel,
  Action,
  Form,
  getPreferenceValues,
  showToast,
  Toast,
  closeMainWindow,
  popToRoot,
} from "@raycast/api";
import { execFile } from "child_process";

type Preferences = { sharexPath: string; useRaycastForms: boolean };

export default function Command() {
  const { sharexPath, useRaycastForms } = getPreferenceValues<Preferences>();

  if (useRaycastForms) {
    return (
      <Form
        actions={
          <ActionPanel>
            <Action.SubmitForm
              title="Open File in Image Beautifier"
              onSubmit={(values: { files?: string[] }) => {
                const file = values.files?.[0];

                if (!sharexPath) {
                  showToast({ style: Toast.Style.Failure, title: "ShareX path not set" });
                  return;
                }

                if (!file) {
                  showToast({ style: Toast.Style.Failure, title: "No file selected" });
                  return;
                }

                showToast({ style: Toast.Style.Animated, title: "Opening image beautifier..." });
                execFile(sharexPath, ["-ImageBeautifier", file], (error) => {
                  if (error) {
                    showToast({
                      style: Toast.Style.Failure,
                      title: "Error running ShareX",
                      message: error.message,
                    });
                  } else {
                    showToast({ style: Toast.Style.Success, title: "Image beautifer opened!" });
                  }
                });
              }}
            />
          </ActionPanel>
        }
      >
        <Form.FilePicker id="files" title="Pick a File" allowMultipleSelection={false} />
      </Form>
    );
  } else {
    if (!sharexPath) {
      showToast({ style: Toast.Style.Failure, title: "ShareX path not set" });
      return;
    }
    showToast({ style: Toast.Style.Animated, title: "Opening image beautifier..." });
    execFile(sharexPath, ["-ImageBeautifier"], (error) => {
      if (error) {
        showToast({
          style: Toast.Style.Failure,
          title: "Error running ShareX",
          message: error.message,
        });
      } else {
        showToast({ style: Toast.Style.Success, title: "Image beautifier opened!" });
        closeMainWindow();
        popToRoot();
      }
    });
  }
}
