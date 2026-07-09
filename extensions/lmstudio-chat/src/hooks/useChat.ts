import { getPreferenceValues, showToast, Toast } from "@raycast/api";
import { useCallback, useEffect, useRef, useState } from "react";
import { chatStream, getConfig } from "../lib/lmstudio";
import { buildApiMessages } from "../lib/payload";
import * as storage from "../lib/storage";
import { Attachment, Chat, Message } from "../lib/types";

interface Preferences {
  systemPrompt?: string;
  temperature?: string;
}

/**
 * One conversation. Pass a chatId to continue a stored chat (Chat History);
 * omit it to start fresh (Chat command always starts a new conversation).
 */
export function useConversation(chatId?: string) {
  const [chat, setChat] = useState<Chat | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (chatId) {
      storage.getChat(chatId).then((loaded) => {
        if (loaded) setChat(loaded);
      });
    }
    return () => abortRef.current?.abort();
  }, [chatId]);

  const newChat = useCallback(() => {
    abortRef.current?.abort();
    setChat(null);
    setError(null);
  }, []);

  const sendMessage = useCallback(
    async (
      text: string,
      model: string,
      options?: { attachments?: Attachment[]; includeImages?: boolean },
    ) => {
      const trimmed = text.trim();
      if (!trimmed || isStreaming) return;
      setError(null);

      const prefs = getPreferenceValues<Preferences>();
      const rawTemperature = prefs.temperature?.trim();
      const parsedTemperature = rawTemperature ? Number(rawTemperature) : NaN;
      const temperature = Number.isFinite(parsedTemperature)
        ? parsedTemperature
        : 0.7;
      const systemPrompt = prefs.systemPrompt?.trim();

      let current: Chat = chat ?? (await storage.createChat(model));
      if (current.messages.length === 0) {
        current = { ...current, title: storage.deriveTitle(trimmed) };
      }
      const attachments = options?.attachments ?? [];
      const userMessage: Message = {
        role: "user",
        content: trimmed,
        timestamp: Date.now(),
        ...(attachments.length > 0 ? { attachments } : {}),
      };
      const assistantMessage: Message = {
        role: "assistant",
        content: "",
        timestamp: Date.now(),
      };
      current = {
        ...current,
        model,
        messages: [...current.messages, userMessage, assistantMessage],
      };
      setChat(current);

      const { messages: apiMessages, skippedImages } = await buildApiMessages(
        { ...current, messages: current.messages.slice(0, -1) },
        { systemPrompt, includeImages: options?.includeImages ?? false },
      );
      if (skippedImages.length > 0) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Some images were skipped",
          message: `File(s) no longer exist: ${skippedImages.join(", ")}`,
        });
      }
      if (!(options?.includeImages ?? false)) {
        const omittedImages = current.messages.some(
          (m) =>
            m.role === "user" &&
            (m.attachments ?? []).some((a) => a.type === "image"),
        );
        if (omittedImages) {
          await showToast({
            style: Toast.Style.Failure,
            title: "Images not sent",
            message: "The selected model has no vision support.",
          });
        }
      }

      const controller = new AbortController();
      abortRef.current = controller;
      setIsStreaming(true);
      let content = "";
      try {
        for await (const delta of chatStream(getConfig(), {
          model,
          messages: apiMessages,
          temperature,
          signal: controller.signal,
        })) {
          content += delta;
          current = {
            ...current,
            messages: [
              ...current.messages.slice(0, -1),
              { ...assistantMessage, content },
            ],
          };
          setChat(current);
        }
      } catch (e) {
        const aborted = e instanceof DOMException && e.name === "AbortError";
        if (!aborted) setError(e as Error);
      } finally {
        setIsStreaming(false);
        abortRef.current = null;
        // Persist even on error/abort so a partial answer is kept (spec requirement).
        await storage.saveChat(current);
      }
    },
    [chat, isStreaming],
  );

  return { chat, isStreaming, error, sendMessage, newChat };
}
