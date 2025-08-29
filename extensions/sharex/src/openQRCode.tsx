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
              title="Open Qr Code in Sharex"
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

                showToast({ style: Toast.Style.Animated, title: "Opening QR code GUI..." });
                execFile(sharexPath, ["-QRCode", file], (error) => {
                  if (error) {
                    showToast({
                      style: Toast.Style.Failure,
                      title: "Error running ShareX",
                      message: error.message,
                    });
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
    showToast({ style: Toast.Style.Animated, title: "Opening QR code GUI..." });
    execFile(sharexPath, ["-QRCode"], (error) => {
      if (error) {
        showToast({
          style: Toast.Style.Failure,
          title: "Error running ShareX",
          message: error.message,
        });
      } else {
        showToast({ style: Toast.Style.Success, title: "QR code GUI opened" });
        closeMainWindow();
        popToRoot();
      }
    });
  }
}
