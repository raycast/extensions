import {
  Action,
  ActionPanel,
  Form,
  Icon,
  Keyboard,
  Toast,
  closeMainWindow,
  getPreferenceValues,
  openCommandPreferences,
  popToRoot,
  showToast,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";

interface Preferences {
  token: string;
}

interface Channel {
  id: string;
  name: string;
  isPrivate: boolean;
}

interface SlackUser {
  id: string;
  label: string;
  isBot: boolean;
}

interface Directory {
  channels: Channel[];
  users: SlackUser[];
}

interface FormValues {
  channel: string;
  mentions: string[];
  message: string;
}

/** Token comes only from Raycast's secure preferences — nothing is written to disk. */
function getToken(): string {
  const token = getPreferenceValues<Preferences>().token?.trim();
  if (!token) {
    throw new Error(
      "No Slack token set. Open preferences (⌘⇧,) and paste your xoxp-… token.",
    );
  }
  return token;
}

async function slackGet(
  method: string,
  token: string,
  params: Record<string, string>,
) {
  const url = new URL(`https://slack.com/api/${method}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = (await res.json()) as {
    ok: boolean;
    error?: string;
    [k: string]: unknown;
  };
  if (!data.ok) throw new Error(`${method}: ${data.error ?? "unknown error"}`);
  return data;
}

async function slackPost(
  method: string,
  token: string,
  body: Record<string, unknown>,
) {
  const res = await fetch(`https://slack.com/api/${method}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json; charset=utf-8",
    },
    body: JSON.stringify(body),
  });
  const data = (await res.json()) as { ok: boolean; error?: string };
  if (!data.ok) throw new Error(`${method}: ${data.error ?? "unknown error"}`);
  return data;
}

async function paginate(
  method: string,
  token: string,
  params: Record<string, string>,
  key: string,
) {
  const items: Record<string, unknown>[] = [];
  let cursor = "";
  do {
    const page = await slackGet(method, token, {
      ...params,
      ...(cursor ? { cursor } : {}),
    });
    items.push(...((page[key] as Record<string, unknown>[]) ?? []));
    cursor = (
      (page.response_metadata as { next_cursor?: string })?.next_cursor ?? ""
    ).trim();
  } while (cursor);
  return items;
}

async function loadDirectory(): Promise<Directory> {
  const token = getToken();
  const [rawChannels, rawUsers] = await Promise.all([
    paginate(
      "conversations.list",
      token,
      {
        types: "public_channel,private_channel",
        exclude_archived: "true",
        limit: "200",
      },
      "channels",
    ),
    paginate("users.list", token, { limit: "200" }, "members"),
  ]);

  const channels: Channel[] = rawChannels
    .filter((c) => c.name)
    .map((c) => ({
      id: c.id as string,
      name: c.name as string,
      isPrivate: Boolean(c.is_private),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const users: SlackUser[] = rawUsers
    .filter((u) => !u.deleted)
    .map((u) => {
      const profile =
        (u.profile as { display_name?: string; real_name?: string }) ?? {};
      const label =
        profile.display_name ||
        profile.real_name ||
        (u.name as string) ||
        (u.id as string);
      return { id: u.id as string, label, isBot: Boolean(u.is_bot) };
    })
    .sort((a, b) => a.label.localeCompare(b.label));

  return { channels, users };
}

export default function Command() {
  const { data, isLoading, error, revalidate } =
    useCachedPromise(loadDirectory);

  async function handleSubmit(values: FormValues) {
    try {
      const token = getToken();
      if (!values.channel) throw new Error("Pick a channel to send to.");

      const mentionTokens = (values.mentions ?? [])
        .map((id) => `<@${id}>`)
        .join(" ");
      const body = (values.message ?? "").trim();
      if (!mentionTokens && !body)
        throw new Error("Add a message or at least one mention.");
      const text = [mentionTokens, body].filter(Boolean).join(" ");

      const toast = await showToast({
        style: Toast.Style.Animated,
        title: "Sending…",
      });
      await slackPost("chat.postMessage", token, {
        channel: values.channel,
        text,
      });
      toast.style = Toast.Style.Success;
      toast.title = "Message sent";
      await closeMainWindow();
      await popToRoot();
    } catch (e) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Couldn't send",
        message: e instanceof Error ? e.message : String(e),
      });
    }
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Send Message"
            icon={Icon.Message}
            onSubmit={handleSubmit}
          />
          <Action
            title="Reload Channels & Users"
            icon={Icon.ArrowClockwise}
            shortcut={Keyboard.Shortcut.Common.Refresh}
            onAction={() => revalidate()}
          />
          <Action
            title="Open Preferences"
            icon={Icon.Gear}
            shortcut={{ modifiers: ["cmd", "shift"], key: "," }}
            onAction={openCommandPreferences}
          />
        </ActionPanel>
      }
    >
      {error ? (
        <Form.Description
          title="Error"
          text={`${error.message}\n\nFix your token in Preferences (⌘⇧,), then press ⌘R to reload.`}
        />
      ) : null}

      <Form.Dropdown
        id="channel"
        title="Send to"
        isLoading={isLoading}
        storeValue
      >
        {(data?.channels ?? []).map((c) => (
          <Form.Dropdown.Item
            key={c.id}
            value={c.id}
            title={`#${c.name}`}
            icon={c.isPrivate ? Icon.Lock : Icon.Hashtag}
          />
        ))}
      </Form.Dropdown>

      <Form.TagPicker
        id="mentions"
        title="Mention"
        placeholder="Search people & apps to @mention…"
      >
        {(data?.users ?? []).map((u) => (
          <Form.TagPicker.Item
            key={u.id}
            value={u.id}
            title={u.isBot ? `${u.label} (app)` : u.label}
            icon={u.isBot ? Icon.Bot : Icon.Person}
          />
        ))}
      </Form.TagPicker>

      <Form.TextArea
        id="message"
        title="Message"
        placeholder="Type your message here…"
      />
      <Form.Description text="Mentioned people/apps are prepended to your message as real @mentions when sent." />
    </Form>
  );
}
