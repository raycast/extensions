import { List, ActionPanel, Action, Icon, getPreferenceValues } from "@raycast/api";
import { useState } from "react";
import useMessageSearch from "./components/SearchMessage";

export interface Message {
  guid: string;
  code: string;
  message_date: string;
  sender: string;
  text: string;
}

export interface Preferences {
  lookBackDays?: string;
}

export type SearchType = "all" | "code";

/**
 * try to extract iMessage 2FA Code, empty result if not found any code
 *
 * @param original - original message text from iMessage
 * @returns
 * @see https://github.com/squatto/alfred-imessage-2fa/blob/master/find-messages.php
 */
const extractCode = (original: string) => {
  // remove URLs
  const regex = new RegExp(
    "\\b((https?|ftp|file):\\/\\/|www\\.)[-A-Z0-9+&@#\\/%?=~_|$!:,.;]*[A-Z0-9+&@#\\/%=~_|$]",
    "ig"
  );
  const message = original.replaceAll(regex, "");

  if (message.trim() === "") return "";

  let m;
  let code;

  if ((m = /(^|\s|\\R|\t|\b|G-|:)(\d{5,8})($|\s|\\R|\t|\b|\.|,)/.exec(message)) !== null) {
    code = m[2];
    // 5-8 consecutive digits
    // examples:
    //   "您的验证码是 199035，10分钟内有效，请勿泄露"
    //   "登录验证码：627823，您正在尝试【登录】，10分钟内有效"
    //   "【赛验】验证码 54538"
    //   "Enter this code to log in:59678."
    //   "G-315643 is your Google verification code"
    //   "Enter the code 765432, and then click the button to log in."
    //   "Your code is 45678!"
    //   "Your code is:98765!"
  } else if ((m = /^(\d{4,8})(\sis your.*code)/.exec(message)) !== null) {
    // 4-8 digits followed by "is your [...] code"
    // examples:
    //   "2773 is your Microsoft account verification code"
    code = m[1];
  } else if ((m = /(code:|is:|码)\s*(\d{4,8})($|\s|\\R|\t|\b|\.|,)/i.exec(message)) !== null) {
    // "code:" OR "is:", optional whitespace, then 4-8 consecutive digits
    // examples:
    //   "Your Airbnb verification code is: 1234."
    //   "Your verification code is: 1234, use it to log in"
    //   "Here is your authorization code:9384"
    //   "【抖音】验证码9316，用于手机验证"
    code = m[2];
  } else if ((m = /(code|is):?\s*(\d{3,8})($|\s|\\R|\t|\b|\.|,)/i.exec(message)) !== null) {
    // "code" OR "is" followed by an optional ":" + optional whitespace, then 3-8 consecutive digits
    // examples:
    //   "Please enter code 548 on Zocdoc."
    code = m[2];
  } else if ((m = /(^|code:|is:|\b)\s*(\d{3})-(\d{3})($|\s|\\R|\t|\b|\.|,)/.exec(message)) !== null) {
    // line beginning OR "code:" OR "is:" OR word boundary, optional whitespace, 3 consecutive digits, a hyphen, then 3 consecutive digits
    // but NOT a phone number (###-###-####)
    // examples:
    //   "123-456"
    //   "Your Stripe verification code is: 719-839."
    // and make sure it isn't a phone number
    // doesn't match: <first digits>-<second digits>-<4 consecutive digits>

    const first = m[2];
    const second = m[3];
    if (!new RegExp("/(^|code:|is:|\b)s*" + first + "-" + second + "-(d{4})($|s|R|\t|\b|.|,)/").test(message)) {
      return `${first}${second}`;
    }
    return "";
  }

  return code;
};

const Actions = (props: { item: Message }) => {
  const item = props.item;
  return (
    <ActionPanel title="Action">
      <ActionPanel.Section>
        <Action.Paste content={item.code} title="Paste Code" />
        <Action.CopyToClipboard content={item.code} title="Copy Code to Clipboard" />
        <Action.CopyToClipboard content={item.text} title="Copy Content to Clipboard" />
        <Action.CopyToClipboard content={item.code + "\t" + item.text} title="Copy Code & Content to Clipboard" />
      </ActionPanel.Section>
    </ActionPanel>
  );
};

export default function Command() {
  const [searchType, setSearchType] = useState("code" as SearchType);
  const [searchText, setSearchText] = useState("");

  const preferences = getPreferenceValues<Preferences>();
  const lookBackDays = parseInt(preferences?.lookBackDays || "1") || 1;
  const { isLoading, data, permissionView } = useMessageSearch({ searchText, searchType, lookBackDays });

  if (permissionView) {
    return permissionView;
  }

  const result = (data || [])
    .map((row) => {
      const code = extractCode(row.text as string);
      return { ...row, code: code || "" };
    })
    .filter((x) => !!x) as Message[];

  return (
    <List
      isShowingDetail={result?.length > 0}
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Filter 2FA Code or Fetch All Messages"
          onChange={(value) => setSearchType((value || "code") as SearchType)}
        >
          <List.Dropdown.Item title="2FA Code" value="code" />
          <List.Dropdown.Item title="All Messages" value="all" />
        </List.Dropdown>
      }
    >
      {result?.length ? (
        result
          .filter((item) => (searchType === "code" ? !!item?.code : true))
          .map((item) => (
            <List.Item
              key={item?.guid}
              icon={Icon.Message}
              title={item?.code ?? "No title"}
              subtitle={item?.text}
              actions={<Actions item={item} />}
              detail={
                <List.Item.Detail
                  markdown={item.text}
                  metadata={
                    <List.Item.Detail.Metadata>
                      <List.Item.Detail.Metadata.Label title="Detail" />
                      <List.Item.Detail.Metadata.Label title="Code" text={item.code} />
                      <List.Item.Detail.Metadata.Label title="From" text={item.sender} />
                      <List.Item.Detail.Metadata.Label title="Date" text={item.message_date} />
                      <List.Item.Detail.Metadata.Separator />
                    </List.Item.Detail.Metadata>
                  }
                />
              }
            />
          ))
      ) : (
        <List.EmptyView title={`No two factor authentication codes in the last ${lookBackDays * 24} hours`} />
      )}
    </List>
  );
}
