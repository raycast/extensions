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
import Twitter from "./twitter";
import { Preferences, Tweet } from "./types";

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();

  async function handleSubmit({ tweet }: Tweet) {
    if (!tweet) {
      showToast(ToastStyle.Failure, "Tweet is required");
      return;
    }
    const toast = new Toast({ style: ToastStyle.Animated, title: "Tweeting 🐣" });
    await toast.show();

    try {
      const twitter = new Twitter(preferences);
      const { handle, id } = await twitter.tweet(tweet);
      await copyTextToClipboard(`https://twitter.com/${handle}/status/${id}`);

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
