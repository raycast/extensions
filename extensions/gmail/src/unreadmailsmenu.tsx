import { MenuBarExtra, Toast, showToast, open, showHUD, Icon, LaunchType } from "@raycast/api";
import { getAvatarIcon, useCachedPromise } from "@raycast/utils";
import { generateQuery, getGMailMessageHeaderValue, getGMailMessages, messageThreadUrl } from "./lib/gmail";
import { gmail_v1 } from "@googleapis/gmail";
import { getAddressParts, getMessageInternalDate } from "./components/message/utils";
import { ensureShortText, getErrorMessage, getFirstValidLetter } from "./lib/utils";
import { LaunchCommandMenubarItem, MenuBarItemConfigureCommand } from "./components/menu";

function MessageMenubarItem(props: { message: gmail_v1.Schema$Message }) {
  const m = props.message;
  const subject = getGMailMessageHeaderValue(m, "Subject") || "<No Subject>";
  const from = getGMailMessageHeaderValue(m, "From");
  const fromParts = getAddressParts(from);
  const internalDate = getMessageInternalDate(m);
  const fromClean = [fromParts?.name, fromParts?.email ? `<${fromParts.email}>` : undefined]
    .filter((e) => e && e.length > 0)
    .join(" ");

  const threadUrlWeb = messageThreadUrl(m);
  const handle = () => {
    try {
      if (threadUrlWeb && threadUrlWeb.length > 0) {
        open(threadUrlWeb);
        showHUD("Open Mail in Browser");
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

export default function UnreadMenuCommand(): JSX.Element {
  const query = generateQuery({ baseQuery: ["is:unread"] });
  const { isLoading, data, error } = useCachedPromise(
    async (q: string) => {
      return await getGMailMessages(q);
    },
    [query],
    { keepPreviousData: true }
  );
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
        {isLoading === false && !error && unreadCount <= 0 && <MenuBarExtra.Item title="No Unread Mails" />}
        {data?.map((m) => (
          <MessageMenubarItem key={m.data.id} message={m.data} />
        ))}
      </MenuBarExtra.Section>
      <MenuBarExtra.Section>
        <MenuBarItemConfigureCommand />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
