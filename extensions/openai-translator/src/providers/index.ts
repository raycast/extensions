import { Provider } from "./base";

//XXX raycast doesn't support dynamic import
import openai from "./openai";
import raycast from "./raycast";
import azure from "./azure";
import gemini from "./gemini";
import claude from "./claude";
import groq from "./groq";
import moonshot from "./moonshot";
import ollama from "./ollama";

import { ProviderProps } from "./types";
/* eslint-disable @typescript-eslint/no-explicit-any */

const PROVIDER_CLASSES: Record<string, new (...args: any[]) => Provider> = {
  openai,
  raycast,
  azure,
  gemini,
  claude,
  groq,
  moonshot,
  ollama,
};

export function createProvider(type: string, props: ProviderProps): Provider {
  const providerClass = PROVIDER_CLASSES[type];
  return new providerClass(props);
}
