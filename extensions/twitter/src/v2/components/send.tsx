import { Action, ActionPanel, Color, confirmAlert, Form, Icon, popToRoot, showToast, Toast, open } from "@raycast/api";
import { Fragment, ReactElement, useState } from "react";
import { Tweet } from "../lib/twitter";
import { clientV2 } from "../lib/twitterapi_v2";
import { getErrorMessage } from "../../utils";
import { hasRestrictedAccess } from "../../common";
import { XIcon } from "../../icon";

interface TweetFormValues {
  text: string;
}

async function submit(values: TweetFormValues, replyTweet: Tweet | undefined) {
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
    }
    popToRoot();
  } catch (error) {
    await showToast({ style: Toast.Style.Failure, title: "Error", message: getErrorMessage(error) });
  }
}

function TweetLengthCounter(props: { text: string }): ReactElement | null {
  const t = props.text;
  const isValid = validTweetText(t);
  return <Form.Description text={`${t.length}/280 ${isValid ? "✅" : "❌"}`} />;
}

export function TweetSendForm(props: { replyTweet: Tweet | undefined }) {
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
            <Action.SubmitForm
              title={submitText}
              onSubmit={(values: TweetFormValues) => submit(values, props.replyTweet)}
            />
          )}
        </ActionPanel>
      }
    >
      <Form.TextArea id="text" title={fromTitle} placeholder={placeholder} onChange={setText} />
      <TweetLengthCounter text={text} />
    </Form>
  );
}

interface TweetContent {
  text: string;
}

function TweetFragment(props: {
  content: TweetContent;
  index: number;
  onTextChange: (text: string, index: number) => void;
}): ReactElement {
  const index = props.index;
  const content = props.content;
  const placeholder = index === 0 ? "What's happening?" : "Another Tweet";
  return (
    <Fragment>
      <Form.TextArea
        id={`${index}`}
        title={`Tweet ${index > 0 ? index + 1 : ""}`}
        placeholder={placeholder}
        value={content.text}
        onChange={(newtext) => props.onTextChange(newtext, index)}
      />
      <TweetLengthCounter text={content.text} />
    </Fragment>
  );
}

function validTweetText(text: string): boolean {
  const l = text.length;
  if (l < 1 || l > 280) {
    return false;
  }
  return true;
}

function validTweet(content: TweetContent): boolean {
  return validTweetText(content.text);
}

function validTweets(tweets: TweetContent[]): boolean {
  if (tweets.length < 1) {
    return false;
  }
  for (const t of tweets) {
    if (!validTweet(t)) {
      return false;
    }
  }
  return true;
}

async function submitTweets(tweets: TweetContent[]) {
  try {
    if (!validTweets(tweets)) {
      await showToast({ style: Toast.Style.Failure, title: "Invalid Tweet", message: "Tweets are not valid" });
      return;
    }
    if (tweets.length === 1) {
      const t = tweets[0];
      if (hasRestrictedAccess()) {
        const url = new URL("https://twitter.com/intent/tweet");
        url.searchParams.append("text", t.text);
        open(url.href);
      } else {
        await clientV2.sendTweet(t.text);
        await showToast({ style: Toast.Style.Success, title: "Tweet created", message: "Tweet creation successful" });
      }
      popToRoot();
    } else {
      if (hasRestrictedAccess()) {
        throw new Error("This Operation requires a an OAuth client");
      }
      const tweetTexts: string[] = tweets.map((t) => t.text);
      await clientV2.sendThread(tweetTexts);
      await showToast({ style: Toast.Style.Success, title: "Thread created", message: "Thread creation successful" });
      popToRoot();
    }
  } catch (error) {
    await showToast({ style: Toast.Style.Failure, title: "Error", message: getErrorMessage(error) });
  }
}

export function TweetSendThreadFormV2({ defaultValue }: { defaultValue?: string }): ReactElement {
  const [tweets, setTweets] = useState<TweetContent[]>([{ text: defaultValue || "" }]);
  const addTweet = () => {
    const nt = [...tweets, { text: "" }];
    setTweets(nt);
  };
  const submitText = tweets && tweets.length > 1 ? "Send Thread" : "Send Tweet";
  const removeTweet = async () => {
    if (tweets.length > 1) {
      const lt = tweets[tweets.length - 1];
      let remove = true;
      if (lt.text.length > 0) {
        remove = await confirmAlert({
          title: "Really remove last Tweet?",
          message: "You last tweet contain content, it will get lost",
          icon: "⚠️",
        });
      }
      if (remove) {
        const nt = [...tweets];
        nt.pop();
        setTweets(nt);
      }
    }
  };
  const updateTweet = (text: string, index: number) => {
    const nt = [...tweets];
    nt[index].text = text;
    setTweets(nt);
  };
  const addTweetNumber = () => {
    const nt = [...tweets];
    for (let i = 0; i < nt.length; i++) {
      nt[i].text += ` ${i + 1}/${nt.length}`;
    }
    setTweets(nt);
  };
  return (
    <Form
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            {validTweets(tweets) && (
              <Action.SubmitForm title={submitText} icon={XIcon()} onSubmit={() => submitTweets(tweets)} />
            )}
          </ActionPanel.Section>
          {!hasRestrictedAccess() && (
            <ActionPanel.Section title="Thread">
              <Action
                title="Add Tweet"
                onAction={addTweet}
                icon={{ source: Icon.Plus, tintColor: Color.PrimaryText }}
                shortcut={{ modifiers: ["cmd"], key: "+" }}
              />
              {tweets.length > 1 && (
                <Action
                  title="Remove Last Tweet"
                  onAction={removeTweet}
                  icon={{ source: Icon.Trash, tintColor: Color.Red }}
                  shortcut={{ modifiers: ["cmd"], key: "-" }}
                />
              )}
              {tweets.length > 1 && (
                <Action
                  title="Add Tweet Numbers"
                  onAction={addTweetNumber}
                  icon={Icon.Document}
                  shortcut={{ modifiers: ["cmd"], key: "n" }}
                />
              )}
            </ActionPanel.Section>
          )}
        </ActionPanel>
      }
    >
      {tweets.map((t, index) => (
        <TweetFragment key={index} index={index} content={t} onTextChange={updateTweet} />
      ))}
    </Form>
  );
}
