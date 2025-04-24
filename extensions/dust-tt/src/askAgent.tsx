import data from "@emoji-mart/data";
import type { EmojiMartData as EmojiData } from "@emoji-mart/data";
import {
  Action,
  ActionPanel,
  Color,
  Form,
  getSelectedText,
  Icon,
  LaunchType,
  List,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { AgentConfigurationType, AgentType, getAgentScopeConfig } from "./utils";
import AskDustCommand from "./ask";
import { useCachedPromise, useForm, useFrecencySorting } from "@raycast/utils";
import { useCallback, useEffect, useState } from "react";
import { getDustClient, withPickedWorkspace } from "./dust_api/oauth";
import { DustAPI } from "@dust-tt/client";

interface AskAgentQuestionFormValues {
  question: string;
}

function useAgents(dustApi: DustAPI) {
  const [error, setError] = useState<string | undefined>(undefined);

  const {
    data: agents,
    isLoading,
    mutate,
  } = useCachedPromise(async () => {
    const r = await dustApi.getAgentConfigurations({ view: "list" });

    if (r.isErr()) {
      setError(r.error.message);
      return undefined;
    } else {
      return r.value.filter((agent) => agent.status === "active");
    }
  }, []);

  return { agents: agents, isLoading, mutate, error: error };
}

function subtitutePictureUrlIfEmoji(url: string) {
  const EMOJI_URL_REGEXP = /\/emojis\/bg-([^/]*)\/([^/]*)\/([^/.]*)/;
  const emojiData: EmojiData = data as EmojiData;

  const match = url.match(EMOJI_URL_REGEXP);
  if (match) {
    const [, , id, unified] = match;

    const emojiUnicodes = Object.values(emojiData.emojis).find((e) => e.id === id);
    if (!emojiUnicodes) {
      return url;
    }

    const skinEmoji = emojiUnicodes.skins.find((s) => s.unified === unified);
    if (!skinEmoji) {
      return url;
    }

    return `https://emoji.beeimg.com/${skinEmoji.native}/128/emojidex`;
  }

  return url;
}

export function useGetSelectedText() {
  const [selectedText, setSelectedText] = useState<string | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  useEffect(() => {
    async function fetchHighlightedText() {
      let text: string | undefined;
      try {
        text = await getSelectedText();
      } catch (error) {
        setSelectedText("");
      }
      if (text) {
        await showToast(Toast.Style.Success, "Used highlighted text as question.");
        setSelectedText(text);
      }
      setIsLoading(false);
    }
    fetchHighlightedText();
  }, []);
  return { selectedText: selectedText, isLoading: isLoading };
}

export function AskAgentQuestionForm({ agent, initialQuestion }: { agent: AgentType; initialQuestion?: string }) {
  const trimmedQuestion = initialQuestion?.trim();
  const { push } = useNavigation();
  const { handleSubmit, itemProps } = useForm<AskAgentQuestionFormValues>({
    initialValues: { question: trimmedQuestion ? trimmedQuestion + "\n\n" : "" },
    onSubmit(values) {
      push(
        <AskDustCommand launchType={LaunchType.UserInitiated} arguments={{ agent: agent, search: values.question }} />,
      );
    },
    validation: {
      question: (value) => {
        if (!value) {
          return "Ask a question";
        }
      },
    },
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Ask" shortcut={{ key: "return", modifiers: [] }} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description title="Assistant" text={`@${agent.name}`} />
      <Form.Description text={agent.description} />
      <Form.TextArea
        title="Question"
        {...itemProps.question}
        placeholder="Type your question here..."
        info="Press ⌥ + ↵ (Option + Return) to go to the next line."
      />
    </Form>
  );
}

export default withPickedWorkspace(function AskDustAgentCommand() {
  const dustClient = getDustClient();
  const { agents, error, isLoading: isLoadingAgents, mutate: mutateAgents } = useAgents(dustClient);
  const { selectedText, isLoading: isLoadingSelectedText } = useGetSelectedText();

  if (error) {
    showToast({ style: Toast.Style.Failure, title: `Could not refresh agents list: ${error}` });
  }
  if (!isLoadingAgents && agents) {
    showToast({ style: Toast.Style.Success, title: `Loaded ${Object.values(agents).length} agents` });
  }

  const saveFavoriteAgent = useCallback(async (agent: { sId: string; name: string }) => {
    const r = await dustClient.request({
      method: "PATCH",
      path: `/assistant/agent_configurations/${agent.sId}/`,
      body: { userFavorite: true },
    });
    if (r.isOk()) {
      void mutateAgents();
      showToast({ style: Toast.Style.Success, title: `${agent.name} added as favorite` });
    } else {
      showToast({ style: Toast.Style.Failure, title: `Could not add ${agent.name} as favorite: ${r.error.message}` });
    }
  }, []);

  const removeFavoriteAgent = useCallback(async (agent: { sId: string; name: string }) => {
    const r = await dustClient.request({
      method: "PATCH",
      path: `/assistant/agent_configurations/${agent.sId}/`,
      body: { userFavorite: false },
    });
    if (r.isOk()) {
      void mutateAgents();
      showToast({ style: Toast.Style.Success, title: `${agent.name} removed as favorite` });
    } else {
      showToast({
        style: Toast.Style.Failure,
        title: `Could not remove ${agent.name} as favorite: ${r.error.message}`,
      });
    }
  }, []);

  const { data: sortedAgents, visitItem } = useFrecencySorting(agents, {
    key: (agent) => agent.sId,
    sortUnvisited: (a, b) =>
      a.userFavorite != b.userFavorite ? (a.userFavorite ? -1 : 1) : a.name.localeCompare(b.name),
  });

  const isLoading = isLoadingAgents || isLoadingSelectedText;
  return (
    <List isLoading={isLoading}>
      {(!sortedAgents || isLoading) && <List.EmptyView icon={Icon.XMarkCircle} title="No Dust agents loaded" />}

      {sortedAgents?.map((agent) => {
        return (
          <AgentListItem
            agent={agent}
            isFavorite={agent.userFavorite}
            selectedText={selectedText}
            onVisit={() => visitItem(agent)}
            onSaveFavorite={() => saveFavoriteAgent(agent)}
            onRemoveFavorite={() => removeFavoriteAgent(agent)}
            key={agent.sId}
          />
        );
      })}
    </List>
  );
});

function AgentListItem({
  agent,
  isFavorite,
  selectedText,
  onVisit,
  onSaveFavorite,
  onRemoveFavorite,
}: {
  agent: AgentConfigurationType;
  isFavorite: boolean;
  selectedText: string | undefined;
  onVisit: () => void;
  onSaveFavorite: () => Promise<void>;
  onRemoveFavorite: () => Promise<void>;
}) {
  if (!agent) {
    return null;
  }

  const config = getAgentScopeConfig(agent.scope);

  return (
    <List.Item
      key={agent.sId}
      title={`@${agent.name}`}
      subtitle={agent.description}
      icon={{ source: subtitutePictureUrlIfEmoji(agent.pictureUrl), fallback: Icon.Stars }}
      accessories={[
        { icon: isFavorite ? { source: Icon.Star, tintColor: Color.Yellow } : null },
        { tag: { value: config.label, color: config.color } },
        { icon: Icon.ArrowRight },
      ]}
      actions={
        <ActionPanel>
          {selectedText ? (
            <>
              <Action.Push
                title="Edit Question Before Asking"
                icon={Icon.Highlight}
                shortcut={{ key: "return", modifiers: [] }}
                target={<AskAgentQuestionForm agent={agent} initialQuestion={selectedText} />}
              />
              <Action.Push
                title="Ask for Selected Text"
                icon={Icon.Message}
                shortcut={{ key: "return", modifiers: ["cmd"] }}
                target={
                  <AskDustCommand
                    launchType={LaunchType.UserInitiated}
                    arguments={{ agent: agent, search: selectedText }}
                  />
                }
                onPush={onVisit}
              />
            </>
          ) : (
            <Action.Push
              title="Ask"
              icon={Icon.Highlight}
              shortcut={{ key: "return", modifiers: [] }}
              target={<AskAgentQuestionForm agent={agent} />}
            />
          )}
          {!isFavorite && (
            <Action
              title="Add to Favorites"
              icon={Icon.Star}
              onAction={onSaveFavorite}
              shortcut={{ key: "d", modifiers: ["cmd"] }}
            />
          )}
          {isFavorite && (
            <Action
              title="Remove from Favorites"
              icon={Icon.StarDisabled}
              onAction={onRemoveFavorite}
              style={Action.Style.Destructive}
              shortcut={{ key: "d", modifiers: ["cmd"] }}
            />
          )}
        </ActionPanel>
      }
    />
  );
}
