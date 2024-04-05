import OpenAI from "openai";
import {
  Form,
  ActionPanel,
  Action,
  showToast,
  LocalStorage,
  List,
  useNavigation,
  Detail,
  getPreferenceValues,
} from "@raycast/api";
import { useState, useEffect } from "react";

interface Message {
  question: string;
  answer: string;
}

interface Conversation {
  id: string;
  messages: Message[];
}

function SavedConversations() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const { push } = useNavigation();

  useEffect(() => {
    const loadConversations = async () => {
      const data = await LocalStorage.getItem<string>("conversations");
      if (data) {
        setConversations(JSON.parse(data));
      }
    };

    loadConversations();
  }, []);

  const viewDetails = (conversation: Conversation) => {
    const conversationDetails = conversation.messages
      .map((msg) => `Q: ${msg.question}\n\nA: ${msg.answer}`)
      .join("\n\n");
    push(<Detail markdown={conversationDetails} />); // Title set in Detail if supported
  };

  const deleteConversation = async (index: number) => {
    const updatedConversations = conversations.filter((_, idx) => idx !== index);
    setConversations(updatedConversations);
    await LocalStorage.setItem("conversations", JSON.stringify(updatedConversations));
    showToast({ title: "Conversation deleted" });
  };

  return (
    <List isLoading={conversations.length === 0} searchBarPlaceholder="Search conversations...">
      {conversations.map((conversation, index) => {
        const firstQuestion = conversation.messages[0]?.question || "No question";
        const title = truncate(firstQuestion, 50); // Truncate the first question to 50 characters

        return (
          <List.Section key={conversation.id} title={`Conversation ${index + 1}`}>
            <List.Item
              title={title}
              subtitle={`${conversation.messages.length} messages`}
              actions={
                <ActionPanel>
                  <Action title="View Details" onAction={() => viewDetails(conversation)} />
                  <Action title="Delete" onAction={() => deleteConversation(index)} />
                </ActionPanel>
              }
              accessories={[{ icon: "chevron-right.png", text: "View" }]}
            />
          </List.Section>
        );
      })}
    </List>
  );
}

function truncate(text: string, length: number) {
  if (text.length <= length) {
    return text;
  }
  return text.substring(0, length) + "...";
}

export default function Command() {
  const [response, setResponse] = useState<string>("");
  const [question, setQuestion] = useState<string>("");
  const [model, setModel] = useState<string>("gpt-4");
  const [maxTokens, setMaxTokens] = useState<number>(1000);
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);
  const preferences = getPreferenceValues();
  const apiKey = preferences.apiKey;

  const { push } = useNavigation();

  const handleSaveConversation = async () => {
    if (currentConversation) {
      const storedConversations = await LocalStorage.getItem<string>("conversations");
      const conversations: Conversation[] = storedConversations ? JSON.parse(storedConversations) : [];

      const updatedConversations = conversations.filter((convo) => convo.id !== currentConversation.id);
      updatedConversations.push(currentConversation);

      await LocalStorage.setItem("conversations", JSON.stringify(updatedConversations));
      showToast({ title: "Conversation saved" });
    }
  };

  async function handleSubmit(values: { textarea: string }) {
    const inputQuestion = values.textarea;
    setQuestion(inputQuestion);
    showToast({ title: "Submitting..." });
    const openai = new OpenAI({ apiKey });

    try {
      let messages: Array<{ role: "user" | "system"; content: string }> = [];

      if (currentConversation) {
        messages = currentConversation.messages.flatMap(({ question, answer }) => [
          { role: "system", content: question },
          { role: "user", content: answer },
        ]);
      }

      messages.push({ role: "user", content: inputQuestion });

      const completion = await openai.chat.completions.create({
        model: model,
        messages: messages,
        temperature: 0.5,
        max_tokens: maxTokens,
      });

      const choiceMessage = completion.choices[0]?.message;
      const answer = choiceMessage?.content ?? "No valid response text found.";
      setResponse(answer);

      const updatedMessages = [...(currentConversation?.messages || []), { question: inputQuestion, answer }];
      setCurrentConversation({ id: currentConversation?.id || Date.now().toString(), messages: updatedMessages });
      setQuestion("");
    } catch (error) {
      console.error("Error fetching the ChatGPT response:", error);
      showToast({ title: "Error", message: "Failed to fetch response" });
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Ask ChatGPT" onSubmit={handleSubmit} />
          <Action title="Save Conversation" onAction={handleSaveConversation} />
          <Action title="View Saved Conversations" onAction={() => push(<SavedConversations />)} />
        </ActionPanel>
      }
    >
      {response && (
        <>
          <Form.Description title="ChatGPT Response" text={response} />
          <Form.Separator />
        </>
      )}

      <Form.TextArea
        id="textarea"
        title="Message"
        placeholder="What would you like to ask?"
        value={question}
        onChange={setQuestion}
      />

      <Form.Dropdown id="model" title="Model" value={model} onChange={setModel}>
        <Form.Dropdown.Item title="GPT-4" value="gpt-4" />
        <Form.Dropdown.Item title="GPT-4 Turbo Preview" value="gpt-4-turbo-preview" />
        <Form.Dropdown.Item title="GPT-3.5 Turbo" value="gpt-3.5-turbo" />
      </Form.Dropdown>

      <Form.TextField
        id="maxTokens"
        title="Max Tokens"
        placeholder="Maximum number of tokens (default: 1000)"
        value={maxTokens.toString()}
        onChange={(newValue) => setMaxTokens(parseInt(newValue, 10) || 1000)}
        info="Determines how much you will be charged: 100 tokens ~= 75 words"
      />
    </Form>
  );
}
