// Documentation: https://huggingface.co/docs/api-inference/tasks/chat-completion

import { getPreferenceValues } from "@raycast/api";
import { ChatPreferences } from "../types/preferences";
import fetch from "node-fetch";
import { NonStreamedToken, StreamedToken } from "../types/hugging-face";
import { Question } from "../types/question";
import { Model } from "../types/model";

const preferences = getPreferenceValues<ChatPreferences>();

const defaultModel = "meta-llama/Meta-Llama-3-8B-Instruct";

export async function generateStreamedResponse(
  questions: Question[],
  questionId: string,
  handleStreamingOutput: (output: string) => void,
  model?: Model,
  abortSignal?: AbortSignal,
): Promise<string | false> {
  try {
    const lastIndex = questions.map((q) => q.id).indexOf(questionId);
    const contextQuestions = questions.slice(0, lastIndex); // Previously answered questions
    const newQuestion = questions[lastIndex]; // Latest question (not answered yet)
    const messages = [
      { role: "system", content: model?.prompt ?? "You are a helpful assistant." },
      ...contextQuestions.flatMap((q) => [
        { role: "user", content: q.prompt },
        { role: "assistant", content: q.response },
      ]),
      { role: "user", content: newQuestion.prompt },
    ];

    const response = await fetch(
      `https://api-inference.huggingface.co/models/${model?.model ?? defaultModel}/v1/chat/completions`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${preferences.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: model?.model ?? defaultModel,
          messages: messages,
          max_tokens: 500,
          stream: true,
        }),
        signal: abortSignal,
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText);
    }

    // Convert the response to a ReadableStream
    const stream = response.body;
    if (!stream) {
      return false;
    }

    // Use the Node.js stream methods instead of HFInference client
    return new Promise((resolve, reject) => {
      let output = "";
      const chunks: Buffer[] = [];

      stream.on("data", (chunk: Buffer) => {
        chunks.push(chunk);
        const text = chunk.toString();
        const lines = text.split("\n").filter((line) => line.trim() !== "");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const rawLine = line.slice(6).trim();

            if (rawLine === "[DONE]") {
              // Safely handle the end of the stream
              resolve(output);
              return;
            }

            try {
              const data: StreamedToken = JSON.parse(rawLine);
              const delta = data.choices[0].delta;

              if ("content" in delta) {
                output += delta.content;
                handleStreamingOutput(output);
              }
            } catch (e) {
              console.error("Error parsing JSON:", e);
            }
          }
        }
      });

      stream.on("end", () => {
        resolve(output);
      });

      stream.on("error", (err) => {
        reject(err);
      });
    });
  } catch (error) {
    if (error instanceof Error) {
      const parsedError = JSON.parse(error.message);

      if (
        "error" in parsedError &&
        parsedError.error === "Authorization header is correct, but the token seems invalid"
      ) {
        throw new Error("Invalid Token");
      }

      if ("error" in parsedError) {
        throw new Error(parsedError.error);
      }
    }
    console.error("Error generating response:", error);
    throw error;
  }
}

// TODO: this function is not actively in use, but may later be used in the background to do things like generating question.description or conversation.title...
export async function generateResponse(prompt: string): Promise<string | false> {
  try {
    const response = await fetch(`https://api-inference.huggingface.co/models/${defaultModel}/v1/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${preferences.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: defaultModel,
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
    const message = responseData.choices[0].message;
    if ("content" in message) {
      return message.content;
    } else {
      return false;
    }
  } catch (error) {
    if (error instanceof Error) {
      const parsedError = JSON.parse(error.message);
      if ("error" in parsedError) {
        throw new Error(parsedError.error);
      }
    }
    console.error("Error generating response:", error);
    throw error;
  }
}
