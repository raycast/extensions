import {
  Icon,
  Form,
  ActionPanel,
  Action,
  showToast,
  getPreferenceValues,
  Toast,
  openCommandPreferences,
} from "@raycast/api";
import { useState } from "react";
import { Configuration, OpenAIApi } from "openai";
import request from "axios";
import { encode } from "./encoder";
import * as example from "../assets/examples";
import * as infoMessages from "./info-messages";

interface Preferences {
  openAiApiKey: string;
}

interface gptFormValues {
  prompt: string;
  model: string;
  temperature: number;
  maxTokens: number;
  topP: number;
  frequencyPenalty: number;
  presencePenalty: number;
}

interface gptCompletion {
  status: number;
  statusText: string;
  request?: any;
  data: any;
}

interface formValues {
  target: {
    id: string;
    value?: string;
  };
}

const configuration = new Configuration({
  apiKey: getPreferenceValues<Preferences>().openAiApiKey,
});
const openai = new OpenAIApi(configuration);

export default function Command() {
  const [textPrompt, setTextPrompt] = useState("");
  const [answer, setAnswer] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [numTokens, setNumTokens] = useState<number | undefined>(0);
  const [promptError, setPromptError] = useState<string | undefined>();
  const [temperatureError, setTemperatureError] = useState<string | undefined>();
  const [maxTokensError, setMaxTokensError] = useState<string | undefined>();
  const [topPError, setTopPError] = useState<string | undefined>();
  const [frequencyPenaltyError, setFrequencyPenaltyError] = useState<string | undefined>();
  const [presencePenaltyError, setPresencePenaltyError] = useState<string | undefined>();

  function dropPromptErrorIfNeeded() {
    if (promptError && promptError.length > 0) {
      setPromptError(undefined);
    }
  }

  function dropTemperatureErrorIfNeeded() {
    if (temperatureError && temperatureError.length > 0) {
      setTemperatureError(undefined);
    }
  }

  function dropMaxTokensErrorIfNeeded() {
    if (maxTokensError && maxTokensError.length > 0) {
      setMaxTokensError(undefined);
    }
  }

  function dropTopPErrorIfNeeded() {
    if (topPError && topPError.length > 0) {
      setTopPError(undefined);
    }
  }

  function dropFrequencyPenaltyErrorIfNeeded() {
    if (frequencyPenaltyError && frequencyPenaltyError.length > 0) {
      setFrequencyPenaltyError(undefined);
    }
  }

  function dropPresencePenaltyErrorIfNeeded() {
    if (presencePenaltyError && presencePenaltyError.length > 0) {
      setPresencePenaltyError(undefined);
    }
  }

  const updatePromptAndTokens = (prompt: string) => {
    setTextPrompt(prompt);
    dropPromptErrorIfNeeded();
    const encoded = encode(prompt);
    setNumTokens(encoded.length);
  };

  const handleSubmit = async (formRequest: gptFormValues) => {
    await showToast({ title: "Prompt Sent" });
    setIsLoading(true);
    try {
      const completion: gptCompletion = await openai.createCompletion({
        model: formRequest.model,
        prompt: formRequest.prompt,
        temperature: Number(formRequest.temperature),
        max_tokens: Number(formRequest.maxTokens),
        top_p: Number(formRequest.topP),
        frequency_penalty: Number(formRequest.frequencyPenalty),
        presence_penalty: Number(formRequest.presencePenalty),
      });
      await showToast({ title: "Answer Received" });
      const response = completion.data.choices[0].text;
      setTextPrompt(textPrompt + response);
      setAnswer(response);
      setNumTokens(completion.data.usage.total_tokens);
    } catch (error) {
      if (request.isAxiosError(error) && error.response) {
        await showToast({ style: Toast.Style.Failure, title: "Error:", message: error.message });
      } else {
        await showToast({ style: Toast.Style.Failure, title: "Error:", message: "Something went wrong" });
      }
    }
    setIsLoading(false);
  };

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Send Prompt"
            icon={Icon.Paperclip}
            onSubmit={(values: gptFormValues) => handleSubmit(values)}
          />
          <Action.CopyToClipboard
            title="Copy Answer to Clipboard"
            content={answer}
            shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
          />
          <ActionPanel.Submenu title="Load an Example" icon={Icon.Book}>
            <Action title="Grammatical Standard English" onAction={() => updatePromptAndTokens(example.grammatical)} />
            <Action title="Summarize for a 2nd Grader" onAction={() => updatePromptAndTokens(example.summarize)} />
            <Action title="Text to Command" onAction={() => updatePromptAndTokens(example.text2command)} />
            <Action title="Q&A" onAction={() => updatePromptAndTokens(example.qa)} />
            <Action title="Translation to Other Languages" onAction={() => updatePromptAndTokens(example.translate)} />
            <Action title="Parse Unstructured Data" onAction={() => updatePromptAndTokens(example.parseUnstructured)} />
            <Action title="Classification" onAction={() => updatePromptAndTokens(example.classify)} />
            <Action title="Chat" onAction={() => updatePromptAndTokens(example.chat)} />
          </ActionPanel.Submenu>
          <Action.OpenInBrowser title="Check Examples at OpenAI Website" url="https://beta.openai.com/examples" />
          <Action title="Change API Key" icon={Icon.Key} onAction={() => openCommandPreferences()} />
        </ActionPanel>
      }
    >
      <Form.Description text="This is your AI playground" />
      <Form.TextArea
        id="prompt"
        title="Prompt"
        placeholder="Enter your prompt"
        value={textPrompt}
        error={promptError}
        onChange={(value) => updatePromptAndTokens(value)}
        onBlur={(event) => {
          if (event.target.value?.length == 0) {
            setPromptError("Prompt is required");
          } else {
            dropPromptErrorIfNeeded();
          }
        }}
      />
      <Form.Description text={`Prompt token count: ${numTokens}`} />
      <Form.Separator />
      <Form.Description text="These are the model parameters" />
      <Form.Dropdown id="model" title="AI Model" info={infoMessages.model}>
        <Form.Dropdown.Item value="text-davinci-002" title="text-davinci-002" />
        <Form.Dropdown.Item value="text-curie-001" title="text-curie-001" />
        <Form.Dropdown.Item value="text-babbage-001" title="text-babbage-001" />
        <Form.Dropdown.Item value="text-ada-001" title="text-ada-001" />
      </Form.Dropdown>
      <Form.TextField
        id="temperature"
        title="Temperature"
        info={infoMessages.temperature}
        defaultValue="0.7"
        error={temperatureError}
        onChange={dropTemperatureErrorIfNeeded}
        onBlur={(event: formValues) => {
          if (
            isNaN(Number(event.target.value)) ||
            event.target.value?.length == 0 ||
            Number(event.target.value) < 0 ||
            Number(event.target.value) > 1
          ) {
            setTemperatureError("Value should be a float between 0 and 1");
          } else {
            dropTemperatureErrorIfNeeded();
          }
        }}
      />
      <Form.TextField
        id="maxTokens"
        title="Maximum Tokens"
        info={infoMessages.maxTokens}
        defaultValue="256"
        error={maxTokensError}
        onChange={dropMaxTokensErrorIfNeeded}
        onBlur={(event: formValues) => {
          if (
            isNaN(Number(event.target.value)) ||
            !Number.isInteger(Number(event.target.value)) ||
            event.target.value?.length == 0 ||
            Number(event.target.value) < 0 ||
            Number(event.target.value) > 4096
          ) {
            setMaxTokensError("Value should be an integer between 0 and 4096");
          } else {
            dropMaxTokensErrorIfNeeded();
          }
        }}
      />
      <Form.TextField
        id="topP"
        title="Top P"
        info={infoMessages.topP}
        defaultValue="1"
        error={topPError}
        onChange={dropTopPErrorIfNeeded}
        onBlur={(event: formValues) => {
          if (
            isNaN(Number(event.target.value)) ||
            event.target.value?.length == 0 ||
            Number(event.target.value) < 0 ||
            Number(event.target.value) > 1
          ) {
            setTopPError("Value should be a float between 0 and 1");
          } else {
            dropTopPErrorIfNeeded();
          }
        }}
      />
      <Form.TextField
        id="frequencyPenalty"
        title="Frequency Penalty"
        info={infoMessages.frequencyPenalty}
        defaultValue="0"
        error={frequencyPenaltyError}
        onChange={dropFrequencyPenaltyErrorIfNeeded}
        onBlur={(event: formValues) => {
          if (
            isNaN(Number(event.target.value)) ||
            event.target.value?.length == 0 ||
            Number(event.target.value) < -2 ||
            Number(event.target.value) > 2
          ) {
            setFrequencyPenaltyError("Value should be a float between -2 and 2");
          } else {
            dropFrequencyPenaltyErrorIfNeeded();
          }
        }}
      />
      <Form.TextField
        id="presencePenalty"
        title="Presence Penalty"
        info={infoMessages.presencePenalty}
        defaultValue="0"
        error={presencePenaltyError}
        onChange={dropPresencePenaltyErrorIfNeeded}
        onBlur={(event: formValues) => {
          if (
            isNaN(Number(event.target.value)) ||
            event.target.value?.length == 0 ||
            Number(event.target.value) < -2 ||
            Number(event.target.value) > 2
          ) {
            setPresencePenaltyError("Value should be a float between -2 and 2");
          } else {
            dropPresencePenaltyErrorIfNeeded();
          }
        }}
      />
    </Form>
  );
}
