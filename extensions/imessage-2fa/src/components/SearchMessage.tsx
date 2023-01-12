import { homedir } from "os";
import { resolve } from "path";
import { useSQL } from "@raycast/utils";
import { Message, SearchType } from "..";

const DB_PATH = resolve(homedir(), "Library/Messages/chat.db");

const baseSQL = (lookBackMinutes: number) => `select
  message.guid,
  message.rowid,
  ifnull(handle.uncanonicalized_id, chat.chat_identifier) AS sender,
  message.service,
  datetime(message.date / 1000000000 + 978307200, 'unixepoch', 'localtime') AS message_date,
  message.text
from message
  left join chat_message_join on chat_message_join.message_id = message.ROWID
  left join chat on chat.ROWID = chat_message_join.chat_id
  left join handle on message.handle_id = handle.ROWID
where
message.is_from_me = 0
and message.text is not null
and length(message.text) > 0
and datetime(message.date / 1000000000 + strftime('%s', '2001-01-01'), 'unixepoch', 'localtime')
        >= datetime('now', '-${lookBackMinutes} minutes', 'localtime')`;

const formatSQL = ({
  searchText,
  searchType,
  lookBackMinutes,
}: {
  searchText?: string;
  searchType: SearchType;
  lookBackMinutes: number;
}) => {
  let base = baseSQL(lookBackMinutes);
  if (searchType === "code") {
    base = `${base} \nand (
      message.text glob '*[0-9][0-9][0-9]*'
      or message.text glob '*[0-9][0-9][0-9][0-9]*'
      or message.text glob '*[0-9][0-9][0-9][0-9][0-9]*'
      or message.text glob '*[0-9][0-9][0-9][0-9][0-9][0-9]*'
      or message.text glob '*[0-9][0-9][0-9]-[0-9][0-9][0-9]*'
      or message.text glob '*[0-9][0-9][0-9][0-9][0-9][0-9][0-9]*'
      or message.text glob '*[0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9]*'
    )`;
  }
  if (searchText !== "") {
    base = `${base} \nand message.text like '%${searchText}%'`;
  }

  return `${base} \norder by message.date desc limit 100`.trim();
};
const useMessageSearch = (options: { searchText?: string; searchType: SearchType; lookBackDays: number }) => {
  const query = formatSQL({ ...options, lookBackMinutes: options.lookBackDays * 60 * 24 });
  // console.log(query.substring(200));
  return useSQL<Message>(DB_PATH, query);
};

export default useMessageSearch;
