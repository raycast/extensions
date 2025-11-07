import { Action, ActionPanel, getPreferenceValues, Icon, List, showToast, Toast } from "@raycast/api";
import { showFailureToast, useLocalStorage } from "@raycast/utils";
import { useEffect, useState } from "react";
import { useClipboardHistory } from "../hooks/use-clipboard-history";
import { type Conversation as ConversationType, getConversations, setConversations } from "../hooks/use-conversations";
import { getSystemPrompt } from "../hooks/use-system-prompt";
import type { Preferences } from "../types/preferences";
import { client } from "../utils/mistral-client";
import {
  DEFAULT_MODEL_ID,
  FALLBACK_MODELS,
  getDefaultVisionModel,
  supportsVision,
  validateModelId,
} from "../utils/models";
import { ClipboardSelector } from "./clipboard-selector";

type Props = {
  conversation: ConversationType;
  model?: string;
};

export function Conversation({ conversation, model: propModel }: Props) {
  const [chats, setChats] = useState(conversation.chats);
  const [isLoading, setIsLoading] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [imagePaths, setImagePaths] = useState<string[]>([]);
  const { clipboardItems } = useClipboardHistory();

  const preferences = getPreferenceValues<Preferences>();
  const defaultModel = preferences.defaultModel || DEFAULT_MODEL_ID;
  const { value: storedModel, setValue: setCurrentModel } = useLocalStorage<string>("mistral-model", defaultModel);
  const currentModel = validateModelId(storedModel, defaultModel);
  const effectiveModel = propModel || currentModel;

  useEffect(() => {
    if (conversation.chats.length > 0 && conversation.chats[0].answer === "") {
      queueMicrotask(() => {
        streamAnswer(conversation.chats[0].question, effectiveModel, conversation.chats[0].images || []);
      });
    }
  }, [conversation.chats, effectiveModel]);

  function handleSubmit() {
    if (!searchText.trim().length) return;

    const newChat = { question: searchText, answer: "", images: imagePaths };
    setChats((prev) => [newChat, ...prev]);
    setSearchText("");
    setImagePaths([]);
    streamAnswer(searchText, currentModel, imagePaths);
  }

  function extractCodeBlocks(text: string): string[] {
    const codeBlockRegex = /```[\s\S]*?```/g;
    const matches = text.match(codeBlockRegex);
    if (!matches) return [];
    return matches.map((block) =>
      block
        .replace(/```[\w]*\n?/g, "")
        .replace(/```$/g, "")
        .trim(),
    );
  }

  async function copyCode(answer: string) {
    const codeBlocks = extractCodeBlocks(answer);
    if (codeBlocks.length === 0) {
      showToast({ title: "No code found", style: Toast.Style.Failure });
      return;
    }
    await Clipboard.copy(codeBlocks.join("\n\n"));
    showToast({ title: "Code copied", style: Toast.Style.Success });
  }

  async function copyAnswer(answer: string) {
    await Clipboard.copy(answer);
    showToast({ title: "Response copied", style: Toast.Style.Success });
  }

  async function imageToBase64(filePath: string): Promise<string> {
    const fs = await import("fs/promises");
    const path = await import("path");
    const { exec } = await import("child_process");
    const { promisify } = await import("util");
    const execAsync = promisify(exec);
    const os = await import("os");

    console.log("Reading image from:", filePath);

    let finalPath = filePath;
    const ext = path.extname(filePath).toLowerCase().slice(1);

    if (ext === "heic" || ext === "heif" || ext === "") {
      const tempJpgPath = path.join(os.tmpdir(), `mistral-converted-${Date.now()}.jpg`);
      console.log("Converting HEIC/HEIF to JPEG:", tempJpgPath);

      try {
        await execAsync(`sips -s format jpeg "${filePath}" --out "${tempJpgPath}"`);
        finalPath = tempJpgPath;
      } catch (error) {
        console.error("Failed to convert image:", error);
        throw new Error("Unsupported image format. Please use JPEG, PNG, or WebP.");
      }
    }

    const imageBuffer = await fs.readFile(finalPath);
    const base64 = imageBuffer.toString("base64");
    const mimeType = "jpeg";

    console.log("Image size:", imageBuffer.length, "bytes, MIME type:", mimeType);

    return `data:image/${mimeType};base64,${base64}`;
  }

  async function* parseSSEStream(reader: ReadableStreamDefaultReader<Uint8Array>) {
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const data = line.slice(6);
          if (data === "[DONE]") return;
          try {
            yield JSON.parse(data);
          } catch (error) {
            console.error("Failed to parse SSE data:", error);
          }
        }
      }
    }
  }

  async function streamAnswer(question: string, model: string, images: string[]) {
    setIsLoading(true);
    showToast({ title: "Thinking...", style: Toast.Style.Animated });

    const [conversationsPromise, systemPromptPromise] = [getConversations(), getSystemPrompt()];

    try {
      const previousMessages: {
        role: "user" | "assistant";
        content: string;
      }[] = [];

      for (const chat of chats.filter((chat) => chat.answer && chat.answer.trim().length > 0).reverse()) {
        previousMessages.push({ role: "user", content: chat.question });
        previousMessages.push({ role: "assistant", content: chat.answer });
      }

      const systemPrompt = await systemPromptPromise;

      const hasImages = images.length > 0;
      const needsVision = hasImages && !supportsVision(model);
      const effectiveModel = needsVision ? getDefaultVisionModel() : model;

      console.log("Sending to Mistral with model:", effectiveModel);
      console.log("Has images:", hasImages, "Needs vision switch:", needsVision);

      let currentAnswer = "";
      let chunkBuffer = "";
      const CHUNK_SIZE = 100;

      if (hasImages) {
        console.log("Processing", images.length, "images:", images);
        const imageUrls = await Promise.all(images.map((img) => imageToBase64(img)));
        console.log("Converted to", imageUrls.length, "base64 data URLs");

        const visionMessages = [
          ...(systemPrompt ? [{ role: "system" as const, content: systemPrompt }] : []),
          ...previousMessages,
          {
            role: "user" as const,
            content: [
              { type: "text", text: question },
              ...imageUrls.map((url) => ({ type: "image_url", image_url: url })),
            ],
          },
        ];

        console.log(
          "User message with images:",
          JSON.stringify(visionMessages[visionMessages.length - 1], null, 2).substring(0, 500),
        );

        const apiKey = preferences.apiKey;
        const response = await fetch("https://api.mistral.ai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: effectiveModel,
            messages: visionMessages,
            stream: true,
          }),
        });

        if (!response.ok) {
          throw new Error(`API error: ${response.status} ${response.statusText}`);
        }

        const reader = response.body?.getReader();
        if (!reader) throw new Error("No response body");

        for await (const chunk of parseSSEStream(reader)) {
          const streamText = chunk.choices?.[0]?.delta?.content || "";
          if (streamText) {
            currentAnswer += streamText;
            chunkBuffer += streamText;

            if (chunkBuffer.length >= CHUNK_SIZE) {
              chunkBuffer = "";
              const answer = currentAnswer;

              setChats((prev) => {
                const [first, ...rest] = prev;
                return [{ ...first, answer }, ...rest];
              });
            }
          }
        }
      } else {
        const messages = [
          ...(systemPrompt ? [{ role: "system" as const, content: systemPrompt }] : []),
          ...previousMessages,
          { role: "user" as const, content: question },
        ];

        const result = await client.chat.stream({ messages, model: effectiveModel });

        for await (const chunk of result) {
          const streamText = chunk.data.choices[0].delta?.content || "";
          if (streamText) {
            currentAnswer += streamText;
            chunkBuffer += streamText;

            if (chunkBuffer.length >= CHUNK_SIZE) {
              chunkBuffer = "";
              const answer = currentAnswer;

              setChats((prev) => {
                const [first, ...rest] = prev;
                return [{ ...first, answer }, ...rest];
              });
            }
          }
        }
      }

      setChats((prev) => {
        const [first, ...rest] = prev;
        return [{ ...first, answer: currentAnswer }, ...rest];
      });

      const conversations = await conversationsPromise;
      const currentConvIndex = conversations.findIndex((conv) => conv.id === conversation.id);
      const newChat = { question, answer: currentAnswer };

      if (currentAnswer.trim().length > 0) {
        if (currentConvIndex === -1) {
          conversations.unshift({ ...conversation, chats: [newChat] });
        } else {
          conversations[currentConvIndex].chats = [newChat, ...conversations[currentConvIndex].chats];
        }

        queueMicrotask(() => setConversations(conversations));
      }

      showToast({ title: "Response complete", style: Toast.Style.Success });
    } catch (error: unknown) {
      console.error("Stream error:", error);
      console.error("Error type:", typeof error);
      if (error && typeof error === "object") {
        console.error("Error keys:", Object.keys(error));
        console.error("Error JSON:", JSON.stringify(error, null, 2).substring(0, 1000));
      }

      const errorMessage = error instanceof Error ? error.message : String(error);
      const is429 = errorMessage.includes("429") || errorMessage.includes("capacity exceeded");
      const isVisionError =
        errorMessage.includes("image_url") ||
        (errorMessage.includes("invalid_enum_value") && errorMessage.includes('"text"'));
      const modelName = FALLBACK_MODELS.find((m) => m.id === model)?.name || model;

      if (isVisionError && images.length > 0) {
        showFailureToast(error, {
          title: "Model doesn't support images",
          message: `${modelName} doesn't support vision. Try using Pixtral Large or a vision-capable model for image analysis.`,
        });
      } else if (is429) {
        showFailureToast(error, {
          title: `${modelName} capacity exceeded`,
          message:
            "This model is currently overloaded. Try selecting a different model using the 🤖 dropdown or wait a moment.",
        });
      } else {
        showFailureToast(error, {
          title: "Could not stream answer",
          message: errorMessage.substring(0, 200),
        });
      }

      setChats((prev) => prev.slice(1));
    }

    setIsLoading(false);
  }

  return (
    <List
      isLoading={isLoading}
      isShowingDetail
      navigationTitle={conversation.title}
      searchBarPlaceholder={
        imagePaths.length > 0
          ? `📎 Image attached - Type your message...`
          : "Type your message here..."
      }
      searchText={searchText}
      onSearchTextChange={setSearchText}
      selectedItemId="chat-0"
      searchBarAccessory={
        <List.Dropdown tooltip="Select Model" value={currentModel} onChange={(newValue) => setCurrentModel(newValue)}>
          <List.Dropdown.Item title="🤖 Mistral Small" value="mistral-small-latest" />
          <List.Dropdown.Item title="🤖 Mistral Medium" value="mistral-medium-latest" />
          <List.Dropdown.Item title="🤖 Mistral Large" value="mistral-large-latest" />
          <List.Dropdown.Item title="🤖 Codestral" value="codestral-latest" />
          <List.Dropdown.Item title="🖼️ Pixtral 12B" value="pixtral-12b-latest" />
          <List.Dropdown.Item title="🖼️ Pixtral Large" value="pixtral-large-latest" />
        </List.Dropdown>
      }
    >
      {chats.map((chat, index) => (
        <List.Item
          key={`${chat.question}-${index}`}
          id={`chat-${index}`}
          title={chat.question}
          subtitle={`Message ${chats.length - index}`}
          icon={Icon.Person}
          detail={
            <List.Item.Detail
              markdown={`**You:** ${chat.question}\n\n---\n\n**Mistral:**\n\n${chat.answer || "_Thinking..._"}`}
            />
          }
          actions={
            <ActionPanel>
              <Action title="Send Message" icon={Icon.ArrowRight} onAction={handleSubmit} />
              <ClipboardSelector
                clipboardItems={clipboardItems}
                onSelectImage={(filePath) => setImagePaths([filePath])}
                onSelectText={(text) => setSearchText(text)}
              />
              {imagePaths.length > 0 && (
                <Action
                  title="Clear Image"
                  icon={Icon.XMarkCircle}
                  shortcut={{ modifiers: ["cmd"], key: "delete" }}
                  onAction={() => {
                    setImagePaths([]);
                    showToast({ title: "Image cleared", style: Toast.Style.Success });
                  }}
                />
              )}
              {chat.answer && (
                <ActionPanel.Section>
                  <Action
                    title="Copy Code"
                    icon={Icon.Clipboard}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "k" }}
                    onAction={() => copyCode(chat.answer)}
                  />
                  <Action
                    title="Copy Response"
                    icon={Icon.CopyClipboard}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                    onAction={() => copyAnswer(chat.answer)}
                  />
                </ActionPanel.Section>
              )}
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
