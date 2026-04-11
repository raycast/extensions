import { useState, useMemo } from "react";
import {
  Action,
  ActionPanel,
  confirmAlert,
  Icon,
  Keyboard,
  List,
  showToast,
  Toast,
  useNavigation,
  getPreferenceValues,
  openCommandPreferences,
} from "@raycast/api";
import { generateStreamedResponse } from "./api/openrouter";
import { useConversations } from "./hooks/useConversations";
import { useQuestions } from "./hooks/useQuestions";
import { v4 as uuidv4 } from "uuid";
import { Question } from "./types/question";
import { isValidQuestionPrompt } from "./utils/chat";
import { ChatPreferences } from "./types/preferences";

interface ChatProps {
  conversationId?: string;
}

export default function AskQuestion({ conversationId }: ChatProps) {
  const { push } = useNavigation();
  const preferences = getPreferenceValues<ChatPreferences>();

  const isConfigured = useMemo(() => {
    return !!preferences.openrouterApiKey && !!preferences.defaultModel;
  }, [preferences]);

  const [searchQuestion, setSearchQuestion] = useState<Question>({
    id: uuidv4(),
    conversationId: conversationId ?? uuidv4(),
    prompt: "",
    response: "",
    createdAt: new Date().toISOString(),
    isStreaming: true,
  });
  const [output, setOutput] = useState<string>("");
  const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(null);
  const [isAskingQuestion, setIsAskingQuestion] = useState<boolean>(false);
  const [isFirstQuestion, setIsFirstQuestion] = useState<boolean>(!conversationId);

  const { add: addConversation } = useConversations();
  const {
    isLoading: isLoadingQuestions,
    getByConversationId,
    add: addQuestion,
    update: updateQuestion,
    remove: removeQuestion,
    refresh: refreshQuestions,
  } = useQuestions();

  const questions = getByConversationId(searchQuestion.conversationId);
  const [abortController, setAbortController] = useState<AbortController | null>(null);

  const handleAskQuestion = async (question: Question) => {
    if (!question.prompt) return;

    if (isFirstQuestion) {
      await addConversation({
        id: conversationId ?? question.conversationId,
        title: question.prompt.substring(0, 50),
        createdAt: new Date().toISOString(),
      });
    }

    setOutput("");
    setIsAskingQuestion(true);
    const abortController = new AbortController();
    setAbortController(abortController);

    const allQuestions = [question, ...questions].reverse();
    await addQuestion(question);
    setSelectedQuestionId(question.id);

    setSearchQuestion((prev) => ({
      ...prev,
      id: uuidv4(),
      prompt: "",
      response: "",
      createdAt: new Date().toISOString(),
    }));

    try {
      const handleStreamingOutput = (output: string) => {
        setOutput(output);
        updateQuestion({ ...question, response: output, isStreaming: true }, true);
      };

      const response = await generateStreamedResponse(
        allQuestions,
        question.id,
        handleStreamingOutput,
        undefined,
        abortController.signal,
      );
      if (response) {
        await updateQuestion({ ...question, response, isStreaming: false });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
      showToast({ style: Toast.Style.Failure, title: "Error", message: errorMessage });
    } finally {
      setIsAskingQuestion(false);
      setAbortController(null);
      if (isFirstQuestion) setIsFirstQuestion(false);
    }
  };

  const handleStopResponse = () => {
    if (abortController) {
      abortController.abort();
      setAbortController(null);
    }
  };

  const renderActions = (question?: Question) => (
    <ActionPanel>
      <ActionPanel.Section>
        {!isAskingQuestion ? (
          <>
            {isValidQuestionPrompt(searchQuestion.prompt) && (
              <Action
                title="Send Message"
                icon={Icon.Message}
                onAction={() => handleAskQuestion({ ...searchQuestion })}
              />
            )}
            <Action
              title="New Chat"
              icon={Icon.Plus}
              shortcut={Keyboard.Shortcut.Common.New}
              onAction={() => push(<AskQuestion />, async () => refreshQuestions())}
            />
          </>
        ) : (
          <Action title="Stop Generating" icon={Icon.Stop} onAction={handleStopResponse} />
        )}
      </ActionPanel.Section>
      {question && (
        <ActionPanel.Section>
          <Action.CopyToClipboard content={question.response} title="Copy Response" />
          <Action
            title="Delete Message"
            icon={Icon.Trash}
            style={Action.Style.Destructive}
            onAction={() =>
              confirmAlert({
                title: "Delete message?",
                primaryAction: { title: "Delete", onAction: () => removeQuestion(question) },
              })
            }
          />
        </ActionPanel.Section>
      )}
    </ActionPanel>
  );

  return (
    <List
      isShowingDetail={questions.length !== 0}
      searchText={searchQuestion.prompt}
      onSearchTextChange={(prompt) => setSearchQuestion((prev) => ({ ...prev, prompt }))}
      searchBarPlaceholder="Type a message..."
      isLoading={isLoadingQuestions}
      selectedItemId={selectedQuestionId ?? undefined}
      actions={renderActions()}
    >
      {!isConfigured ? (
        <List.EmptyView
          title="Configuration Required"
          description="Please set your OpenRouter API Key and Model ID in preferences."
          icon={Icon.Gear}
          actions={
            <ActionPanel>
              <Action title="Open Preferences" icon={Icon.Gear} onAction={openCommandPreferences} />
            </ActionPanel>
          }
        />
      ) : questions.length === 0 ? (
        <List.EmptyView
          title="Start a Conversation"
          description="Type a message above to get started."
          icon={Icon.Bubble}
        />
      ) : (
        questions.map((q) => (
          <List.Item
            id={q.id}
            key={q.id}
            title={q.prompt}
            accessories={q.isStreaming ? [{ icon: Icon.CircleProgress }] : undefined}
            detail={<List.Item.Detail markdown={q.id === selectedQuestionId ? q.response || output : q.response} />}
            actions={renderActions(q)}
          />
        ))
      )}
    </List>
  );
}
