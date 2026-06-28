import {
  Form,
  ActionPanel,
  Action,
  showToast,
  Toast,
  closeMainWindow,
  popToRoot,
  getPreferenceValues,
} from "@raycast/api";
import { spawn } from "child_process";
import { checkErrors, checkOpenFortiVpn } from "./utilities/common";

interface CommandForm {
  otp: string;
}

export default function Command() {
  async function handleSubmit(values: CommandForm) {
    if (await checkOpenFortiVpn()) {
      const useSudo: boolean = getPreferenceValues().sudo ?? false;
      const cmd = `${useSudo ? "/usr/bin/sudo /opt/homebrew/bin/openfortivpn" : "openfortivpn"} ${
        values.otp ? " -o " + values.otp : ""
      }`;
      try {
        await showToast({
          style: Toast.Style.Success,
          title: "Connecting",
        });
        spawn("/bin/sh", ["-c", cmd], {});
        closeMainWindow();
        popToRoot();
      } catch (e) {
        if (e instanceof Error) {
          await checkErrors(e.message);
        }
      }
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Connect" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="otp"
        title="One time password"
        placeholder="Enter or leave blank (if you are not using 2FA)"
      />
    </Form>
  );
}
