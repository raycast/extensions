import OpenAI from "openai";
import { getPreferenceValues } from "@raycast/api";

const preferences = getPreferenceValues();
const apiKey = preferences.openaiApiKey;
const defaultModel = preferences.defaultOpenaiModel || "gpt-4.1";

const openai = new OpenAI({ apiKey });

async function callOpenAIChatCompletion(messages, model = defaultModel) {
  const res = await openai.chat.completions.create({
    model,
    temperature: 0.2,
    messages,
  });
  return res.choices?.[0]?.message?.content?.trim() || "[No summary]";
}

export async function callOpenAIChannel(promptBody, channelName, customPrompt) {
  console.log("Calling OpenAI (channel prompt)…");

  const promptHeader =
    customPrompt?.trim() ||
    `Summarize the following Slack conversations from #${channelName}.
    Combine the messages into a concise digest with bullet points.
    Each message is prefixed with the user name.
    If an item contains multiple messages, that means it's a discussion.
    Omit greetings and signatures.`;

  const messages = [
    {
      role: "user",
      content: [promptHeader, "", promptBody].join("\n"),
    },
  ];
  return callOpenAIChatCompletion(messages);
}

export async function callOpenAIThread(promptBody, customPrompt) {
  console.log("Calling OpenAI (thread prompt)…");

  const promptHeader =
    customPrompt?.trim() ||
    `Summarize the following Slack thread.
    Each message is prefixed with the user name.
    Omit greetings and signatures.
    Highlight decisions and next steps at the end if necessary.`;

  const messages = [
    {
      role: "user",
      content: [promptHeader, "", promptBody].join("\n"),
    },
  ];
  return callOpenAIChatCompletion(messages);
}
