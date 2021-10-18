import { ActionPanel, Form, FormTextArea, popToRoot, showToast, SubmitFormAction, ToastStyle } from "@raycast/api";
import { twitterClient } from "../twitterapi";

interface TweetFormValues {
  text: string;
}

async function submit(values: TweetFormValues) {
  try {
    const text = values.text;
    if (text.length < 0) {
      throw Error("Please enter a text");
    }
    if (text.length > 280) {
      throw Error("Tweet text could not be longer than 280");
    }
    console.log(values.text);
    await twitterClient.v1.tweet(text);
    await showToast(ToastStyle.Success, "Tweet created", "Tweet creation successful");
    popToRoot();
  } catch (error: any) {
    await showToast(ToastStyle.Failure, "Error", error.message);
  }
}

export function TweetSendForm() {
  return (
    <Form
      onSubmit={submit}
      actions={
        <ActionPanel>
          <SubmitFormAction title="Send Tweet" onSubmit={submit} />
        </ActionPanel>
      }
    >
      <FormTextArea id="text" title="Text" placeholder="What's happening" />
    </Form>
  );
}
