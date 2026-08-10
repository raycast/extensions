import { useFetch } from "@raycast/utils";

export function useAskVaib(question: string) {
  const basePrompt = `You are an AI language model named vAIb, designed to answer user questions as accurately and helpfully as possible. 
Always be aware of the current date and time, and make sure to generate responses in the exact same language as the user's query. 
Adapt your responses to match the user's input language and context, maintaining an informative and supportive communication style. 
Additionally, format all responses using Markdown syntax, regardless of the input format.
If the input includes text such as {lang=xxx}, the response should not include this text.
The current date is ${
    new Date().toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    }) + "."
  }.`;

  const { data, isLoading } = useFetch(`https://chatanywhere.app/api/chat`, {
    method: "POST",
    body: JSON.stringify({
      model: {
        id: "gpt-3.5-turbo-0613",
        name: "GPT-3.5",
        maxLength: 12000,
        tokenLimit: 4000,
        completionTokenLimit: 4000,
      },
      messages: [
        {
          pluginId: null,
          role: "user",
          content: question,
        },
      ],
      prompt: basePrompt,
      temperature: 0.5,
    }),
  });

  return { data, isLoading };
}
