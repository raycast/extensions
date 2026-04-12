// Documentation: https://openrouter.ai/docs

import { getPreferenceValues } from "@raycast/api";
import { NonStreamedToken, StreamedToken } from "../types/ai";
import { Question } from "../types/question";

export async function generateStreamedResponse(
  questions: Question[],
  questionId: string,
  handleStreamingOutput: (output: string) => void,
  abortSignal?: AbortSignal,
): Promise<string | false> {
  const preferences = getPreferenceValues<Preferences>();
  const modelId = (preferences.defaultModel ?? "meta-llama/llama-3.1-8b-instruct:free").trim();

  try {
    const lastIndex = questions.map((q) => q.id).indexOf(questionId);
    const contextQuestions = questions.slice(0, lastIndex);
    const newQuestion = questions[lastIndex];

    const messages = [
      { role: "system", content: "You are a helpful assistant." },
      ...contextQuestions.flatMap((q) => [
        { role: "user", content: q.prompt },
        { role: "assistant", content: q.response },
      ]),
      { role: "user", content: newQuestion.prompt },
    ];

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${preferences.openrouterApiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://raycast.com",
        "X-Title": "OpenRouter",
      },
      body: JSON.stringify({
        model: modelId,
        messages: messages,
        max_tokens: 1000,
        stream: true,
      }),
      signal: abortSignal,
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `OpenRouter Error ${response.status}: ${response.statusText}`;
      try {
        const errorData = JSON.parse(errorText);
        errorMessage = errorData.error?.message || errorData.error || errorMessage;
      } catch (e) {
        if (errorText) errorMessage = errorText;
      }
      throw new Error(errorMessage);
    }

    const stream = response.body;
    if (!stream) return false;

    const decoder = new TextDecoder();
    let output = "";
    let buffer = "";

    // Iterate over the native ReadableStream
    const reader = stream.getReader();
    try {
      let done = false;
      while (!done) {
        const { done: readerDone, value } = await reader.read();
        done = readerDone;
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");

        // Keep the last partial line in the buffer
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmedLine = line.trim();
          if (!trimmedLine) continue;

          if (trimmedLine.startsWith("data: ")) {
            const rawLine = trimmedLine.slice(6).trim();
            if (rawLine === "[DONE]") {
              return output;
            }
            try {
              const data: StreamedToken = JSON.parse(rawLine);
              if (data.choices && data.choices.length > 0) {
                const delta = data.choices[0].delta;
                if ("content" in delta) {
                  output += delta.content;
                  handleStreamingOutput(output);
                }
              }
            } catch (e) {
              console.error("Failed to parse streaming token", e);
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    return output;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") throw error;
    throw error;
  }
}

export async function generateResponse(prompt: string): Promise<string | false> {
  const preferences = getPreferenceValues<Preferences>();
  const modelId = (preferences.defaultModel ?? "meta-llama/llama-3.1-8b-instruct:free").trim();
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${preferences.openrouterApiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://raycast.com",
      "X-Title": "OpenRouter",
    },
    body: JSON.stringify({
      model: modelId,
      messages: [{ role: "user", content: prompt }],
      max_tokens: 100,
      stream: false,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText);
  }

  const responseData = (await response.json()) as NonStreamedToken;
  if (responseData.choices && responseData.choices.length > 0) {
    const message = responseData.choices[0].message;
    return "content" in message ? message.content : false;
  }
  return false;
}
