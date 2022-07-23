import { ActionPanel, Action, List, Icon, showToast, Toast } from "@raycast/api";
import { homedir } from "os";

import { findAddressBookDbPath } from "./useContacts";
import { useMessages } from "./useMessages";
import { isPermissionError } from "./useSql";
import PermissionError from "./PermissionError";

const IMESSAGE_DB_PATH = `${homedir()}/Library/Messages/chat.db`;
const ADDRESS_BOOK_DB_PATH = findAddressBookDbPath();

const formatDate = (date: Date) =>
  date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

export default function Command() {
  const { search, searchResults, error } = useMessages({
    messagesDbPath: IMESSAGE_DB_PATH,
    contactsDbPath: ADDRESS_BOOK_DB_PATH,
  });

  if (error) {
    if (isPermissionError(error)) {
      return <PermissionError />;
    } else {
      showToast({
        style: Toast.Style.Failure,
        title: "Cannot search history",
        message: error instanceof Error ? error.message : undefined,
      });
    }
  }

  return (
    <List
      isLoading={searchResults.isLoading}
      onSearchTextChange={search}
      searchBarPlaceholder="Search messages..."
      throttle
    >
      <List.Section title="Results" subtitle={searchResults.messages.length + ""}>
        {searchResults.messages.map((message) => (
          <List.Item
            key={message.id}
            title={message.text}
            subtitle={[message.contact?.firstName, message.contact?.lastName].filter(Boolean).join(" ")}
            icon={Icon.Person}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard content={message.text} shortcut={{ modifiers: ["cmd"], key: "c" }} />
              </ActionPanel>
            }
            accessories={[
              {
                text: formatDate(message.timestamp),
              },
            ]}
          />
        ))}
      </List.Section>
    </List>
  );
}
