import type { Content, GroundingChunk, GroundingMetadata } from "@google/genai";
import { randomUUID } from "node:crypto";
import { ensureFileSearchStore } from "./file-search";
import { getGoogleClient } from "./google-client";
import { DEFAULT_MODEL } from "./constants";
import type { StoredDocument } from "./types";
import { getDocuments as getCachedDocuments } from "./cache";

export type CitationEntry = {
  id: string;
  documentId?: string;
  documentName: string;
  snippet?: string;
  uri?: string;
};

export interface AskOptions {
  question: string;
  conversation?: Content[];
  history?: Content[];
  documents?: StoredDocument[];
  model?: string;
  storeName?: string;
  storeDisplayName?: string;
}

export interface AskResult {
  answer?: string;
  citations: CitationEntry[];
  modelContent?: Content;
  metadata?: GroundingMetadata;
  store: {
    name: string;
    displayName?: string;
  };
  history: Content[];
}

export interface AskFlowOptions extends AskOptions {
  maxContextMessages?: number;
}

export interface AskFlowResult extends AskResult {
  conversation: Content[];
}

export const DEFAULT_MAX_CONTEXT_MESSAGES = 10;

export async function askLibrary(options: AskOptions): Promise<AskResult> {
  const trimmedQuestion = options.question?.trim();
  if (!trimmedQuestion) {
    throw new Error("A question is required to query the Great Library.");
  }

  const store =
    options.storeName && options.storeName.length > 0
      ? { name: options.storeName, displayName: options.storeDisplayName }
      : await ensureFileSearchStore();

  const client = getGoogleClient();
  const history = options.history ?? [
    ...(options.conversation ?? []),
    {
      role: "user",
      parts: [{ text: trimmedQuestion }],
    },
  ];

  const response = await client.models.generateContent({
    model: options.model ?? DEFAULT_MODEL,
    contents: history,
    config: {
      tools: [
        {
          fileSearch: {
            fileSearchStoreNames: [store.name],
          },
        },
      ],
    },
  });

  const candidate = response.candidates?.[0];
  const answer = (response.text ?? extractText(candidate?.content))?.trim();
  const documents = options.documents ?? (await getCachedDocuments());
  const citations = extractCitations(candidate?.groundingMetadata, documents);

  return {
    answer,
    citations,
    modelContent: candidate?.content,
    metadata: candidate?.groundingMetadata,
    store,
    history,
  };
}

export function buildAskHistory(question: string, conversation: Content[] = []): Content[] {
  const trimmed = question.trim();
  if (!trimmed) {
    throw new Error("A question is required to build the ask history.");
  }

  return [
    ...conversation,
    {
      role: "user",
      parts: [{ text: trimmed }],
    },
  ];
}

export function appendModelResponse(
  history: Content[],
  result: { modelContent?: Content; answer?: string },
): Content[] {
  if (!history.length) {
    return history;
  }

  const next = [...history];
  if (result.modelContent) {
    next.push({ role: result.modelContent.role ?? "model", parts: result.modelContent.parts });
  } else if (result.answer) {
    next.push({ role: "model", parts: [{ text: result.answer }] });
  }
  return next;
}

export function trimConversation(history: Content[], maxContextMessages = DEFAULT_MAX_CONTEXT_MESSAGES): Content[] {
  if (history.length <= maxContextMessages) {
    return history;
  }
  return history.slice(history.length - maxContextMessages);
}

export async function runAskFlow(options: AskFlowOptions): Promise<AskFlowResult> {
  const question = options.question?.trim();
  if (!question) {
    throw new Error("A question is required to query the Great Library.");
  }

  const baseConversation = options.conversation ?? [];
  const history = options.history ?? buildAskHistory(question, baseConversation);
  const { maxContextMessages, ...askOptions } = options;
  const askResult = await askLibrary({
    ...askOptions,
    question,
    conversation: baseConversation,
    history,
  });

  const conversationWithResponse = appendModelResponse(history, askResult);
  const conversation = trimConversation(conversationWithResponse, maxContextMessages ?? DEFAULT_MAX_CONTEXT_MESSAGES);

  return {
    ...askResult,
    conversation,
  };
}

export function extractText(content?: Content): string | undefined {
  if (!content?.parts?.length) {
    return undefined;
  }
  return content.parts
    .map((part) => part.text)
    .filter(Boolean)
    .join("\n\n")
    .trim();
}

export function extractCitations(
  metadata: GroundingMetadata | undefined,
  documents: StoredDocument[],
): CitationEntry[] {
  if (!metadata?.groundingChunks?.length) {
    return [];
  }

  const byDocument = new Map<string, CitationEntry>();
  const docMap = new Map(documents.map((doc) => [doc.id, doc]));

  for (const chunk of metadata.groundingChunks) {
    const context = chunk.retrievedContext;
    if (!context) {
      continue;
    }

    const documentId = context.documentName ? context.documentName.split("/").pop() : undefined;
    const baseId = documentId ?? context.uri ?? randomUUID();
    const existing = byDocument.get(baseId);
    const storedDoc = documentId ? docMap.get(documentId) : undefined;
    const snippet = context.ragChunk?.text ?? context.text;

    if (!existing) {
      byDocument.set(baseId, {
        id: baseId,
        documentId,
        documentName: storedDoc?.name ?? context.title ?? documentId ?? "Document",
        snippet,
        uri: context.uri,
      });
    } else if (!existing.snippet && snippet) {
      existing.snippet = snippet;
    }
  }

  return Array.from(byDocument.values());
}

export function describeGroundingChunk(chunk: GroundingChunk) {
  const context = chunk.retrievedContext;
  const web = chunk.web;
  const maps = chunk.maps;
  const snippetSource = context?.ragChunk?.text ?? context?.text ?? maps?.text ?? web?.title;

  return {
    sourceType: context ? "file-search" : maps ? "maps" : web ? "web" : "unknown",
    documentName: context?.documentName,
    title: context?.title ?? maps?.title ?? web?.title,
    uri: context?.uri ?? maps?.uri ?? web?.uri,
    snippetPreview: truncate(snippetSource),
    hasRagChunk: Boolean(context?.ragChunk),
    hasText: Boolean(context?.text ?? maps?.text ?? web?.title),
    rawContextKeys: context ? Object.keys(context) : undefined,
    rawWebKeys: web ? Object.keys(web) : undefined,
    rawMapsKeys: maps ? Object.keys(maps) : undefined,
  };
}

export function truncate(text?: string, length = 80) {
  if (!text) {
    return "";
  }
  if (text.length <= length) {
    return text;
  }
  return `${text.slice(0, length - 1)}…`;
}
