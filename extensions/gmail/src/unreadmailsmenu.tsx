import { MenuBarExtra, Toast, showToast, open, showHUD, Icon, LaunchType } from "@raycast/api";
import { getAvatarIcon, useCachedPromise } from "@raycast/utils";
import {
  generateQuery,
  getGMailCurrentProfile,
  getGMailMessageHeaderValue,
  getGMailMessages,
  messageThreadUrl,
} from "./lib/gmail";
import { gmail_v1 } from "@googleapis/gmail";
import { getAddressParts, getMessageInternalDate } from "./components/message/utils";
import { ensureShortText, getErrorMessage, getFirstValidLetter } from "./lib/utils";
import { LaunchCommandMenubarItem, MenuBarItemConfigureCommand } from "./components/menu";
import View from "./components/view";
import { getGMailClient } from "./lib/withGmailClient";

function MessageMenubarItem(props: {
  message: gmail_v1.Schema$Message;
  onMailOpen?: (message: gmail_v1.Schema$Message) => void;
}) {
  const m = props.message;
  const subject = getGMailMessageHeaderValue(m, "Subject") || "<No Subject>";
  const from = getGMailMessageHeaderValue(m, "From");
  const fromParts = getAddressParts(from);
  const internalDate = getMessageInternalDate(m);
  const fromClean = [fromParts?.name, fromParts?.email ? `<${fromParts.email}>` : undefined]
    .filter((e) => e && e.length > 0)
    .join(" ");

  const { gmail } = getGMailClient();
  const handle = async () => {
    try {
      const profile = await getGMailCurrentProfile(gmail);
      const threadUrlWeb = messageThreadUrl(profile, m);
      if (threadUrlWeb && threadUrlWeb.length > 0) {
        open(threadUrlWeb);
        showHUD("Open Mail in Browser");
        if (props.onMailOpen) {
          props.onMailOpen(m);
        }
      } else {
        throw new Error("Invalid URL");
      }
    } catch (error) {
      showToast({ style: Toast.Style.Failure, title: "Error", message: getErrorMessage(error) });
    }
  };
  return (
    <MenuBarExtra.Item
      key={m.id}
      title={ensureShortText(subject, { maxLength: 40 })}
      icon={getAvatarIcon(getFirstValidLetter(from) || "?")}
      tooltip={`From: ${fromClean}\nReceived: ${!internalDate ? "?" : internalDate.toLocaleString()}`}
      onAction={handle}
    />
  );
}

function UnreadMenuCommand(): JSX.Element {
  const query = generateQuery({ baseQuery: ["is:unread"] });
  const { gmail } = getGMailClient();
  const { isLoading, data, error, mutate } = useCachedPromise(
    async (q: string) => {
      return await getGMailMessages(gmail, q);
    },
    [query],
    { keepPreviousData: true },
  );
  const onMailOpen = async (message: gmail_v1.Schema$Message) => {
    await mutate(undefined, {
      optimisticUpdate(data) {
        return data?.filter((m) => m.data.id !== message.id);
      },
    });
  };
  const unreadCount = data?.length || 0;
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
        {!error && unreadCount <= 0 && <MenuBarExtra.Item title="No Unread Mails" />}
        {data?.map((m) => <MessageMenubarItem key={m.data.id} message={m.data} onMailOpen={onMailOpen} />)}
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
