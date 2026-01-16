import OpenAI from "openai";
import { getPreferenceValues } from "@raycast/api";

const preferences = getPreferenceValues();
const apiKey = preferences.openaiApiKey;
const defaultModel = preferences.defaultOpenaiModel || "gpt-4.1";

const openai = new OpenAI({ apiKey });

async function* streamOpenAIChatCompletion(systemPrompt, promptBody, model = defaultModel) {
  const messages = [
    {
      role: "system",
      content: systemPrompt,
    },
    {
      role: "user",
      content: promptBody,
    },
  ];

  const stream = await openai.chat.completions.create({
    model,
    temperature: 0.2,
    messages,
    stream: true,
  });

  for await (const chunk of stream) {
    const content = chunk.choices[0]?.delta?.content;
    if (content) yield content;
  }
}

export async function* callOpenAIChannel(promptBody, channelName, customPrompt) {
  console.log("Calling OpenAI (channel prompt)…");

  const systemPrompt =
    customPrompt?.trim() ||
    `Summarize the following Slack conversations from #${channelName}.
    Combine the messages into a concise digest with bullet points.
    Each message is prefixed with the user name.
    Multiple messages in an item indicate a single conversation.`;

  yield* streamOpenAIChatCompletion(systemPrompt, promptBody);
}

export async function* callOpenAIThread(promptBody, customPrompt) {
  console.log("Calling OpenAI (thread prompt)…");

  const systemPrompt =
    customPrompt?.trim() ||
    `Summarize the following Slack thread.
    Each message is prefixed with the user name.
    Highlight decisions and next steps at the end if necessary.`;

  yield* streamOpenAIChatCompletion(systemPrompt, promptBody);
}
