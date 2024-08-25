import { Detail, ActionPanel, Action, Icon, Form, useNavigation } from "@raycast/api";
import { useEffect, useState } from "react";
import { ITalkAssistant, ITalkLlm } from "./ai/type";
import { useLlm } from "./hook/useLlm";
import { useAssistant } from "./hook/useAssistant";
import { ConfigurationTypeCommunicationLocal } from "./type/config";
import { v4 as uuidv4 } from "uuid";
import { useOnboarding } from "./hook/useOnboarding";

const STEPS = {
  WELCOME: 1,
  CHOICE_MODEL: 2,
  CHOICE_ASSISTANT: 3,
  FINISHED: 4,
};

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

export default function Onboarding() {
  const [currentStep, setCurrentStep] = useState<number | null>(null);
  const { pop } = useNavigation();
  const collectionsLlm = useLlm();
  const collectionsAssistant = useAssistant();
  const hookOnboarding = useOnboarding();
  const [llm, setLLM] = useState("");
  const [apiKeyOrUrl, setApiKeyOrUrl] = useState("");
  const [assistantTitle, setAssistantTitle] = useState("");
  const [assistantSystemPrompt, setAssistantSystemPrompt] = useState("");

  useEffect(() => {
    (async () => {
      setCurrentStep(STEPS.WELCOME);
    })();
  }, []);

  const saveStep = async (step: number) => {
    setCurrentStep(step);
  };

  const completeOnboarding = async () => {
    hookOnboarding.finish();
    pop();
  };

  if (currentStep === STEPS.WELCOME) {
    return (
      <Detail
        markdown={
          "# Welcome!\n\nWe’re excited that you’re using our extension to create personalized assistants based on various LLM models.\n\nWith this tool, you can build assistants that utilize different LLMs, each requiring its own API key for full functionality.\n\nYour assistants can take on various roles, such as:\n- **Translator**\n- **Content Proofreader**\n- **Coding Assistant**\n\n**Click below to get started and create your first assistant!**"
        }
        actions={
          <ActionPanel>
            <Action title="Next Step" icon={Icon.ArrowRight} onAction={() => saveStep(STEPS.CHOICE_MODEL)} />
          </ActionPanel>
        }
      />
    );
  }

  if (currentStep === STEPS.CHOICE_MODEL) {
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

        saveStep(STEPS.CHOICE_ASSISTANT);
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
            if (exist === undefined) {
              return <Form.Dropdown.Item value={key} key={key} title={value.name} />;
            }
          })}
        </Form.Dropdown>
        {/* {llm ? <Form.Description title="Documentation" text={llms[llm].documentation} /> : <></>} */}
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

  if (currentStep === STEPS.CHOICE_ASSISTANT) {
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

        saveStep(STEPS.FINISHED);
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

  if (currentStep === STEPS.FINISHED) {
    return (
      <Detail
        markdown={
          "### Congratulations!\n\nYou have successfully added the necessary settings to the extension. From now on, you can start conversations with your first assistant. Below is a brief overview of how the extension works:\n\n- **LLMs** - configurations of LLM and models that you add to the system.\n- **Assistants** - your personalized assistants who perform specific tasks.\n- **Snippets** - tasks that you can connect to an assistant and perform during conversations.\n- **Conversations** - histories of your chats.\n- **Chat** - the conversation window.\n\nWe wish you fruitful conversations!"
        }
        actions={
          <ActionPanel>
            <Action title="Finish" icon={Icon.Checkmark} onAction={() => completeOnboarding()} />
          </ActionPanel>
        }
      />
    );
  }

  return null;
}
