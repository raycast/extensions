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
    actions={
      <ActionPanel title="#1 in raycast/extensions">
        <Action.Push
          title="Push Pong"
          target={<ChatForm isLoading={false} api={api}/>}
        />
        <Action.Push
          title="sdaf"
          target={<ChatForm isLoading={false} api={api}/>}
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

