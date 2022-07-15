import axios from "axios";
import { useState } from "react";
import { getPreferenceValues, ActionPanel, Form, FormValue, showToast, Action, Toast } from "@raycast/api";

interface Preferences {
  api: string;
  defaultTags: string;
}

export default function Command() {
  const preferences: Preferences = getPreferenceValues();
  const [text, setText] = useState<string>("");
  const [tags, setTags] = useState<string>(preferences.defaultTags);

  async function handleSubmit(values: Record<string, FormValue>) {
    let content = values.memo;

    if (content !== "") {
      if (tags) {
        content += ` ${values.tags}`;
      }
      showToast({
        style: Toast.Style.Animated,
        title: "Sending",
      });
      const response = await axios.post(preferences.api, { content });

      if (response.data?.code === 0) {
        showToast({
          style: Toast.Style.Success,
          title: "Success",
          message: "Successfully sent MEMO",
        });
        setText("");
        setTags(preferences.defaultTags);
      } else {
        showToast({
          style: Toast.Style.Failure,
          title: "Failed",
          message: "Check that API MEMO URL is correct",
        });
      }
    } else {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed",
        message: "MEMO can't be left empty",
      });
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Send MEMO" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextArea id="memo" title="MEMO" placeholder="What's on your mind?" defaultValue={text} onChange={setText} />
      <Form.TextField id="tags" title="Tags" defaultValue={tags} onChange={setTags} />
    </Form>
  );
}
