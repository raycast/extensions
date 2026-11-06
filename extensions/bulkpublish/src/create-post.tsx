import {
  Action,
  ActionPanel,
  Form,
  Icon,
  open,
  openExtensionPreferences,
  popToRoot,
  showToast,
  Toast,
  Keyboard,
} from "@raycast/api";
import { useForm } from "@raycast/utils";
import { basename } from "node:path";
import { useMemo, useState } from "react";
import { ApiError, nextQueueSlot, SendMode, sendPost } from "./lib/api";
import {
  API_KEYS_URL,
  APP_URL,
  countsFor,
  MediaKind,
  mediaKindOf,
  mimeFromName,
  planTargets,
  platformLabel,
  postEditUrl,
} from "./lib/core";
import { useChannels } from "./lib/hooks";
import { channelIcon, channelTitle, formatDateTime, localTimeZone } from "./lib/ui";

interface Values {
  content: string;
  channelIds: string[];
  mode: SendMode;
  scheduledAt: Date | null;
  files: string[];
}

const MODES: { value: SendMode; title: string; icon: Icon }[] = [
  { value: "now", title: "Publish Now", icon: Icon.Upload },
  { value: "queue", title: "Add to Queue", icon: Icon.Calendar },
  { value: "schedule", title: "Schedule for Later", icon: Icon.Clock },
  { value: "draft", title: "Save as Draft", icon: Icon.Document },
];

const SUBMIT_TITLE: Record<SendMode, string> = {
  now: "Publish Now",
  queue: "Add to Queue",
  schedule: "Schedule Post",
  draft: "Save Draft",
};

export default function Command() {
  return <CreatePostForm />;
}

function mediaKindOfFiles(files: string[]): MediaKind {
  const kinds = files.map((f) => mediaKindOf(mimeFromName(basename(f))));
  if (kinds.includes("video")) return "video";
  if (kinds.includes("image")) return "image";
  return null;
}

export function CreatePostForm({ initialChannelIds = [] }: { initialChannelIds?: number[] }) {
  const { channels, isLoading, error } = useChannels();
  const [sending, setSending] = useState(false);

  const { handleSubmit, itemProps, values, reset } = useForm<Values>({
    initialValues: {
      content: "",
      channelIds: initialChannelIds.map(String),
      mode: "queue",
      scheduledAt: null,
      files: [],
    },
    validation: {
      content: (v) => {
        if (!v?.trim() && !values.files?.length) return "Write something or attach a file";
      },
      channelIds: (v) => {
        if (!v?.length) return "Choose at least one channel";
      },
      scheduledAt: (v) => {
        if (values.mode !== "schedule") return;
        if (!v) return "Pick a date and time";
        if (v.getTime() <= Date.now()) return "Pick a time in the future";
      },
      files: (v) => {
        const bad = (v ?? []).find((f) => !mediaKindOf(mimeFromName(basename(f))));
        if (bad) return `${basename(bad)} isn't an image or video`;
        const kinds = new Set((v ?? []).map((f) => mediaKindOf(mimeFromName(basename(f)))));
        if (kinds.size > 1) return "Attach images or one video, not both";
        if (kinds.has("video") && (v ?? []).length > 1) return "Attach one video at a time";
      },
    },
    async onSubmit(v) {
      const ids = v.channelIds.map(Number);
      const media = mediaKindOfFiles(v.files);
      const { targets, skipped } = planTargets(channels, ids, media);
      if (!targets.length) {
        await showToast({
          style: Toast.Style.Failure,
          title: "None of the chosen channels can take this post",
          message: skipped.map((s) => `${s.channel.name} ${s.reason}`).join(". "),
        });
        return;
      }
      const over = countsFor(
        v.content,
        targets.map((t) => t.platform),
      ).filter((c) => c.over);
      if (over.length) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Post is too long",
          message: over.map((c) => `${platformLabel(c.platform)}: ${c.length}/${c.limit}`).join(", "),
        });
        return;
      }

      const toast = await showToast({ style: Toast.Style.Animated, title: "Sending to BulkPublish…" });
      setSending(true);
      try {
        const timezone = localTimeZone();
        let schedule: { scheduledAt: string; timezone: string } | undefined;
        if (v.mode === "queue") {
          toast.title = "Finding your next queue slot…";
          schedule = { scheduledAt: await nextQueueSlot(timezone), timezone };
        } else if (v.mode === "schedule" && v.scheduledAt) {
          schedule = { scheduledAt: v.scheduledAt.toISOString(), timezone };
        }
        const id = await sendPost(
          { content: v.content, targets, files: v.files, media, mode: v.mode, schedule },
          (step) => (toast.title = step),
        );
        const where = targets.map((t) => t.name).join(", ");
        toast.style = Toast.Style.Success;
        toast.title =
          v.mode === "now"
            ? "Publishing started"
            : v.mode === "draft"
              ? "Draft saved"
              : `Scheduled for ${formatDateTime(schedule!.scheduledAt)}`;
        toast.message = skipped.length
          ? `${where}. Skipped ${skipped.map((s) => `${s.channel.name} (${s.reason})`).join(", ")}.`
          : where;
        toast.primaryAction = {
          title: "Open in BulkPublish",
          shortcut: { modifiers: ["cmd", "shift"], key: "o" },
          onAction: () => open(postEditUrl(id)),
        };
        reset({ content: "", channelIds: v.channelIds, mode: v.mode, scheduledAt: null, files: [] });
        if (v.mode !== "draft") await popToRoot({ clearSearchBar: true });
      } catch (e) {
        toast.style = Toast.Style.Failure;
        toast.title = "Couldn't send post";
        toast.message = (e as Error).message;
        if (e instanceof ApiError && e.status === 401) {
          toast.primaryAction = { title: "Open Extension Preferences", onAction: () => openExtensionPreferences() };
        }
      } finally {
        setSending(false);
      }
    },
  });

  const chosen = useMemo(() => {
    const ids = new Set(values.channelIds.map(Number));
    return channels.filter((c) => ids.has(c.id));
  }, [channels, values.channelIds]);

  const counts = countsFor(
    values.content ?? "",
    chosen.map((c) => c.platform),
  );
  const { skipped } = planTargets(
    chosen,
    chosen.map((c) => c.id),
    mediaKindOfFiles(values.files ?? []),
  );
  const usable = channels.filter((c) => c.usable);
  const unusable = channels.filter((c) => !c.usable);

  const counter = counts
    .map((c) => `${platformLabel(c.platform)} ${c.length}/${c.limit}${c.over ? " ⚠️" : ""}`)
    .join("   ");

  return (
    <Form
      isLoading={isLoading || sending}
      navigationTitle="Create Post"
      actions={
        <ActionPanel>
          <Action.SubmitForm title={SUBMIT_TITLE[values.mode]} icon={Icon.Upload} onSubmit={handleSubmit} />
          <Action.OpenInBrowser
            title="Open Composer in BulkPublish"
            url={`${APP_URL}/compose`}
            shortcut={Keyboard.Shortcut.Common.Open}
          />
          <Action.OpenInBrowser title="Connect More Channels" icon={Icon.Link} url={`${APP_URL}/channels`} />
          <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
        </ActionPanel>
      }
    >
      {error && (
        <Form.Description
          title="Couldn't load channels"
          text={
            error instanceof ApiError && error.status === 401
              ? `Your API key wasn't accepted. Create one at ${API_KEYS_URL} and add it in the extension preferences (⌘E).`
              : error.message
          }
        />
      )}
      <Form.TextArea
        {...itemProps.content}
        title="Post"
        placeholder="What do you want to share?"
        enableMarkdown={false}
        info="Sent as plain text to every channel you choose."
      />
      {counter && <Form.Description title="Length" text={counter} />}
      <Form.TagPicker {...itemProps.channelIds} title="Channels" placeholder="Choose where to post">
        {usable.map((c) => (
          <Form.TagPicker.Item key={c.id} value={String(c.id)} title={channelTitle(c)} icon={channelIcon(c)} />
        ))}
      </Form.TagPicker>
      {unusable.length > 0 && (
        <Form.Description
          text={`Not available: ${unusable.map((c) => `${c.name} (${c.problem?.toLowerCase()})`).join(", ")}.`}
        />
      )}
      {skipped.length > 0 && (
        <Form.Description
          title="Heads Up"
          text={skipped.map((s) => `${s.channel.name} ${s.reason} and will be skipped.`).join("\n")}
        />
      )}
      <Form.FilePicker
        {...itemProps.files}
        title="Media"
        allowMultipleSelection
        canChooseDirectories={false}
        info="Optional. Images (PNG, JPEG, GIF, WebP) or one video (MP4, MOV, WebM), up to 100 MB each."
      />
      <Form.Separator />
      <Form.Dropdown
        id="mode"
        title="When"
        value={values.mode}
        onChange={(v) => itemProps.mode.onChange?.(v as SendMode)}
        info="Add to Queue uses the next free time from your BulkPublish queue."
      >
        {MODES.map((m) => (
          <Form.Dropdown.Item key={m.value} value={m.value} title={m.title} icon={m.icon} />
        ))}
      </Form.Dropdown>
      {values.mode === "schedule" && (
        <Form.DatePicker
          {...itemProps.scheduledAt}
          title="Date and Time"
          type={Form.DatePicker.Type.DateTime}
          min={new Date()}
          info={`Your time zone: ${localTimeZone()}`}
        />
      )}
    </Form>
  );
}
