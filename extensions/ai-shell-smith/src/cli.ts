#!/usr/bin/env node

import { convertPrompt, EngineOptions } from "./engine";
import { MODELS_BY_PROVIDER } from "./config";

const PROVIDERS = ["openai", "perplexity", "ollama"] as const;
type Provider = (typeof PROVIDERS)[number];

const HELP = `
AI Shellsmith — CLI

Usage: aishellsmith [options] "your command description"

Options:
  -m, --model <model>           Model to use (default: the provider's first model)
  -p, --provider <provider>     openai | perplexity | ollama (default: openai)
  -w, --web-search              Enable web search (OpenAI only)
      --history                 Send your last shell commands as context (lines that look like secrets are skipped)
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
  shellHistory: boolean;
} {
  let prompt = "";
  let model: string | undefined;
  let provider: Provider = "openai";
  let webSearch = false;
  let shellHistory = false;

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
    } else if (arg === "--history") {
      shellHistory = true;
    } else if (!arg.startsWith("-")) {
      prompt = arg;
    } else {
      die(`Unknown option: ${arg}`);
    }
  }

  return {
    prompt,
    model: model ?? MODELS_BY_PROVIDER[provider][0].value,
    provider,
    webSearch,
    shellHistory,
  };
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === "--help" || args[0] === "-h") {
    console.log(HELP);
    process.exit(0);
  }

  const { prompt, model, provider, webSearch, shellHistory } = parseArgs(args);
  if (!prompt) die("Please provide a command description");

  const options: EngineOptions = {
    prompt,
    model,
    provider,
    webSearch,
    shellHistory,
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
    // Warnings and alternatives go to stderr so `$(aishellsmith …)` gets one command.
    const best = result.candidates?.[0];
    if (best?.risk && best.risk !== "safe")
      console.error(`# warning: ${best.risk} (${best.riskReason})`);
    if (best?.missing)
      console.error(`# needs: ${best.missing.join(", ")} (not installed)`);
    for (const alt of result.candidates?.slice(1) ?? [])
      console.error(
        `# alt${alt.platform === "any" ? "" : ` (${alt.platform})`}: ${alt.command}`,
      );
    process.exit(0);
  }

  console.error(`Error: ${result.title}`);
  if (result.message) console.error(result.message);
  process.exit(1);
}

main().catch((error) => {
  console.error(
    "Fatal error:",
    error instanceof Error ? error.message : String(error),
  );
  process.exit(1);
});
