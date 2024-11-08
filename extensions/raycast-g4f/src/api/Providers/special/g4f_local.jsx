// This module allows communication and requests to the local G4F API.
// Read more here: https://github.com/xtekky/gpt4free/blob/main/docs/interference.md

import { exec } from "child_process";
import fetch from "node-fetch";

import { Storage } from "../../storage.js";
import { messages_to_json } from "../../../classes/message.js";
import { sleep } from "../../../helpers/helper.js";

import { Form } from "@raycast/api";
import { getSupportPath } from "../../../helpers/helper.js";

// constants
const DEFAULT_MODEL = "meta-ai";
const DEFAULT_PROVIDER = null;
const DEFAULT_INFO = JSON.stringify({ model: DEFAULT_MODEL, provider: DEFAULT_PROVIDER });

export const DEFAULT_TIMEOUT = "900";

const BASE_URL = "http://localhost:1337/v1";
const API_URL = "http://localhost:1337/v1/chat/completions";
const MODELS_URL = "http://localhost:1337/v1/models";

// main function
export const G4FLocalProvider = {
  name: "G4FLocal",
  generate: async function* (chat, options) {
    if (!(await isG4FRunning())) {
      await startG4F();
    }

    chat = messages_to_json(chat);

    const apiInfo = await getCustomAPIInfo();
    const info = await getG4FModelInfo(apiInfo);
    const model = info.model || DEFAULT_MODEL,
      provider = info.provider || DEFAULT_PROVIDER;

    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: model,
        provider: provider,
        stream: options.stream,
        messages: chat,
      }),
    });

    // Important! we assume that the response is a stream, as this is true for most G4F models.
    // If in the future this is not the case, we should add separate handling for non-streaming responses.
    const reader = response.body;
    for await (let chunk of reader) {
      const str = chunk.toString();
      let lines = str.split("\n");
      for (let i = 0; i < lines.length; i++) {
        let line = lines[i];
        if (line.startsWith("data: ")) {
          let chunk = line.substring(6);
          if (chunk.trim() === "[DONE]") return; // trim() is important

          try {
            let data = JSON.parse(chunk);
            let delta = data["choices"][0]["delta"]["content"];
            if (delta) {
              yield delta;
            }
          } catch (e) {} // eslint-disable-line
        }
      }
    }
  },
};

/// utilities

// check if the G4F API is running
// with a request timeout of 0.5 seconds (since it's localhost)
const isG4FRunning = async () => {
  try {
    const controller = new AbortController();
    setTimeout(() => controller.abort(), 500);
    const response = await fetch(BASE_URL, { signal: controller.signal });
    return response.ok;
  } catch (e) {
    return false;
  }
};

// get available models
const getG4FModels = async () => {
  try {
    const response = await fetch(MODELS_URL);
    return (await response.json()).data || [];
  } catch (e) {
    return [];
  }
};

// get available models as dropdown component
export const getG4FModelsComponent = async (apiInfo) => {
  const models = await getG4FModels(apiInfo);
  const info = await getG4FModelInfo(apiInfo);
  return (
    <>
      <Form.Dropdown id="g4f_model" title="G4F Model" defaultValue={info.model}>
        {models.map((model) => {
          return <Form.Dropdown.Item title={model.id} key={model.id} value={model.id} />;
        })}
      </Form.Dropdown>
      <Form.TextField
        id="g4f_provider"
        title="G4F Provider"
        info="(Optional) The provider to use in the API. The API will automatically select the best provider if this is not set."
        defaultValue={info.provider}
      />
    </>
  );
};

// get custom API info from storage
export const getCustomAPIInfo = async () => {
  return JSON.parse(await Storage.read("customApiInfo", "{}"));
};

// get G4F executable path from storage
export const getG4FExecutablePath = async (apiInfo) => {
  return apiInfo.g4f_executable || "g4f";
};

// get the currently selected G4F model and provider from storage
const getG4FModelInfo = async (apiInfo) => {
  return JSON.parse(apiInfo.g4f_info || DEFAULT_INFO);
};

// get G4F API timeout (in seconds) from storage
export const getG4FTimeout = async (apiInfo) => {
  return (apiInfo.g4f_timeout || DEFAULT_TIMEOUT || parseInt(DEFAULT_TIMEOUT)).toString();
};

// start the G4F API
const startG4F = async () => {
  const apiInfo = await getCustomAPIInfo();
  const exe = await getG4FExecutablePath(apiInfo);
  const timeout_s = await getG4FTimeout(apiInfo);

  const START_COMMAND = `export PATH="/opt/homebrew/bin:$PATH"; ( "${exe}" api ) & sleep ${timeout_s} ; kill -2 $!`;
  const dirPath = getSupportPath();
  try {
    const child = exec(START_COMMAND, { cwd: dirPath });
    console.log("G4F API Process ID:", child.pid);
    child.stderr.on("data", (data) => {
      console.log("g4f >", data);
    });
    // sleep for some time to allow the API to start
    await sleep(2000);
    console.log(`G4F API started with timeout ${timeout_s}`);
  } catch (e) {
    console.log(e);
  }
};
