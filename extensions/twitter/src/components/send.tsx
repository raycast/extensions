import { Action, ActionPanel, Form, popToRoot, showToast, Toast } from "@raycast/api";
import { ReactElement, useState } from "react";
import { TweetV1 } from "twitter-api-v2";
import { twitterClient } from "../twitterapi";
import { getErrorMessage } from "../utils";

interface TweetFormValues {
  text: string;
}

async function submit(values: TweetFormValues, replyTweet?: TweetV1 | undefined) {
  try {
    const text = values.text;
    if (text.length <= 0) {
      throw Error("Please enter a text");
    }
    if (text.length > 280) {
      throw Error("Tweet text could not be longer than 280 characters");
    }
    if (replyTweet) {
      await twitterClient.v1.reply(text, replyTweet.id_str);
      await showToast({
        style: Toast.Style.Success,
        title: "Tweet created",
        message: "Reply Tweet creation successful",
      });
    } else {
      await twitterClient.v1.tweet(text);
      await showToast({ style: Toast.Style.Success, title: "Tweet created", message: "Tweet creation successful" });
    }
    popToRoot();
  } catch (error) {
    await showToast({ style: Toast.Style.Failure, title: "Error", message: getErrorMessage(error) });
  }
}

function TweetLengthCounter(props: { text: string }): ReactElement | null {
  return <Form.Description text={`${props.text.length}/280`} />;
}

export function TweetSendForm(props: { replyTweet?: TweetV1 | undefined }) {
  const rt = props.replyTweet;
  const submitText = rt ? "Send Reply" : "Send Tweet";
  const fromTitle = rt ? "Reply" : "Tweet";
  const placeholder = rt ? "Tweet your reply" : "What's happening?";
  const [text, setText] = useState<string>("");
  return (
    <Form
      actions={
        <ActionPanel>
          {text.length > 0 && text.length <= 280 && (
            <Action.SubmitForm title={submitText} onSubmit={(values: TweetFormValues) => submit(values, rt)} />
          )}
        </ActionPanel>
      }
    >
      <TweetLengthCounter text={text} />
      <Form.TextArea id="text" title={fromTitle} placeholder={placeholder} onChange={setText} />
    </Form>
  );
}
