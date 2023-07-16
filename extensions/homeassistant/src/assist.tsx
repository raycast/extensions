import { Action, ActionPanel, List, Toast, showToast, Icon, Color, Image } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { getHAWSConnection, ha } from "./common";
import { useState, useEffect } from "react";
import { getErrorMessage } from "./utils";
import { clearSearchBar } from "@raycast/api";
import { Connection } from "home-assistant-js-websocket";

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

interface HAAssistPipeline {
  id: string;
  conversation_engine: string;
  conversation_language: string;
  language: string;
  name: string;
  stt_engine?: string | null;
  stt_language?: string | null;
  tts_engine?: string | null;
  tts_language?: string | null;
  tts_voice?: string | null;
}

interface HAAssistPipelines {
  pipelines?: HAAssistPipeline[] | null;
  preferred_pipeline: string;
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

function getInitialConversations(): ConversationContent[] {
  return [{ text: "How can I help you?", author: Author.Assist, date: new Date() }];
}

function PipelinesDropdownList(props: {
  pipelines: HAAssistPipelines | undefined;
  onChange?: (newValue: HAAssistPipeline | undefined) => void;
}): JSX.Element | null {
  const p = props.pipelines;
  if (!p) {
    return null;
  }
  const onAction = (newValue: string) => {
    if (!props.onChange) {
      return;
    }
    props.onChange(p.pipelines?.find((p) => p.id === newValue));
  };
  return (
    <List.Dropdown tooltip="Assist" onChange={onAction}>
      {p?.pipelines?.map((a) => <List.Dropdown.Item key={a.id} title={a.name} value={a.id} />)}
    </List.Dropdown>
  );
}

export default function AssistCommand(): JSX.Element {
  const [searchText, setSearchText] = useState<string>("");
  const { connection, isLoading: isLoadingConnection } = useHAWSConnection();
  const { pipelines, isLoading: isLoadingPipeline } = useAssistPipelines(connection);
  const [conversations, setConversations] = useState<ConversationContent[]>(getInitialConversations());
  const { data: currentUser } = useCachedPromise(getHAWSCurrentUser);
  const [selectedPipeline, setSelectedPipeline] = useState<HAAssistPipeline>();
  const process = async () => {
    try {
      if (searchText.length <= 0) {
        showToast({
          style: Toast.Style.Failure,
          title: "Empty Requests are not allowed",
        });
        return;
      }
      if (!connection) {
        throw Error("No Home Assistant Connection");
      }
      const r: ConversationAnswer = await connection.sendMessagePromise({
        type: "conversation/process",
        text: searchText,
        agent_id: selectedPipeline?.conversation_engine,
        language: selectedPipeline?.language,
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
  const isLoading = isLoadingConnection || isLoadingPipeline;
  return (
    <List
      searchBarPlaceholder="Type your Request and Press Enter"
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarAccessory={<PipelinesDropdownList pipelines={pipelines} onChange={setSelectedPipeline} />}
    >
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
                    onAction={() => setConversations(getInitialConversations())}
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

function useHAWSConnection(): {
  error?: string;
  isLoading: boolean;
  connection?: Connection;
} {
  const [connection, setConnection] = useState<Connection>();
  const [error, setError] = useState<string>();
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    let didUnmount = false;

    async function fetchData() {
      if (didUnmount) {
        return;
      }

      setIsLoading(true);
      setError(undefined);

      try {
        const con = await getHAWSConnection();
        if (!didUnmount) {
          setConnection(con);
        }
      } catch (error) {
        if (!didUnmount) {
          setError(getErrorMessage(error));
        }
      } finally {
        if (!didUnmount) {
          setIsLoading(false);
        }
      }
    }

    fetchData();

    return () => {
      didUnmount = true;
    };
  }, []);

  return { error, isLoading, connection };
}

function useAssistPipelines(connection?: Connection): {
  error?: string;
  isLoading: boolean;
  pipelines?: HAAssistPipelines;
} {
  const [pipelines, setPipelines] = useState<HAAssistPipelines>();
  const [error, setError] = useState<string>();
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    let didUnmount = false;

    async function fetchData() {
      if (didUnmount) {
        return;
      }

      setIsLoading(true);
      setError(undefined);

      try {
        if (connection) {
          const data: HAAssistPipelines | undefined = await connection.sendMessagePromise({
            type: "assist_pipeline/pipeline/list",
          });
          if (!didUnmount) {
            setPipelines(data);
          }
        }
      } catch (error) {
        if (!didUnmount) {
          setError(getErrorMessage(error));
        }
      } finally {
        if (!didUnmount) {
          setIsLoading(false);
        }
      }
    }

    fetchData();

    return () => {
      didUnmount = true;
    };
  }, [connection]);

  return { error, isLoading, pipelines };
}
