import {
  getG4FExecutablePath,
  getG4FTimeout,
  DEFAULT_TIMEOUT,
  getG4FModelsComponent,
  getCustomAPIInfo,
} from "./api/Providers/special/g4f_local";
import { getOllamaApiURL, getOllamaCtxSize, getOllamaModelsComponent } from "./api/Providers/special/ollama_local";
import { getCustomOpenAiInfo } from "./api/Providers/special/custom_openai";

import { Storage } from "./api/storage.js";
import { help_action } from "./helpers/helpPage.jsx";

import { Form, ActionPanel, Action, showToast, Toast } from "@raycast/api";
import { useState, useEffect } from "react";

export default function ManageCustomAPIs() {
  const [g4fExePath, setG4fExePath] = useState("");
  const [g4fTimeout, setG4fTimeout] = useState("");
  const [g4fModelsComponent, setG4fModelsComponent] = useState(null);
  const [ollamaApiURL, setOllamaApiURL] = useState("");
  const [ollamaModelsComponent, setOllamaModelsComponent] = useState(null);
  const [ollamaCtxSize, setOllamaCtxSize] = useState("");
  const [openAiApiURL, setOpenAiApiURL] = useState("");
  const [openAiApiKey, setOpenAiApiKey] = useState("");
  const [openAiConfig, setOpenAiConfig] = useState("");

  const [rendered, setRendered] = useState(false);

  useEffect(() => {
    (async () => {
      const apiInfo = await getCustomAPIInfo();

      setG4fExePath(await getG4FExecutablePath(apiInfo));
      setG4fTimeout(await getG4FTimeout(apiInfo));
      setG4fModelsComponent(await getG4FModelsComponent(apiInfo));
      setOllamaApiURL(await getOllamaApiURL(apiInfo));
      setOllamaModelsComponent(await getOllamaModelsComponent(apiInfo));
      setOllamaCtxSize((await getOllamaCtxSize(apiInfo)).toString());

      const openAiInfo = await getCustomOpenAiInfo(apiInfo);
      setOpenAiApiURL(openAiInfo.api_url);
      setOpenAiApiKey(openAiInfo.api_key);
      setOpenAiConfig(JSON.stringify(openAiInfo.config));

      setRendered(true);
    })();
  }, []);

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Save"
            onSubmit={async (values) => {
              values.g4f_timeout = values.g4f_timeout || DEFAULT_TIMEOUT;
              values.g4f_info = JSON.stringify({ model: values.g4f_model, provider: values.g4f_provider.trim() });
              delete values.g4f_model;
              delete values.g4f_provider;

              values.ollama_model = JSON.stringify({ model: values.ollama_model });

              try {
                values.openai_config = JSON.parse(values.openai_config);
              } catch (e) {
                await showToast(Toast.Style.Failure, "Invalid JSON in OpenAI config");
                return;
              }
              values.openai_info = JSON.stringify({
                api_url: values.openai_api_url,
                api_key: values.openai_api_key,
                config: values.openai_config,
              });
              delete values.openai_api_url;
              delete values.openai_api_key;
              delete values.openai_config;

              let info = await getCustomAPIInfo();
              info = { ...info, ...values };

              await Storage.write("customApiInfo", JSON.stringify(info));
              await showToast(Toast.Style.Success, "Configuration saved");
            }}
          />
          {help_action("localAPI")}
        </ActionPanel>
      }
    >
      <Form.Description text="Configure the GPT4Free Local API. Select 'Help' for the full guide." />
      <Form.TextField
        id="g4f_executable"
        title="G4F Executable Path"
        value={g4fExePath}
        onChange={(x) => {
          if (rendered) setG4fExePath(x);
        }}
      />
      <Form.TextField
        id="g4f_timeout"
        title="G4F API Timeout (in seconds)"
        info="After this timeout, the G4F API will be stopped. It will be automatically started again when used. This saves resources when the API is not in use."
        value={g4fTimeout}
        onChange={(x) => {
          if (rendered) setG4fTimeout(x);
        }}
      />
      {g4fModelsComponent}

      <Form.Separator />

      <Form.Description text="Configure the Ollama Local API." />
      <Form.TextField
        id="ollama_api"
        title="Ollama API URL"
        value={ollamaApiURL}
        onChange={(x) => {
          if (rendered) setOllamaApiURL(x);
        }}
        onBlur={async (event) => {
          const path = event.target.value;
          setOllamaModelsComponent(await getOllamaModelsComponent(await getCustomAPIInfo(), path));
        }}
      />
      {ollamaModelsComponent}
      <Form.TextField
        id="ollama_ctx_size"
        title="Ollama Context Size"
        info="Context size (in tokens) when running inference with Ollama."
        value={ollamaCtxSize}
        onChange={(x) => {
          if (rendered) setOllamaCtxSize(x);
        }}
      />

      <Form.Separator />

      <Form.Description text="Configure a custom OpenAI-compatible API." />
      <Form.TextField
        id="openai_api_url"
        title="API URL"
        value={openAiApiURL}
        onChange={(x) => {
          if (rendered) setOpenAiApiURL(x);
        }}
      />
      <Form.PasswordField
        id="openai_api_key"
        title="API Key"
        value={openAiApiKey}
        onChange={(x) => {
          if (rendered) setOpenAiApiKey(x);
        }}
      />
      <Form.TextField
        id="openai_config"
        title="Config (JSON)"
        value={openAiConfig}
        onChange={(x) => {
          if (rendered) setOpenAiConfig(x);
        }}
        info="Must be a valid JSON object. Example: { model: 'gpt-4', temperature: 0.7 }"
      />
    </Form>
  );
}
