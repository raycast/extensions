import { Form, getPreferenceValues, ActionPanel, Action, Detail } from "@raycast/api";
import { useForm, FormValidation } from "@raycast/utils";
import { ModelSettings } from "./util/apiHelper";
import { useFetch } from "@raycast/utils";
import { useState, useEffect } from "react";
import { fetchStreamingApiResponse, StreamResponseEventEmitter } from "./util/apiHelper";

interface ChatFormValues {
  model: string;
  systemPrompt: string;
  userPrompt: string;
  frequency_penalty: string;
  top_logprobs: string;
  max_tokens: string;
  n: string;
  presence_penalty: string;
  stop: string;
  temperature: string;
  top_p: string;
}

export default function CustomChatPromptCommand() {
  const preferences = getPreferenceValues<Preferences>();
  const [response, setResponse] = useState<string>("");
  const [showResult, setShowResult] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [streamEmitter, setStreamEmitter] = useState<StreamResponseEventEmitter | null>(null);

  const { data: models } = useFetch<ModelSettings[]>(`${preferences.apiUrl}/model-settings`, {
    headers: {
      Accept: "application/json",
      Authorization: "Bearer " + preferences.apiKey,
    },
  });

  const chatModels = models?.filter((model) => model.chat && model.status === "available") || [];

  // Set up stream event listeners
  useEffect(() => {
    if (!streamEmitter) return;

    const onChunk = (chunk: string) => {
      setResponse((prev) => prev + chunk);
    };

    const onError = () => {
      setIsLoading(false);
    };

    const onDone = () => {
      setIsLoading(false);
    };

    streamEmitter.on("chunk", onChunk);
    streamEmitter.on("error", onError);
    streamEmitter.on("done", onDone);

    return () => {
      streamEmitter.removeAllListeners();
    };
  }, [streamEmitter]);

  const { handleSubmit, itemProps } = useForm<ChatFormValues>({
    async onSubmit(values) {
      setIsLoading(true);
      setShowResult(true);
      setResponse("");

      // Create a new emitter for this streaming session
      const emitter = new StreamResponseEventEmitter();
      setStreamEmitter(emitter);

      // Start the streaming request
      fetchStreamingApiResponse(
        values.systemPrompt,
        values.userPrompt,
        values.model,
        emitter,
        Number(values.max_tokens),
        Number(values.temperature),
        Number(values.frequency_penalty),
        Number(values.top_p),
        Number(values.presence_penalty),
      );
    },
    validation: {
      model: FormValidation.Required,
      systemPrompt: FormValidation.Required,
      userPrompt: FormValidation.Required,
      frequency_penalty: (value) => {
        const num = Number(value);
        if (isNaN(num) || num < -2 || num > 2) return "Must be between -2 and 2";
      },
      max_tokens: (value) => {
        const num = Number(value);
        if (isNaN(num) || num < 1) return "Must be greater than 0";
      },
      presence_penalty: (value) => {
        const num = Number(value);
        if (isNaN(num) || num < -2 || num > 2) return "Must be between -2 and 2";
      },
      temperature: (value) => {
        const num = Number(value);
        if (isNaN(num) || num < 0 || num > 2) return "Must be between 0 and 2";
      },
      top_p: (value) => {
        const num = Number(value);
        if (isNaN(num) || num < 0 || num > 1) return "Must be between 0 and 1";
      },
    },
  });

  if (showResult) {
    return (
      <Detail
        isLoading={isLoading}
        markdown={response}
        actions={
          <ActionPanel>
            <Action.CopyToClipboard content={response} />
            <Action title="New Chat" onAction={() => setShowResult(false)} />
          </ActionPanel>
        }
      />
    );
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Submit" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Dropdown
        title="Model"
        storeValue={true}
        info="Select the AI model to use for this chat"
        {...itemProps.model}
      >
        {chatModels.map((model) => (
          <Form.Dropdown.Item key={model.name} value={model.name} title={model.name} />
        ))}
      </Form.Dropdown>
      <Form.TextArea
        title="System Prompt"
        storeValue={true}
        info="Instructions that define how the model should behave and respond"
        placeholder="You are a helpful, knowledgeable assistant..."
        {...itemProps.systemPrompt}
      />
      <Form.TextArea
        title="User Prompt"
        storeValue={true}
        info="Your message or question to the model"
        placeholder="What can you tell me about..."
        {...itemProps.userPrompt}
      />
      <Form.Separator />
      <Form.TextField
        title="Temperature"
        storeValue={true}
        defaultValue="0"
        info="Controls randomness: 0 = more deterministic, 2 = maximum creativity (0-2)"
        {...itemProps.temperature}
      />
      <Form.TextField
        title="Top P"
        storeValue={true}
        defaultValue="1"
        info="Controls diversity via nucleus sampling: lower values = more focused (0-1)"
        {...itemProps.top_p}
      />
      <Form.TextField
        title="Max Tokens"
        storeValue={true}
        defaultValue="1024"
        info="Maximum number of tokens in the response"
        {...itemProps.max_tokens}
      />
      <Form.TextField
        title="Frequency Penalty"
        storeValue={true}
        defaultValue="0"
        info="Penalizes frequent tokens: higher values reduce repetition (-2 to 2)"
        {...itemProps.frequency_penalty}
      />
      <Form.TextField
        title="Presence Penalty"
        storeValue={true}
        defaultValue="0"
        info="Penalizes tokens already used: higher values encourage new topics (-2 to 2)"
        {...itemProps.presence_penalty}
      />
    </Form>
  );
}
