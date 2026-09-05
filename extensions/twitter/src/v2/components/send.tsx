import {
  Action,
  ActionPanel,
  Color,
  confirmAlert,
  Form,
  Icon,
  Keyboard,
  popToRoot,
  showToast,
  Toast,
} from "@raycast/api";
import { Fragment, ReactElement, useEffect, useState } from "react";
import { Tweet } from "../lib/twitter";
import { clientV2, CreatePostInput, ReplySettings } from "../lib/twitterapi_v2";
import { clearThreadDraft, loadThreadDraft, saveThreadDraft, TweetDraftContent } from "../lib/drafts";
import { parsePollDurationMinutes, POLL_DURATION_PRESETS, PollDurationPreset } from "../lib/poll_duration";
import { getErrorMessage } from "../../utils";
import { XIcon } from "../../icon";

interface TweetFormValues {
  text: string;
  media: string[];
  replySettings: ReplySettings;
}

async function submit(values: TweetFormValues, replyTweet: Tweet | undefined) {
  try {
    const text = values.text.trim();
    if (text.length <= 0 && values.media.length === 0) throw Error("Please enter text or attach media");
    if (text.length > 280) {
      throw Error("Post text cannot be longer than 280 characters");
    }
    if (replyTweet) {
      await clientV2.createPost({
        text,
        mediaPaths: values.media,
        replySettings: values.replySettings,
        replyToPostId: replyTweet.id,
      });
      await showToast({
        style: Toast.Style.Success,
        title: "Reply posted",
        message: "Reply published successfully",
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
  const submitText = rt ? "Send Reply" : "Send Post";
  const fromTitle = rt ? "Reply" : "Post";
  const placeholder = rt ? "Write your reply" : "What's happening?";
  const [text, setText] = useState<string>("");
  const [replySettings, setReplySettings] = useState<ReplySettings>("everyone");
  return (
    <Form
      actions={
        <ActionPanel>
          {text.length <= 280 && (
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
      <Form.FilePicker
        id="media"
        title="Media"
        allowMultipleSelection
        canChooseDirectories={false}
        info="Attach up to four images, one GIF, or one video."
      />
      <ReplySettingsDropdown value={replySettings} onChange={setReplySettings} />
    </Form>
  );
}

function TweetFragment(props: {
  content: TweetDraftContent;
  index: number;
  onTextChange: (text: string, index: number) => void;
  onMediaChange: (paths: string[], index: number) => void;
}): ReactElement {
  const index = props.index;
  const content = props.content;
  const placeholder = index === 0 ? "What's happening?" : "Another post";
  return (
    <Fragment>
      <Form.TextArea
        id={`${index}`}
        title={`Post ${index > 0 ? index + 1 : ""}`}
        placeholder={placeholder}
        value={content.text}
        onChange={(newtext) => props.onTextChange(newtext, index)}
      />
      <TweetLengthCounter text={content.text} />
      <Form.FilePicker
        id={`media-${index}`}
        title={`Media ${index > 0 ? index + 1 : ""}`}
        value={content.mediaPaths ?? []}
        allowMultipleSelection
        canChooseDirectories={false}
        onChange={(paths) => props.onMediaChange(paths, index)}
        info="Up to four images, one GIF, or one video."
      />
    </Fragment>
  );
}

function ReplySettingsDropdown(props: { value: ReplySettings; onChange: (value: ReplySettings) => void }) {
  return (
    <Form.Dropdown
      id="replySettings"
      title="Who Can Reply"
      value={props.value}
      onChange={(value) => props.onChange(value as ReplySettings)}
    >
      <Form.Dropdown.Item value="everyone" title="Everyone" />
      <Form.Dropdown.Item value="following" title="People You Follow" />
      <Form.Dropdown.Item value="mentionedUsers" title="Only People You Mention" />
    </Form.Dropdown>
  );
}

function validTweetText(text: string): boolean {
  const l = text.trim().length;
  if (l < 1 || l > 280) {
    return false;
  }
  return true;
}

function validTweet(content: TweetDraftContent): boolean {
  return (
    (validTweetText(content.text) || (content.text.trim().length === 0 && Boolean(content.mediaPaths?.length))) &&
    (content.mediaPaths?.length ?? 0) <= 4
  );
}

function validTweets(tweets: TweetDraftContent[]): boolean {
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

interface ComposeOptions {
  replySettings: ReplySettings;
  quotePostId: string;
  includePoll: boolean;
  pollOptions: string[];
  pollDurationMinutes: number;
}

async function submitTweets(tweets: TweetDraftContent[], options: ComposeOptions) {
  try {
    if (!validTweets(tweets)) {
      await showToast({ style: Toast.Style.Failure, title: "Invalid Post", message: "Posts are not valid" });
      return;
    }
    const poll = options.includePoll
      ? {
          options: options.pollOptions,
          durationMinutes: options.pollDurationMinutes,
        }
      : undefined;
    const posts: CreatePostInput[] = tweets.map((tweet, index) => ({
      text: tweet.text,
      mediaPaths: tweet.mediaPaths,
      quotePostId: index === 0 ? options.quotePostId : undefined,
      poll: index === 0 ? poll : undefined,
      replySettings: options.replySettings,
    }));
    const progressToast = await showToast({
      style: Toast.Style.Animated,
      title: tweets.length === 1 ? "Publishing post..." : "Publishing thread...",
      message: tweets.some((tweet) => tweet.mediaPaths?.length) ? "Uploading media to X" : undefined,
    });
    if (tweets.length === 1) {
      await clientV2.createPost(posts[0]);
      await clearThreadDraft().catch((error) => console.error("Could not clear sent X post draft", error));
      progressToast.style = Toast.Style.Success;
      progressToast.title = "Post published";
      progressToast.message = undefined;
      popToRoot();
    } else {
      await clientV2.createThread(posts);
      await clearThreadDraft().catch((error) => console.error("Could not clear sent X thread draft", error));
      progressToast.style = Toast.Style.Success;
      progressToast.title = "Thread published";
      progressToast.message = undefined;
      popToRoot();
    }
  } catch (error) {
    await showToast({ style: Toast.Style.Failure, title: "Error", message: getErrorMessage(error) });
  }
}

export function TweetSendThreadFormV2({
  defaultValue,
  quotePostId: initialQuotePostId,
}: {
  defaultValue?: string;
  quotePostId?: string;
}): ReactElement {
  const [tweets, setTweets] = useState<TweetDraftContent[]>([{ text: defaultValue || "" }]);
  const [isDraftLoaded, setIsDraftLoaded] = useState(false);
  const [replySettings, setReplySettings] = useState<ReplySettings>("everyone");
  const [quotePostId, setQuotePostId] = useState(initialQuotePostId ?? "");
  const [includePoll, setIncludePoll] = useState(false);
  const [pollOptions, setPollOptions] = useState(["", "", "", ""]);
  const [pollDurationPreset, setPollDurationPreset] = useState<PollDurationPreset>("1440");
  const [customPollDurationMinutes, setCustomPollDurationMinutes] = useState("60");
  const pollDurationMinutes = parsePollDurationMinutes(pollDurationPreset, customPollDurationMinutes);

  useEffect(() => {
    let canceled = false;
    async function loadDraft() {
      if (!defaultValue) {
        const draft = await loadThreadDraft();
        if (!canceled && draft) setTweets(draft);
      }
      if (!canceled) setIsDraftLoaded(true);
    }
    loadDraft();
    return () => {
      canceled = true;
    };
  }, [defaultValue]);

  useEffect(() => {
    if (!isDraftLoaded) return;
    saveThreadDraft(tweets).catch((error) => console.error("Could not save X post draft", error));
  }, [isDraftLoaded, tweets]);

  const addTweet = () => {
    const nt = [...tweets, { text: "" }];
    setTweets(nt);
  };
  const submitText = tweets && tweets.length > 1 ? "Send Thread" : "Send Post";
  const removeTweet = async () => {
    if (tweets.length > 1) {
      const lt = tweets[tweets.length - 1];
      let remove = true;
      if (lt.text.length > 0) {
        remove = await confirmAlert({
          title: "Really remove the last post?",
          message: "The last post contains content, which will be lost.",
          icon: Icon.Warning,
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
    setTweets((currentTweets) =>
      currentTweets.map((tweet, currentIndex) => (currentIndex === index ? { text } : tweet)),
    );
  };
  const updateMedia = (mediaPaths: string[], index: number) => {
    setTweets((currentTweets) =>
      currentTweets.map((tweet, currentIndex) => (currentIndex === index ? { ...tweet, mediaPaths } : tweet)),
    );
  };
  const updatePollOption = (value: string, index: number) => {
    setPollOptions((currentOptions) =>
      currentOptions.map((option, currentIndex) => (currentIndex === index ? value : option)),
    );
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
            {validTweets(tweets) && (!includePoll || pollDurationMinutes !== undefined) && (
              <Action.SubmitForm
                title={submitText}
                icon={XIcon()}
                onSubmit={() =>
                  submitTweets(tweets, {
                    replySettings,
                    quotePostId,
                    includePoll,
                    pollOptions,
                    pollDurationMinutes: pollDurationMinutes ?? 1440,
                  })
                }
              />
            )}
          </ActionPanel.Section>
          <ActionPanel.Section title="Thread">
            <Action
              title="Add Post"
              onAction={addTweet}
              icon={{ source: Icon.Plus, tintColor: Color.PrimaryText }}
              shortcut={Keyboard.Shortcut.Common.New}
            />
            {tweets.length > 1 && (
              <Action
                title="Remove Last Post"
                onAction={removeTweet}
                icon={{ source: Icon.Trash, tintColor: Color.Red }}
                shortcut={Keyboard.Shortcut.Common.Remove}
              />
            )}
            {tweets.length > 1 && (
              <Action
                title="Add Post Numbers"
                onAction={addTweetNumber}
                icon={Icon.Document}
                shortcut={{
                  macOS: { modifiers: ["cmd", "shift"], key: "n" },
                  Windows: { modifiers: ["ctrl", "shift"], key: "n" },
                }}
              />
            )}
          </ActionPanel.Section>
        </ActionPanel>
      }
    >
      {tweets.map((t, index) => (
        <TweetFragment key={index} index={index} content={t} onTextChange={updateTweet} onMediaChange={updateMedia} />
      ))}
      <Form.Separator />
      <ReplySettingsDropdown value={replySettings} onChange={setReplySettings} />
      <Form.TextField
        id="quotePostId"
        title="Quote Post ID"
        placeholder="Optional numeric post ID"
        value={quotePostId}
        onChange={setQuotePostId}
        info="Quote posting requires X Enterprise API access."
      />
      <Form.Checkbox id="includePoll" title="Poll" label="Add a Poll" value={includePoll} onChange={setIncludePoll} />
      {includePoll && (
        <Fragment>
          {pollOptions.map((option, index) => (
            <Form.TextField
              key={index}
              id={`poll-option-${index}`}
              title={`Poll Option ${index + 1}`}
              placeholder={index < 2 ? "Required" : "Optional"}
              value={option}
              onChange={(value) => updatePollOption(value, index)}
            />
          ))}
          <Form.Dropdown
            id="pollDurationPreset"
            title="Poll Duration"
            value={pollDurationPreset}
            onChange={(value) => setPollDurationPreset(value as PollDurationPreset)}
            info="Choose a common duration or enter a custom number of minutes."
          >
            {POLL_DURATION_PRESETS.map((preset) => (
              <Form.Dropdown.Item key={preset.value} value={preset.value} title={preset.title} />
            ))}
            <Form.Dropdown.Item value="custom" title="Custom…" />
          </Form.Dropdown>
          {pollDurationPreset === "custom" && (
            <Form.TextField
              id="customPollDurationMinutes"
              title="Custom Duration"
              placeholder="Minutes"
              value={customPollDurationMinutes}
              onChange={setCustomPollDurationMinutes}
              error={pollDurationMinutes === undefined ? "Enter a whole number from 5 to 10,080." : undefined}
              info="Polls can run from 5 minutes to 7 days."
            />
          )}
        </Fragment>
      )}
    </Form>
  );
}
