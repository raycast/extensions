import { ActionPanel, List, Action } from "@raycast/api";
import ChatFormView from "./ChatFormView";
import { useState } from "react";
import { APIInstance } from "../services/api";

export default function EmptyConversationView({ isLoading, api }: { isLoading: boolean; api?: APIInstance }) {
  const [query, setQuery] = useState<string>("");
  const title = "Chat with bot";
  const action = (
    <ActionPanel>
      <Action.Push
        title={title}
        target={<ChatFormView isLoading={isLoading} api={api} query={query} autoFocusQuery />}
      />
    </ActionPanel>
  );

  return (
    <List
      isLoading={false}
      searchBarPlaceholder={title}
      searchText={query}
      onSearchTextChange={setQuery}
      isShowingDetail={true}
      actions={action}
    >
      <List.EmptyView title={title} description="Enter your message and press Enter to send" actions={action} />
    </List>
  );
}
