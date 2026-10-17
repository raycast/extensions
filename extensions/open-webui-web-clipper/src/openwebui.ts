import type {
  ChatData,
  ChatOperationResult,
  ChatFileRef,
  ChatMessage,
  ChatRecord,
  Clip,
  Folder,
  FolderAttachment,
  ModelInfo,
  UploadedFile,
} from "./types";
import { clipToMarkdown, safeFilename } from "./capture";

function normalizeBaseUrl(url: string): string {
  return url.trim().replace(/\/+$/, "");
}

function mergeUrl(baseUrl: string, path: string): string {
  return `${normalizeBaseUrl(baseUrl)}${path.startsWith("/") ? path : `/${path}`}`;
}

function errorDetail(body: unknown): string {
  if (typeof body === "string") return body;
  if (body && typeof body === "object" && "detail" in body) {
    const detail = (body as { detail?: unknown }).detail;
    return typeof detail === "string" ? detail : JSON.stringify(detail);
  }
  return JSON.stringify(body);
}

function dedupeFiles(files: ChatFileRef[]): ChatFileRef[] {
  const byId = new Map<string, ChatFileRef>();
  for (const file of files) byId.set(file.id, file);
  return [...byId.values()];
}

export class OpenWebUIClient {
  constructor(private readonly prefs: Preferences) {}

  get baseUrl(): string {
    return normalizeBaseUrl(this.prefs.baseUrl);
  }

  private headers(json = true): HeadersInit {
    return {
      Authorization: `Bearer ${this.prefs.apiKey}`,
      ...(json ? { "Content-Type": "application/json" } : {}),
    };
  }

  private async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const response = await fetch(mergeUrl(this.baseUrl, path), {
      ...init,
      headers: {
        ...this.headers(init.body instanceof FormData ? false : true),
        ...(init.headers ?? {}),
      },
    });

    const text = await response.text();
    let body: unknown = text;
    if (text) {
      try {
        body = JSON.parse(text);
      } catch {
        // keep text
      }
    }

    if (!response.ok) {
      throw new Error(`Open WebUI ${response.status}: ${errorDetail(body)}`);
    }
    return body as T;
  }

  async getFolders(): Promise<Folder[]> {
    return this.request<Folder[]>("/api/v1/folders/");
  }

  async getFolder(folderId: string): Promise<Folder> {
    return this.request<Folder>(
      `/api/v1/folders/${encodeURIComponent(folderId)}`,
    );
  }

  async getModels(): Promise<ModelInfo[]> {
    const response = await this.request<{ data?: ModelInfo[] }>("/api/models");
    return response.data ?? [];
  }

  async getChats(folderId: string): Promise<ChatRecord[]> {
    return this.request<ChatRecord[]>(
      `/api/v1/chats/folder/${encodeURIComponent(folderId)}`,
    );
  }

  async getChat(chatId: string): Promise<ChatRecord> {
    return this.request<ChatRecord>(
      `/api/v1/chats/${encodeURIComponent(chatId)}`,
    );
  }

  async uploadClipAsMarkdown(
    clip: Clip,
    processInBackground = true,
  ): Promise<UploadedFile> {
    const form = new FormData();
    form.append(
      "file",
      new Blob([clipToMarkdown(clip)], { type: "text/markdown;charset=utf-8" }),
      safeFilename(clip.title),
    );

    return this.request<UploadedFile>(
      `/api/v1/files/?process=true&process_in_background=${processInBackground ? "true" : "false"}`,
      {
        method: "POST",
        body: form,
      },
    );
  }

  private toChatFileRef(file: UploadedFile, clip: Clip): ChatFileRef {
    const name = file.filename || file.meta?.name || safeFilename(clip.title);
    return {
      type: "file",
      id: file.id,
      url: file.id,
      name,
      status: "uploaded",
      content_type: file.meta?.content_type || "text/markdown",
      ...(typeof file.meta?.size === "number" ? { size: file.meta.size } : {}),
      context: "full",
      file,
      ...(file.meta?.collection_name
        ? { collection_name: file.meta.collection_name }
        : {}),
    };
  }

  async waitForFile(fileId: string, maxAttempts = 20): Promise<void> {
    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      try {
        const state = await this.request<{ status?: string; error?: string }>(
          `/api/v1/files/${encodeURIComponent(fileId)}/process/status`,
        );
        if (state.status === "completed") return;
        if (state.status === "failed")
          throw new Error(state.error || "File processing failed.");
      } catch (error) {
        if (attempt === maxAttempts - 1) throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, 750));
    }
  }

  async attachFileToFolder(
    folderId: string,
    file: UploadedFile,
    clip: Clip,
  ): Promise<Folder> {
    const folder = await this.getFolder(folderId);
    const current = Array.isArray(folder.data?.files) ? folder.data.files : [];
    const exists = current.some(
      (item) => item.type === "file" && item.id === file.id,
    );
    if (exists) return folder;

    // Open WebUI folder knowledge is keyed by resource type + id. Keep the stored
    // entry intentionally small and compatible with the backend access-control filter.
    const attachment: FolderAttachment = {
      id: file.id,
      type: "file",
      name: file.filename || file.meta?.name || safeFilename(clip.title),
    };

    const updated = await this.request<Folder>(
      `/api/v1/folders/${encodeURIComponent(folderId)}/update`,
      {
        method: "POST",
        body: JSON.stringify({
          data: {
            ...(folder.data ?? {}),
            files: [...current, attachment],
          },
        }),
      },
    );

    const savedInResponse = updated.data?.files?.some(
      (item) => item.type === "file" && item.id === file.id,
    );
    if (!savedInResponse) {
      throw new Error(
        "Open WebUI accepted the folder update but did not return the saved file in folder.data.files.",
      );
    }

    // Re-read from the server. A silent/no-op folder update must be reported as an
    // error instead of looking like a successful Quick Save.
    const verified = await this.getFolder(folderId);
    const persisted = verified.data?.files?.some(
      (item) => item.type === "file" && item.id === file.id,
    );
    if (!persisted) {
      throw new Error(
        "The file was uploaded, but Open WebUI did not persist it as a source for the selected folder.",
      );
    }

    return verified;
  }

  async saveClipToFolder(
    folderId: string,
    clip: Clip,
  ): Promise<{
    fileId: string;
    filename: string;
    folderId: string;
    folderName: string;
  }> {
    // Quick Save must not report success before Open WebUI has processed the file.
    const file = await this.uploadClipAsMarkdown(clip, false);
    const state = await this.request<{ status?: string; error?: string }>(
      `/api/v1/files/${encodeURIComponent(file.id)}/process/status`,
    );
    if (state.status === "failed") {
      throw new Error(
        state.error || "Open WebUI could not process the saved Markdown file.",
      );
    }

    const folder = await this.attachFileToFolder(folderId, file, clip);
    return {
      fileId: file.id,
      filename: file.filename || file.meta?.name || safeFilename(clip.title),
      folderId,
      folderName: folder.name,
    };
  }

  private extractGeneratedTitle(body: unknown): string | null {
    if (!body || typeof body !== "object") return null;
    const choices = (
      body as { choices?: Array<{ message?: { content?: string } }> }
    ).choices;
    const content = choices?.[0]?.message?.content?.trim();
    if (!content) return null;

    const start = content.indexOf("{");
    const end = content.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        const parsed = JSON.parse(content.slice(start, end + 1)) as {
          title?: unknown;
        };
        if (typeof parsed.title === "string" && parsed.title.trim())
          return parsed.title.trim();
      } catch {
        // Fall through to plain-text handling.
      }
    }

    const plain = content
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/```$/i, "")
      .replace(/^['"]|['"]$/g, "")
      .trim();
    return plain && plain.length <= 160 ? plain : null;
  }

  private async generateAndSaveTitle(
    chatId: string,
    model: string,
    messages: Array<{ role: string; content: string }>,
    fallbackTitle: string,
  ): Promise<string> {
    let title = fallbackTitle;

    try {
      const titleMessages = messages.map((message) => ({
        ...message,
        content: message.content.slice(0, 8000),
      }));
      const result = await this.request<unknown>(
        "/api/v1/tasks/title/completions",
        {
          method: "POST",
          body: JSON.stringify({
            model,
            messages: titleMessages,
            chat_id: chatId,
          }),
        },
      );
      title = this.extractGeneratedTitle(result) || fallbackTitle;
    } catch {
      // Title generation may be disabled or the configured task model may be unavailable.
    }

    title = title.replace(/\s+/g, " ").trim().slice(0, 160) || fallbackTitle;

    try {
      const current = await this.getChat(chatId);
      await this.request(`/api/v1/chats/${encodeURIComponent(chatId)}`, {
        method: "POST",
        body: JSON.stringify({
          chat: {
            ...current.chat,
            title,
          },
          folder_id: current.folder_id ?? null,
        }),
      });
    } catch {
      // Renaming is non-critical.
    }

    return title;
  }

  async createChat(
    folderId: string,
    model: string,
    content: string,
    title: string,
    files: ChatFileRef[] = [],
    assistantState: "pending" | "completed" | "none" = "pending",
  ): Promise<ChatRecord> {
    const userId = crypto.randomUUID();
    // For a true generation we need an assistant placeholder. For a saved clip
    // without generation, keep the user message as the terminal leaf and mark it
    // done=true. Open WebUI's MessageInput treats any current message with
    // done != true as active, regardless of role, so this avoids both the stuck
    // Stop button and a fake/blank assistant response.
    const assistantId =
      assistantState === "pending" ? crypto.randomUUID() : null;
    const timestamp = Math.floor(Date.now() / 1000);

    const userMessage: ChatMessage = {
      id: userId,
      role: "user",
      content,
      timestamp,
      models: [model],
      childrenIds: assistantId ? [assistantId] : [],
      ...(assistantState === "completed" ? { done: true } : {}),
      ...(files.length ? { files } : {}),
    };

    const historyMessages: Record<string, ChatMessage> = {
      [userId]: userMessage,
    };
    const flatMessages: ChatMessage[] = [userMessage];
    let currentId = userId;

    if (assistantId) {
      const assistantMessage: ChatMessage = {
        id: assistantId,
        role: "assistant",
        content: "",
        parentId: userId,
        childrenIds: [],
        model,
        modelName: model,
        modelIdx: 0,
        done: false,
        timestamp: timestamp + 1,
      };
      historyMessages[assistantId] = assistantMessage;
      flatMessages.push(assistantMessage);
      currentId = assistantId;
    }

    const chat: ChatData = {
      title: title.slice(0, 160),
      models: [model],
      messages: flatMessages,
      history: { currentId, messages: historyMessages },
      currentId,
      files,
      tags: [],
    };

    return this.request<ChatRecord>("/api/v1/chats/new", {
      method: "POST",
      body: JSON.stringify({ chat, folder_id: folderId }),
    });
  }

  async runCompletion(
    chatId: string,
    assistantId: string,
    model: string,
    messages: Array<{ role: string; content: string }>,
    files: ChatFileRef[] = [],
    userMessage?: ChatMessage,
    folderId?: string | null,
  ): Promise<void> {
    const response = await fetch(
      mergeUrl(this.baseUrl, "/api/chat/completions"),
      {
        method: "POST",
        headers: this.headers(true),
        body: JSON.stringify({
          chat_id: chatId,
          id: assistantId,
          messages,
          model,
          ...(files.length ? { files } : {}),
          ...(folderId ? { folder_id: folderId } : {}),
          ...(userMessage
            ? {
                user_message: userMessage,
                parent_id: userMessage.parentId ?? null,
              }
            : {}),
          stream: true,
          background_tasks: {
            title_generation: true,
            tags_generation: false,
            follow_up_generation: false,
          },
          features: {
            code_interpreter: false,
            web_search: false,
            image_generation: false,
            memory: false,
          },
          variables: {
            "{{CURRENT_DATETIME}}": new Date().toISOString(),
            "{{CURRENT_TIMEZONE}}":
              Intl.DateTimeFormat().resolvedOptions().timeZone,
          },
          session_id: crypto.randomUUID(),
        }),
      },
    );

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Open WebUI completion ${response.status}: ${text}`);
    }

    // In the native asynchronous Open WebUI path (chat_id + id + stream=true
    // + session_id) the server normally responds immediately with JSON like
    // { status: true, task_ids: [...], chat_id: ... }. Do not wait for model
    // tokens here: the server-side task owns the generation and updates the chat.
    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      const text = await response.text();
      if (!text.trim()) return;
      try {
        const body = JSON.parse(text) as { status?: boolean; detail?: unknown };
        if (body.status === false) {
          throw new Error(
            `Open WebUI rejected completion: ${errorDetail(body.detail ?? body)}`,
          );
        }
      } catch (error) {
        if (error instanceof SyntaxError) {
          // A successful non-standard JSON-ish response should not block opening
          // the already-created chat.
          return;
        }
        throw error;
      }
      return;
    }

    // Compatibility path for Open WebUI builds that return an actual SSE/body
    // stream to the API caller instead of accepting a background task.
    if (response.body) {
      const reader = response.body.getReader();
      while (true) {
        const { done } = await reader.read();
        if (done) break;
      }
    }
  }

  private async markAssistantDone(
    chatId: string,
    assistantId: string,
  ): Promise<void> {
    const current = await this.getChat(chatId);
    const map = current.chat?.history?.messages ?? {};
    const assistant = map[assistantId];
    if (!assistant || assistant.role !== "assistant" || assistant.done === true)
      return;

    const finished: ChatMessage = { ...assistant, done: true };
    const nextMap = { ...map, [assistantId]: finished };
    const nextFlat = (current.chat?.messages ?? []).map((message) =>
      message.id === assistantId ? finished : message,
    );

    await this.request(`/api/v1/chats/${encodeURIComponent(chatId)}`, {
      method: "POST",
      body: JSON.stringify({
        chat: {
          ...current.chat,
          history: { ...(current.chat?.history ?? {}), messages: nextMap },
          messages: nextFlat,
        },
        folder_id: current.folder_id ?? null,
      }),
    });
  }

  async saveClipAsVisibleChat(
    folderId: string,
    model: string,
    clip: Clip,
    title: string,
  ): Promise<ChatOperationResult> {
    // Quick Save should leave a visible artifact in the folder. Folder-level
    // knowledge is intentionally background context in Open WebUI and is not
    // rendered as a chat/list item, so create a chat without invoking the model.
    const uploaded = await this.uploadClipAsMarkdown(clip, false);
    const fileRef = this.toChatFileRef(uploaded, clip);
    const content = [
      "Saved web material for later discussion.",
      "",
      `Source: ${clip.url || "URL unavailable"}`,
      `Title: ${clip.title}`,
      "",
      `The full material is attached as ${fileRef.name}.`,
    ].join("\n");

    // Keep Quick Save as a completed user-only clip. The user message is marked
    // done=true by createChat(), so Open WebUI shows the normal idle input without
    // rendering a misleading empty assistant/model response.
    const chat = await this.createChat(
      folderId,
      model,
      content,
      title,
      [fileRef],
      "completed",
    );
    const warnings: string[] = [];

    // Also attach the same file as folder-level knowledge when possible. This is
    // useful for future chats in the folder but is secondary to the visible chat.
    try {
      await this.attachFileToFolder(folderId, uploaded, clip);
    } catch (error) {
      warnings.push(
        `The clip was saved in the chat, but the file could not be confirmed as a shared folder source: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }

    return { chat, warnings };
  }
  /**
   * Fast path for Raycast Quick Save commands.
   *
   * The chat and attachment are persisted first, then the Open WebUI native
   * async completion loop is started with session_id. That endpoint returns
   * as soon as the server accepts the task, so the browser can open the chat
   * while the model is already generating. Non-critical folder-knowledge and
   * explicit title operations are intentionally skipped here to avoid delaying
   * the hand-off to the Open WebUI UI. Background title generation is already
   * requested by runCompletion().
   */
  async startQuickChat(
    folderId: string,
    model: string,
    content: string,
    title: string,
    clip: Clip,
  ): Promise<ChatOperationResult> {
    const uploaded = await this.uploadClipAsMarkdown(clip, false);
    const fileRef = this.toChatFileRef(uploaded, clip);
    const chat = await this.createChat(
      folderId,
      model,
      content,
      title,
      [fileRef],
      "pending",
    );
    const warnings: string[] = [];

    const map = chat.chat?.history?.messages ?? {};
    const userMessage = Object.values(map).find(
      (message) => message.role === "user",
    );
    const assistantId = chat.chat?.history?.currentId;

    if (!assistantId || !userMessage) {
      warnings.push(
        "The chat was created, but the automatic model response could not be prepared.",
      );
      return { chat, warnings };
    }

    try {
      // With chat_id + assistant id + stream=true + session_id Open WebUI
      // starts the native server-side task and returns immediately with task_ids.
      await this.runCompletion(
        chat.id,
        assistantId,
        model,
        [{ role: "user", content }],
        [fileRef],
        userMessage,
        folderId,
      );
    } catch (error) {
      try {
        await this.markAssistantDone(chat.id, assistantId);
      } catch {
        // The chat is already saved; avoid hiding it because cleanup failed.
      }
      warnings.push(
        `The chat was created, but the automatic model response did not start: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }

    return { chat, warnings };
  }

  async startChat(
    folderId: string,
    model: string,
    content: string,
    title: string,
    clip: Clip,
    generate = true,
  ): Promise<ChatOperationResult> {
    // Upload and create the chat first. Once createChat succeeds, secondary operations
    // must never make the caller lose access to the newly-created conversation.
    const uploaded = await this.uploadClipAsMarkdown(clip, false);
    const fileRef = this.toChatFileRef(uploaded, clip);

    const chat = await this.createChat(
      folderId,
      model,
      content,
      title,
      [fileRef],
      generate ? "pending" : "completed",
    );
    const warnings: string[] = [];
    const map = chat.chat?.history?.messages ?? {};
    const userMessage = Object.values(map).find(
      (message) => message.role === "user",
    );
    const assistantId = generate ? chat.chat?.history?.currentId : null;

    if (generate && assistantId && userMessage) {
      try {
        await this.runCompletion(
          chat.id,
          assistantId,
          model,
          [{ role: "user", content }],
          [fileRef],
          userMessage,
          folderId,
        );
      } catch (error) {
        try {
          await this.markAssistantDone(chat.id, assistantId);
        } catch {
          // Best effort: the chat itself already exists and must remain accessible.
        }
        warnings.push(
          `The chat was created, but the automatic model response did not start: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }

    // Folder knowledge is useful, but it is secondary to the chat itself.
    // Some Open WebUI versions normalize folder.data.files differently, so a
    // verification failure here must be reported only as a warning.
    try {
      await this.attachFileToFolder(folderId, uploaded, clip);
    } catch (error) {
      warnings.push(
        `The file is attached to the message, but it could not be confirmed as a folder source: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    const finalTitle = await this.generateAndSaveTitle(
      chat.id,
      model,
      [{ role: "user", content }],
      title,
    );
    const finalChat = {
      ...chat,
      title: finalTitle,
      chat: { ...chat.chat, title: finalTitle },
    };
    return { chat: finalChat, warnings };
  }

  private inferModel(chat: ChatRecord): string {
    const direct = chat.chat?.models?.[0];
    if (direct) return direct;
    const messages = Object.values(chat.chat?.history?.messages ?? {});
    const lastAssistant = [...messages]
      .reverse()
      .find((message) => message.role === "assistant" && message.model);
    return lastAssistant?.model || "";
  }

  async appendToChat(
    chatId: string,
    content: string,
    clip: Clip,
    generate = true,
  ): Promise<ChatOperationResult> {
    const existing = await this.getChat(chatId);
    const history = existing.chat?.history ?? { messages: {}, currentId: null };
    const messagesMap = history.messages ?? {};
    const previousId = history.currentId ?? existing.chat?.currentId ?? null;
    const model = this.inferModel(existing);
    if (!model)
      throw new Error(
        "Could not determine the model used by the existing chat.",
      );

    const uploaded = await this.uploadClipAsMarkdown(clip, false);
    const fileRef = this.toChatFileRef(uploaded, clip);

    const userId = crypto.randomUUID();
    const assistantId = generate ? crypto.randomUUID() : null;
    const timestamp = Math.floor(Date.now() / 1000);

    const userMessage: ChatMessage = {
      id: userId,
      role: "user",
      content,
      parentId: previousId,
      childrenIds: assistantId ? [assistantId] : [],
      timestamp,
      models: [model],
      files: [fileRef],
      ...(!generate ? { done: true } : {}),
    };

    const partialMessages: Record<string, Partial<ChatMessage>> = {
      [userId]: userMessage,
    };
    if (assistantId) {
      partialMessages[assistantId] = {
        id: assistantId,
        role: "assistant",
        content: "",
        parentId: userId,
        childrenIds: [],
        model,
        modelName: model,
        modelIdx: 0,
        done: false,
        timestamp: timestamp + 1,
      };
    }
    if (previousId && messagesMap[previousId]) {
      partialMessages[previousId] = {
        childrenIds: [...(messagesMap[previousId].childrenIds ?? []), userId],
      };
    }

    const nextCurrentId = assistantId ?? userId;
    const mergedMessages: Record<string, ChatMessage> = { ...messagesMap };
    for (const [messageId, patch] of Object.entries(partialMessages)) {
      const existingMessage = mergedMessages[messageId];
      mergedMessages[messageId] = {
        ...(existingMessage ?? {}),
        ...patch,
      } as ChatMessage;
    }

    const legacyMessages = [...(existing.chat?.messages ?? [])];
    if (previousId) {
      const previousIndex = legacyMessages.findIndex(
        (message) => message.id === previousId,
      );
      if (previousIndex >= 0 && mergedMessages[previousId])
        legacyMessages[previousIndex] = mergedMessages[previousId];
    }
    legacyMessages.push(userMessage);
    if (assistantId && mergedMessages[assistantId])
      legacyMessages.push(mergedMessages[assistantId]);

    const chatFiles = dedupeFiles([...(existing.chat?.files ?? []), fileRef]);
    const updatedChat: ChatData = {
      ...existing.chat,
      history: {
        ...(existing.chat?.history ?? {}),
        currentId: nextCurrentId,
        messages: mergedMessages,
      },
      currentId: nextCurrentId,
      messages: legacyMessages,
      files: chatFiles,
    };

    await this.request(`/api/v1/chats/${encodeURIComponent(chatId)}`, {
      method: "POST",
      body: JSON.stringify({
        chat: updatedChat,
        folder_id: existing.folder_id ?? null,
      }),
    });

    const warnings: string[] = [];

    if (generate && assistantId) {
      try {
        const ordered = this.activeBranchMessages(existing.chat);
        await this.runCompletion(
          chatId,
          assistantId,
          model,
          [
            ...ordered.map((message) => ({
              role: message.role,
              content: message.content,
            })),
            { role: "user", content },
          ],
          [fileRef],
          userMessage,
          existing.folder_id ?? null,
        );
      } catch (error) {
        try {
          await this.markAssistantDone(chatId, assistantId);
        } catch {
          // Best effort: keep the conversation usable even when generation fails.
        }
        warnings.push(
          `The message was added, but the automatic model response did not start: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }

    if (existing.folder_id) {
      try {
        await this.attachFileToFolder(existing.folder_id, uploaded, clip);
      } catch (error) {
        warnings.push(
          `The file is attached to the message, but it could not be confirmed as a folder source: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }

    return { chat: await this.getChat(chatId), warnings };
  }

  private activeBranchMessages(chat: ChatData): ChatMessage[] {
    const map = chat.history?.messages ?? {};
    if (!Object.keys(map).length) return chat.messages ?? [];

    // Open WebUI chats can branch after edits/regenerations. `history.currentId`
    // identifies the leaf that is active in the UI. Reconstruct that exact branch
    // by walking parentId backwards; following childrenIds[0] can silently select
    // a different historical branch and send the wrong context to the model.
    let currentId = chat.history?.currentId ?? chat.currentId ?? undefined;
    if (!currentId || !map[currentId]) return chat.messages ?? [];

    const reversed: ChatMessage[] = [];
    const seen = new Set<string>();
    while (currentId && map[currentId] && !seen.has(currentId)) {
      seen.add(currentId);
      const message: ChatMessage = map[currentId];
      if (
        message.role === "user" ||
        message.role === "assistant" ||
        message.role === "system"
      ) {
        reversed.push(message);
      }
      currentId = message.parentId ?? undefined;
    }

    return reversed.reverse();
  }

  folderUrl(folderId: string): string {
    return `${this.baseUrl}/folders/${encodeURIComponent(folderId)}`;
  }

  chatUrl(chatId: string): string {
    return `${this.baseUrl}/c/${chatId}`;
  }
}
