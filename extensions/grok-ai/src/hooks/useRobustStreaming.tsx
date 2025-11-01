import { useState, useCallback, useRef } from "react";
import { showToast, Toast } from "@raycast/api";
import { StreamRecoveryManager } from "../utils/stream-recovery";

export interface StreamingState {
  isLoading: boolean;
  data: string;
  error?: Error;
  isConnected: boolean;
  connectionState: "disconnected" | "connecting" | "connected" | "error";
}

export interface UseRobustStreamingOptions {
  onData?: (chunk: string) => void;
  onError?: (error: Error) => void;
  onComplete?: () => void;
  onConnectionChange?: (connected: boolean) => void;
  enableRecovery?: boolean;
  maxRetries?: number;
}

export function useRobustStreaming(hookOptions: UseRobustStreamingOptions = {}) {
  const [state, setState] = useState<StreamingState>({
    isLoading: false,
    data: "",
    isConnected: false,
    connectionState: "disconnected",
  });

  const recoveryManagerRef = useRef<StreamRecoveryManager | null>(null);
  const readerRef = useRef<ReadableStreamDefaultReader<Uint8Array> | null>(null);
  const accumulatedDataRef = useRef<string>("");

  const parseSSE = useCallback((line: string): { event?: string; data?: string; id?: string } | null => {
    if (!line || line.startsWith(":")) return null;

    const colonIndex = line.indexOf(":");
    if (colonIndex === -1) return null;

    const field = line.substring(0, colonIndex).trim();
    const value = line.substring(colonIndex + 1).trim();

    return { [field]: value };
  }, []);

  const processSSELine = useCallback(
    (line: string) => {
      const parsed = parseSSE(line);
      if (!parsed) return;

      if (parsed.data) {
        // Handle Grok API SSE format
        if (parsed.data === "[DONE]") {
          return;
        }

        try {
          const jsonData = JSON.parse(parsed.data);
          const content = jsonData.choices?.[0]?.delta?.content || jsonData.choices?.[0]?.delta?.reasoning_content;

          if (content) {
            accumulatedDataRef.current += content;

            setState((prev) => ({
              ...prev,
              data: prev.data + content,
            }));

            hookOptions.onData?.(content);
          }
        } catch (error) {
          console.error("Failed to parse SSE data:", error);
        }
      }

      if (parsed.id && recoveryManagerRef.current) {
        recoveryManagerRef.current.updatePartialContent(accumulatedDataRef.current, parsed.id);
      }
    },
    [parseSSE, hookOptions],
  );

  const fetchWithTimeout = useCallback(
    async (url: string, fetchOptions: RequestInit, timeout: number = 120000): Promise<Response> => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      try {
        const response = await fetch(url, {
          ...fetchOptions,
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        return response;
      } catch (error) {
        clearTimeout(timeoutId);
        if (error instanceof Error && error.name === "AbortError") {
          throw new Error("Request timeout");
        }
        throw error;
      }
    },
    [],
  );

  const streamRequest = useCallback(
    async (url: string, requestOptions: RequestInit, attemptRecovery: boolean = true): Promise<void> => {
      if (!recoveryManagerRef.current) {
        recoveryManagerRef.current = new StreamRecoveryManager({
          maxRetries: 3,
          enablePartialRecovery: true,
          onRetry: (attempt, error) => {
            console.log(`Retry attempt ${attempt} due to ${error.type}: ${error.message}`);
          },
        });
      }

      const recoveryManager = recoveryManagerRef.current;
      const recoveryHeaders = recoveryManager.getRecoveryHeaders();
      const abortController = recoveryManager.createAbortController();

      try {
        setState((prev) => ({ ...prev, connectionState: "connecting", isLoading: true }));

        const response = await fetchWithTimeout(url, {
          ...requestOptions,
          headers: {
            ...requestOptions.headers,
            ...recoveryHeaders,
          },
          signal: abortController.signal,
        });

        if (!response.ok) {
          const error = new Error(`HTTP ${response.status}`) as Error & { statusCode: number };
          error.statusCode = response.status;
          throw error;
        }

        if (!response.body) {
          throw new Error("No response body");
        }

        setState((prev) => ({
          ...prev,
          connectionState: "connected",
          isConnected: true,
        }));

        hookOptions.onConnectionChange?.(true);

        const reader = response.body.getReader();
        readerRef.current = reader;
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();

          if (done) {
            if (buffer.trim()) {
              processSSELine(buffer.trim());
            }
            break;
          }

          const chunk = decoder.decode(value, { stream: true });
          buffer += chunk;

          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (line.trim()) {
              processSSELine(line.trim());
            }
          }
        }

        setState((prev) => ({
          ...prev,
          isLoading: false,
          connectionState: "disconnected",
          isConnected: false,
        }));

        hookOptions.onComplete?.();
        hookOptions.onConnectionChange?.(false);
      } catch (error) {
        const streamError = recoveryManager.classifyError(error);

        if (attemptRecovery && (await recoveryManager.shouldRetry(streamError))) {
          await recoveryManager.prepareRetry(streamError);
          return streamRequest(url, requestOptions, true);
        }

        setState((prev) => ({
          ...prev,
          error: new Error(streamError.message),
          isLoading: false,
          connectionState: "error",
          isConnected: false,
        }));

        hookOptions.onError?.(new Error(streamError.message));
        hookOptions.onConnectionChange?.(false);

        await showToast({
          style: Toast.Style.Failure,
          title: "Connection Failed",
          message: streamError.message,
        });
      }
    },
    [fetchWithTimeout, processSSELine, hookOptions],
  );

  const start = useCallback(
    async (url: string, requestOptions: RequestInit = {}) => {
      accumulatedDataRef.current = "";
      setState({
        isLoading: true,
        data: "",
        isConnected: false,
        connectionState: "connecting",
      });

      await streamRequest(url, requestOptions);
    },
    [streamRequest],
  );

  const stop = useCallback(() => {
    if (readerRef.current) {
      readerRef.current.cancel();
    }
    if (recoveryManagerRef.current) {
      recoveryManagerRef.current.abort();
    }
    setState((prev) => ({
      ...prev,
      isLoading: false,
      connectionState: "disconnected",
      isConnected: false,
    }));
    hookOptions.onConnectionChange?.(false);
  }, [hookOptions]);

  const reset = useCallback(() => {
    stop();
    if (recoveryManagerRef.current) {
      recoveryManagerRef.current.reset();
    }
    accumulatedDataRef.current = "";
    setState({
      isLoading: false,
      data: "",
      isConnected: false,
      connectionState: "disconnected",
    });
  }, [stop]);

  return {
    ...state,
    start,
    stop,
    reset,
  };
}
