import {
  Action,
  ActionPanel,
  Detail,
  Form,
  Icon,
  openExtensionPreferences,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useForm, usePromise } from "@raycast/utils";
import { useState } from "react";
import { client, prefs } from "./lib/client";
import {
  DASHBOARD_URL,
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
  const defaultProfile = prefs().defaultProfile ?? "";
  const {
    data: list,
    isLoading,
    error,
    revalidate,
  } = usePromise(() => profiles(client()), [], { failureToastOptions: { title: "Could not load profiles" } });
  const [chosen, setChosen] = useState<string>(defaultProfile);
  // The chosen profile, or the first one when nothing (or an unknown default) is chosen.
  const current = list?.find((p) => p.username === chosen) ?? list?.[0];
  const profile = current?.username ?? "";
  const connected = current?.networks ?? [];
  const defaultMissing =
    !!list && !!defaultProfile && chosen === defaultProfile && !list.some((p) => p.username === chosen);

  const { handleSubmit, itemProps, values, setValue } = useForm<Values>({
    initialValues: {
      type: "text",
      platforms: [],
      text: "",
      files: [],
      urls: "",
      scheduledDate: null,
      firstComment: "",
      addToQueue: false,
    },
    validation: {
      platforms: (v) => (!v?.length ? "Choose at least one network" : undefined),
    },
    async onSubmit(v) {
      const draft: PostDraft = {
        profile,
        type: v.type as PostDraft["type"],
        platforms: v.platforms.filter((p) => connected.includes(p)),
        text: v.text,
        media: v.type === "text" ? [] : [...(v.files ?? []), ...(v.urls ?? "").split(/[\s,]+/).filter(Boolean)],
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

  function chooseProfile(username: string) {
    if (username === profile) return;
    setChosen(username);
    // Networks belong to a profile: start over so nothing the new profile lacks stays selected.
    setValue("platforms", []);
  }

  // Nothing to post to yet: say why and offer the way forward instead of a form that cannot be sent.
  const blocker = error
    ? { title: "Could not load profiles", text: errorMessage(error) }
    : list && !list.length
      ? {
          title: "No profiles yet",
          text: "Create a profile in the Reelspan dashboard and connect your social accounts.",
        }
      : current && !connected.length
        ? {
            title: "No connected networks",
            text: `${current.name ?? current.username} has no social accounts connected yet. Connect one in the Reelspan dashboard, or copy a connect link from the Profiles command.`,
          }
        : null;

  return (
    <Form
      isLoading={isLoading}
      actions={
        blocker ? (
          <ActionPanel>
            {error ? (
              <>
                <Action title="Try Again" icon={Icon.ArrowClockwise} onAction={revalidate} />
                <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
              </>
            ) : (
              <Action.OpenInBrowser title="Open Dashboard" url={DASHBOARD_URL} />
            )}
          </ActionPanel>
        ) : (
          <ActionPanel>
            <Action.SubmitForm
              title={values.scheduledDate ? "Schedule Post" : "Publish"}
              icon={Icon.Upload}
              onSubmit={handleSubmit}
            />
          </ActionPanel>
        )
      }
    >
      {!!list?.length && (
        <Form.Dropdown id="profile" title="Profile" value={profile} onChange={chooseProfile}>
          {list.map((p) => (
            <Form.Dropdown.Item
              key={p.username}
              value={p.username}
              title={p.name ?? p.username}
              keywords={[p.username]}
            />
          ))}
        </Form.Dropdown>
      )}
      {defaultMissing && (
        <Form.Description text={`The default profile "${defaultProfile}" was not found, so ${profile} is selected.`} />
      )}
      {blocker ? (
        <Form.Description title={blocker.title} text={blocker.text} />
      ) : (
        list && (
          <>
            <Form.Dropdown title="Type" {...itemProps.type}>
              <Form.Dropdown.Item value="text" title="Text" icon={Icon.Text} />
              <Form.Dropdown.Item value="video" title="Video" icon={Icon.Video} />
              <Form.Dropdown.Item value="photos" title="Photos" icon={Icon.Image} />
            </Form.Dropdown>
            <Form.TagPicker title="Networks" placeholder="Choose networks" {...itemProps.platforms}>
              {NETWORKS.filter((n) => connected.includes(n.id)).map((n) => (
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
                <Form.TextField
                  title="Or URLs"
                  placeholder="https://… (Drive and Dropbox links work)"
                  {...itemProps.urls}
                />
              </>
            )}
            <Form.Separator />
            <Form.DatePicker title="Schedule For" info="Leave empty to post now" {...itemProps.scheduledDate} />
            <Form.Checkbox label="Add to the profile's queue instead" {...itemProps.addToQueue} />
            <Form.TextField title="First Comment" placeholder="Optional first comment" {...itemProps.firstComment} />
          </>
        )
      )}
    </Form>
  );
}
