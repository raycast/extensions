import axios from "axios";
import { useState } from "react";
import { getPreferenceValues, ActionPanel, Form, FormValue, showToast, Action, Toast } from "@raycast/api";

interface Preferences {
  api: string;
  email: string;
}

export default function Command() {
  const preferences: Preferences = getPreferenceValues();
  const postUrl = 'https://app.napkin.one/api/createThought';
  const [text, setText] = useState<string>("");
  const [url, setUrl] = useState<string>("");

  async function handleSubmit(values: Record<string, FormValue>) {
    const content = values.thoughts;
    const sourceUrl = values.sourceUrl;

    if (content !== "") {
      showToast({
        style: Toast.Style.Animated,
        title: "Sending",
      });

      const data = { 
        email: preferences.email,
        token: preferences.api,
        thought: content,
      }

      const response = await axios.post(postUrl,sourceUrl ? {...data, sourceUrl} : data);

      if (response.data?.thoughtId) {
        showToast({
          style: Toast.Style.Success,
          title: "Success",
          message: `Successfully sent thoughts, thoughtId: ${response.data.thoughtId}`,
        });
        setText("");
      } else {
        showToast({
          style: Toast.Style.Failure,
          title: "Failed",
          message: "Check that Email and API TOKEN is correct",
        });
      }
    } else {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed",
        message: "Thoughts can't be left empty",
      });
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Send thoughts" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextArea id="thoughts" title="Thoughts" placeholder="What's on your mind?" defaultValue={text} onChange={setText} />
      <Form.TextField id="sourceUrl" title="SourceUrl" placeholder="https://" defaultValue={url} onChange={setUrl} />
    </Form>
  );
}
