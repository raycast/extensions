import { ActionPanel, getPreferenceValues, List, showToast, Toast, useNavigation } from "@raycast/api";
import { NotDiamond } from "notdiamond";
import { useEffect, useState } from "react";
import { useQuestion } from "./hooks/useQuestion";
import { Chat } from "./types/chat";
import { ChatView } from "./components/chat";
import { PreferencesActionSection } from "./components/preferences-action-section";
import { v4 as uuidv4 } from "uuid";
import { getSendMessageActionPanel } from "./actions/send-message";
import { getSelectModelActionPanel, SelectModel } from "./actions/select-model";
import { useCachedState } from "@raycast/utils";
import { ProviderModelMap } from "./constants/provider";

export default function Command() {
  const { push } = useNavigation();
  const [selectedModels] = useCachedState<string[]>("selected-models", []);
  const [chats, setChats] = useState<Chat[]>([]);
  const preferences = getPreferenceValues<Preferences>();
  const [error, setError] = useState<Error>();
  const [isLoading, setIsLoading] = useState<boolean>();
  const question = useQuestion({ initialQuestion: "", disableAutoLoad: true });

  useEffect(() => {
    if (isLoading != null) {
      if (isLoading) {
        showToast({
          style: Toast.Style.Animated,
          title: "Generating...",
        });
      } else {
        showToast({
          style: Toast.Style.Success,
          title: "Generated",
        });
      }
    }
  }, [isLoading]);

  useEffect(() => {
    if (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Something went wrong",
        message: error.message,
      });

      if (error.message.includes("No LLM providers specified")) {
        push(<SelectModel preferences={preferences} />);
      }
    }
  }, [error]);

  const getProviderForModel = (model: string): keyof typeof ProviderModelMap => {
    for (const [provider, models] of Object.entries(ProviderModelMap)) {
      if (models.includes(model)) {
        return provider;
      }
    }
    return "unknown";
  };

  async function returnBlock() {
    if (!question.data) {
      showToast({
        style: Toast.Style.Failure,
        title: "Please enter a question",
      });
      return;
    }

    setIsLoading(true);
    const newChat: Chat = {
      id: uuidv4(),
      answer: "",
      question: question.data,
      created_at: new Date().toISOString(),
      provider: "",
      model: "",
    };
    const notDiamondClient = new NotDiamond({
      apiKey: preferences.apiKey,
      llmKeys: {
        openai: preferences.openAIApiKey,
        anthropic: preferences.anthropicApiKey,
        perplexity: preferences.perplexityApiKey,
      },
    });

    setChats((prev) => [...prev, newChat]);

    try {
      const result = await notDiamondClient.stream({
        messages: [{ content: question.data, role: "user" }],
        llmProviders: selectedModels.map((model) => ({
          provider: getProviderForModel(model),
          model: model,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        })) as any,
        ...(preferences.tradeoff && { tradeoff: preferences.tradeoff as "latency" | "cost" }),
      });

      if (result) {
        let fullAnswer = "";
        for await (const chunk of result.stream) {
          fullAnswer += chunk;
        }

        setChats((prev) =>
          prev.map((chat) =>
            chat.id === newChat.id
              ? { ...chat, answer: fullAnswer, model: result?.provider.model, provider: result?.provider.provider }
              : chat,
          ),
        );
        question.update("");
      }
    } catch (error) {
      // remove the new chat
      setChats((prev) => prev.filter((chat) => chat.id !== newChat.id));
      setError(error as Error);
    }
    setIsLoading(false);
  }

  return (
    <List
      searchText={question.data}
      throttle={false}
      filtering={false}
      isShowingDetail={chats.length > 0 ? true : false}
      isLoading={isLoading}
      onSearchTextChange={question.update}
      navigationTitle={"Ask"}
      searchBarPlaceholder={"Ask a question..."}
      actions={
        !question.data ? (
          <ActionPanel>
            {getSelectModelActionPanel(preferences)}
            <PreferencesActionSection />
          </ActionPanel>
        ) : (
          getSendMessageActionPanel({ onAction: returnBlock, preferences, currentQuestion: question.data, answer: "" })
        )
      }
    >
      <ChatView data={chats} onAction={returnBlock} preferences={preferences} currentQuestion={question.data} />
    </List>
  );
}
