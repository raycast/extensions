import { List, Icon, Action, Detail, ActionPanel, showToast, Toast, Clipboard } from "@raycast/api";
import { useSQL } from "@raycast/utils";
import { resolve } from "path";
import { homedir } from "os";
import { useState } from "react";

const IMESSAGE_DB = resolve(homedir(), "Library/Messages/chat.db");

const QUERY = (search: string) => `
select 
  message.rowid, 
  ifnull(
    handle.uncanonicalized_id, chat.chat_identifier
  ) AS sender, 
  message.service, 
  datetime(
    message.date / 1000000000 + 978307200, 
    'unixepoch', 'localtime'
  ) AS message_date, 
  message.text 
from 
  message 
  left join chat_message_join on chat_message_join.message_id = message.ROWID 
  left join chat on chat.ROWID = chat_message_join.chat_id 
  left join handle on message.handle_id = handle.ROWID 
where 
  message.is_from_me = 0 
  and message.text is not null 
  and length(message.text) > 0 
  and message.text like '%${search}%'
order by 
  message.date desc
limit 
  50
`;

const get2FACode = async (text: string) => {
  const regexs = {
    // Set 1 Return index 2
    Set1: {
      index: 2,
      regex: [
        /(^|\s|R|\t|\b|G-|:)(\d{5,8})($|\s|R|\t|\b|\.|,)/,
        /(code:|is:)\s*(\d{4,8})($|\s|R|\t|\b|\.|,)/i,
        /(code|is):?\s*(\d{3,8})($|\s|R|\t|\b|\.|,)/i,
      ],
    },
    // Set 2 Return index 1
    Set2: {
      index: 1,
      regex: /^(\d{4,8})(\sis your.*code)/,
    },
    //  Set 3 Return index 2 and 3
    Set3: {
      regex: /(^|code:|is:|\b)\s*(\d{3})-(\d{3})($|\s|R|\t|\b|\.|,)/,
    },
  };

  const match = regexs.Set1.regex.reduce((acc, regex) => {
    const match = regex.exec(text);
    if (match) {
      return match[regexs.Set1.index];
    } else {
      const match = regexs.Set2.regex.exec(text);
      if (match) {
        return match[regexs.Set2.index];
      } else {
        const match = regexs.Set3.regex.exec(text);
        if (match) {
          return match[2] + match[3];
        }
      }
    }
    return acc;
  }, "");

  if (!match)
    return showToast({
      style: Toast.Style.Failure,
      title: "No 2FA code found",
    });

  await Clipboard.copy(match);

  showToast({
    style: Toast.Style.Success,
    title: "2FA code copied to clipboard",
  });
};
export default function Command() {
  const [searchText, setSearchText] = useState("");

  const { isLoading, data, permissionView } = useSQL(IMESSAGE_DB, QUERY(searchText));

  if (permissionView) return permissionView;

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search Messages..." onSearchTextChange={setSearchText}>
      {data?.map((message: any) => {
        return (
          <List.Item
            icon={{ source: Icon.Message }}
            key={message.ROWID}
            title={message.sender}
            subtitle={message.text}
            accessories={[
              {
                icon: { source: Icon.Calendar },
                text: new Date(message.message_date).toLocaleString(),
              },
            ]}
            actions={
              <ActionPanel>
                <Action title={"Copy Code"} icon={{ source: Icon.Code }} onAction={() => get2FACode(message.text)} />
                <Action.Push
                  title={"Open Message"}
                  icon={{ source: Icon.Message }}
                  target={<Detail markdown={`## ${message.text} `} />}
                />
              </ActionPanel>
            }
          ></List.Item>
        );
      })}
    </List>
  );
}
