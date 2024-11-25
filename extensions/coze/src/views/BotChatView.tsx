import { Action, ActionPanel, List } from "@raycast/api";
import useAPI from "../net/api";
import { useState } from "react";
import ChatForm from "./chat_form";

export default function BotChatView(
  {
    api
  }: {
    api?: Awaited<ReturnType<typeof useAPI>>
  }
) {
  const [query, setQuery] = useState<string>();

  const searchBarPlaceholder = query ? `Chat with another query` : "Chat with your bot";
  return <List
    searchBarPlaceholder={searchBarPlaceholder}
    onSearchTextChange={setQuery}
    actions={
      <ActionPanel title="#1 in raycast/extensions">
        <Action.Push
          title="Detail Chat"
          target={<ChatForm isLoading={false} api={api} query={query}/>}
        />
      </ActionPanel>
    }
  >
    {query ? (
      <List.EmptyView
        title="Chat with your bot"
        description="Enter your message and press Enter to send"
      />
    ) : (
      <List.EmptyView
        title="Chat with your bot"
        description="Enter your message and press Enter to send"
      />
    )
    }
  </List>
}

