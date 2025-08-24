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
  openAiBasePath: string | undefined;
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

interface modelTokenLimit {
  [model: string]: number;
}

const configuration = new Configuration({
  apiKey: getPreferenceValues<Preferences>().openAiApiKey,
  basePath: getPreferenceValues<Preferences>().openAiBasePath || undefined,
});
const openai = new OpenAIApi(configuration);

export default function Command() {
  const maxTokensGPT40125Preview = 128000;
  const maxTokensGPT41106Preview = 128000;
  const maxTokensGPT35Turbo0125 = 16385;
  const maxTokensGPT35Turbo1106 = 16385;
  const maxTokensGPT4 = 8192;
  const maxTokensGPT35Turbo = 4096;
  const maxTokensBabbageDavinci = 16384;
  const [textPrompt, setTextPrompt] = useState("");
  const [answer, setAnswer] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [numTokensPrompt, setNumTokensPrompt] = useState<number | undefined>(0);
  const [maxTokens, setMaxTokens] = useState<number>(256);
  const [promptError, setPromptError] = useState<string | undefined>();
  const [temperatureError, setTemperatureError] = useState<string | undefined>();
  const [maxTokensError, setMaxTokensError] = useState<string | undefined>();
  const [topPError, setTopPError] = useState<string | undefined>();
  const [frequencyPenaltyError, setFrequencyPenaltyError] = useState<string | undefined>();
  const [presencePenaltyError, setPresencePenaltyError] = useState<string | undefined>();
  const [maxModelTokens, setMaxModelTokens] = useState<number>(maxTokensGPT35Turbo0125);

  const modelLimit = {} as modelTokenLimit;
  modelLimit["gpt-4-0125-preview"] = maxTokensGPT40125Preview;
  modelLimit["gpt-4-1106-preview"] = maxTokensGPT41106Preview;
  modelLimit["gpt-3.5-turbo-0125"] = maxTokensGPT35Turbo0125;
  modelLimit["gpt-3.5-turbo-1106"] = maxTokensGPT35Turbo1106;
  modelLimit["gpt-4"] = maxTokensGPT4;
  modelLimit["gpt-3.5-turbo"] = maxTokensGPT35Turbo;
  modelLimit["babbage-002"] = maxTokensBabbageDavinci;
  modelLimit["davinci-002"] = maxTokensBabbageDavinci;

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
    setNumTokensPrompt(encoded.length);
  };

  const handleSubmit = async (formRequest: gptFormValues) => {
    await showToast({ title: "Prompt Sent" });
    setIsLoading(true);
    try {
      const completion: gptCompletion =
        formRequest.model === "gpt-3.5-turbo" ||
        formRequest.model === "gpt-4" ||
        formRequest.model === "gpt-4-1106-preview" ||
        formRequest.model === "gpt-3.5-turbo-1106" ||
        formRequest.model === "gpt-3.5-turbo-0125" ||
        formRequest.model === "gpt-4-0125-preview"
          ? await openai.createChatCompletion({
              model: formRequest.model,
              messages: [
                {
                  role: "user",
                  content: formRequest.prompt,
                },
              ],
              temperature: Number(formRequest.temperature),
              max_tokens: Number(formRequest.maxTokens),
              top_p: Number(formRequest.topP),
              frequency_penalty: Number(formRequest.frequencyPenalty),
              presence_penalty: Number(formRequest.presencePenalty),
            })
          : await openai.createCompletion({
              model: formRequest.model,
              prompt: formRequest.prompt,
              temperature: Number(formRequest.temperature),
              max_tokens: Number(formRequest.maxTokens),
              top_p: Number(formRequest.topP),
              frequency_penalty: Number(formRequest.frequencyPenalty),
              presence_penalty: Number(formRequest.presencePenalty),
            });
      await showToast({ title: "Answer Received" });
      const response =
        formRequest.model === "gpt-3.5-turbo" ||
        formRequest.model === "gpt-4" ||
        formRequest.model === "gpt-4-1106-preview" ||
        formRequest.model === "gpt-3.5-turbo-1106" ||
        formRequest.model === "gpt-3.5-turbo-0125" ||
        formRequest.model === "gpt-4-0125-preview"
          ? `\n\n${completion.data.choices[0].message.content}`
          : completion.data.choices[0].text;
      setTextPrompt(textPrompt + response);
      setAnswer(response);
      setNumTokensPrompt(completion.data.usage.total_tokens);
    } catch (error) {
      if (request.isAxiosError(error) && error.response) {
        await showToast({ style: Toast.Style.Failure, title: "Error:", message: error.response.data.error.message });
      } else {
        await showToast({
          style: Toast.Style.Failure,
          title: "Error:",
          message: "Something went wrong but I am not sure what",
        });
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
            <Action
              icon={Icon.Book}
              title="Grammatical Standard English"
              onAction={() => updatePromptAndTokens(example.grammatical)}
            />
            <Action
              icon={Icon.Book}
              title="Summarize for a 2nd Grader"
              onAction={() => updatePromptAndTokens(example.summarize)}
            />
            <Action
              icon={Icon.Book}
              title="Text to Command"
              onAction={() => updatePromptAndTokens(example.text2command)}
            />
            <Action icon={Icon.Book} title="Q&A" onAction={() => updatePromptAndTokens(example.qa)} />
            <Action
              icon={Icon.Book}
              title="Translation to Other Languages"
              onAction={() => updatePromptAndTokens(example.translate)}
            />
            <Action
              icon={Icon.Book}
              title="Parse Unstructured Data"
              onAction={() => updatePromptAndTokens(example.parseUnstructured)}
            />
            <Action icon={Icon.Book} title="Classification" onAction={() => updatePromptAndTokens(example.classify)} />
            <Action icon={Icon.Book} title="Chat" onAction={() => updatePromptAndTokens(example.chat)} />
          </ActionPanel.Submenu>
          <Action.OpenInBrowser title="Check Examples at OpenAI Website" url="https://platform.openai.com/examples" />
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
        onChange={(value) => {
          updatePromptAndTokens(value);
          if (Number(numTokensPrompt) + maxTokens > maxModelTokens) {
            setPromptError(`Sum of prompt tokens and maximum tokens should be less or equal than ${maxModelTokens}`);
          }
        }}
        onBlur={(event) => {
          if (event.target.value?.length == 0) {
            setPromptError("Prompt is required");
          } else if (!promptError) {
            dropPromptErrorIfNeeded();
          }
        }}
      />
      <Form.Description text={`Prompt token count: ${numTokensPrompt}`} />
      <Form.Separator />
      <Form.Description text="These are the model parameters" />
      <Form.Dropdown
        id="model"
        title="AI Model"
        info={infoMessages.model}
        onChange={(newValue: string) => setMaxModelTokens(modelLimit[newValue])}
      >
        {Object.keys(modelLimit).map((key) => {
          return <Form.Dropdown.Item key={key} value={key} title={key} />;
        })}
      </Form.Dropdown>
      <Form.TextField
        id="temperature"
        title="Temperature"
        info={infoMessages.temperature}
        defaultValue="0.7"
        error={temperatureError}
        onChange={(value: string) => {
          if (isNaN(Number(value)) || value.length == 0 || Number(value) < 0 || Number(value) > 1) {
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
        onChange={(value: string) => {
          setMaxTokens(Number(value));
          if (
            isNaN(Number(value)) ||
            !Number.isInteger(Number(value)) ||
            value.length == 0 ||
            Number(value) < 0 ||
            Number(value) > maxModelTokens
          ) {
            setMaxTokensError(`Value should be an integer between 0 and ${maxModelTokens}`);
          } else if (Number(value) + Number(numTokensPrompt) > maxModelTokens) {
            setMaxTokensError(`Sum of prompt tokens and maximum tokens should be less or equal than ${maxModelTokens}`);
          } else {
            dropMaxTokensErrorIfNeeded();
            if (promptError && Number(value) + Number(numTokensPrompt) <= maxModelTokens) {
              dropPromptErrorIfNeeded();
            }
          }
        }}
      />
      <Form.TextField
        id="topP"
        title="Top P"
        info={infoMessages.topP}
        defaultValue="1"
        error={topPError}
        onChange={(value: string) => {
          if (isNaN(Number(value)) || value.length == 0 || Number(value) < 0 || Number(value) > 1) {
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
        onChange={(value: string) => {
          if (isNaN(Number(value)) || value.length == 0 || Number(value) < -2 || Number(value) > 2) {
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
        onChange={(value: string) => {
          if (isNaN(Number(value)) || value.length == 0 || Number(value) < -2 || Number(value) > 2) {
            setPresencePenaltyError("Value should be a float between -2 and 2");
          } else {
            dropPresencePenaltyErrorIfNeeded();
          }
        }}
      />
    </Form>
  );
}
