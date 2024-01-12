import { LocalStorage } from "@raycast/api";
import { MemoryVectorStore } from "langchain/vectorstores/memory";
import { VectorStore } from "langchain/vectorstores/base";
import { OllamaEmbeddings } from "langchain/embeddings/ollama";
import { TextLoader } from "langchain/document_loaders/fs/text";
import { PDFLoader } from "langchain/document_loaders/fs/pdf";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { Document } from "langchain/document";
import { OllamaApiChat, OllamaApiGenerateNoStream, parseOllamaUrlForLangchain } from "./ollama";
import {
  DocumentLoaderFiles,
  OllamaApiChatMessage,
  OllamaApiChatRequestBody,
  OllamaApiGenerateRequestBody,
  PromptTags,
} from "./types";
import fs from "fs";
import mime from "mime-types";
import "./polyfill/node-fetch";
import { EventEmitter } from "stream";

const ErrorDocumentLoaderFilesEmpty = new Error("Before Using /edit Tag Select File to Load.");

const OllamaApiUrl = parseOllamaUrlForLangchain();

/**
 * Get files path from LocalStorage.
 * @returns {Promise<string[]>} Array of file path.
 */
async function GetFilesPathFromLocalStorage(): Promise<string[]> {
  const FilesJSON = await LocalStorage.getItem("embedding_files");
  if (FilesJSON) {
    const Files: DocumentLoaderFiles[] = JSON.parse(FilesJSON as string);
    return Files.map((f) => {
      return f.path;
    });
  } else {
    throw ErrorDocumentLoaderFilesEmpty;
  }
}

/**
 * Get files from LocalStorage.
 * @returns {Promise<DocumentLoaderFiles[]>} Array of files.
 */
async function GetFilesFromLocalStorage(): Promise<DocumentLoaderFiles[]> {
  const FilesJSON = await LocalStorage.getItem("embedding_files");
  if (FilesJSON) {
    const Files: DocumentLoaderFiles[] = JSON.parse(FilesJSON as string);
    return Files;
  } else {
    throw ErrorDocumentLoaderFilesEmpty;
  }
}

/**
 * Verify if cache can be used for DocumentLoader().
 * @returns {Promise<Boolean>} Return 'true' value if cache can be used otherwise return 'false' value.
 */
async function UseCacheDocumentLoader(): Promise<boolean> {
  let files = await GetFilesFromLocalStorage();

  let UseCache = true;

  files = files.map((f) => {
    const mtime = fs.statSync(f.path).mtime;
    if (!f.mtime || (f.mtime && mtime > f.mtime)) {
      UseCache = false;
    }
    return {
      path: f.path,
      mtime: mtime,
    } as DocumentLoaderFiles;
  });

  LocalStorage.setItem("embedding_files", JSON.stringify(files));

  return UseCache;
}

/**
 * Function for verify is cache can be used.
 * @param {PromptTags[]} tags - list of used tags
 * @returns {boolean} If Cache can be used it return true otherwise false.
 */
export async function UseCache(tags: PromptTags[]): Promise<boolean> {
  const UseCacheMap = new Map([[PromptTags.FILE, UseCacheDocumentLoader]]);

  let UseCache = true;

  const cachep: Promise<boolean>[] = [];

  tags.forEach((tag) => {
    if (UseCacheMap.has(tag)) {
      const UseCacheFunc = UseCacheMap.get(tag);
      if (UseCacheFunc) cachep.push(UseCacheFunc());
    }
  });

  await Promise.all(cachep).then((c) => {
    c.forEach((data) => {
      if (!data) UseCache = false;
    });
  });

  return UseCache;
}

/**
 * Load documents contents from file.
 * @param {number} chunckSize - Number of character for each chunk.
 * @param {number} chunckOverlap - Number of character overlapping between nearby chunk.
 * @returns {Promise<Document<Record<string, any>>[]>} Array of documents.
 */
async function DocumentLoader(chunckSize = 1000, chunckOverlap = 200): Promise<Document<Record<string, any>>[]> {
  const path = await GetFilesPathFromLocalStorage();

  const docsp: Promise<Document<Record<string, any>>[]>[] = [];
  let docs: Document<Record<string, any>>[] = [];

  path.forEach((p) => {
    const fmime = mime.lookup(p) as string;

    if (fmime === "application/pdf") {
      const l = new PDFLoader(p);
      docsp.push(l.load());
    }

    if (fmime.match("text/")) {
      const l = new TextLoader(p);
      docsp.push(l.load());
    }
  });

  await Promise.all(docsp).then((d) => {
    d.forEach((data) => {
      docs.push(...data);
    });
  });

  docs = await DocumentSplitter(docs, chunckSize, chunckOverlap);

  return docs;
}

/**
 * Split documents.
 * @param {Document<Record<string,any>>[]} docs.
 * @param {number} chunckSize - Number of character for each chunk.
 * @param {number} chunckOverlap - Number of character overlapping between nearby chunk.
 * @returns {Promise<Document<Record<string,any>>[]>} splitted documents.
 */
async function DocumentSplitter(
  docs: Document<Record<string, any>>[],
  chunckSize = 1000,
  chunckOverlap = 200
): Promise<Document<Record<string, any>>[]> {
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: chunckSize,
    chunkOverlap: chunckOverlap,
  });
  return await splitter.splitDocuments(docs);
}

/**
 * Return Document based on chosed tags.
 * Memory Vector Store is used only for large amount of data.
 * @param {string} prompt.
 * @param {string} model - Model used for embedding.
 * @param {PromptTags[]} tags.
 * @param {number} DocsNumber - Number of documents to return.
 * @param {number} SplitterChunckSize - Number of character for each chunk.
 * @returns {Promise<Document<Record<string, any>>[] | undefined>} Return knowledge to inject on prompt.
 */
export async function GetDocument(
  prompt: string,
  model: string,
  tags: PromptTags[],
  DocsNumber = 2,
  SplitterChunckSize = 1000
): Promise<Document<Record<string, any>>[] | undefined> {
  const LoaderMap = new Map([[PromptTags.FILE, DocumentLoader]]);

  let store: VectorStore | undefined;
  let docs: Document<Record<string, any>>[];

  const docsp = tags.map((tag) => {
    const Loader = LoaderMap.get(tag);
    if (Loader) {
      return Loader(SplitterChunckSize);
    }
  });
  docs = await Promise.all(docsp).then((d) => {
    const output: Document<Record<string, any>>[] = [];
    d.forEach((data) => {
      if (data) output.push(...data);
    });
    return output;
  });

  if (docs.length > DocsNumber) {
    const OllamaEmbeddingSettings = {
      baseUrl: OllamaApiUrl,
      model: model,
    };
    store = await MemoryVectorStore.fromDocuments(docs, new OllamaEmbeddings(OllamaEmbeddingSettings));
    docs = await store.similaritySearch(prompt, DocsNumber);
  }

  return docs;
}

/**
 * Parse prompt for tags.
 * @param {string} prompt.
 * @returns {[string, PromptTags[]]} Return prompt without tags and tags list.
 */
export function GetTags(prompt: string): [string, PromptTags[]] {
  let oPrompt = prompt;
  const oTags: PromptTags[] = [];

  const tags: string[] = Object.values(PromptTags);
  tags.forEach((tag) => {
    if (prompt.toLocaleLowerCase().includes(tag)) {
      oPrompt = oPrompt.replace(tag, "");
      oTags.push(tag as PromptTags);
    }
  });

  return [oPrompt, oTags];
}

/**
 * LLM Chain.
 * @param {string} prompt.
 * @param {string} model.
 * @returns {Promise<EventEmitter>} Response from the Ollama API with an EventEmitter with two event: `data` where all generated text is passed on `string` format and `done` when inference is finished returning a `OllamaApiGenerateResponse` object contains all metadata of inference.
 */
export async function LLMChain(
  prompt: string,
  model: string,
  messages: OllamaApiChatMessage[] | undefined = undefined,
  images: string[] | undefined = undefined
): Promise<EventEmitter> {
  if (messages) messages.push({ role: "user", content: prompt, images: images } as OllamaApiChatMessage);
  else messages = [{ role: "user", content: prompt, images: images } as OllamaApiChatMessage];
  const body: OllamaApiChatRequestBody = {
    model: model,
    messages: messages,
  };
  return OllamaApiChat(body);
}

/**
 * loadQARefineChain.
 * @param {string} prompt.
 * @param {string} model.
 * @param {Document<Record<string, any>>[]} docs.
 * @param {number[] | undefined} context.
 * @returns {Promise<EventEmitter>} Response from the Ollama API with an EventEmitter with two event: `data` where all generated text is passed on `string` format and `done` when inference is finished returning a `OllamaApiGenerateResponse` object contains all metadata of inference.
 */
export async function loadQARefineChain(
  prompt: string,
  model: string,
  docs: Document<Record<string, any>>[],
  messages: OllamaApiChatMessage[] | undefined = undefined,
  images: string[] | undefined = undefined
): Promise<EventEmitter | undefined> {
  let LastResponse: string | undefined;

  let i = 0;
  for (const doc of docs) {
    if (LastResponse) {
      const SystemPrompt = `The original question is as follows: ${prompt}\nWe have provided an existing answer: ${LastResponse}\nWe have the opportunity to refine the existing answer (only if needed) with some more context below.`;
      const body: OllamaApiGenerateRequestBody = {
        model: model,
        system: SystemPrompt,
        prompt: `CONTEXT: ${doc.pageContent}`,
      };
      if (i < docs.length - 1) {
        const Response = await OllamaApiGenerateNoStream(body);
        LastResponse = Response.response;
      } else {
        if (messages) {
          messages.push({ role: "system", content: SystemPrompt } as OllamaApiChatMessage);
          messages.push({
            role: "user",
            content: `CONTEXT: ${doc.pageContent}`,
            images: images,
          } as OllamaApiChatMessage);
        } else {
          messages = [
            { role: "system", content: SystemPrompt } as OllamaApiChatMessage,
            { role: "user", content: `CONTEXT: ${doc.pageContent}`, images: images } as OllamaApiChatMessage,
          ];
        }
        const body: OllamaApiChatRequestBody = {
          model: model,
          messages: messages,
        };
        return OllamaApiChat(body);
      }
    } else {
      const SystemPrompt = `Given the context information and no prior knowledge, answer the question: ${prompt}`;
      const Response = await OllamaApiGenerateNoStream({
        model: model,
        system: SystemPrompt,
        prompt: `CONTEXT: ${doc.pageContent}`,
      });
      LastResponse = Response.response;
    }
    i += 1;
  }
}

/**
 * loadQAStuffChain Chain.
 * @param {string} prompt.
 * @param {string} model.
 * @param {Document<Record<string, any>>[]} docs.
 * @param {number[] | undefined} context.
 * @returns {Promise<EventEmitter>} Response from the Ollama API with an EventEmitter with two event: `data` where all generated text is passed on `string` format and `done` when inference is finished returning a `OllamaApiGenerateResponse` object contains all metadata of inference.
 */
export async function loadQAStuffChain(
  prompt: string,
  model: string,
  docs: Document<Record<string, any>>[],
  messages: OllamaApiChatMessage[] | undefined = undefined,
  images: string[] | undefined = undefined
): Promise<EventEmitter> {
  let docsContents = "";
  docs.forEach((doc) => {
    docsContents += doc.pageContent + "\n\n";
  });
  if (messages) {
    messages.push({
      role: "user",
      content: `${prompt}\nCONTEXT: ${docsContents}`,
      images: images,
    } as OllamaApiChatMessage);
  } else {
    messages = [
      { role: "user", content: `${prompt}\nCONTEXT: ${docsContents}`, images: images } as OllamaApiChatMessage,
    ];
  }
  const body: OllamaApiChatRequestBody = {
    model: model,
    messages: messages,
  };
  return OllamaApiChat(body);
}
