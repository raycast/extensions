import { getPreferenceValues, environment } from "@raycast/api";

export interface ConfigurationPreferencesType {
  anthropicApiKey: string;
  cohereApiKey: string;
  groqApiKey: string;
  ollamaApiUrl: string;
  openaiApiKey: string;
  perplexityApiKey: string;

  langfuseSecretApiKey: string;
  lanfusePublicApiKey: string;
  langfuseApiUrl: string;
  lunaryApiKey: string;

  apiEndpoint: string;
  apiBinnary: string;
  apiEndpointData: string;
}

export const ConfigurationTypeCommunicationLocal = "local";
export const ConfigurationTypeCommunicationExternalApi = "external-api";
export const ConfigurationTypeCommunicationBinaryFile = "binary-file";
export const ConfigurationTypeCommunicationDefault: string = ConfigurationTypeCommunicationLocal;

export const ConfigurationTypeCommunication: { key: string; title: string }[] = [
  {
    key: ConfigurationTypeCommunicationLocal,
    title: "Local communication",
  },
  {
    key: ConfigurationTypeCommunicationExternalApi,
    title: "External endpoint api communication",
  },
  {
    key: ConfigurationTypeCommunicationBinaryFile,
    title: "Local binnary file communication",
  },
];

export const ConfigurationModelDefault = "openai__gpt-4o";

export const ConfigurationModelCollection: { key: string; title: string }[] = [
  // anthropic
  {
    key: "anthropic__claude-3-5-sonnet-20240620",
    title: "claude-3-5-sonnet-20240620",
  },
  {
    key: "anthropic__claude-3-opus-20240229",
    title: "claude-3-opus-20240229",
  },
  {
    key: "anthropic__claude-3-sonnet-20240229",
    title: "claude-3-sonnet-20240229",
  },
  {
    key: "anthropic__claude-3-haiku-20240307",
    title: "claude-3-haiku-20240307",
  },
  //cohere
  {
    key: "cohere__command-r-plus",
    title: "command-r-plus",
  },
  {
    key: "cohere__command-r",
    title: "command-r",
  },
  {
    key: "cohere__command",
    title: "command",
  },
  {
    key: "cohere__command-nightly",
    title: "command-nightly",
  },
  {
    key: "cohere__command-light",
    title: "command-light",
  },
  {
    key: "cohere__command-light-nightly",
    title: "command-light-nightly",
  },
  //groq
  {
    key: "groq__llama3-8b-8192",
    title: "llama3-8b-8192",
  },
  {
    key: "groq__llama3-70b-8192",
    title: "llama3-70b-8192",
  },
  {
    key: "groq__mixtral-8x7b-32768",
    title: "mixtral-8x7b-32768",
  },
  {
    key: "groq__gemma-7b-it",
    title: "gemma-7b-it",
  },
  {
    key: "groq__gemma2-9b-it",
    title: "gemma2-9b-it",
  },
  //ollama
  {
    key: "ollama__llama2",
    title: "llama2",
  },
  {
    key: "ollama__llama3",
    title: "llama3",
  },
  // openai
  {
    key: "openai__gpt-4o-2024-05-13",
    title: "gpt-4o-2024-05-13",
  },
  {
    key: "openai__gpt-4o",
    title: "gpt-4o",
  },
  {
    key: "openai__gpt-4-turbo-2024-04-09",
    title: "gpt-4-turbo-2024-04-09",
  },
  {
    key: "openai__gpt-4-turbo",
    title: "gpt-4-turbo",
  },
  {
    key: "openai__gpt-4-turbo-preview",
    title: "gpt-4-turbo-preview",
  },
  {
    key: "openai__gpt-4-1106-preview",
    title: "gpt-4-1106-preview",
  },
  {
    key: "openai__gpt-4",
    title: "gpt-4",
  },
  {
    key: "openai__gpt-4-0613",
    title: "gpt-4-0613",
  },
  {
    key: "openai__gpt-3.5-turbo-0125",
    title: "gpt-3.5-turbo-0125",
  },
  {
    key: "openai__gpt-3.5-turbo-1106",
    title: "gpt-3.5-turbo-1106",
  },
  {
    key: "openai__gpt-3.5-turbo-0613",
    title: "gpt-3.5-turbo-0613",
  },
  {
    key: "openai__gpt-3.5-turbo",
    title: "gpt-3.5-turbo",
  },
  //perplexity
  {
    key: "perplexity__llama-3-sonar-small-32k-chat",
    title: "llama-3-sonar-small-32k-chat",
  },
  {
    key: "perplexity__llama-3-sonar-small-32k-online",
    title: "llama-3-sonar-small-32k-online",
  },
  {
    key: "perplexity__llama-3-sonar-large-32k-chat",
    title: "llama-3-sonar-large-32k-chat",
  },
  {
    key: "perplexity__llama-3-sonar-large-32k-online",
    title: "llama-3-sonar-large-32k-online",
  },
  {
    key: "perplexity__llama-3-8b-instruct",
    title: "llama-3-8b-instruct",
  },
  {
    key: "perplexity__llama-3-70b-instruct",
    title: "llama-3-70b-instruct",
  },
  {
    key: "perplexity__mixtral-8x7b-instruct",
    title: "mixtral-8x7b-instruct",
  },
];

export function ClearImportModel(str: string): string {
  const s = str;

  s.replace(/openai-/g, "openai__");

  return s;
}

export function ClearImportModelTemperature(str: string, base: string): string {
  if (str === "low") {
    return "0.2";
  } else if (str === "medium") {
    return "0.7";
  } else if (str === "maximum") {
    return "1.0";
  }

  return base;
}

export function ChangePromptSystem(str: string) {
  const currentDateTime = new Date();
  const year = currentDateTime.getFullYear();
  const month = String(currentDateTime.getMonth() + 1).padStart(2, "0");
  const day = String(currentDateTime.getDate()).padStart(2, "0");
  const hours = String(currentDateTime.getHours()).padStart(2, "0");
  const minutes = String(currentDateTime.getMinutes()).padStart(2, "0");
  const seconds = String(currentDateTime.getSeconds()).padStart(2, "0");
  const s = str;

  return s.replace(/{{-CURRENT_DATETIME-}}/g, `${year}/${month}/${day}, ${hours}:${minutes}:${seconds}`);

  return s;
}

export function ClearPromptSystem(str: string) {
  const s = str;

  // s.replace(/"/g, "\'");
  // s = s.replace(/'/g, "\'");
  // s = s.replace(/{/g, '<');
  // s = s.replace(/}/g, '>');

  return s;
}

function getConfig(): ConfigurationPreferencesType {
  return getPreferenceValues<ConfigurationPreferencesType>();
}

//

export function GetAnthropicApi(): { key: string } {
  return {
    key: getConfig().anthropicApiKey,
  };
}

export function GetCohereApi(): { key: string } {
  return {
    key: getConfig().cohereApiKey,
  };
}

export function GetGroqApi(): { key: string } {
  return {
    key: getConfig().groqApiKey,
  };
}

export function GetOllamaApi(): { url: string } {
  return {
    url: getConfig().ollamaApiUrl,
  };
}

export function GetOpenaiApi(): { key: string } {
  return {
    key: getConfig().openaiApiKey,
  };
}

export function GetPerplexityApi(): { key: string } {
  return {
    key: getConfig().perplexityApiKey,
  };
}

//

export function GetLangfuseApi(): { enable: boolean; url: string; public: string; secret: string } {
  return {
    enable:
      getConfig().langfuseApiUrl !== "" &&
      getConfig().langfuseApiUrl !== undefined &&
      getConfig().lanfusePublicApiKey !== "" &&
      getConfig().lanfusePublicApiKey !== undefined &&
      getConfig().langfuseSecretApiKey !== "" &&
      getConfig().langfuseSecretApiKey !== undefined &&
      1 === 1,
    url: getConfig().langfuseApiUrl,
    public: getConfig().lanfusePublicApiKey,
    secret: getConfig().langfuseSecretApiKey,
  };
}

export function GetLunaryApi(): { enable: boolean; key: string } {
  return {
    enable: getConfig().lunaryApiKey !== "" && getConfig().lunaryApiKey !== undefined && 1 === 1,
    key: getConfig().lunaryApiKey,
  };
}

//

export function GetApiEndpoint(): { host: string } {
  return {
    host: getConfig().apiEndpoint,
  };
}

export function GetApiBinnary(): { path: string } {
  return {
    path: getConfig().apiBinnary,
  };
}

export function GetApiEndpointData(): { host: string } {
  return {
    host: getConfig().apiEndpointData,
  };
}

export function GetUserName(): string {
  // eslint-disable-next-line
  const match = environment.assetsPath.match(/\/Users\/([^\/]+)/);
  return match ? match[1] : "unknown";
}

export function GetDevice(): string {
  return "raycast";
}
