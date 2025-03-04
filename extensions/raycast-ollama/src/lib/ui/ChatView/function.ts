import { getPreferenceValues, showToast, Toast } from "@raycast/api";
import { Document } from "langchain/document";
import { MemoryVectorStore } from "langchain/vectorstores/memory";
import { OllamaEmbeddings } from "@langchain/community/embeddings/ollama";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import * as React from "react";
import { OllamaApiChatMessageRole, OllamaServerAuthorizationMethod } from "../../ollama/enum";
import { Ollama } from "../../ollama/ollama";
import {
  OllamaApiChatMessage,
  OllamaApiChatRequestBody,
  OllamaApiChatResponse,
  OllamaApiTagsResponseModel,
  OllamaServerAuth,
} from "../../ollama/types";
import { AddSettingsCommandChat, GetSettingsCommandChatByIndex } from "../../settings/settings";
import { RaycastChat, RaycastChatMessage, SettingsChatModel } from "../../settings/types";
import { Preferences, RaycastImage } from "../../types";
import { GetAvailableModel, PromptTokenParser } from "../function";
import "../../polyfill/node-fetch";

const preferences = getPreferenceValues<Preferences>();

/**
 * Set Chat by given index.
 * @param i - index.
 * @param setChat - React SetChat Function.
 * @param setChatModelsAvailable - React SetChatModelsAvailabel Function.
 * @param setShowFormModel = React SetShowFormModel Function.
 */
export async function ChangeChat(
  i: number,
  setChat: React.Dispatch<React.SetStateAction<RaycastChat | undefined>>,
  setChatModelsAvailable: React.Dispatch<React.SetStateAction<boolean>>,
  setShowFormModel: React.Dispatch<React.SetStateAction<boolean>>
): Promise<void> {
  const c = await GetSettingsCommandChatByIndex(i).catch(async (e) => {
    await showToast({ style: Toast.Style.Failure, title: "Error", message: e });
    setShowFormModel(true);
    return;
  });
  if (!c) return;
  const vi = await VerifyChatModelInstalled(
    c.models.main.server_name,
    c.models.main.tag,
    c.models.embedding?.server_name,
    c.models.embedding?.tag,
    c.models.vision?.server_name,
    c.models.vision?.tag
  ).catch(async (e) => {
    await showToast({ style: Toast.Style.Failure, title: "Error", message: e });
    setChatModelsAvailable(false);
  });
  setChat(c);
  if (vi) setChatModelsAvailable(true);
}

/**
 * Verify if configured model are stiil installed on eatch server.
 * @param ms - Main Model Server Name
 * @param mt - Main Model Tag
 * @param es - Embedding Model Server Name
 * @param et - Embedding Model Tag
 * @param vs - Vision Model Server Name
 * @param vt - Vision Model Tag
 * @returns Return `true` if all configured model are installed.
 */
async function VerifyChatModelInstalled(
  ms: string,
  mt: string,
  es?: string,
  et?: string,
  vs?: string,
  vt?: string
): Promise<boolean> {
  const am: Map<string, OllamaApiTagsResponseModel[]> = new Map();
  am.set(ms, await GetAvailableModel(ms));
  if ((am.get(ms) as OllamaApiTagsResponseModel[]).filter((v) => v.name === mt).length === 0) return false;
  if (es && et && !am.has(es)) am.set(es, await GetAvailableModel(es));
  if (es && et && (am.get(es) as OllamaApiTagsResponseModel[]).filter((v) => v.name === et).length === 0) return false;
  if (vs && vt && !am.has(vs)) am.set(vs, await GetAvailableModel(vs));
  if (vs && vt && (am.get(vs) as OllamaApiTagsResponseModel[]).filter((v) => v.name === vt).length === 0) return false;
  return true;
}

/**
 * Create New Empty Conversation.
 * @param chat - Selected Chat, used for copy models settings.
 * @param setChatNameIndex - React SetChatNameIndex Function.
 * @param revalidate - React RevalidateChatNames Function.
 */
export async function NewChat(
  chat: RaycastChat,
  setChatNameIndex: React.Dispatch<React.SetStateAction<number>>,
  revalidate: () => Promise<string[]>
): Promise<void> {
  const cn: RaycastChat = {
    name: "New Chat",
    models: chat.models,
    messages: [],
  };
  await AddSettingsCommandChat(cn);
  await revalidate().then(() => setChatNameIndex(0));
}

/**
 * Set Clipboard
 * @return
 */
export function ClipboardConversation(chat?: RaycastChat): string {
  let clipboard = "";
  if (chat) {
    chat.messages.map(
      (value) => (clipboard += `Question:\n${value.messages[0].content}\n\nAnswer:${value.messages[1].content}\n\n`)
    );
  }
  return clipboard;
}

/**
 * Get Headers for Ollama Langchain.
 * @param settings - Ollama Server Auth
 */
function LangChainGetOllamaHeaders(settings?: OllamaServerAuth): Record<string, string> | undefined {
  if (!settings) return undefined;
  if (settings && settings.mode === OllamaServerAuthorizationMethod.BASIC)
    return {
      Authorization: `${settings.mode} ${btoa(`${settings.username}:${settings.password}`)}`,
    };
  if (settings && settings.mode === OllamaServerAuthorizationMethod.BEARER)
    return { Authorization: `${settings.mode} ${settings.token}` };
}

/**
 * Get Configured LangChain OllamaEmbedding
 * @param settings
 */
function LangChainGetOllamaEmbeddings(settings: SettingsChatModel): OllamaEmbeddings {
  const headers = LangChainGetOllamaHeaders(settings.server.auth);
  return new OllamaEmbeddings({ baseUrl: settings.server.url, model: settings.tag, headers: headers });
}

/**
 * Get how many tokens are required for given string.
 * @param text
 * @returns tokens
 */
function StringToTokens(text: string): number {
  return Number(Number(text.length / 3).toFixed(0));
}

/**
 * Get how many tokens are required for given document.
 * @param document
 * @returns tokens
 */
function DocumentToTokens(document: Document<Record<string, any>>): number {
  return StringToTokens(document.pageContent);
}

/**
 * Get how many tokens are required for given documents.
 * @param documents
 * @returns tokens
 */
function DocumentsToTokens(documents: Document<Record<string, any>>[]): number {
  let o = 0;
  for (const d of documents) o += DocumentToTokens(d);
  return o;
}

/**
 * Get how many tokens are required by chat history.
 * @param chat
 * @returns tokens
 */
function ChatToTokens(chat: RaycastChat): number {
  if (chat.messages.length === 0) return 0;
  const lastMessage = chat.messages[chat.messages.length - 1];
  let o = 0;
  if (lastMessage.prompt_eval_count) o += lastMessage.prompt_eval_count;
  if (lastMessage.eval_count) o += lastMessage.eval_count;
  if (chat.messages.length > Number(preferences.ollamaChatHistoryMessagesNumber)) {
    const removedMessage =
      chat.messages[chat.messages.length - Number(preferences.ollamaChatHistoryMessagesNumber) - 1];
    if (removedMessage.prompt_eval_count) o -= removedMessage.prompt_eval_count;
    if (removedMessage.eval_count) o -= removedMessage.eval_count;
  }
  return o;
}

/**
 * Retrieval of relevant information by affinity that fits all available contextual windows.
 * @param query
 * @param token - available tokens.
 * @param documents
 * @param ollamaModelEmbedding - ollama model settings.
 */
async function GetDocumentByAffinity(
  query: string,
  token: number,
  documents: Document<Record<string, any>>[],
  ollamaModelEmbedding: SettingsChatModel
): Promise<Document<Record<string, any>>[]> {
  await showToast({ style: Toast.Style.Animated, title: "📥 Embeddings..." });
  const textsplitter = new RecursiveCharacterTextSplitter({
    chunkOverlap: 200,
    chunkSize: 1000,
  });
  const vectorstore = await MemoryVectorStore.fromDocuments(
    await textsplitter.splitDocuments(documents),
    LangChainGetOllamaEmbeddings(ollamaModelEmbedding)
  );
  const retriever = vectorstore.asRetriever(((token * 3) / 1000) * 0.8);
  return await retriever.invoke(query);
}

/**
 * Convert documents into text that can be added to the user's prompt.
 * @param documents
 */
function DocumentsToText(documents: Document<Record<string, any>>[]): string {
  let o = `\n\n`;
  for (const document of documents) {
    o += `<document>
<source>${document.metadata.source}</source>
<content>${document.pageContent}</content>
</document>\n\n`;
  }
  return o;
}

/**
 * Add document knowledge into user prompt.
 * @param query
 * @param chat
 * @param documents
 * @param image
 */
async function PromptAddDocuments(
  query: string,
  chat: RaycastChat,
  documents: Document<Record<string, any>>[],
  image: RaycastImage[] | undefined
): Promise<string> {
  let model = chat.models.main;
  if (chat.models.vision && image) model = chat.models.vision;
  const ollama = new Ollama(model.server);
  const availableToken = ollama.OllamaApiShowParseModelfile(await ollama.OllamaApiShow(model.tag)).parameter.num_ctx;
  const requiredToken = StringToTokens(query) + ChatToTokens(chat) + DocumentsToTokens(documents);
  if (requiredToken > availableToken) {
    let model = chat.models.main;
    if (chat.models.embedding) model = chat.models.embedding;
    documents = await GetDocumentByAffinity(query, availableToken - StringToTokens(query), documents, model);
  }
  return `${query}\n${DocumentsToText(documents)}`;
}

/**
 * Inference Task.
 */
async function Inference(
  query: string,
  image: RaycastImage[] | undefined,
  documents: Document<Record<string, any>>[] | undefined,
  chat: RaycastChat,
  setChat: React.Dispatch<React.SetStateAction<RaycastChat | undefined>>,
  setLoading: React.Dispatch<React.SetStateAction<boolean>>
): Promise<void> {
  await showToast({ style: Toast.Style.Animated, title: "🧠 Inference..." });

  let model = chat.models.main;
  if (image && chat.models.vision) model = chat.models.vision;

  const messages: OllamaApiChatMessage[] = [];
  chat.messages
    .slice(chat.messages.length - Number(preferences.ollamaChatHistoryMessagesNumber))
    .forEach((v) => messages.push(...v.messages));
  messages.push({
    role: OllamaApiChatMessageRole.USER,
    content: query,
    images: image && image.map((i) => i.base64),
  });

  const body: OllamaApiChatRequestBody = {
    model: model.tag,
    messages: messages,
    keep_alive: model.keep_alive,
  };

  const ml = chat.messages.length;
  const o = new Ollama(model.server);
  o.OllamaApiChat(body)
    .then(async (emiter) => {
      emiter.on("data", (data: string) => {
        setChat((prevState) => {
          if (prevState) {
            if (prevState.messages.length === ml) {
              return {
                ...prevState,
                messages: prevState.messages.concat({
                  model: chat.models.main.tag,
                  created_at: "",
                  images: image,
                  files:
                    documents && documents.map((d) => d.metadata.source).filter((v, i) => i === documents.indexOf(v)),
                  messages: [
                    { role: OllamaApiChatMessageRole.USER, content: query },
                    { role: OllamaApiChatMessageRole.ASSISTANT, content: data },
                  ],
                  done: false,
                }),
              };
            } else {
              const m: RaycastChat = JSON.parse(JSON.stringify(prevState));
              m.messages[m.messages.length - 1].messages[1].content += data;
              return {
                ...prevState,
                messages: m.messages,
              };
            }
          }
        });
      });
      emiter.on("done", async (data: OllamaApiChatResponse) => {
        await showToast({ style: Toast.Style.Success, title: "🧠 Inference Done." });
        setChat((prevState) => {
          if (prevState) {
            const m: RaycastChat = JSON.parse(JSON.stringify(prevState));
            m.messages[m.messages.length - 1] = {
              ...data,
              images: image,
              files: documents && documents.map((d) => d.metadata.source).filter((v, i) => i === documents.indexOf(v)),
              messages: m.messages[m.messages.length - 1].messages,
            };
            setLoading(false);
            return { ...m };
          }
        });
      });
    })
    .catch(async (e: Error) => {
      await showToast({ style: Toast.Style.Failure, title: "Error:", message: e.message });
      setLoading(false);
    });
}

export async function Run(
  query: string,
  image: RaycastImage[] | undefined,
  documents: Document<Record<string, any>>[] | undefined,
  chat: RaycastChat,
  setChat: React.Dispatch<React.SetStateAction<RaycastChat | undefined>>,
  setLoading: React.Dispatch<React.SetStateAction<boolean>>
): Promise<void> {
  setLoading(true);
  query = await PromptTokenParser(query);
  if (documents) query = await PromptAddDocuments(query, chat, documents, image);
  await Inference(query, image, documents, chat, setChat, setLoading);
}
