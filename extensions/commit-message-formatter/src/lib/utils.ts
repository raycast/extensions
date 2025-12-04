import { getPreferenceValues, showToast, Toast } from "@raycast/api";
import { gitmojis } from "./types";
import { OpenAI } from "openai";
import { ChatCompletionTool } from "openai/resources";

export async function ask(prompt: string, message: string, tools: ChatCompletionTool[]) {
  const { openAiApiKey, openAiBasePath, model } = getPreferenceValues<ExtensionPreferences>();
  const openai = new OpenAI({
    apiKey: openAiApiKey,
    baseURL: openAiBasePath,
  });
  const answer = await openai.chat.completions.create({
    model: model,
    messages: [
      { role: "system", content: prompt },
      { role: "user", content: message },
    ],
    tools: tools,
    tool_choice: "required",
    frequency_penalty: 2,
  });
  return answer;
}

export function getEmojiTextByType(type: string) {
  const { emojiFormat, copyFormat } = getPreferenceValues<ExtensionPreferences>();
  const gitmoji = gitmojis.find((g) => g.type === type);
  if (!gitmoji) {
    throw new Error(`No gitmoji found for type: ${type}`);
  }
  let emojiText = emojiFormat === "emoji" ? gitmoji.emoji : gitmoji.code;

  if (copyFormat === "emoji-type") {
    emojiText = `${emojiText} ${type}`;
  }
  return emojiText;
}

export async function getCommitMessage(selectedText: string) {
  const { terminator, language } = getPreferenceValues<ExtensionPreferences>();
  const tools = [
    {
      type: "function" as const,
      function: {
        name: "generate_commit_message",
        parameters: {
          type: "object",
          properties: {
            type: {
              type: "string",
              enum: gitmojis.map((gitmoji) => gitmoji.type),
            },
            message: { type: "string" },
          },
          required: ["type", "message"],
          additionalProperties: false,
        },
      },
    },
  ];

  const prompt = `
    You are a helpful assistant that generates commit messages in ${language} based on the selected text.
    The commit message should be a concise summary of the changes made.
  
    Gitmojis' descriptions are as follows:
    ${gitmojis.map((gitmoji) => `${gitmoji.code} - ${gitmoji.desc}`).join("\n")}
  
    **Important:** Do not modify class names, method names, etc., and do not change the case, just add \` around them.
  
    **Important:** Use imperative mood and write in ${language}.
  
    **Important:** Translate the commit message to ${language}.
  
    **Important:** If specific capitalization or language is required, such as for proper nouns, do not modify the case or language.
  
    For example, use ("${
      gitmojis[0].type
    }", "add functionality for information retrieval") instead of longer descriptions.
    `;
  try {
    const answer = await ask(
      prompt,
      `Selected text: ${selectedText}. Give me a commit message and translate it to ${language}.`,
      tools
    );
    let commitMessage = answer.choices[0]?.message.content || "";
    if (answer.choices[0]?.message.tool_calls) {
      const toolCall = answer.choices[0]?.message.tool_calls[0];
      const toolCallFunction = toolCall.function;
      const functionArguments = JSON.parse(toolCallFunction.arguments);
      commitMessage = `${getEmojiTextByType(functionArguments.type)}${terminator}${functionArguments.message}`;
    }
    return commitMessage;
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to generate commit message",
      message: error.message,
    });
  }
}
