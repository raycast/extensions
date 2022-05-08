import { Action, ActionPanel, Form, popToRoot, showToast, Toast } from "@raycast/api";
import { Tweet } from "../lib/twitter";
import { clientV2 } from "../lib/twitterapi_v2";
import { getErrorMessage } from "../lib/utils";

interface TweetFormValues {
  text: string;
}

async function submit(values: TweetFormValues, replyTweet?: Tweet | undefined) {
  try {
    const text = values.text;
    if (text.length <= 0) {
      throw Error("Please enter a text");
    }
    if (text.length > 280) {
      throw Error("Tweet text could not be longer than 280 characters");
    }
    if (replyTweet) {
      await clientV2.replyTweet(text, replyTweet);
      await showToast({
        style: Toast.Style.Success,
        title: "Tweet created",
        message: "Reply Tweet creation successful",
      });
    } else {
      await clientV2.sendTweet(text);
      await showToast({ style: Toast.Style.Success, title: "Tweet created", message: "Tweet creation successful" });
    }
    popToRoot();
  } catch (error) {
    await showToast({ style: Toast.Style.Failure, title: "Error", message: getErrorMessage(error) });
  }
}

export function TweetSendForm(props: { replyTweet?: Tweet | undefined }) {
  const rt = props.replyTweet;
  const submitText = rt ? "Send Reply" : "Send Tweet";
  const fromTitle = rt ? "Reply" : "Tweet";
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={submitText}
            icon={"twitter.png"}
            onSubmit={(values: TweetFormValues) => submit(values, rt)}
          />
        </ActionPanel>
      }
    >
      <Form.TextArea id="text" title={fromTitle} placeholder="What's happening?" />
    </Form>
  );
}
