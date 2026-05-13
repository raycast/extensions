/// <reference types="@raycast/api" />

/* Generated types — keep in sync with package.json commands + preferences */

/* eslint-disable @typescript-eslint/ban-types */

type ExtensionPreferences = {
  "provider": "openai" | "perplexity" | "ollama",
  "apiKey"?: string,
  "perplexityApiKey"?: string,
  "context7ApiKey"?: string,
  "webSearch": boolean,
  "openaiModel": "gpt-5.4-nano" | "gpt-5.4-mini",
  "openaiUrl"?: string,
  "openaiModelCustom"?: string,
  "ollamaModel": "gpt-oss:20b-cloud" | "gpt-oss:120b-cloud",
  "ollamaUrl": string,
  "ollamaApiKey"?: string,
  "terminal":
    | "auto"
    | "Warp"
    | "iTerm2"
    | "Ghostty"
    | "WezTerm"
    | "Alacritty"
    | "Kitty"
    | "cmux"
    | "Terminal";
};

declare type Preferences = ExtensionPreferences;

declare namespace Preferences {
  export type Index = ExtensionPreferences & {};
}

declare namespace Arguments {
  export type Index = {
    "prompt": string;
  };
}
