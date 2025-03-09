import { ActionPanel, Action, Form, showToast, Toast } from "@raycast/api";
import { useState } from "react";

export default function ReplaceBlancvpnUrlCommand() {
  const [result, setResult] = useState("");

  function handleSubmit(values: { inputUrl: string }) {
    const regex = /^https:\/\/blancvpn\.[^/]+\/(.*)$/;

    if (!regex.test(values.inputUrl)) {
      showToast({
        style: Toast.Style.Failure,
        title: "Invalid URL Format",
        message: "Expected format: https://blancvpn.<any>/XXXXXXXXXXX",
      });
      return;
    }

    const replaced = values.inputUrl.replace(regex, "https://getblancvpn.com/$1");
    setResult(replaced);

    showToast({
      style: Toast.Style.Success,
      title: "URL Replaced!",
      message: replaced,
    });
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Replace URL" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description
        title="BlancVPN URL Replacer"
        text="Enter the URL you want to transform from blancvpn.<any> to getblancvpn.com."
      />
      <Form.TextField id="inputUrl" title="Original URL" placeholder="e.g., https://blancvpn.eu/12345" />
      {result && <Form.Description title="Result" text={result} />}
    </Form>
  );
}
