import axios from "axios";
import { getPreferenceValues } from "@raycast/api";

interface Message {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface InkeepLink {
  label?: string | null;
  url: string;
  title?: string | null;
  description?: string | null;
  type?: string | null;
  breadcrumbs?: string[] | null;
}

export interface AIAnnotations {
  answerConfidence?: "very_confident" | "somewhat_confident" | "not_confident" | "no_sources" | "other" | string | null;
}

export interface ToolCall {
  id: string;
  type: string;
  function: {
    name: string;
    arguments: string;
  };
}

export interface InkeepToolResponse {
  links?: InkeepLink[] | null;
  aiAnnotations?: AIAnnotations;
}

// This interface is used for type checking when building the request
export interface InkeepCompletionRequest {
  model: string;
  messages: Message[];
  stream?: boolean;
  tools?: Array<{
    type: string;
    function: {
      name: string;
      description?: string;
      parameters?: Record<string, unknown>;
    };
  }>;
  tool_choice?: string | { type: string; function: { name: string } };
}

interface InkeepCompletionResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: {
    index: number;
    message: {
      role: string;
      content: string;
      tool_calls?: ToolCall[];
    };
    finish_reason: string;
  }[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

interface StreamChunk {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: {
    index: number;
    delta: {
      content?: string;
      role?: string;
      tool_calls?: Partial<ToolCall>[];
    };
    finish_reason: string | null;
  }[];
}

export interface InkeepResponse {
  content: string;
  links?: InkeepLink[];
  aiAnnotations?: AIAnnotations;
}

export async function getInkeepCompletion(prompt: string): Promise<InkeepResponse> {
  const preferences = getPreferenceValues<ExtensionPreferences>();
  const apiBaseUrl = preferences.aiApiBaseUrl.endsWith("/")
    ? preferences.aiApiBaseUrl.slice(0, -1)
    : preferences.aiApiBaseUrl;

  try {
    const response = await axios.post<InkeepCompletionResponse>(
      `${apiBaseUrl}/chat/completions`,
      {
        model: preferences.model,
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "provideLinks",
              description: "Provides a list of links (sources) used by the AI assistant to generate a response",
            },
          },
          {
            type: "function",
            function: {
              name: "provideAIAnnotations",
              description: "Provides labels for the response, like answerConfidence",
              parameters: {
                type: "object",
                properties: {
                  aiAnnotations: {
                    type: "object",
                    properties: {
                      answerConfidence: {
                        type: "string",
                        enum: ["very_confident", "somewhat_confident", "not_confident", "no_sources", "other"],
                        description: "The confidence level of the answer",
                      },
                    },
                    required: ["answerConfidence"],
                  },
                },
                required: ["aiAnnotations"],
              },
            },
          },
        ],
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${preferences.apiKey}`,
        },
      },
    );

    if (!response.data.choices || response.data.choices.length === 0) {
      throw new Error("No completion choices returned from the API");
    }
    const message = response.data.choices[0].message;
    const result: InkeepResponse = {
      content: message.content,
    };

    // Process tool calls if any
    if (message.tool_calls && message.tool_calls.length > 0) {
      for (const toolCall of message.tool_calls) {
        if (toolCall.function.name === "provideLinks") {
          const toolResponse = JSON.parse(toolCall.function.arguments) as { links?: InkeepLink[] };
          result.links = toolResponse.links || [];
        } else if (toolCall.function.name === "provideAIAnnotations") {
          const toolResponse = JSON.parse(toolCall.function.arguments) as { aiAnnotations?: AIAnnotations };
          result.aiAnnotations = toolResponse.aiAnnotations;
        }
      }
    }

    return result;
  } catch (error: unknown) {
    if (axios.isAxiosError(error) && error.response) {
      console.error("API Error:", error.response.data);
      throw new Error(`Inkeep API Error: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
    }
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Error fetching completion: ${errorMessage}`);
  }
}

export async function streamInkeepCompletion(
  prompt: string,
  onChunk: (chunk: string) => void,
  onToolCall: (toolName: string, args: string) => void,
  onComplete: (fullResponse: InkeepResponse) => void,
): Promise<void> {
  const preferences = getPreferenceValues<Preferences>();
  const apiBaseUrl = preferences.aiApiBaseUrl.endsWith("/")
    ? preferences.aiApiBaseUrl.slice(0, -1)
    : preferences.aiApiBaseUrl;
  let fullContent = "";
  let lastChunkEndedWithNewline = true;
  const toolCalls: ToolCall[] = [];
  let partialToolCalls: Partial<ToolCall>[] = [];

  try {
    const response = await axios.post(
      `${apiBaseUrl}/chat/completions`,
      {
        model: preferences.model,
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
        stream: true,
        tools: [
          {
            type: "function",
            function: {
              name: "provideLinks",
              description: "Provides a list of links (sources) used by the AI assistant to generate a response",
            },
          },
          {
            type: "function",
            function: {
              name: "provideAIAnnotations",
              description: "Provides labels for the response, like answerConfidence",
              parameters: {
                type: "object",
                properties: {
                  aiAnnotations: {
                    type: "object",
                    properties: {
                      answerConfidence: {
                        type: "string",
                        enum: ["very_confident", "somewhat_confident", "not_confident", "no_sources", "other"],
                        description: "The confidence level of the answer",
                      },
                    },
                    required: ["answerConfidence"],
                  },
                },
                required: ["aiAnnotations"],
              },
            },
          },
        ],
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${preferences.apiKey}`,
        },
        responseType: "stream",
      },
    );

    const stream = response.data;
    let buffer = "";

    stream.on("data", (chunk: Buffer) => {
      const chunkStr = chunk.toString();
      buffer += chunkStr;

      // Process complete lines
      const lines = buffer.split("\n");
      buffer = lines.pop() || ""; // Keep the last incomplete line in the buffer

      for (const line of lines) {
        if (line.trim() === "") continue;
        if (line.trim() === "data: [DONE]") continue;

        try {
          // Remove the "data: " prefix
          const jsonStr = line.replace(/^data: /, "").trim();
          const data = JSON.parse(jsonStr) as StreamChunk;

          if (data.choices && data.choices.length > 0) {
            const choice = data.choices[0];

            // Handle content updates
            if (choice.delta.content) {
              const content = choice.delta.content;

              // Format markdown content
              let formattedContent = content;

              // Add proper spacing around inline code
              formattedContent = formattedContent.replace(/`([^`]+)`/g, " `$1` ");

              // Ensure bullet points and ordered lists have proper spacing
              if (formattedContent.match(/^\s*[-*]\s/) || formattedContent.match(/^\s*\d+\.\s/)) {
                if (!lastChunkEndedWithNewline) {
                  formattedContent = "\n" + formattedContent;
                }
                if (!formattedContent.endsWith("\n")) {
                  formattedContent = formattedContent + "\n";
                }
              }

              // Add extra spacing after ordered list items to ensure proper rendering
              formattedContent = formattedContent.replace(/(\d+\.\s.*?)(?=\n|$)/g, "$1\n");

              lastChunkEndedWithNewline = formattedContent.endsWith("\n");
              fullContent += formattedContent;
              onChunk(formattedContent);
            }

            // Handle tool calls
            if (choice.delta.tool_calls) {
              // Merge partial tool calls
              if (!partialToolCalls.length && choice.delta.tool_calls.length) {
                partialToolCalls = choice.delta.tool_calls.map((tc) => ({ ...tc }));
              } else {
                choice.delta.tool_calls.forEach((deltaToolCall, index) => {
                  if (!partialToolCalls[index]) {
                    partialToolCalls[index] = { ...deltaToolCall };
                  } else {
                    // Merge function properties
                    if (deltaToolCall.function) {
                      if (!partialToolCalls[index].function) {
                        partialToolCalls[index].function = { ...deltaToolCall.function };
                      } else {
                        if (deltaToolCall.function.name) {
                          partialToolCalls[index].function!.name = deltaToolCall.function.name;
                        }
                        if (deltaToolCall.function.arguments) {
                          partialToolCalls[index].function!.arguments =
                            (partialToolCalls[index].function!.arguments || "") + deltaToolCall.function.arguments;
                        }
                      }
                    }

                    // Merge other properties
                    if (deltaToolCall.id) {
                      partialToolCalls[index].id = deltaToolCall.id;
                    }
                    if (deltaToolCall.type) {
                      partialToolCalls[index].type = deltaToolCall.type;
                    }
                  }
                });
              }

              // Check if any tool call is complete and can be processed
              for (let i = partialToolCalls.length - 1; i >= 0; i--) {
                const tc = partialToolCalls[i];
                if (tc.id && tc.type && tc.function?.name && tc.function?.arguments) {
                  try {
                    // Validate JSON before processing
                    const args = tc.function.arguments;
                    // Check if the JSON is valid and complete
                    if (isValidJSON(args)) {
                      const completeToolCall = tc as ToolCall;
                      toolCalls.push(completeToolCall);
                      onToolCall(completeToolCall.function.name, completeToolCall.function.arguments);
                      // Remove from partial list
                      partialToolCalls.splice(i, 1);
                    }
                  } catch (e) {
                    console.error("Error validating tool call arguments:", e);
                    // Keep in partial list to collect more chunks
                  }
                }
              }
            }
          }
        } catch (e) {
          console.error("Error parsing stream chunk:", e, line);
        }
      }
    });

    stream.on("end", () => {
      // Process any remaining tool calls
      for (let i = partialToolCalls.length - 1; i >= 0; i--) {
        const tc = partialToolCalls[i];
        if (tc.id && tc.type && tc.function?.name && tc.function?.arguments) {
          try {
            // Validate JSON before processing
            const args = tc.function.arguments;
            // Check if the JSON is valid and complete
            if (isValidJSON(args)) {
              const completeToolCall = tc as ToolCall;
              toolCalls.push(completeToolCall);
              onToolCall(completeToolCall.function.name, completeToolCall.function.arguments);
            } else {
              console.warn("Incomplete JSON in tool call arguments:", args);
            }
          } catch (e) {
            console.error("Error processing remaining tool call:", e);
          }
        }
      }

      // Create final response
      const result: InkeepResponse = {
        content: fullContent,
      };

      // Process tool calls
      for (const toolCall of toolCalls) {
        try {
          if (toolCall.function.name === "provideLinks") {
            const args = toolCall.function.arguments;
            if (isValidJSON(args)) {
              const toolResponse = JSON.parse(args) as { links?: InkeepLink[] };
              result.links = toolResponse.links || [];
            }
          } else if (toolCall.function.name === "provideAIAnnotations") {
            const args = toolCall.function.arguments;
            if (isValidJSON(args)) {
              const toolResponse = JSON.parse(args) as { aiAnnotations?: AIAnnotations };
              result.aiAnnotations = toolResponse.aiAnnotations;
            }
          }
        } catch (e) {
          console.error("Error processing tool call in final response:", e);
        }
      }

      onComplete(result);
    });

    stream.on("error", (err: Error) => {
      console.error("Stream error:", err);
      throw err;
    });
  } catch (error: unknown) {
    if (axios.isAxiosError(error) && error.response) {
      console.error("API Error:", error.response.data);
      throw new Error(`Inkeep API Error: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
    }
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Error fetching completion: ${errorMessage}`);
  }
}

// Helper function to check if a string is valid JSON
function isValidJSON(str: string): boolean {
  try {
    JSON.parse(str);
    return true;
  } catch (e) {
    return false;
  }
}
