import { Action, ActionPanel, Detail, Form, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { useForm, usePromise } from "@raycast/utils";
import { useMemo, useState } from "react";
import { client, prefs } from "./lib/client";
import {
  errorMessage,
  networkName,
  NETWORKS,
  profiles,
  publish,
  results,
  summary,
  type PostDraft,
} from "./lib/reelspan";

type Values = {
  profile: string;
  type: string;
  platforms: string[];
  text: string;
  files: string[];
  urls: string;
  scheduledDate: Date | null;
  firstComment: string;
  addToQueue: boolean;
};

function Result({ answer }: { answer: Record<string, unknown> }) {
  const rows = results(answer);
  const md = [
    `## ${summary(answer)}`,
    "",
    ...rows.map(
      (r) =>
        `- ${r.ok ? "✅" : r.ok === false ? "❌" : "⏳"} **${networkName(r.platform)}** ${r.url ? `[open](${r.url})` : (r.error ?? "")}`,
    ),
    "",
    answer.request_id ? `Request ID: \`${answer.request_id}\`` : answer.job_id ? `Job ID: \`${answer.job_id}\`` : "",
  ].join("\n");
  return (
    <Detail
      markdown={md}
      actions={
        <ActionPanel>
          {rows
            .filter((r) => r.url)
            .map((r) => (
              <Action.OpenInBrowser key={r.platform} title={`Open on ${networkName(r.platform)}`} url={r.url!} />
            ))}
          {typeof answer.request_id === "string" && (
            <Action.CopyToClipboard title="Copy Request ID" content={answer.request_id} />
          )}
        </ActionPanel>
      }
    />
  );
}

export default function Command() {
  const { push } = useNavigation();
  const { data: list, isLoading } = usePromise(() => profiles(client()), [], {
    onError: (e) =>
      void showToast({ style: Toast.Style.Failure, title: "Could not load profiles", message: errorMessage(e) }),
  });
  const [profile, setProfile] = useState<string>(prefs().defaultProfile ?? "");
  const connected = useMemo(() => list?.find((p) => p.username === profile)?.networks ?? [], [list, profile]);

  const { handleSubmit, itemProps, values } = useForm<Values>({
    initialValues: { type: "text", platforms: [], addToQueue: false },
    validation: {
      platforms: (v) => (!v?.length ? "Choose at least one network" : undefined),
    },
    async onSubmit(v) {
      const draft: PostDraft = {
        profile,
        type: v.type as PostDraft["type"],
        platforms: v.platforms,
        text: v.text,
        media: [...(v.files ?? []), ...v.urls.split(/[\s,]+/).filter(Boolean)],
        scheduledDate: v.scheduledDate,
        firstComment: v.firstComment,
        addToQueue: v.addToQueue,
      };
      const toast = await showToast({
        style: Toast.Style.Animated,
        title: v.scheduledDate ? "Scheduling…" : "Posting…",
      });
      try {
        const answer = await publish(client(), draft);
        const failed = results(answer).some((r) => r.ok === false);
        toast.style = failed ? Toast.Style.Failure : Toast.Style.Success;
        toast.title = summary(answer);
        push(<Result answer={answer} />);
      } catch (e) {
        toast.style = Toast.Style.Failure;
        toast.title = "Not posted";
        toast.message = errorMessage(e);
      }
    },
  });

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={values.scheduledDate ? "Schedule Post" : "Publish"}
            icon={Icon.Upload}
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.Dropdown id="profile" title="Profile" value={profile} onChange={setProfile}>
        {(list ?? []).map((p) => (
          <Form.Dropdown.Item
            key={p.username}
            value={p.username}
            title={p.name ?? p.username}
            keywords={[p.username]}
          />
        ))}
      </Form.Dropdown>
      <Form.Dropdown title="Type" {...itemProps.type}>
        <Form.Dropdown.Item value="text" title="Text" icon={Icon.Text} />
        <Form.Dropdown.Item value="video" title="Video" icon={Icon.Video} />
        <Form.Dropdown.Item value="photos" title="Photos" icon={Icon.Image} />
      </Form.Dropdown>
      <Form.TagPicker title="Networks" {...itemProps.platforms}>
        {NETWORKS.filter((n) => !connected.length || connected.includes(n.id)).map((n) => (
          <Form.TagPicker.Item key={n.id} value={n.id} title={n.name} />
        ))}
      </Form.TagPicker>
      <Form.TextArea
        title={values.type === "text" ? "Text" : "Caption"}
        placeholder="Long text becomes a thread on X and Bluesky"
        {...itemProps.text}
      />
      {values.type !== "text" && (
        <>
          <Form.FilePicker
            title={values.type === "video" ? "Video" : "Photos"}
            allowMultipleSelection={values.type === "photos"}
            {...itemProps.files}
          />
          <Form.TextField title="Or URLs" placeholder="https://… (Drive and Dropbox links work)" {...itemProps.urls} />
        </>
      )}
      <Form.Separator />
      <Form.DatePicker title="Schedule For" info="Leave empty to post now" {...itemProps.scheduledDate} />
      <Form.Checkbox label="Add to the profile's queue instead" {...itemProps.addToQueue} />
      <Form.TextField title="First Comment" {...itemProps.firstComment} />
    </Form>
  );
}
