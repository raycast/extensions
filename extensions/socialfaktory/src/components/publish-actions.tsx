import {
  Action,
  ActionPanel,
  Alert,
  Form,
  Icon,
  Keyboard,
  LaunchType,
  Toast,
  confirmAlert,
  launchCommand,
  showToast,
  useNavigation,
} from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useState } from "react";
import { SITE_URL, personalToken } from "../lib/auth";
import { platformName } from "../lib/format";
import { MIN_LEAD_MS, needsSignInForPublishing, scheduleProblem } from "../lib/publishing";
import { publishPost, signInAgain } from "../lib/socialfaktory";
import type { Channel } from "../lib/types";

type Props = {
  brandId: string;
  platform: string;
  channels: Channel[] | undefined;
  loading: boolean;
  parts: string[];
  reload: () => void;
};

const POST_SHORTCUT: Keyboard.Shortcut = {
  macOS: { modifiers: ["cmd", "shift"], key: "u" },
  Windows: { modifiers: ["ctrl", "shift"], key: "u" },
};

const SCHEDULE_SHORTCUT: Keyboard.Shortcut = {
  macOS: { modifiers: ["cmd", "shift"], key: "t" },
  Windows: { modifiers: ["ctrl", "shift"], key: "t" },
};

const openScheduledPosts: Toast.ActionOptions = {
  title: "Open Scheduled Posts",
  onAction: async () => {
    try {
      await launchCommand({ name: "scheduled-posts", type: LaunchType.UserInitiated });
    } catch (error) {
      await showFailureToast(error, { title: "Could not open Scheduled Posts" });
    }
  },
};

const signInToPublish: Toast.ActionOptions = {
  title: "Sign in Again",
  onAction: async (toast) => {
    toast.style = Toast.Style.Animated;
    toast.title = "Signing in to SocialFaktory";
    try {
      await signInAgain();
      toast.style = Toast.Style.Success;
      toast.title = "Signed in: post it again";
    } catch (error) {
      await toast.hide();
      await showFailureToast(error, { title: "Could not sign in" });
    }
  },
};

function accountName(channel: Channel): string {
  return channel.handle ?? platformName(channel.provider);
}

async function run(work: () => Promise<unknown>, busy: string, done: string): Promise<boolean> {
  const toast = await showToast({ style: Toast.Style.Animated, title: busy });
  try {
    await work();
    toast.style = Toast.Style.Success;
    toast.title = done;
    toast.primaryAction = openScheduledPosts;
    return true;
  } catch (error) {
    await toast.hide();
    await showFailureToast(error, {
      title: "SocialFaktory could not send this post",
      primaryAction: needsSignInForPublishing(error) && !personalToken() ? signInToPublish : undefined,
    });
    return false;
  }
}

async function postNow({ brandId, platform, parts }: Props, channel: Channel) {
  const network = platformName(platform);
  const confirmed = await confirmAlert({
    title: `Post to ${network} Now?`,
    message: `${accountName(channel)} publishes this right away:\n\n${parts.join("\n\n")}`,
    icon: Icon.Upload,
    primaryAction: { title: "Post", style: Alert.ActionStyle.Default },
  });
  if (!confirmed) return;
  await run(
    () => publishPost({ brandId, channel, parts }),
    `Posting to ${network}`,
    `Sent to ${network}: it goes live in a moment`,
  );
}

export function PublishActions(props: Props) {
  const { platform, channels } = props;
  const network = platformName(platform);
  const checkAgain = <Action title="Check Accounts Again" icon={Icon.ArrowClockwise} onAction={props.reload} />;
  if (!channels) return props.loading ? null : <ActionPanel.Section>{checkAgain}</ActionPanel.Section>;

  if (channels.length === 0) {
    return (
      <ActionPanel.Section>
        <Action.OpenInBrowser title={`Connect ${network} in SocialFaktory`} icon={Icon.Link} url={SITE_URL} />
        {checkAgain}
      </ActionPanel.Section>
    );
  }

  return (
    <ActionPanel.Section>
      {channels.length === 1 ? (
        <Action
          title={`Post to ${network}`}
          icon={Icon.Upload}
          shortcut={POST_SHORTCUT}
          onAction={() => postNow(props, channels[0])}
        />
      ) : (
        <ActionPanel.Submenu title={`Post to ${network}`} icon={Icon.Upload} shortcut={POST_SHORTCUT}>
          {channels.map((channel) => (
            <Action key={channel.id} title={accountName(channel)} onAction={() => postNow(props, channel)} />
          ))}
        </ActionPanel.Submenu>
      )}
      <Action.Push
        title="Schedule Post…"
        icon={Icon.Calendar}
        shortcut={SCHEDULE_SHORTCUT}
        target={<ScheduleForm {...props} channels={channels} />}
      />
    </ActionPanel.Section>
  );
}

type Values = { channelId: string; scheduledAt: Date | null };

function ScheduleForm({ brandId, platform, channels, parts }: Props & { channels: Channel[] }) {
  const { pop } = useNavigation();
  const [timeError, setTimeError] = useState<string>();
  const network = platformName(platform);

  async function submit({ channelId, scheduledAt }: Values) {
    const problem = scheduledAt ? scheduleProblem(scheduledAt, Date.now()) : "Pick when the post goes out.";
    if (!scheduledAt || problem) {
      setTimeError(problem);
      return;
    }
    const channel = channels.find((candidate) => candidate.id === channelId);
    if (!channel) return;
    const when = scheduledAt.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
    const scheduled = await run(
      () => publishPost({ brandId, channel, parts, scheduledAt }),
      `Scheduling on ${network}`,
      `Scheduled on ${network} for ${when}`,
    );
    if (scheduled) pop();
  }

  return (
    <Form
      navigationTitle="Schedule Post"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Schedule Post" icon={Icon.Calendar} onSubmit={submit} />
        </ActionPanel>
      }
    >
      <Form.Dropdown id="channelId" title="Account">
        {channels.map((channel) => (
          <Form.Dropdown.Item key={channel.id} value={channel.id} title={accountName(channel)} />
        ))}
      </Form.Dropdown>
      <Form.DatePicker
        id="scheduledAt"
        title="Publish At"
        type={Form.DatePicker.Type.DateTime}
        defaultValue={new Date(Date.now() + MIN_LEAD_MS + 60 * 60 * 1000)}
        min={new Date()}
        error={timeError}
        onChange={() => setTimeError(undefined)}
      />
      <Form.Description title="Post" text={parts.join("\n\n")} />
    </Form>
  );
}
