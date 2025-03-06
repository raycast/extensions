import { ActionPanel, Form, Action } from "@raycast/api";
import ShareSecretAction from "./components/shareSecretAction";
import ExpireViews from "./components/expireViews";
import ExpireDays from "./components/expireDays";

export default function Command() {
  return (
    <Form
      actions={
        <ActionPanel>
          <ShareSecretAction />
          <Action.OpenInBrowser url="https://share.doppler.com" />
        </ActionPanel>
      }
    >
      <Form.TextArea id="secret" title="Secret" placeholder="Enter sensitive data to securely share..." />
      <ExpireViews></ExpireViews>
      <ExpireDays></ExpireDays>
    </Form>
  );
}
