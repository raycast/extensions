import { createAnthropic } from "@ai-sdk/anthropic";
import { parse, Allow } from "partial-json";
import { createOpenAI } from "@ai-sdk/openai";
import {
  Action,
  ActionPanel,
  AI,
  getPreferenceValues,
  Icon,
  List,
  LocalStorage,
  openExtensionPreferences,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { streamObject } from "ai";
import dedent from "dedent";
import fs from "fs";
import OpenAI from "openai";
import getPlayer from "play-sound";
import { useEffect, useMemo, useState } from "react";
import { fetch } from "undici";
import { z } from "zod";

const preferences = getPreferenceValues();
type LLMProvider = "openai" | "groq" | "fireworks" | "anthropic" | "together" | "raycast";

type Preferences = {
  llmProvider: LLMProvider;
  openaiApiKey: string;
  fireworksApiKey: string;
  anthropicApiKey: string;
  groqApiKey: string;
  togetherApiKey?: string;
};

const prefs = preferences as Preferences;
const llmProvider: LLMProvider = prefs.llmProvider;

if (
  (llmProvider === "openai" && !prefs.openaiApiKey) ||
  (llmProvider === "groq" && !prefs.groqApiKey) ||
  (llmProvider === "fireworks" && !prefs.fireworksApiKey) ||
  (llmProvider === "anthropic" && !prefs.anthropicApiKey)
) {
  showToast({
    style: Toast.Style.Failure,
    title: "API Key Missing",
    primaryAction: {
      title: "Add API Key",
      onAction: () => openExtensionPreferences(),
    },
    message: `API key for ${llmProvider} is missing. Please provide the API key in the preferences.`,
  });
}

type FetchFunction = typeof globalThis.fetch;

const { model, mode } = (() => {
  switch (llmProvider) {
    case "raycast": {
      return { model: null, mode: "auto" as const };
    }
    case "openai": {
      const openai = createOpenAI({
        apiKey: prefs.openaiApiKey,
        fetch: fetch as FetchFunction,
      });
      return { model: openai("gpt-4o-2024-08-06"), mode: "auto" as const };
    }
    case "groq": {
      const groq = createOpenAI({
        apiKey: prefs.groqApiKey,
        baseURL: "https://api.groq.com/openai/v1",
        fetch: fetch as FetchFunction,
      });
      return { model: groq("llama-3.1-70b-versatile"), mode: "auto" as const };
    }
    case "fireworks": {
      const fireworks = createOpenAI({
        apiKey: prefs.fireworksApiKey,
        baseURL: "https://api.fireworks.ai/inference/v1",
        fetch: fetch as FetchFunction,
      });
      return { model: fireworks("accounts/fireworks/models/llama-v3p1-70b-instruct"), mode: "json" as const };
    }
    case "anthropic": {
      const anthropic = createAnthropic({
        apiKey: prefs.anthropicApiKey,
        fetch: fetch as FetchFunction,
      });
      return { model: anthropic("claude-3-haiku-20240307"), mode: "auto" as const };
    }
    case "together": {
      const together = createOpenAI({
        apiKey: prefs.togetherApiKey,
        baseURL: "https://api.together.xyz/v1",
        fetch: fetch as FetchFunction,
      });
      return { model: together("meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo"), mode: "json" as const };
    }
    default: {
      throw new Error("Unknown LLM provider");
    }
  }
})();

export default function Command() {
  const [language, setLanguage] = useState("English");
  const [results, setResults] = useState<z.infer<typeof synonymSchema>[]>([]);
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { push } = useNavigation();

  const isPhrase = query.split(" ").length > 2;
  const synonymSchema = useMemo(() => {
    return z.object({
      emoji: z.string().describe(`The emoji that best represent the meaning of the word`),
      synonym: z
        .string()
        .describe(
          `The synonym, translated into ${language} if necessary. When user uses a verb you should return a verb too. If user uses a noun you should return noun too.`,
        ),
      meaning: z
        .string()
        .nullable()
        .describe(
          dedent`
      Example use of the word that explains its meaning, very short and in user original language. 
      Omit it if unnecessary, for example when you already used the same meaning for another synonym.
      Omit it if it doesn't add any value, just return null in that case.
      `,
        ),
    });
  }, [language, isPhrase]);
  const schema = useMemo(() => {
    return z.object({
      originalLanguage: z.string().describe("The original language of the sentence"),
      synonyms: z
        .array(synonymSchema)
        .describe("The synonyms of the sentence, should be maximum 9 items, never return more than 9 synonyms"),
    });
  }, [synonymSchema]);

  const examplePerfectOutput = useMemo(() => {
    return {
      originalLanguage: "Italian",
      synonyms: [
        {
          emoji: "😊",
          synonym: "joyful",
          meaning: "Feeling, expressing, or causing great pleasure and happiness.",
        },
        {
          emoji: "😁",
          synonym: "cheerful",
          meaning: "Noticeably happy and optimistic.",
        },
        {
          emoji: "😄",
          synonym: "merry",
          meaning: "Full of cheerfulness or gaiety; joyous in disposition or spirit.",
        },
        {
          emoji: "😃",
          synonym: "gleeful",
          meaning: "Exuberantly or triumphantly joyful.",
        },
        {
          emoji: "😆",
          synonym: "jovial",
          meaning: "Cheerful and friendly.",
        },
        {
          emoji: "😌",
          synonym: "content",
          meaning: "In a state of peaceful happiness.",
        },
        {
          emoji: "😇",
          synonym: "blissful",
          meaning: "Extremely happy; full of joy.",
        },
      ],
    };
  }, [schema]);

  useEffect(() => {
    const abortController = new AbortController();
    async function generate() {
      if (!query) {
        return;
      }
      setIsLoading(true);
      try {
        if (!query.trim()) {
          return;
        }
        // average person types at 300 characters per minute, which means there are 200 ms of wait time per character
        await sleep(210);
        if (abortController.signal.aborted) {
          return;
        }

        if (llmProvider === "raycast") {
          const prompt = dedent`
            Find synonyms for: "${query}"
            The synonyms should be in ${language}.
            Format the response as a JSON object with this structure:
            {
              "originalLanguage": "detected language",
              "synonyms": [
                {
                  "emoji": "relevant emoji",
                  "synonym": "the synonym",
                  "meaning": "short meaning or null"
                }
              ]
            }
            Maximum 9 synonyms. Make them suitable for literary use.
            If the input is not in ${language}, add the direct translation as first synonym.

            Only output JSON without any other text or markdown formatting.
          `;

          let response = "";
          console.log("Asking AI...");
          const answer = AI.ask(prompt, { signal: abortController.signal });
          answer.on("data", (data) => {
            response += data;
            response = response
              .split("\n")
              .filter((x) => !x.startsWith("```"))
              .join("\n");

            try {
              const parsed = parse(response, Allow.ALL);
              if (parsed.synonyms?.length) {
                setResults(parsed.synonyms);
              }
            } catch (e) {
              // Partial JSON, wait for more data
            }
          });

          await answer;
          try {
            const finalResult = JSON.parse(response);
            setResults(finalResult.synonyms);
            if (finalResult.originalLanguage) {
              showToast({
                style: Toast.Style.Success,
                title: "Language Detected",
                message: finalResult.originalLanguage,
              });
            }
          } catch (e) {
            throw new Error("Failed to parse AI response");
          }
        } else {
          const stream = await streamObject({
            model: model!,
            mode,
            messages: [
              {
                role: "system",
                content: dedent`
                The user wants to find synonyms for a word or sentence <sentence/>.

                You need to find synonyms for it. The returned synonyms should be in the user requested <language/> language.

                The synonyms should be different than the initial word passed by the user. Don't repeat the same word or phrase twice.

                If the user used another language than the user requested language, add the direct translation as the first synonym.

                These synonyms should be suitable for literary use, avoiding common or simplistic alternatives.

                If the there not enough synonyms for the word use a phrase instead, for example "squinting" in Italian would be "socchiudere gli occhi".
              `,
              },
              {
                role: "user",
                content: dedent`
                <sentence>gioioso, in italiano</sentence>
                <language>English</language>
              `,
              },
              {
                role: "assistant",
                content: JSON.stringify(examplePerfectOutput),
              },
              {
                role: "user",
                content: dedent`
                <sentence>${query}</sentence>
                <language>${language}</language>
              `,
              },
            ],
            schema,
            abortSignal: abortController.signal,
          });

          let detectedLanguage: string | undefined;
          let lastUpdate = Date.now();
          let addedToHistory = false;
          for await (const obj of stream.partialObjectStream) {
            if (abortController.signal.aborted) {
              return;
            }
            if (!detectedLanguage && obj.originalLanguage && obj.synonyms?.length) {
              detectedLanguage = obj.originalLanguage;
              showToast({
                style: Toast.Style.Success,
                title: `Language Detected`,
                message: detectedLanguage,
              });
            }

            if (obj.synonyms?.length) {
              const now = Date.now();
              if (now - lastUpdate >= 50) {
                setResults(obj.synonyms as z.infer<typeof synonymSchema>[]);
                lastUpdate = now;
              }
            }
            if (obj.synonyms?.length && obj.synonyms?.length > 2 && !addedToHistory) {
              // Add query to history
              const history = JSON.parse((await LocalStorage.getItem("queryHistory")) || "[]");
              history.unshift({ query, language, timestamp: Date.now() });
              await LocalStorage.setItem("queryHistory", JSON.stringify(history.slice(0, 50))); // Keep last 50 queries
              addedToHistory = true;
            }
          }
          const finalResult = await stream.object;
          setResults(finalResult.synonyms);
        }
        setIsLoading(false);
      } catch (e) {
        if (!isAbortError(e)) {
          notifyError(e);
          setIsLoading(false);
        }
      }
    }

    generate();
    return () => {
      abortController.abort();
    };
  }, [query, language]);

  return (
    <List
      onSearchTextChange={setQuery}
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action
            title="Change Model Provider in Preferences"
            onAction={() => openExtensionPreferences()}
            icon={Icon.Gear}
          />
        </ActionPanel>
      }
      searchBarAccessory={
        <List.Dropdown filtering tooltip="Select language to translate to" storeValue onChange={setLanguage}>
          {languages.map((x) => {
            return <List.Dropdown.Item key={x.name} icon={x.icon} value={x.name} title={x.name} />;
          })}
        </List.Dropdown>
      }
    >
      <List.EmptyView
        title="Find Synonyms"
        icon={Icon.ComputerChip}
        description={`Find synonyms and translate to ${language}`}
      />
      {results.map((item, index) => {
        if (!item.synonym) {
          return null;
        }
        return (
          <List.Item
            key={item.synonym + index}
            icon={item.emoji}
            title={item.synonym || ""}
            subtitle={item.meaning || ""}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard content={item.synonym} />
                {item.synonym && !!prefs.openaiApiKey && (
                  <Action
                    title="Pronounce Speech"
                    icon={Icon.Speaker}
                    onAction={async () => {
                      setIsLoading(true);
                      showToast({
                        style: Toast.Style.Animated,
                        title: "Generating speech...",
                      });
                      try {
                        await generateAndPlaySpeech(item.synonym, language);
                      } finally {
                        showToast({
                          title: "Generated Speech",
                        });
                        setIsLoading(false);
                      }
                    }}
                  />
                )}
                <Action
                  title="View History"
                  icon={Icon.Clock}
                  onAction={() => {
                    push(<HistoryView />);
                  }}
                />
                <Action
                  title="Change Model Provider in Preferences"
                  onAction={() => openExtensionPreferences()}
                  icon={Icon.Gear}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}

function HistoryView() {
  const [history, setHistory] = useState<{ query: string; language: string; timestamp: number }[]>([]);

  useEffect(() => {
    LocalStorage.getItem("queryHistory").then((data) => {
      if (data) {
        setHistory(JSON.parse(data as string));
      }
    });
  }, []);

  return (
    <List>
      <List.EmptyView title="No History" description="Your search history will appear here" />
      {history.map((item, index) => (
        <List.Item
          key={index}
          title={item.query}
          subtitle={`Language: ${item.language || ""}`}
          accessories={[{ text: new Date(item.timestamp).toLocaleString() }]}
          actions={
            <ActionPanel>
              <Action
                title="Delete History"
                onAction={async () => {
                  await LocalStorage.removeItem("queryHistory");
                  setHistory([]);
                  showToast({
                    style: Toast.Style.Success,
                    title: "History Deleted",
                    message: "Your search history has been cleared.",
                  });
                }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function isAbortError(error: Error) {
  if (error.name === "AbortError") {
    console.warn("Operation aborted:", error);
    return true;
  }
  if (error.message.includes("This operation was aborted")) {
    console.warn("Operation aborted:", error);
    return true;
  }
  return false;
}

export async function notifyError(error: Error) {
  if (isAbortError(error)) {
    return;
  }
  console.error("Error:", error);
  await showToast({
    style: Toast.Style.Failure,
    title: "Error",
    message: error.message,
  });
}

const player = getPlayer();

async function generateAndPlaySpeech(text: string, language: string) {
  try {
    const openai = new OpenAI({
      apiKey: prefs.openaiApiKey || "",
    });
    const response = await openai.audio.speech.create({
      model: "tts-1",
      voice: "onyx",
      response_format: "mp3",

      input: `[said in ${language}] "${text}"`,
    });

    // Get the audio data as an ArrayBuffer
    const audioData = await response.arrayBuffer();

    // Save the audio data to a file
    const outputFile = "/tmp/temp_output_tts.mp3";
    fs.writeFileSync(outputFile, Buffer.from(audioData));

    console.log(`Audio saved to ${outputFile}`);

    // Play the audio file
    await new Promise((resolve, reject) => {
      player.play(outputFile, (err) => {
        if (err) {
          console.error("Error playing audio:", err);
          reject(err);
        } else {
          resolve(null);
        }
      });
    });
    fs.unlinkSync(outputFile);
  } catch (error) {
    console.error("Error:", error);
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
const languages = [
  {
    name: "English",
    icon: "🇬🇧",
  },
  {
    name: "Spanish",
    icon: "🇪🇸",
  },
  {
    name: "French",
    icon: "🇫🇷",
  },
  {
    name: "German",
    icon: "🇩🇪",
  },
  {
    name: "Italian",
    icon: "🇮🇹",
  },
  {
    name: "Portuguese",
    icon: "🇵🇹",
  },
  {
    name: "Dutch",
    icon: "🇳🇱",
  },
  {
    name: "Swedish",
    icon: "🇸🇪",
  },
  {
    name: "Danish",
    icon: "🇩🇰",
  },
  {
    name: "Norwegian",
    icon: "🇳🇴",
  },
  {
    name: "Finnish",
    icon: "🇫🇮",
  },
  {
    name: "Chinese",
    icon: "🇨🇳",
  },
  {
    name: "Japanese",
    icon: "🇯🇵",
  },
  {
    name: "Korean",
    icon: "🇰🇷",
  },
  {
    name: "Russian",
    icon: "🇷🇺",
  },
  {
    name: "Arabic",
    icon: "🇸🇦",
  },
  {
    name: "Hindi",
    icon: "🇮🇳",
  },
  {
    name: "Bengali",
    icon: "🇧🇩",
  },
  {
    name: "Turkish",
    icon: "🇹🇷",
  },
  {
    name: "Vietnamese",
    icon: "🇻🇳",
  },
];
