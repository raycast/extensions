import open from "open";
import { closeMainWindow, showHUD, ActionPanel, Form, Action } from "@raycast/api";
import { SipInstallationCheck } from "./checkInstall";

export default function Command() {
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Submit Name" onSubmit={(values) => console.log(values)} />
        </ActionPanel>
      }
    >
      <Form.TextField id="name" defaultValue="Steve" />
    </Form>
  );
}
