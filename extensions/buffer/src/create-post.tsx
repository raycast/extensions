import {
  Action,
  ActionPanel,
  Detail,
  Form,
  Icon,
  Toast,
  showToast,
  useNavigation,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useState } from "react";
import { createPost, getAccount, getChannels } from "./utils/buffer-api";
import { serviceIcon, serviceName } from "./utils/helpers";

type PostMode = "queue" | "scheduled" | "draft";

interface FormValues {
  channelId: string;
  text: string;
  mode: PostMode;
  scheduledDate: Date | null;
  imageUrl: string;
  videoUrl: string;
  videoThumbnailUrl: string;
}

export default function CreatePost() {
  const { pop } = useNavigation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mode, setMode] = useState<PostMode>("queue");
  const [videoUrl, setVideoUrl] = useState("");

  const {
    data: account,
    isLoading: loadingAccount,
    error: accountError,
  } = usePromise(getAccount);
  const orgId = account?.organizations?.[0]?.id;

  const {
    data: channels,
    isLoading: loadingChannels,
    error: channelsError,
  } = usePromise(async (id?: string) => (id ? getChannels(id) : []), [orgId]);

  const error = accountError ?? channelsError;

  if (error) {
    return (
      <Detail
        markdown={`## ❌ Error\n\n${error.message}\n\nCheck your **Buffer Access Token** in Raycast preferences.`}
      />
    );
  }

  const activeChannels =
    channels?.filter(
      (channel) => !channel.isDisconnected && !channel.isLocked,
    ) ?? [];

  async function handleSubmit(values: FormValues) {
    if (!values.channelId) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Select a channel",
      });
      return;
    }

    if (!values.text.trim()) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Post text is required",
      });
      return;
    }

    if (values.imageUrl.trim() && values.videoUrl.trim()) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Use either an image URL or a video URL",
      });
      return;
    }

    if (mode === "scheduled" && !values.scheduledDate) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Choose a date and time for the scheduled post",
      });
      return;
    }

    setIsSubmitting(true);
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Sending to Buffer…",
    });

    try {
      const selectedChannel = activeChannels.find(
        (channel) => channel.id === values.channelId,
      );
      const post = await createPost({
        channelId: values.channelId,
        text: values.text.trim(),
        scheduledAt:
          mode === "scheduled"
            ? (values.scheduledDate ?? undefined)
            : undefined,
        service: selectedChannel?.service,
        saveToDraft: mode === "draft",
        imageUrl: values.imageUrl.trim() || undefined,
        videoUrl: values.videoUrl.trim() || undefined,
        videoThumbnailUrl: values.videoThumbnailUrl.trim() || undefined,
      });

      toast.style = Toast.Style.Success;
      toast.title =
        mode === "draft"
          ? "Draft created"
          : mode === "scheduled"
            ? "Post scheduled"
            : "Post added to queue";
      toast.message = `ID: ${post.id}`;
      pop();
    } catch (submissionError) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to create post";
      toast.message =
        submissionError instanceof Error
          ? submissionError.message
          : String(submissionError);
    } finally {
      setIsSubmitting(false);
    }
  }

  const isLoading = loadingAccount || loadingChannels;

  return (
    <Form
      isLoading={isLoading || isSubmitting}
      navigationTitle="Create Post"
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={
              mode === "draft"
                ? "Save Draft"
                : mode === "scheduled"
                  ? "Schedule Post"
                  : "Add to Queue"
            }
            icon={
              mode === "draft"
                ? Icon.Pencil
                : mode === "scheduled"
                  ? Icon.Calendar
                  : Icon.Plus
            }
            onSubmit={handleSubmit}
          />
          <Action.OpenInBrowser
            title="Open Buffer"
            url="https://publish.buffer.com"
            shortcut={{ modifiers: ["cmd"], key: "o" }}
          />
        </ActionPanel>
      }
    >
      <Form.Dropdown
        id="channelId"
        title="Channel"
        info="Select the social media channel where the post will live"
      >
        {activeChannels.map((channel) => (
          <Form.Dropdown.Item
            key={channel.id}
            value={channel.id}
            title={`${serviceIcon(channel.service)} ${channel.displayName || channel.name}`}
            keywords={[
              serviceName(channel.service),
              channel.name,
              channel.displayName ?? "",
            ]}
          />
        ))}
        {activeChannels.length === 0 && !isLoading && (
          <Form.Dropdown.Item
            value=""
            title="No active channels — connect one in Buffer"
          />
        )}
      </Form.Dropdown>

      <Form.TextArea
        id="text"
        title="Post Text"
        placeholder="What do you want to share?"
        enableMarkdown={false}
        info="Keep the post text exactly as you want Buffer to receive it."
      />

      <Form.Dropdown
        id="mode"
        title="Publish Mode"
        value={mode}
        onChange={(value) => setMode(value as PostMode)}
      >
        <Form.Dropdown.Item value="queue" title="Add to Queue" />
        <Form.Dropdown.Item value="scheduled" title="Schedule for Later" />
        <Form.Dropdown.Item value="draft" title="Save as Draft" />
      </Form.Dropdown>

      {mode === "scheduled" ? (
        <Form.DatePicker
          id="scheduledDate"
          title="Scheduled Date & Time"
          type={Form.DatePicker.Type.DateTime}
          min={new Date()}
        />
      ) : (
        <Form.Description
          title="Mode Details"
          text={
            mode === "draft"
              ? "Buffer will save this post as a draft and it will not publish until scheduled later."
              : "Buffer will place this post in the next available queue slot."
          }
        />
      )}

      <Form.Separator />

      <Form.TextField
        id="imageUrl"
        title="Image URL"
        placeholder="https://example.com/image.jpg"
        info="Optional. Use this for image posts."
      />

      <Form.TextField
        id="videoUrl"
        title="Video URL"
        placeholder="https://example.com/video.mp4"
        value={videoUrl}
        onChange={setVideoUrl}
        info="Optional. Use this for video posts. Leave Image URL empty if you use this."
      />

      {videoUrl.trim() && (
        <Form.TextField
          id="videoThumbnailUrl"
          title="Video Thumbnail URL"
          placeholder="https://example.com/thumb.jpg"
          info="Optional thumbnail for the video asset."
        />
      )}
    </Form>
  );
}
