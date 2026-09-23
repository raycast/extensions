import { postLength, validatePostLength } from "../lib/post_text";
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
import { Fragment, ReactElement, useEffect, useRef, useState } from "react";
import { Tweet } from "../lib/twitter";
import { clientV2, CreatedPost, CreatePostInput, postInputError, ReplySettings } from "../lib/twitterapi_v2";
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
    validatePostLength(text);
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
  return <Form.Description text={`${postLength(t)}/280 ${isValid ? "✅" : "❌"}`} />;
}

export function TweetSendForm(props: { replyTweet: Tweet | undefined }) {
  const rt = props.replyTweet;
  const submitText = rt ? "Send Reply" : "Send Post";
  const fromTitle = rt ? "Reply" : "Post";
  const placeholder = rt ? "Write your reply" : "What's happening?";
  const [text, setText] = useState<string>("");
  const [media, setMedia] = useState<string[]>([]);
  const error = postInputError({ text, mediaPaths: media });
  const [replySettings, setReplySettings] = useState<ReplySettings>("everyone");
  return (
    <Form
      actions={
        <ActionPanel>
          {!error && (
            <Action.SubmitForm
              title={submitText}
              onSubmit={(values: TweetFormValues) => submit(values, props.replyTweet)}
            />
          )}
        </ActionPanel>
      }
    >
      <Form.TextArea id="text" title={fromTitle} placeholder={placeholder} onChange={setText} error={error} />
      <TweetLengthCounter text={text} />
      <Form.FilePicker
        id="media"
        title="Media"
        value={media}
        onChange={setMedia}
        error={error}
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
  error?: string;
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
        error={props.error}
        value={content.text}
        onChange={(newtext) => props.onTextChange(newtext, index)}
      />
      <TweetLengthCounter text={content.text} />
      <Form.FilePicker
        id={`media-${index}`}
        title={`Media ${index > 0 ? index + 1 : ""}`}
        error={props.error}
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
  return text.trim().length > 0 && postLength(text) <= 280;
}

interface ComposeOptions {
  replySettings: ReplySettings;
  quotePostId: string;
  includePoll: boolean;
  pollOptions: string[];
  pollDurationMinutes: number;
}

function composePosts(tweets: TweetDraftContent[], options: ComposeOptions): CreatePostInput[] {
  return tweets.map((tweet, index) => ({
    text: tweet.text,
    mediaPaths: tweet.mediaPaths,
    replyToPostId: tweet.replyToPostId,
    quotePostId: index === 0 ? options.quotePostId : undefined,
    poll:
      index === 0 && options.includePoll
        ? { options: options.pollOptions, durationMinutes: options.pollDurationMinutes }
        : undefined,
    replySettings: options.replySettings,
  }));
}

async function submitTweets(posts: CreatePostInput[], onProgress: (created: CreatedPost[]) => Promise<void>) {
  try {
    const progressToast = await showToast({
      style: Toast.Style.Animated,
      title: posts.length === 1 ? "Publishing post..." : "Publishing thread...",
    });
    await clientV2.createThread(posts, onProgress);
    await clearThreadDraft().catch((error) => console.error("Could not clear sent X thread draft", error));
    progressToast.style = Toast.Style.Success;
    progressToast.title = posts.length === 1 ? "Post published" : "Thread published";
    progressToast.message = undefined;
    popToRoot();
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submitting = useRef(false);
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
      if (!defaultValue && !initialQuotePostId) {
        const draft = await loadThreadDraft();
        if (!canceled && draft) {
          setTweets(draft.tweets);
          if (draft.settings) {
            setReplySettings(draft.settings.replySettings);
            setQuotePostId(draft.settings.quotePostId);
            setIncludePoll(draft.settings.includePoll);
            setPollOptions(draft.settings.pollOptions);
            setPollDurationPreset(draft.settings.pollDurationPreset as PollDurationPreset);
            setCustomPollDurationMinutes(draft.settings.customPollDurationMinutes);
          }
        }
      }
      if (!canceled) setIsDraftLoaded(true);
    }
    loadDraft();
    return () => {
      canceled = true;
    };
  }, [defaultValue, initialQuotePostId]);

  useEffect(() => {
    if (!isDraftLoaded || submitting.current) return;
    saveThreadDraft(tweets, {
      replySettings,
      quotePostId,
      includePoll,
      pollOptions,
      pollDurationPreset,
      customPollDurationMinutes,
    }).catch((error) => console.error("Could not save X post draft", error));
  }, [
    isDraftLoaded,
    tweets,
    replySettings,
    quotePostId,
    includePoll,
    pollOptions,
    pollDurationPreset,
    customPollDurationMinutes,
  ]);

  const posts = composePosts(tweets, {
    replySettings,
    quotePostId,
    includePoll,
    pollOptions,
    pollDurationMinutes: pollDurationMinutes ?? NaN,
  });
  const errors = posts.map(postInputError);
  const publish = async () => {
    if (submitting.current || errors.some(Boolean) || !isDraftLoaded || !tweets.length) return;
    submitting.current = true;
    setIsSubmitting(true);
    try {
      await submitTweets(posts, async (created) => {
        const remaining = tweets.slice(created.length);
        if (remaining.length) remaining[0] = { ...remaining[0], replyToPostId: created.at(-1)!.id };
        // Update memory before persistence so even a storage failure cannot replay the prefix.
        setTweets(remaining);
        setQuotePostId("");
        setIncludePoll(false);
        await saveThreadDraft(remaining, {
          replySettings,
          quotePostId: "",
          includePoll: false,
          pollOptions,
          pollDurationPreset,
          customPollDurationMinutes,
        });
      });
    } finally {
      submitting.current = false;
      setIsSubmitting(false);
    }
  };
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
      currentTweets.map((tweet, currentIndex) => (currentIndex === index ? { ...tweet, text } : tweet)),
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
      isLoading={isSubmitting}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            {isDraftLoaded && !isSubmitting && tweets.length > 0 && !errors.some(Boolean) && (
              <Action.SubmitForm title={submitText} icon={XIcon()} onSubmit={publish} />
            )}
          </ActionPanel.Section>
          {!isSubmitting && (
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
          )}
        </ActionPanel>
      }
    >
      {isSubmitting ? (
        <Form.Description text="Publishing and saving thread progress…" />
      ) : (
        <Fragment>
          {tweets[0]?.replyToPostId && (
            <Form.Description
              text={`Continuing after published post ${tweets[0].replyToPostId}. Only the remaining posts will be sent.`}
            />
          )}
          {tweets.map((t, index) => (
            <TweetFragment
              key={index}
              index={index}
              error={errors[index]}
              content={t}
              onTextChange={updateTweet}
              onMediaChange={updateMedia}
            />
          ))}
          <Form.Separator />
          <ReplySettingsDropdown value={replySettings} onChange={setReplySettings} />
          <Form.TextField
            id="quotePostId"
            title="Quote Post ID"
            placeholder="Optional numeric post ID"
            error={quotePostId ? errors[0] : undefined}
            value={quotePostId}
            onChange={setQuotePostId}
            info="Quote posting requires X Enterprise API access."
          />
          <Form.Checkbox
            error={includePoll ? errors[0] : undefined}
            id="includePoll"
            title="Poll"
            label="Add a Poll"
            value={includePoll}
            onChange={setIncludePoll}
          />
          {includePoll && (
            <Fragment>
              {pollOptions.map((option, index) => (
                <Form.TextField
                  key={index}
                  id={`poll-option-${index}`}
                  title={`Poll Option ${index + 1}`}
                  placeholder={index < 2 ? "Required" : "Optional"}
                  error={errors[0]}
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
        </Fragment>
      )}
    </Form>
  );
}
