import { LMStudioClient } from "../src/lib/lmstudio";
import { readFile } from "node:fs/promises";

async function main() {
  const baseUrl = process.env.LM_STUDIO_BASE_URL ?? "http://localhost:1234";
  const apiToken = process.env.LM_STUDIO_API_TOKEN;
  const requestedChatModel = process.env.LM_STUDIO_CHAT_MODEL;
  const requestedEmbeddingModel = process.env.LM_STUDIO_EMBEDDING_MODEL;

  const client = new LMStudioClient({ baseUrl, apiToken });
  const models = await client.listModels();
  const chatModels = models.filter((model) => model.type === "llm");
  const embeddingModels = models.filter((model) => model.type === "embedding");
  const chatModel = requestedChatModel
    ? chatModels.find((model) => model.key === requestedChatModel)
    : (chatModels.find((model) => model.loadedInstances.length > 0) ?? chatModels[0]);
  const embeddingModel = requestedEmbeddingModel
    ? embeddingModels.find((model) => model.key === requestedEmbeddingModel)
    : (embeddingModels.find((model) => model.loadedInstances.length > 0) ?? embeddingModels[0]);

  if (!chatModel) {
    throw new Error(
      requestedChatModel ? `Chat model not found: ${requestedChatModel}` : "No LM Studio language model is available.",
    );
  }
  if (!embeddingModel) {
    throw new Error(
      requestedEmbeddingModel
        ? `Embedding model not found: ${requestedEmbeddingModel}`
        : "No LM Studio embedding model is available.",
    );
  }

  const reasoning = chatModel.capabilities?.reasoning?.allowedOptions.includes("off") ? "off" : undefined;

  const chat = await client.chat({
    model: chatModel.key,
    input: "Reply with exactly LIVE_CHAT_OK",
    systemPrompt: "Follow the requested output format exactly.",
    maxOutputTokens: 512,
    reasoning,
    store: false,
  });
  if (!chat.text.includes("LIVE_CHAT_OK")) {
    throw new Error(`Unexpected native chat response: ${chat.text}`);
  }

  const structured = await client.structuredOutput<{ status: string }>({
    model: chatModel.key,
    messages: [
      {
        role: "user",
        content: "Return the required success status.",
      },
    ],
    schemaName: "live_smoke",
    schema: {
      type: "object",
      properties: {
        status: { type: "string", enum: ["LIVE_STRUCTURED_OK"] },
      },
      required: ["status"],
      additionalProperties: false,
    },
    temperature: 0,
    maxTokens: 512,
  });
  if (structured.status !== "LIVE_STRUCTURED_OK") {
    throw new Error(`Unexpected structured response: ${JSON.stringify(structured)}`);
  }

  const embeddings = await client.embeddings({
    model: embeddingModel.key,
    input: ["LM Studio Raycast live smoke test"],
  });
  const vector = embeddings.data[0]?.embedding;
  if (!vector?.length || vector.some((value) => !Number.isFinite(value))) {
    throw new Error("LM Studio returned an invalid embedding vector.");
  }

  let vision: "passed" | "unsupported" = "unsupported";
  if (chatModel.capabilities?.vision) {
    const imageBytes = await readFile(new URL("../assets/icon.png", import.meta.url));
    const image = `data:image/png;base64,${imageBytes.toString("base64")}`;
    const result = await client.chat({
      model: chatModel.key,
      input: [
        { type: "message", content: "Reply with exactly LIVE_IMAGE_OK" },
        { type: "image", dataUrl: image },
      ],
      maxOutputTokens: 512,
      reasoning,
      store: false,
    });
    if (!result.text.includes("LIVE_IMAGE_OK")) {
      throw new Error(`Unexpected vision response: ${result.text}`);
    }
    vision = "passed";
  }

  process.stdout.write(
    `${JSON.stringify(
      {
        baseUrl: client.baseUrl,
        chatModel: chatModel.key,
        embeddingModel: embeddingModel.key,
        chat: "passed",
        structuredOutput: "passed",
        embeddingDimension: vector.length,
        vision,
      },
      null,
      2,
    )}\n`,
  );
}

void main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
  process.exitCode = 1;
});
