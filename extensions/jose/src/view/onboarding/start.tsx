import { Action, ActionPanel, Detail, Form, Icon, useNavigation } from "@raycast/api";
import { useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { ITalkAssistant, ITalkLlm } from "../../ai/type";
import { ConfigurationTypeCommunicationLocal } from "../../type/config";
import { useAssistant } from "../../hook/useAssistant";
import { useLlm } from "../../hook/useLlm";
import Chat from "../../chat";

const llms: Record<
  string,
  { key: string; name: string; model: string; modelTitle: string; need: string; field: string; documentation: string }
> = {
  anthropic: {
    key: "anthropic",
    name: "Anthropic",
    model: "anthropic__claude-3-5-sonnet-20240620",
    modelTitle: "claude-3-5-sonnet-20240620",
    need: "key",
    field: "anthropicApiKey",
    documentation: "https://docs.anthropic.com/en/docs/quickstart",
  },
  cohere: {
    key: "cohere",
    name: "Cohere",
    model: "cohere__command-r-plus",
    modelTitle: "command-r-plus",
    need: "key",
    field: "cohereApiKey",
    documentation: "https://docs.cohere.com/docs/rate-limits#production-key-specifications",
  },
  groq: {
    key: "groq",
    name: "Groq",
    model: "groq__llama-3.1-405b-reasoning",
    modelTitle: "llama-3.1-405b-reasoning",
    need: "key",
    field: "groqApiKey",
    documentation: "https://console.groq.com/docs/quickstart",
  },
  ollama: {
    key: "ollama",
    name: "Ollama",
    model: "ollama__llama3.1",
    modelTitle: "llama3.1",
    need: "url",
    field: "ollamaApiUrl",
    documentation: "https://github.com/ollama/ollama/tree/main/docs",
  },
  openai: {
    key: "openai",
    name: "OpenAI",
    model: "openai__gpt-4o-mini",
    modelTitle: "gpt-4o-mini",
    need: "key",
    field: "openaiApiKey",
    documentation: "https://platform.openai.com/docs/quickstart",
  },
  perplexity: {
    key: "perplexity",
    name: "Perplexity",
    model: "perplexity__llama-3.1-sonar-small-128k-online",
    modelTitle: "llama-3.1-sonar-small-128k-online",
    need: "key",
    field: "perplexityApiKey",
    documentation: "https://docs.perplexity.ai/docs/getting-started",
  },
};

export const Onboarding = () => {
  const collectionsAssistant = useAssistant();
  const collectionsLlm = useLlm();
  const { push } = useNavigation();
  const [step, setStep] = useState(1);
  const [selectedLlm, setSelectedLlm] = useState("");

  const handleNextFromStep3 = (llm: string) => {
    setSelectedLlm(llm);
    setStep(4);
  };

  return (
    <>
      {step === 1 && <Step1 onNext={() => setStep(2)} />}
      {step === 2 && <Step2 onNext={() => setStep(3)} />}
      {step === 3 && <Step3 collectionsLlm={collectionsLlm} onNext={handleNextFromStep3} />}
      {step === 4 && <Step4 llm={selectedLlm} collectionsAssistant={collectionsAssistant} onNext={() => setStep(5)} />}
      {step === 5 && <Step5 push={push} />}
    </>
  );
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function Step1({ onNext }: any) {
  setTimeout(() => {
    onNext();
  }, 500);

  return <Detail markdown="Loading..." />;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function Step2({ onNext }: any) {
  const markdown = `
  # Welcome!

  We’re excited that you’re using our extension to create personalized assistants based on various LLM models.

  With this tool, you can build assistants that utilize different LLMs, each requiring its own API key for full functionality.

  Your assistants can take on various roles, such as:
  - **Translator**
  - **Content Proofreader**
  - **Coding Assistant**

  **Click below to get started and create your first assistant!**
  `;

  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action title="Next Step" icon={Icon.ArrowRight} onAction={onNext} />
        </ActionPanel>
      }
    />
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function Step3({ onNext, collectionsLlm }: any) {
  const [llm, setLLM] = useState("");
  const [apiKeyOrUrl, setApiKeyOrUrl] = useState("");

  const handleLLMChange = (value: string) => {
    setLLM(value);
  };

  const handleApiKeyOrUrlChange = (value: string) => {
    setApiKeyOrUrl(value);
  };

  const handleSaveAndNext = async () => {
    const llmData: ITalkLlm = {
      key: llms[llm].model,
      title: llms[llm].modelTitle,
      company: llms[llm].key,
      model: llms[llm].model,
      apiKeyOrUrl: apiKeyOrUrl,
      useLocalOrEnv: "local",
      url: undefined,
      trainingDataTo: undefined,
      tokens: {
        contextWindow: undefined,
        maxOutput: undefined,
      },
      isLocal: true,
    };

    if (llms && apiKeyOrUrl) {
      collectionsLlm.add(llmData);

      // setTimeout(() => {
      onNext(llm);
      // }, 1000);
    }
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action title="Next Step" icon={Icon.ArrowRight} onAction={handleSaveAndNext} />
        </ActionPanel>
      }
    >
      <Form.Dropdown
        id="llm"
        title="Wybierz model LLM"
        placeholder="Wybierz model językowy"
        value={llm}
        onChange={handleLLMChange}
      >
        {Object.entries(llms).map(([key, value]) => {
          const exist = collectionsLlm.data.find((item: ITalkLlm) => item.key === value.model);
          if (exist === undefined || exist.length === 0) {
            return <Form.Dropdown.Item value={key} key={key} title={value.name} />;
          }
        })}
      </Form.Dropdown>
      {llm ? <Form.Description title="Documentation" text={llms[llm].documentation} /> : <></>}
      {llm === "ollama" || llm === "api" ? (
        <Form.TextField
          id="apiUrl"
          title="API Url"
          placeholder="Enter url api address"
          value={apiKeyOrUrl}
          onChange={handleApiKeyOrUrlChange}
        />
      ) : (
        <Form.PasswordField
          id="apiKey"
          title="API Key"
          placeholder="Enter key api"
          value={apiKeyOrUrl}
          onChange={handleApiKeyOrUrlChange}
        />
      )}
    </Form>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function Step4({ llm, collectionsAssistant, onNext }: any) {
  const [assistantTitle, setAssistantTitle] = useState("");
  const [assistantSystemPrompt, setAssistantSystemPrompt] = useState("");

  const handleFinish = () => {
    const assistantData: ITalkAssistant = {
      typeCommunication: ConfigurationTypeCommunicationLocal,
      assistantId: uuidv4(),
      title: assistantTitle,
      description: "Your first assistant",
      emoji: Icon.Emoji,
      avatar: "",
      model: llms[llm].model,
      modelTemperature: "0.7",
      promptSystem: assistantSystemPrompt,
      webhookUrl: undefined,
      additionalData: undefined,
      snippet: undefined,
      isLocal: true,
    };

    if (assistantTitle && assistantSystemPrompt) {
      collectionsAssistant.add(assistantData);

      setTimeout(() => {
        onNext();
      }, 1000);
    }
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action title="Finish" icon={Icon.Checkmark} onAction={handleFinish} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="assistantTitle"
        title="Assistant Name"
        placeholder="Enter name of assistant"
        value={assistantTitle}
        onChange={setAssistantTitle}
      />
      <Form.TextArea
        id="systemPrompt"
        title="System Prompt"
        placeholder="Enter system prompt for assistant"
        value={assistantSystemPrompt}
        onChange={setAssistantSystemPrompt}
      />
      <Form.Description title="LLM" text={llms[llm].name} />
      <Form.Description title="Model" text={llms[llm].modelTitle} />
    </Form>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function Step5({ push }: any) {
  const markdown = `
  ### Congratulations!

  You have successfully added the necessary settings to the extension. From now on, you can start conversations with your first assistant. Below is a brief overview of how the extension works:

  - **LLMs** - configurations of LLM and models that you add to the system.
  - **Assistants** - your personalized assistants who perform specific tasks.
  - **Snippets** - tasks that you can connect to an assistant and perform during conversations.
  - **Conversations** - histories of your chats.
  - **Chat** - the conversation window.

  We wish you fruitful conversations!
  `;

  const handleFinish = () => {
    push(<Chat />);
  };

  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action title="Finish" icon={Icon.Checkmark} onAction={handleFinish} />
        </ActionPanel>
      }
    />
  );
}
