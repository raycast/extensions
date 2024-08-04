import { getPreferenceValues, environment, LocalStorage } from "@raycast/api";

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

  apiEndpointDataAssistant: string;
  apiEndpointDataLlm: string;
  apiEndpointDataSnippet: string;
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

export const ConfigurationModelDefault = "openai__gpt-4o-mini";

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

export function needOnboarding(assistans: number | undefined): boolean {
  LocalStorage.getItem<string>("onboarding").then((value) => {
    if (value === "finish") {
      return false;
    }
  });
  if (assistans !== undefined && assistans !== 0) {
    return false;
  }
  if (getConfig().anthropicApiKey !== "" && getConfig().anthropicApiKey !== undefined) {
    return false;
  }
  if (getConfig().cohereApiKey !== "" && getConfig().cohereApiKey !== undefined) {
    return false;
  }
  if (getConfig().groqApiKey !== "" && getConfig().groqApiKey !== undefined) {
    return false;
  }
  if (getConfig().ollamaApiUrl !== "" && getConfig().ollamaApiUrl !== undefined) {
    return false;
  }
  if (getConfig().openaiApiKey !== "" && getConfig().openaiApiKey !== undefined) {
    return false;
  }
  if (getConfig().perplexityApiKey !== "" && getConfig().perplexityApiKey !== undefined) {
    return false;
  }
  if (getConfig().apiEndpoint !== "" && getConfig().apiEndpoint !== undefined) {
    return false;
  }
  if (getConfig().apiBinnary !== "" && getConfig().apiBinnary !== undefined) {
    return false;
  }

  return true;
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

export function GetApiEndpointData(): { assistant: string; llm: string; snippet: string } {
  return {
    assistant: getConfig().apiEndpointDataAssistant,
    llm: getConfig().apiEndpointDataLlm,
    snippet: getConfig().apiEndpointDataSnippet,
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
