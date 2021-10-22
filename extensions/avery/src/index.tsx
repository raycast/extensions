import {
  ActionPanel,
  SubmitFormAction,
  Form,
  showToast,
  ToastStyle,
  Toast,
  copyTextToClipboard,
  closeMainWindow,
  getPreferenceValues,
} from "@raycast/api";
import got from "got";
import { Tweet } from "./types";

export default function Command() {
  const preferences = getPreferenceValues();

  async function handleSubmit({ tweet }: Tweet) {
    if (!tweet) {
      showToast(ToastStyle.Failure, "Tweet is required");
      return;
    }
    const toast = new Toast({ style: ToastStyle.Animated, title: "Tweeting 🐣" });
    await toast.show();

    try {
      const { body } = await got.post("https://daily-actions.vercel.app/api", {
        json: { tweet, preferences },
        responseType: "json",
      });
      await copyTextToClipboard((body as Tweet).tweet);
      toast.style = ToastStyle.Success;
      toast.title = "Tweet sent";
      toast.message = "Copied link to clipboard";
      setTimeout(() => closeMainWindow(), 1500);
    } catch (error) {
      toast.style = ToastStyle.Failure;
      toast.title = "Invalid credentials";
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <SubmitFormAction title="Send Tweet" onSubmit={handleSubmit} icon={{ source: "twitter.png" }} />
        </ActionPanel>
      }
    >
      <Form.TextArea id="tweet" title="Tweet" placeholder="What's happening?" />
    </Form>
  );
}
