import { ActionPanel, Form, FormTextArea, popToRoot, showToast, SubmitFormAction, ToastStyle } from "@raycast/api";
import { TweetV1 } from "twitter-api-v2";
import { twitterClient } from "../twitterapi";

interface TweetFormValues {
  text: string;
}

async function submit(values: TweetFormValues, replyTweet?: TweetV1 | undefined) {
  try {
    const text = values.text;
    if (text.length < 0) {
      throw Error("Please enter a text");
    }
    if (text.length > 280) {
      throw Error("Tweet text could not be longer than 280 characters");
    }
    console.log(text);
    if (replyTweet) {
      twitterClient.v1.reply(text, replyTweet.id_str);
      await showToast(ToastStyle.Success, "Tweet created", "Reply Tweet creation successful");
    } else {
      await twitterClient.v1.tweet(text);
      await showToast(ToastStyle.Success, "Tweet created", "Tweet creation successful");
    }
    popToRoot();
  } catch (error: any) {
    await showToast(ToastStyle.Failure, "Error", error.message);
  }
}

export function TweetSendForm(props: { replyTweet?: TweetV1 | undefined }) {
  const rt = props.replyTweet;
  return (
    <Form
      onSubmit={submit}
      actions={
        <ActionPanel>
          <SubmitFormAction title="Send Tweet" onSubmit={(values: TweetFormValues) => submit(values, rt)} />
        </ActionPanel>
      }
    >
      <FormTextArea id="text" title="Text" placeholder="What's happening?" />
    </Form>
  );
}
