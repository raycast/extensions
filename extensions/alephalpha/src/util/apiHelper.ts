import { getPreferenceValues, showToast, Toast } from "@raycast/api";
import fetch, { RequestInit, Response } from "node-fetch";
import { Headers } from "node-fetch";
import { EventEmitter } from "events";

export interface Preferences {
  apiKey: string;
  apiUrl: string;
  defaultModel: string;
}

export interface ModelSettings {
  name: string;
  status: string;
  worker_type: string;
  description: string;
  multimodal: boolean;
  max_context_size: number;
  semantic_embedding: boolean;
  completion_type: string;
  embedding_type: string;
  aligned: boolean;
  chat: boolean;
  prompt_template: string;
  model_card: string;
  maximum_completion_tokens: number;
}

export interface ChatModel {
  model: string;
  frequency_penalty: number;
  logprobs: boolean;
  top_logprobs: number;
  max_tokens: number;
  n: number;
  presence_penalty: number;
  stop: string;
  stream: boolean;
  stream_options: {
    include_usage: boolean;
  };
  temperature: number;
  top_p: number;
  steering_concepts?: string;
}

export interface ApiResponseWithUsage {
  content: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

// Define a type for API request bodies
export interface ApiRequestBody {
  messages: Array<{
    role: string;
    content: string;
  }>;
  model: string;
  max_tokens?: number;
  frequency_penalty?: number;
  temperature?: number;
  presence_penalty?: number;
  top_p?: number;
  stream?: boolean;
  steering_concepts?: string[];
  [key: string]: unknown; // For any additional properties
}

// Common base function to make API requests
async function makeApiRequest(
  requestBody: ApiRequestBody,
  toastTitle: string = "Generating answer...",
  silent: boolean = false,
): Promise<ApiResponseWithUsage> {
  let toast;

  if (!silent) {
    toast = await showToast({
      style: Toast.Style.Animated,
      title: toastTitle,
    });
  }

  const preferences = getPreferenceValues<Preferences>();
  const myHeaders = new Headers();
  myHeaders.append("Content-Type", "application/json");
  myHeaders.append("Accept", "application/json");
  myHeaders.append("Authorization", "Bearer " + preferences.apiKey);

  const requestOptions: RequestInit = {
    method: "POST",
    headers: Object.fromEntries(myHeaders.entries()),
    body: JSON.stringify(requestBody),
    redirect: "follow",
  };

  try {
    const response = await fetch(`${preferences.apiUrl}/chat/completions`, requestOptions);
    const result = await response.json();

    if (result.status === 401) {
      if (!silent) {
        toast!.style = Toast.Style.Failure;
        toast!.title = "Unauthorized. Please update your API key in the settings.";
      }
      return { content: "" };
    }

    if (result.choices && result.choices.length > 0) {
      if (!silent) {
        toast!.style = Toast.Style.Success;
        toast!.title = "Answer generated successfully.";
      }
      return {
        content: result.choices[0].message.content,
        usage: result.usage,
      };
    } else {
      if (!silent) {
        toast!.style = Toast.Style.Failure;
        toast!.title = "No answer returned from the API.";
      }
      return { content: "" };
    }
  } catch (error) {
    console.error(error);
    if (!silent) {
      toast!.style = Toast.Style.Failure;
      toast!.title = "Failed to generate answer.";
      if (error instanceof Error) {
        toast!.message = error.message;
      }
    }
    return { content: "" };
  }
}

// Standard API function that returns just the content string
export async function fetchApiResponse(
  prompt: string,
  textInput: string,
  model: string,
  max_tokens?: number,
  temperature?: number,
  frequency_penalty?: number,
  top_p?: number,
  presence_penalty?: number,
): Promise<string> {
  const requestBody = {
    messages: [
      {
        role: "system",
        content: prompt,
      },
      {
        role: "user",
        content: textInput,
      },
    ],
    model: model,
    ...(max_tokens !== undefined && { max_tokens }),
    ...(frequency_penalty !== undefined && { frequency_penalty }),
    ...(temperature !== undefined && { temperature }),
    ...(presence_penalty !== undefined && { presence_penalty }),
    ...(top_p !== undefined && { top_p }),
    stream: false,
  };

  const response = await makeApiRequest(requestBody);
  return response.content;
}

// Performance test API function that returns full usage data
export async function fetchApiResponseWithUsage(
  prompt: string,
  textInput: string,
  model: string,
  max_tokens?: number,
  temperature?: number,
  frequency_penalty?: number,
  top_p?: number,
  presence_penalty?: number,
  silent: boolean = false,
): Promise<ApiResponseWithUsage> {
  const requestBody = {
    messages: [
      {
        role: "system",
        content: prompt,
      },
      {
        role: "user",
        content: textInput,
      },
    ],
    model: model,
    ...(max_tokens !== undefined && { max_tokens }),
    ...(frequency_penalty !== undefined && { frequency_penalty }),
    ...(temperature !== undefined && { temperature }),
    ...(presence_penalty !== undefined && { presence_penalty }),
    ...(top_p !== undefined && { top_p }),
    stream: false,
  };

  return makeApiRequest(requestBody, "Measuring performance...", silent);
}

export async function fetchSteeringApiResponse(
  textInput: string,
  steeringConcept: string,
  model: string,
): Promise<string> {
  const requestBody = {
    messages: [
      {
        role: "user",
        content: textInput,
      },
    ],
    model: model,
    steering_concepts: ["_worker/" + steeringConcept],
    stream: false,
  };

  const response = await makeApiRequest(requestBody, "Generating steered answer...");
  return response.content;
}

// Create a stream response event emitter
export class StreamResponseEventEmitter extends EventEmitter {
  constructor() {
    super();
  }
}

// Streaming API function that emits chunks as they arrive
export async function fetchStreamingApiResponse(
  prompt: string,
  textInput: string,
  model: string,
  eventEmitter: StreamResponseEventEmitter,
  max_tokens?: number,
  temperature?: number,
  frequency_penalty?: number,
  top_p?: number,
  presence_penalty?: number,
): Promise<void> {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Generating streaming response...",
  });

  const preferences = getPreferenceValues<Preferences>();
  const myHeaders = new Headers();
  myHeaders.append("Content-Type", "application/json");
  myHeaders.append("Accept", "application/json");
  myHeaders.append("Authorization", "Bearer " + preferences.apiKey);

  const requestBody: ApiRequestBody = {
    messages: [
      {
        role: "system",
        content: prompt,
      },
      {
        role: "user",
        content: textInput,
      },
    ],
    model: model,
    ...(max_tokens !== undefined && { max_tokens }),
    ...(frequency_penalty !== undefined && { frequency_penalty }),
    ...(temperature !== undefined && { temperature }),
    ...(presence_penalty !== undefined && { presence_penalty }),
    ...(top_p !== undefined && { top_p }),
    stream: true,
    stream_options: {
      include_usage: true,
    },
  };

  const requestOptions: RequestInit = {
    method: "POST",
    headers: Object.fromEntries(myHeaders.entries()),
    body: JSON.stringify(requestBody),
    redirect: "follow",
  };

  try {
    const response: Response = await fetch(`${preferences.apiUrl}/chat/completions`, requestOptions);

    if (!response.ok) {
      const errorData = await response.json();
      toast.style = Toast.Style.Failure;
      toast.title = "API request failed";
      toast.message = errorData.error?.message || "Unknown error";
      eventEmitter.emit("error", errorData.error?.message || "API request failed");
      return;
    }

    if (!response.body) {
      toast.style = Toast.Style.Failure;
      toast.title = "No response body received";
      eventEmitter.emit("error", "No response body received");
      return;
    }

    // Process the streaming response
    let fullContent = "";
    let buffer = "";

    // Use response.body directly as it's already a Node.js stream
    const stream = response.body;

    stream.on("data", (chunk) => {
      const textChunk = chunk.toString();
      buffer += textChunk;

      // Process each line in the buffer
      const lines = buffer.split("\n");
      buffer = lines.pop() || ""; // Keep the last potentially incomplete line

      for (const line of lines) {
        if (line.trim() === "") continue;

        // Remove "data: " prefix
        const jsonLine = line.replace(/^data: /, "").trim();

        // Skip "[DONE]" message
        if (jsonLine === "[DONE]") continue;

        try {
          const parsed = JSON.parse(jsonLine);

          // Extract content from delta if available
          if (parsed.choices && parsed.choices[0].delta?.content) {
            const content = parsed.choices[0].delta.content;
            fullContent += content;
            eventEmitter.emit("chunk", content);
            eventEmitter.emit("fullContent", fullContent);
          }

          // Emit usage info if available
          if (parsed.usage) {
            eventEmitter.emit("usage", parsed.usage);
          }
        } catch (error) {
          console.error("Error parsing stream chunk:", error, "Line:", jsonLine);
        }
      }
    });

    stream.on("error", (error) => {
      console.error("Stream error:", error);
      toast.style = Toast.Style.Failure;
      toast.title = "Streaming error";
      if (error instanceof Error) {
        toast.message = error.message;
        eventEmitter.emit("error", error.message);
      } else {
        eventEmitter.emit("error", "Unknown streaming error");
      }
    });

    stream.on("end", () => {
      // Process any remaining content in the buffer
      if (buffer.trim()) {
        const jsonLine = buffer.replace(/^data: /, "").trim();
        if (jsonLine !== "[DONE]") {
          try {
            const parsed = JSON.parse(jsonLine);
            if (parsed.choices && parsed.choices[0].delta?.content) {
              const content = parsed.choices[0].delta.content;
              fullContent += content;
              eventEmitter.emit("chunk", content);
            }
          } catch (error) {
            console.error("Error parsing final chunk:", error);
          }
        }
      }
      eventEmitter.emit("done", fullContent);
      toast.style = Toast.Style.Success;
      toast.title = "Response completed";
    });
  } catch (error) {
    console.error("Streaming request error:", error);
    toast.style = Toast.Style.Failure;
    toast.title = "Streaming request failed";
    if (error instanceof Error) {
      toast.message = error.message;
      eventEmitter.emit("error", error.message);
    } else {
      eventEmitter.emit("error", "Unknown error");
    }
  }
}

// Streaming version of steering API response
export async function fetchStreamingSteeringApiResponse(
  textInput: string,
  steeringConcept: string,
  model: string,
  eventEmitter: StreamResponseEventEmitter,
): Promise<void> {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Generating streaming response...",
  });

  const preferences = getPreferenceValues<Preferences>();
  const myHeaders = new Headers();
  myHeaders.append("Content-Type", "application/json");
  myHeaders.append("Accept", "application/json");
  myHeaders.append("Authorization", "Bearer " + preferences.apiKey);

  const requestBody: ApiRequestBody = {
    messages: [
      {
        role: "user",
        content: textInput,
      },
    ],
    model: model,
    steering_concepts: ["_worker/" + steeringConcept],
    stream: true,
    stream_options: {
      include_usage: true,
    },
  };

  const requestOptions: RequestInit = {
    method: "POST",
    headers: Object.fromEntries(myHeaders.entries()),
    body: JSON.stringify(requestBody),
    redirect: "follow",
  };

  try {
    const response: Response = await fetch(`${preferences.apiUrl}/chat/completions`, requestOptions);

    if (!response.ok) {
      const errorData = await response.json();
      toast.style = Toast.Style.Failure;
      toast.title = "API request failed";
      toast.message = errorData.error?.message || "Unknown error";
      eventEmitter.emit("error", errorData.error?.message || "API request failed");
      return;
    }

    if (!response.body) {
      toast.style = Toast.Style.Failure;
      toast.title = "No response body received";
      eventEmitter.emit("error", "No response body received");
      return;
    }

    // Process the streaming response
    let fullContent = "";
    let buffer = "";

    // Use response.body directly as it's already a Node.js stream
    const stream = response.body;

    stream.on("data", (chunk) => {
      const textChunk = chunk.toString();
      buffer += textChunk;

      // Process each line in the buffer
      const lines = buffer.split("\n");
      buffer = lines.pop() || ""; // Keep the last potentially incomplete line

      for (const line of lines) {
        if (line.trim() === "") continue;

        // Remove "data: " prefix
        const jsonLine = line.replace(/^data: /, "").trim();

        // Skip "[DONE]" message
        if (jsonLine === "[DONE]") continue;

        try {
          const parsed = JSON.parse(jsonLine);

          // Extract content from delta if available
          if (parsed.choices && parsed.choices[0].delta?.content) {
            const content = parsed.choices[0].delta.content;
            fullContent += content;
            eventEmitter.emit("chunk", content);
            eventEmitter.emit("fullContent", fullContent);
          }

          // Emit usage info if available
          if (parsed.usage) {
            eventEmitter.emit("usage", parsed.usage);
          }
        } catch (error) {
          console.error("Error parsing stream chunk:", error, "Line:", jsonLine);
        }
      }
    });

    stream.on("error", (error) => {
      console.error("Stream error:", error);
      toast.style = Toast.Style.Failure;
      toast.title = "Streaming error";
      if (error instanceof Error) {
        toast.message = error.message;
        eventEmitter.emit("error", error.message);
      } else {
        eventEmitter.emit("error", "Unknown streaming error");
      }
    });

    stream.on("end", () => {
      // Process any remaining content in the buffer
      if (buffer.trim()) {
        const jsonLine = buffer.replace(/^data: /, "").trim();
        if (jsonLine !== "[DONE]") {
          try {
            const parsed = JSON.parse(jsonLine);
            if (parsed.choices && parsed.choices[0].delta?.content) {
              const content = parsed.choices[0].delta.content;
              fullContent += content;
              eventEmitter.emit("chunk", content);
            }
          } catch (error) {
            console.error("Error parsing final chunk:", error);
          }
        }
      }
      eventEmitter.emit("done", fullContent);
      toast.style = Toast.Style.Success;
      toast.title = "Response completed";
    });
  } catch (error) {
    console.error("Streaming request error:", error);
    toast.style = Toast.Style.Failure;
    toast.title = "Streaming request failed";
    if (error instanceof Error) {
      toast.message = error.message;
      eventEmitter.emit("error", error.message);
    } else {
      eventEmitter.emit("error", "Unknown error");
    }
  }
}
