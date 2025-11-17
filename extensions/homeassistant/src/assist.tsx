import { getHAWSConnection, ha } from "@lib/common";
import { getTranslation } from "@lib/translation";
import { getErrorMessage } from "@lib/utils";
import { Action, ActionPanel, Color, Icon, Image, List, Toast, clearSearchBar, showToast } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import React, { useEffect, useState } from "react";

interface PlainSpeech {
  speech: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

function getInitialConversations(language: string): ConversationContent[] {
  const ts = getTranslation({
    language: language,
    id: "ui.dialogs.voice_command.how_can_i_help",
    fallback: "How can I assist",
  });
  return [{ text: ts, author: Author.Assist, date: new Date() }];
}

function PipelinesDropdownList(props: {
  pipelines: HAAssistPipelines | undefined;
  onChange?: (newValue: HAAssistPipeline | undefined) => void;
}): React.ReactElement | null {
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
      {p?.pipelines?.map((a) => (
        <List.Dropdown.Item key={a.id} title={`${a.name} (${a.conversation_language})`} value={a.id} />
      ))}
    </List.Dropdown>
  );
}

export default function AssistCommand(): React.ReactElement {
  const [searchText, setSearchText] = useState<string>("");
  const { pipelines, isLoading: isLoadingPipeline, error } = useAssistPipelines();
  const [conversations, setConversations] = useState<ConversationContent[]>();
  const { data: currentUser } = useCachedPromise(getHAWSCurrentUser);
  const [selectedPipeline, setSelectedPipeline] = useState<HAAssistPipeline>();

  if (error) {
    showToast({ style: Toast.Style.Failure, title: "Error", message: error });
  }

  const process = async () => {
    try {
      if (searchText.length <= 0) {
        showToast({
          style: Toast.Style.Failure,
          title: "Empty Requests are not allowed",
        });
        return;
      }
      const connection = await getHAWSConnection();
      const r: ConversationAnswer = await connection.sendMessagePromise({
        type: "conversation/process",
        text: searchText,
        agent_id: selectedPipeline?.conversation_engine,
        language: selectedPipeline?.language,
      });
      clearSearchBar();
      const convs = conversations || [];
      const assistAnswer = r.response?.speech?.plain?.speech;
      if (assistAnswer) {
        setConversations([
          { text: assistAnswer, author: Author.Assist, date: new Date() },
          { text: searchText, author: Author.Me, date: new Date() },
          ...convs,
        ]);
      } else {
        setConversations([{ text: searchText, author: Author.Me, date: new Date() }, ...convs]);
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
    return { source: "account.svg", tintColor: Color.PrimaryText, mask: Image.Mask.Circle };
  };
  const isLoading = !error ? isLoadingPipeline || !conversations : false;
  return (
    <List
      searchBarPlaceholder="Enter your request"
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarAccessory={
        <PipelinesDropdownList
          pipelines={pipelines}
          onChange={(newLanguage: HAAssistPipeline | undefined) => {
            setSelectedPipeline(newLanguage);
            setConversations(newLanguage ? getInitialConversations(newLanguage.conversation_language) : []);
          }}
        />
      }
    >
      {selectedPipeline && (
        <List.Section title="Conversation">
          {conversations?.map((c, i) => (
            <List.Item
              key={i.toString()}
              title={c.text}
              icon={{
                value:
                  c.author === Author.Assist
                    ? { source: "home-assistant.svg", tintColor: Color.PrimaryText }
                    : userPicture(),
                tooltip: c.author === Author.Assist ? "Assist" : (currentUser?.name ?? ""),
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
                      shortcut={{ modifiers: ["opt"], key: "x" }}
                      onAction={() => setConversations(getInitialConversations(selectedPipeline.conversation_language))}
                    />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}

function useAssistPipelines(): {
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
        const con = await getHAWSConnection();
        const data: HAAssistPipelines | undefined = await con.sendMessagePromise({
          type: "assist_pipeline/pipeline/list",
        });
        if (!didUnmount) {
          setPipelines(data);
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

  return { error, isLoading, pipelines };
}
