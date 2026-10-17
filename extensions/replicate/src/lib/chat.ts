import { AI } from "@raycast/api";
import { Model, OptionSchema, Prediction } from "../types";
import { altText, extensionFor, outputItems } from "../utils/output";
import { imageForModel, ReplicateError, uploadBytes, USER_AGENT } from "./replicate";

export type ChatShape = {
  output: "text" | "image";
  prompt: string;
  image?: { name: string; multiple: boolean; required: boolean };
  system?: string;
  temperature?: { minimum?: number; maximum?: number };
};

const PROMPT_NAMES = ["prompt", "text", "input", "instruction", "query", "question", "message"];
const VISION_TYPES: ("image/png" | "image/jpeg" | "image/webp" | "image/gif")[] = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
];

const isUri = (schema?: OptionSchema) => schema?.format === "uri";
const isText = (schema?: OptionSchema) => schema?.type === "string" && !schema.format;
const isUriField = (schema: OptionSchema) => isUri(schema) || (schema.type === "array" && isUri(schema.items));

const outputKind = (model: Model): ChatShape["output"] | undefined => {
  const output = model.latest_version?.openapi_schema?.components?.schemas?.Output;
  if (!output) return undefined;
  if (isText(output) || (output.type === "array" && isText(output.items))) return "text";
  if (!isUriField(output)) return undefined;

  // A URI output could be video or audio, so the model's example output decides.
  const example = outputItems(model.default_example?.output);
  return example.some((item) => item.kind === "video" || item.kind === "audio") ? undefined : "image";
};

export const chatShape = (model?: Model | null): ChatShape | undefined => {
  if (!model) return undefined;
  const output = outputKind(model);
  if (!output) return undefined;

  const input = model.latest_version?.openapi_schema?.components?.schemas?.Input;
  const properties = input?.properties ?? {};
  const required = input?.required ?? [];
  const texts = Object.keys(properties).filter((name) => isText(properties[name]));
  const prompt =
    PROMPT_NAMES.find((name) => texts.includes(name)) ?? texts.find((name) => required.includes(name)) ?? texts[0];
  if (!prompt) return undefined;

  const images = Object.keys(properties).filter(
    (name) => /image/i.test(name) && !/mask/i.test(name) && isUriField(properties[name]),
  );
  const image = images.find((name) => required.includes(name)) ?? images[0];
  const temperature = properties.temperature;

  return {
    output,
    prompt,
    image: image
      ? { name: image, multiple: properties[image].type === "array", required: required.includes(image) }
      : undefined,
    system: texts.includes("system_prompt") ? "system_prompt" : undefined,
    temperature:
      temperature?.type === "number" || temperature?.type === "integer"
        ? { minimum: temperature.minimum, maximum: temperature.maximum }
        : undefined,
  };
};

// Every model takes attachments: Raycast drops them silently otherwise, and the chat couldn't say why.
export const chatCapabilities = (shape: ChatShape): AI.RegisteredModel["capabilities"] => ({
  systemMessage: { supported: Boolean(shape.system) },
  temperature: { supported: Boolean(shape.temperature) },
  streaming: { supported: shape.output === "text" },
  tools: { supported: false },
  vision: { mediaTypes: VISION_TYPES },
});

type ImageRef = { data: string | Uint8Array | ArrayBuffer | URL; mediaType: string };

const MARKDOWN_IMAGE = /!\[[^\]]*\]\((https?:\/\/[^)\s]+)\)/g;
const PASTED_URL = /https?:\/\/[^\s<>()"']+/g;

// A pasted page link isn't an image, so only image files and Replicate outputs count.
const isImageUrl = (value: string) => {
  try {
    const url = new URL(value);
    return /\.(png|jpe?g|webp|gif)$/i.test(url.pathname) || url.hostname === "replicate.delivery";
  } catch {
    return false;
  }
};

const textOf = (message: AI.ModelMessage) => {
  if (message.role === "system") return message.content;
  if (message.role === "tool") return "";
  return message.content
    .map((part) => (part.type === "text" ? part.text : ""))
    .join("")
    .trim();
};

const attachedImage = (message: AI.ModelMessage): ImageRef | undefined => {
  if (message.role !== "user" && message.role !== "assistant") return undefined;
  for (const part of [...message.content].reverse()) {
    if (part.type === "file" && part.mediaType.startsWith("image/")) return part;
  }
  return undefined;
};

const linkedImage = (message: AI.ModelMessage): ImageRef | undefined => {
  if (message.role !== "user" && message.role !== "assistant") return undefined;
  const url =
    message.role === "user"
      ? [...textOf(message).matchAll(PASTED_URL)].map((match) => match[0]).findLast(isImageUrl)
      : [...textOf(message).matchAll(MARKDOWN_IMAGE)].at(-1)?.[1];
  return url ? { data: url, mediaType: "image/*" } : undefined;
};

const imageIn = (message: AI.ModelMessage) => attachedImage(message) ?? linkedImage(message);

// A text model reads a pasted image link as text, so only an attachment would go unused.
export const sentImage = (messages: AI.ModelMessage[], shape: ChatShape) => {
  const last = messages.findLast((message) => message.role === "user");
  if (!last) return false;
  return Boolean(shape.output === "text" ? attachedImage(last) : imageIn(last));
};

// The newest image is the one a follow-up like "make it bluer" means.
const latestImage = (messages: AI.ModelMessage[]) =>
  [...messages]
    .reverse()
    .map(imageIn)
    .find((image) => image);

const toBuffer = (data: Exclude<ImageRef["data"], URL>) => {
  if (typeof data === "string") return Buffer.from(data, "base64");
  if (data instanceof ArrayBuffer) return Buffer.from(data);
  return Buffer.from(data.buffer, data.byteOffset, data.byteLength);
};

const toUrl = async ({ data, mediaType }: ImageRef) => {
  if (data instanceof URL) return imageForModel(data.href);
  if (typeof data === "string" && /^(https?:|data:)/.test(data)) return imageForModel(data);
  return uploadBytes(toBuffer(data), `attachment.${extensionFor(mediaType) ?? "png"}`, mediaType);
};

const transcript = (messages: AI.ModelMessage[]) => {
  const turns = messages.filter((message) => message.role === "user" || message.role === "assistant");
  if (turns.length <= 1) return turns[0] ? textOf(turns[0]) : "";
  const lines = turns.map((message) => `${message.role === "user" ? "User" : "Assistant"}: ${textOf(message)}`);
  return `${lines.join("\n\n")}\n\nAssistant:`;
};

const clamp = (value: number, { minimum, maximum }: NonNullable<ChatShape["temperature"]>) =>
  Math.min(maximum ?? value, Math.max(minimum ?? value, value));

export const chatInput = async (model: Model, shape: ChatShape, request: AI.ModelRequest) => {
  const messages = request.messages ?? [];
  const lastUser = messages.findLast((message) => message.role === "user");
  // Image models take one instruction, so earlier turns only matter for the image they left.
  const prompt = shape.output === "text" ? transcript(messages) : lastUser ? textOf(lastUser) : "";
  const input: Record<string, unknown> = {};
  if (prompt) input[shape.prompt] = prompt;

  const image = shape.image ? latestImage(messages) : undefined;
  if (shape.image && image) {
    const url = await toUrl(image);
    input[shape.image.name] = shape.image.multiple ? [url] : url;
  }
  if (shape.image?.required && !image) {
    throw new Error(`${model.owner}/${model.name} edits an image. Attach one to your message.`);
  }

  if (shape.system && request.system) input[shape.system] = request.system;
  if (shape.temperature && request.temperature !== undefined) {
    input.temperature = clamp(request.temperature, shape.temperature);
  }

  return { input, prompt };
};

export const chatReply = (prediction: Prediction, prompt: string, shape: ChatShape) => {
  const items = outputItems(prediction.output);
  if (!items.length) throw new Error("The model finished without returning anything.");
  return items
    .map((item) => {
      if (item.kind === "text") return item.text;
      // Some image URLs have no extension, so an image model's plain file is still its image.
      if (item.kind === "image" || (item.kind === "file" && shape.output === "image")) {
        return `![${altText(prompt)}](${item.url})`;
      }
      return `[${item.kind === "file" ? "Open file" : `Play ${item.kind}`}](${item.url})`;
    })
    .join("\n\n");
};

const parseEvent = (block: string) => {
  const lines = block.split("\n");
  const event =
    lines
      .find((line) => line.startsWith("event:"))
      ?.slice(6)
      .trim() ?? "message";
  const data = lines
    .filter((line) => line.startsWith("data:"))
    .map((line) => line.slice(5).replace(/^ /, ""))
    .join("\n");
  return { event, data };
};

const errorDetail = (data: string) => {
  try {
    return (JSON.parse(data) as { detail?: string }).detail ?? data;
  } catch {
    return data;
  }
};

export async function* streamOutput(url: string, token: string) {
  const response = await fetch(url, {
    headers: {
      Accept: "text/event-stream",
      "Cache-Control": "no-store",
      Authorization: `Bearer ${token}`,
      "User-Agent": USER_AGENT,
    },
  });
  if (!response.ok || !response.body) {
    throw new ReplicateError(response.status, `The output stream failed with ${response.status}.`);
  }

  const decoder = new TextDecoder();
  let buffer = "";
  for await (const chunk of response.body) {
    buffer += decoder.decode(chunk, { stream: true }).replace(/\r/g, "");
    let end = buffer.indexOf("\n\n");
    while (end !== -1) {
      const { event, data } = parseEvent(buffer.slice(0, end));
      buffer = buffer.slice(end + 2);
      if (event === "output") yield data;
      if (event === "error") throw new Error(errorDetail(data));
      if (event === "done") return;
      end = buffer.indexOf("\n\n");
    }
  }
}
