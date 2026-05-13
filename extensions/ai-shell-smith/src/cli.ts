#!/usr/bin/env node

import { convertPrompt, EngineOptions } from "./engine";

const DEFAULT_MODEL = "gpt-5.4-nano";
const PROVIDERS = ["openai", "perplexity", "ollama"] as const;
type Provider = (typeof PROVIDERS)[number];

const HELP = `
AI Shellsmith — CLI

Usage: aishellsmith [options] "your command description"

Options:
  -m, --model <model>           Model to use (default: ${DEFAULT_MODEL})
  -p, --provider <provider>     openai | perplexity | ollama (default: openai)
  -w, --web-search              Enable web search (OpenAI only)
  -h, --help                    Show this help message

Environment Variables:
  OPENAI_API_KEY                OpenAI API key
  PERPLEXITY_API_KEY            Perplexity API key
  OLLAMA_API_KEY                Ollama API key (optional)
  CONTEXT7_API_KEY              Context7 API key (optional)
  OPENAI_URL                    Custom OpenAI base URL
  OLLAMA_URL                    Ollama base URL (default: http://localhost:11434)

Examples:
  aishellsmith "list files in current directory"
  aishellsmith -p perplexity "install nodejs on ubuntu"
  aishellsmith -w "search for recent npm packages"
  aishellsmith -m gpt-5.4-mini -p openai "compress image to 1mb"
`;

function die(message: string): never {
  console.error(`Error: ${message}`);
  process.exit(1);
}

function requireValue(flag: string, value: string | undefined): string {
  if (value === undefined || value.startsWith("-"))
    die(`Missing value for ${flag}`);
  return value;
}

function isProvider(value: string): value is Provider {
  return (PROVIDERS as readonly string[]).includes(value);
}

function parseArgs(args: string[]): {
  prompt: string;
  model: string;
  provider: Provider;
  webSearch: boolean;
} {
  let prompt = "";
  let model = DEFAULT_MODEL;
  let provider: Provider = "openai";
  let webSearch = false;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "-m" || arg === "--model") {
      model = requireValue(arg, args[++i]);
    } else if (arg === "-p" || arg === "--provider") {
      const value = requireValue(arg, args[++i]);
      if (!isProvider(value))
        die(`Invalid provider "${value}". Use: ${PROVIDERS.join(", ")}`);
      provider = value;
    } else if (arg === "-w" || arg === "--web-search") {
      webSearch = true;
    } else if (!arg.startsWith("-")) {
      prompt = arg;
    } else {
      die(`Unknown option: ${arg}`);
    }
  }

  return { prompt, model, provider, webSearch };
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === "--help" || args[0] === "-h") {
    console.log(HELP);
    process.exit(0);
  }

  const { prompt, model, provider, webSearch } = parseArgs(args);
  if (!prompt) die("Please provide a command description");

  const options: EngineOptions = {
    prompt,
    model,
    provider,
    webSearch,
    apiKeys: {
      openai: process.env.OPENAI_API_KEY,
      perplexity: process.env.PERPLEXITY_API_KEY,
      ollama: process.env.OLLAMA_API_KEY,
      context7: process.env.CONTEXT7_API_KEY || process.env.CTX7_API_KEY,
    },
    urls: {
      openaiUrl: process.env.OPENAI_URL,
      ollamaUrl: process.env.OLLAMA_URL,
    },
  };

  const result = await convertPrompt(options);
  if (result.success && result.command) {
    console.log(result.command);
    process.exit(0);
  }

  console.error(`Error: ${result.title}`);
  if (result.message) console.error(result.message);
  process.exit(1);
}

main().catch((error) => {
  console.error(
    "Fatal error:",
    error instanceof Error ? error.message : String(error)
  );
  process.exit(1);
});
