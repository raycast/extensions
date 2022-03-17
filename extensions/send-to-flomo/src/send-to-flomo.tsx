import axios from "axios";
import { useState } from "react";
import {
  getPreferenceValues,
  ActionPanel,
  Form,
  FormValue,
  SubmitFormAction,
  showToast,
  ToastStyle,
} from "@raycast/api";

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
      showToast(ToastStyle.Animated, "Sending");
      const response = await axios.post(preferences.api, { content });

      if (response.data?.code === 0) {
        showToast(ToastStyle.Success, "Success", "Successfully sent MEMO");
        setText("");
        setTags(preferences.defaultTags);
      } else {
        showToast(ToastStyle.Failure, "Failed", "Check that API MEMO URL is correct");
      }
    } else {
      showToast(ToastStyle.Failure, "Failed", "MEMO can't be left empty");
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <SubmitFormAction title="Send MEMO" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextArea id="memo" title="MEMO" placeholder="What's on your mind?" value={text} onChange={setText} />
      <Form.TextField id="tags" title="Tags" value={tags} onChange={setTags} />
    </Form>
  );
}
