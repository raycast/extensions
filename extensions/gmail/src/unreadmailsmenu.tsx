import { MenuBarExtra, Toast, showToast, open, showHUD, Icon, LaunchType, getPreferenceValues } from "@raycast/api";
import { getAvatarIcon, useCachedPromise } from "@raycast/utils";
import {
  generateQuery,
  getGMailCurrentProfile,
  getGMailMessageHeaderValue,
  getGMailMessages,
  markMessageAsRead,
  messageThreadUrl,
} from "./lib/gmail";
import { gmail_v1 } from "@googleapis/gmail";
import { getAddressParts, getMessageInternalDate } from "./components/message/utils";
import { ensureShortText, getErrorMessage, getFirstValidLetter } from "./lib/utils";
import { LaunchCommandMenubarItem, MenuBarItemConfigureCommand } from "./components/menu";
import View from "./components/view";
import { getGMailClient } from "./lib/withGmailClient";

function MessageMenubarItem(props: { message: gmail_v1.Schema$Message; onAction?: () => void }) {
  const m = props.message;
  const subject = getGMailMessageHeaderValue(m, "Subject") || "<No Subject>";
  const from = getGMailMessageHeaderValue(m, "From");
  const fromParts = getAddressParts(from);
  const internalDate = getMessageInternalDate(m);
  const fromClean = [fromParts?.name, fromParts?.email ? `<${fromParts.email}>` : undefined]
    .filter((e) => e && e.length > 0)
    .join(" ");

  return (
    <MenuBarExtra.Item
      key={m.id}
      title={ensureShortText(subject, { maxLength: 40 })}
      icon={getAvatarIcon(getFirstValidLetter(from) || "?")}
      tooltip={`From: ${fromClean}\nReceived: ${!internalDate ? "?" : internalDate.toLocaleString()}`}
      onAction={props.onAction}
    />
  );
}

function UnreadMenuCommand() {
  const query = generateQuery({ baseQuery: ["is:unread", "label:inbox"] });
  const { gmail } = getGMailClient();
  const { isLoading, data, error, mutate } = useCachedPromise(
    async (q: string) => {
      return await getGMailMessages(gmail, q);
    },
    [query],
    { keepPreviousData: true },
  );
  async function openMailAndMarkAsRead(message: gmail_v1.Schema$Message) {
    const profile = await getGMailCurrentProfile(gmail);
    const threadUrlWeb = messageThreadUrl(profile, message);
    if (threadUrlWeb && threadUrlWeb.length > 0) {
      open(threadUrlWeb);
      await markMessageAsRead(message);
      showHUD("Open Mail in Browser");
    } else {
      throw new Error("Invalid URL");
    }
  }

  const onMailOpen = async (message: gmail_v1.Schema$Message) => {
    try {
      await mutate(openMailAndMarkAsRead(message), {
        optimisticUpdate(data) {
          return data?.filter((m) => m.data.id !== message.id);
        },
      });
    } catch (error) {
      showToast({ style: Toast.Style.Failure, title: getErrorMessage(error) });
    }
  };
  const unreadCount = data?.length || 0;
  const { showAlways } = getPreferenceValues<Preferences.Unreadmailsmenu>();
  if (!showAlways && unreadCount <= 0) {
    return null;
  }
  return (
    <MenuBarExtra icon={"gmail.svg"} title={unreadCount.toString()} isLoading={isLoading} tooltip="Unread Mails">
      {error ? <MenuBarExtra.Item title={`Error: ${getErrorMessage(error)}`} /> : null}
      <MenuBarExtra.Section>
        <LaunchCommandMenubarItem
          title="Open Unread Mails"
          icon={Icon.Terminal}
          name="unread"
          type={LaunchType.UserInitiated}
        />
      </MenuBarExtra.Section>
      <MenuBarExtra.Section>
        {!error && unreadCount <= 0 && <MenuBarExtra.Item title="No Unread Mails" icon={Icon.Envelope} />}
        {data?.map((m) => <MessageMenubarItem key={m.data.id} message={m.data} onAction={() => onMailOpen(m.data)} />)}
      </MenuBarExtra.Section>
      <MenuBarExtra.Section>
        <MenuBarItemConfigureCommand />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}

export default function Command() {
  return (
    <View>
      <UnreadMenuCommand />
    </View>
  );
}
