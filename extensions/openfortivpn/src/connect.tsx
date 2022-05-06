import { Form, ActionPanel, Action, showToast, Toast } from "@raycast/api";
import { promisify } from "util";
import { exec as cExec } from "child_process";
import { checkErrors } from "./utilities/common";

const exec = promisify(cExec);

interface CommandForm {
  otp: string;
}

export default function Command() {
  async function handleSubmit(values: CommandForm) {
    const cmd = `/usr/bin/sudo /opt/homebrew/bin/openfortivpn${values.otp ? " -o " + values.otp : ""}`;
    try {
      await showToast({
        style: Toast.Style.Success,
        title: "Connecting",
      });
      await exec(cmd);
    } catch (e) {
      if (e instanceof Error) {
        await checkErrors(e);
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
