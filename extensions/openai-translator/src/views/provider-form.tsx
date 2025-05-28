import { Form, ActionPanel, Action, Icon } from "@raycast/api";
import { useState, useEffect } from "react";
import { v4 as uuidv4 } from "uuid";
import { IConfig, IModel } from "../providers/types";

import openaiConfig from "../providers/openai/config";
import geminiConfig from "../providers/gemini/config";
import azureConfig from "../providers/azure/config";
import claudeConfig from "../providers/claude/config";
import groqConfig from "../providers/groq/config";
import moonshotConfig from "../providers/moonshot/config";
import ollamaConfig from "../providers/ollama/config";
import { Record, ProvidersHook } from "../hooks/useProvider";

export interface ProviderFormProps {
  record: Record | undefined;
  hook: ProvidersHook;
  onCancel?: () => void;
  onDone?: () => void;
}

const providers: { value: string; title: string; config: IConfig }[] = [
  { value: "openai", title: "OpenAI", config: openaiConfig },
  { value: "gemini", title: "Gemini", config: geminiConfig },
  { value: "azure", title: "Azure", config: azureConfig },
  { value: "claude", title: "Claude", config: claudeConfig },
  { value: "groq", title: "Groq", config: groqConfig },
  { value: "moonshot", title: "Moonshot", config: moonshotConfig },
  { value: "ollama", title: "Ollama", config: ollamaConfig },
];

/* eslint-disable @typescript-eslint/no-unused-vars */
function providerByType(type: string): { value: string; title: string; config: IConfig } {
  return providers.find((p) => p.value === type)!;
}

function providerByConfig(config: IConfig): { value: string; title: string; config: IConfig } {
  return providers.find((p) => p.config === config)!;
}

function recordByName(name: string, hook: ProvidersHook): Record | undefined {
  return hook.data?.find((r) => r.props.name === name);
}

function nextValidName(config: IConfig, hook: ProvidersHook): string {
  const provider = providerByConfig(config);
  const type = provider.value;
  const records = hook.data;
  const names = records?.map((r) => r.props.name);
  let name = provider.title;
  let i = 1;
  let existInGlobal = type == "openai";
  while (names?.includes(name) || existInGlobal) {
    existInGlobal = false;
    name = `${provider.title} ${i}`;
    i++;
  }
  return name;
}

function isValidUrl(url: string) {
  try {
    const parsedUrl = new URL(url);
    // Check if the protocol is http or https
    return parsedUrl.protocol === "http:" || parsedUrl.protocol === "https:";
  } catch (e) {
    return false; // Invalid URL
  }
}

export const ProviderForm = (props: ProviderFormProps) => {
  const { record, hook, onCancel, onDone } = props;
  const providerProps = record?.props;
  const [config, setConfig] = useState(
    providers[record ? providers.findIndex((p) => p.value === record.type) : 0].config,
  );

  const [modelList, setModelList] = useState<IModel[]>([]);
  const [modelId, setModelId] = useState<string | undefined>(undefined);

  const [entrypoint, setEntrypoint] = useState<string>(
    providerProps ? providerProps.entrypoint : config.defaultEntrypoint,
  );
  const [entrypointError, setEntrypointError] = useState<string | undefined>();

  const [isModelLoading, setIsModelLoading] = useState(false);
  const [modelValue, setModelValue] = useState<string | undefined>("");

  const isCustomModel = modelId == "custom";
  const [customModelError, setCustomModelError] = useState<string | undefined>();

  const [apikey, setAPIKey] = useState(providerProps ? providerProps.apikey : "");
  const [apiKeyError, setAPIKeyError] = useState<string | undefined>();

  const [name, setName] = useState<string>(record?.props ? record.props.name : nextValidName(config, hook));
  const [nameError, setNameError] = useState<string | undefined>();

  useEffect(() => {
    fetchModels();
  }, [config]);

  const fetchModels = async () => {
    try {
      setIsModelLoading(true);
      let _model = providerProps ? providerProps.apiModel : config.defaultModel?.id;
      if (modelId == undefined) {
        setModelId(_model);
        setModelValue(_model);
      } else {
        _model = modelId;
      }
      const models = await config.listModels(apikey, entrypoint);
      if (config.supportCustomModel) {
        models.push({ id: "custom", name: "Custom" });
        const isCustomModel = !models.find((m) => m.id === _model);
        if (isCustomModel) {
          setModelId("custom");
        }
      }
      setModelList(models);
      setIsModelLoading(false);
    } catch (error) {
      console.error("Error fetching models:", error);
    }
  };

  function handleModelChange(modelId: string) {
    const selectedModel = modelList.find((m) => m.id === modelId);
    if (selectedModel) {
      const id = selectedModel.id;
      setModelId(id);
      if (id == "custom") {
        setModelValue("");
      } else {
        setModelValue(id);
      }
    }
  }

  /* eslint-disable @typescript-eslint/no-unused-vars */
  function handleCustomModelChange(value: string) {
    if (customModelError && customModelError.length > 0) {
      setCustomModelError(undefined);
    }
    setModelValue(value);
  }

  function handleAPIKeyChange(value: string) {
    setAPIKey(value);
    if (apiKeyError && apiKeyError.length > 0) {
      //reset error
      setAPIKeyError(undefined);
    }
  }
  function handleEntrypointChange(value: string) {
    setEntrypoint(value);
    if (entrypointError && entrypointError.length > 0) {
      //reset error
      setAPIKeyError(undefined);
    }
  }

  function handleProviderChange(provider: string) {
    const selectedProvider = providers.find((p) => p.value === provider);
    if (selectedProvider) {
      setConfig(selectedProvider.config);
      setName(nextValidName(selectedProvider.config, hook));
    }
    if (apiKeyError && apiKeyError.length > 0) {
      if ((apikey && apikey.length > 0) || !config.requireApiKey) {
        setAPIKeyError(undefined);
      }
    }
  }

  function checkNameValid(name: string): boolean {
    if (name && name.length > 0) {
      if (record) {
        return true;
      }
      if (name === "OpenAI" || name === "Raycast" || recordByName(name, hook)) {
        setNameError("Name already exists");
        return false;
      }
      setNameError(undefined);
      return true;
    }
    setNameError("Name is required");
    return false;
  }

  function submitForm(values: { customModel: string; entrypoint: string; model: string }) {
    // check api key
    if (config.requireApiKey && (!apikey || apikey.length == 0)) {
      setAPIKeyError("API Key is required");
      return;
    }
    // check if custom model
    if (isCustomModel && (!values.customModel || values.customModel.length == 0)) {
      setCustomModelError("Custom Model is required");
      return;
    }

    if (!checkNameValid(name)) {
      return;
    }

    hook.addOrUpdate({
      id: record ? record?.id : uuidv4(),
      type: providerByConfig(config).value,
      props: {
        name: name,
        apikey: apikey,
        entrypoint: values.entrypoint || config.defaultEntrypoint,
        apiModel: isCustomModel ? values.customModel : values.model,
      },
      created_at: new Date().toISOString(),
    });
    if (onDone) {
      onDone();
    }
  }

  return (
    <Form
      isLoading={isModelLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={providerProps ? "Update" : "Create"}
            icon={{ source: Icon.Checkmark }}
            onSubmit={submitForm}
          />
          <Action title="Cancel" icon={{ source: Icon.Xmark }} onAction={onCancel} />
          <Action
            title="Refresh Models"
            icon={{ source: Icon.Repeat }}
            shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
            onAction={() => {
              fetchModels();
            }}
          />
        </ActionPanel>
      }
    >
      {!providerProps && (
        <Form.Dropdown id="provider" title="Provider" defaultValue="openai" onChange={handleProviderChange}>
          {providers.map((provider) => (
            <Form.Dropdown.Item
              key={provider.value}
              value={provider.value}
              title={provider.title}
              icon={{ source: `ic_${provider.value}.png` }}
            />
          ))}
        </Form.Dropdown>
      )}
      {!providerProps && (
        <Form.TextField
          id="name"
          title="Name"
          value={name}
          error={nameError}
          onBlur={(event) => {
            const value = event.target.value as string;
            checkNameValid(value);
          }}
          onChange={(value) => {
            setName(value);
          }}
        />
      )}
      {config.supportCustomEntrypoint && (
        <Form.TextField
          id="entrypoint"
          title="Entrypoint"
          placeholder="Enter custom entrypoint"
          onChange={handleEntrypointChange}
          defaultValue={entrypoint}
          error={entrypointError}
          onBlur={(event) => {
            console.log("onBlur", event.target.value);
            const value = event.target.value;
            if (!value || value.length == 0 || !isValidUrl(value)) {
              setEntrypointError("Must be a valid URL");
            }
          }}
        />
      )}
      {config.hasApiKey && (
        <Form.PasswordField
          id="apikey"
          title={config.requireApiKey ? "API Key" : "API Key (Optional)"}
          value={apikey}
          error={apiKeyError}
          onChange={handleAPIKeyChange}
          onBlur={(event) => {
            const value = event.target.value;
            if (!(value && value.length > 0) && config.requireApiKey) {
              setAPIKeyError("API Key is required");
            }
          }}
        />
      )}
      <Form.Dropdown
        id="model"
        title="Model"
        isLoading={isModelLoading}
        defaultValue={modelList.length ? modelId : ""}
        onChange={handleModelChange}
      >
        {modelList.map((model) => (
          <Form.Dropdown.Item key={model.id} value={model.id} title={model.name} />
        ))}
      </Form.Dropdown>
      {isCustomModel && (
        <Form.TextField
          id="customModel"
          title="Custom Model"
          placeholder="Enter custom model"
          value={modelValue}
          error={customModelError}
          onChange={handleCustomModelChange}
          onBlur={(event) => {
            const value = event.target.value;
            if (!(value && value.length > 0)) {
              setCustomModelError("Custom Model is required");
            }
          }}
        />
      )}
    </Form>
  );
};
