import { Action, ActionPanel, List, Toast, showToast, Icon, Color, Image } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { getHAWSConnection, ha } from "./common";
import { useState } from "react";
import { getErrorMessage } from "./utils";
import { clearSearchBar } from "@raycast/api";

interface PlainSpeech {
  speech: string;
  extra_data?: any;
}

interface Speech {
  plain: PlainSpeech;
}

interface ConversationResponse {
  language: string;
  response_type: string;
  speech?: Speech;
}

interface ConversationAnswer {
  response: ConversationResponse;
  conversation_id?: string | null;
}

enum Author {
  Me = "me",
  Assist = "assist",
}

interface ConversationContent {
  text: string;
  author: Author;
  date: Date;
}

interface HAWSUser {
  id: string;
  name: string;
  is_owner: boolean;
  is_admin: boolean;
}

interface HAWSPersonsList {
  storage?: HAWSPerson[];
}

interface HAWSPerson {
  name: string;
  user_id: string;
  id: string;
  picture?: string | null;
}

interface HAUser {
  name: string;
  picture?: string | null;
  isAdmin: boolean;
  isOwner: boolean;
}

async function getHAWSCurrentUser(): Promise<HAUser | undefined> {
  const con = await getHAWSConnection();
  const currentUser: HAWSUser | undefined = await con.sendMessagePromise({
    type: "auth/current_user",
  });
  if (!currentUser) {
    return;
  }
  const persons: HAWSPersonsList | undefined = await con.sendMessagePromise({
    type: "person/list",
  });
  const person = persons?.storage?.find((p) => p.user_id === currentUser.id);
  const picture = person?.picture && person?.picture.startsWith("/") ? ha.urlJoin(person?.picture) : person?.picture;
  const r: HAUser = {
    name: currentUser.name,
    picture: picture,
    isAdmin: currentUser.is_admin,
    isOwner: currentUser.is_owner,
  };
  return r;
}

function getInitalConversations(): ConversationContent[] {
  return [{ text: "How can I help you?", author: Author.Assist, date: new Date() }];
}

export default function AssistCommand(): JSX.Element {
  const [searchText, setSearchText] = useState<string>("");
  const [conversations, setConversations] = useState<ConversationContent[]>(getInitalConversations());
  const { data: currentUser } = useCachedPromise(getHAWSCurrentUser);
  const process = async () => {
    try {
      if (searchText.length <= 0) {
        showToast({
          style: Toast.Style.Failure,
          title: "Empty Requests are not allowed",
        });
        return;
      }
      const con = await getHAWSConnection();
      const r: ConversationAnswer = await con.sendMessagePromise({
        type: "conversation/process",
        text: searchText,
      });
      clearSearchBar();
      const assistAnswer = r.response?.speech?.plain?.speech;
      if (assistAnswer) {
        setConversations([
          { text: assistAnswer, author: Author.Assist, date: new Date() },
          { text: searchText, author: Author.Me, date: new Date() },
          ...conversations,
        ]);
      } else {
        setConversations([{ text: searchText, author: Author.Me, date: new Date() }, ...conversations]);
      }
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: getErrorMessage(error),
      });
    }
  };
  const userPicture = (): Image.ImageLike | undefined => {
    if (currentUser) {
      if (currentUser.picture) {
        return { source: currentUser.picture, mask: Image.Mask.Circle };
      }
    }
    return { source: "person.png", tintColor: Color.PrimaryText, mask: Image.Mask.Circle };
  };
  return (
    <List searchBarPlaceholder="Type your Request and Press Enter" onSearchTextChange={setSearchText}>
      <List.Section title="Conversation">
        {conversations.map((c, i) => (
          <List.Item
            key={i.toString()}
            title={c.text}
            icon={{
              value: c.author === Author.Assist ? "home-assistant.png" : userPicture(),
              tooltip: c.author === Author.Assist ? "Assist" : currentUser?.name ?? "",
            }}
            accessories={[{ date: c.date }]}
            actions={
              <ActionPanel>
                <ActionPanel.Section>
                  <Action onAction={() => process()} title="Send" icon={Icon.Terminal} />
                  <Action.CopyToClipboard title="Copy Text to Clipboard" content={c.text} />
                </ActionPanel.Section>
                <ActionPanel.Section>
                  <Action
                    title="Clear Conversation"
                    icon={Icon.DeleteDocument}
                    onAction={() => setConversations(getInitalConversations())}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
