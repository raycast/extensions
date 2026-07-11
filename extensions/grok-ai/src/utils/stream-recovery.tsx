import { showToast, Toast } from "@raycast/api";

export enum StreamErrorType {
  NETWORK = "network",
  RATE_LIMIT = "rate_limit",
  AUTH = "auth",
  SERVER = "server",
  TOKEN_LIMIT = "token_limit",
  TIMEOUT = "timeout",
  ABORTED = "aborted",
  UNKNOWN = "unknown",
}

export interface StreamRecoveryConfig {
  maxRetries: number;
  initialDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  jitterFactor: number;
  timeout: number;
  onRetry?: (attempt: number, error: StreamError) => void;
  onRecoveryFailed?: (error: StreamError) => void;
  enablePartialRecovery: boolean;
}

export interface StreamError {
  type: StreamErrorType;
  message: string;
  statusCode?: number;
  retryable: boolean;
  timestamp: number;
}

export interface RecoveryState {
  attempts: number;
  lastError?: StreamError;
  isRecovering: boolean;
  partialContent?: string;
  lastEventId?: string;
}

export class StreamRecoveryManager {
  private config: StreamRecoveryConfig;
  private state: RecoveryState;
  private abortController?: AbortController;

  constructor(config: Partial<StreamRecoveryConfig> = {}) {
    this.config = {
      maxRetries: 3,
      initialDelay: 1000,
      maxDelay: 30000,
      backoffMultiplier: 2,
      jitterFactor: 0.3,
      timeout: 120000,
      enablePartialRecovery: true,
      ...config,
    };

    this.state = {
      attempts: 0,
      isRecovering: false,
    };
  }

  classifyError(error: unknown): StreamError {
    const timestamp = Date.now();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const err = error as any;

    if (err.name === "AbortError") {
      return {
        type: StreamErrorType.ABORTED,
        message: "Request was aborted",
        retryable: false,
        timestamp,
      };
    }

    if (err.message?.includes("timeout")) {
      return {
        type: StreamErrorType.TIMEOUT,
        message: "Request timed out",
        retryable: true,
        timestamp,
      };
    }

    if (err.statusCode === 401) {
      return {
        type: StreamErrorType.AUTH,
        message: "Authentication failed",
        statusCode: 401,
        retryable: false,
        timestamp,
      };
    }

    if (err.statusCode === 429) {
      return {
        type: StreamErrorType.RATE_LIMIT,
        message: "Rate limit exceeded",
        statusCode: 429,
        retryable: true,
        timestamp,
      };
    }

    if (err.statusCode >= 500) {
      return {
        type: StreamErrorType.SERVER,
        message: "Server error",
        statusCode: err.statusCode,
        retryable: true,
        timestamp,
      };
    }

    if (err.message?.toLowerCase().includes("token") || err.message?.toLowerCase().includes("limit")) {
      return {
        type: StreamErrorType.TOKEN_LIMIT,
        message: "Token limit exceeded",
        retryable: false,
        timestamp,
      };
    }

    if (err.message?.includes("network") || err.message?.includes("fetch")) {
      return {
        type: StreamErrorType.NETWORK,
        message: "Network error",
        retryable: true,
        timestamp,
      };
    }

    return {
      type: StreamErrorType.UNKNOWN,
      message: err.message || "Unknown error",
      retryable: true,
      timestamp,
    };
  }

  private calculateDelay(attempt: number): number {
    const baseDelay = Math.min(
      this.config.initialDelay * Math.pow(this.config.backoffMultiplier, attempt - 1),
      this.config.maxDelay,
    );

    const jitter = baseDelay * this.config.jitterFactor * (Math.random() * 2 - 1);
    return Math.max(0, baseDelay + jitter);
  }

  async shouldRetry(error: StreamError): Promise<boolean> {
    if (!error.retryable) {
      return false;
    }

    if (this.state.attempts >= this.config.maxRetries) {
      this.config.onRecoveryFailed?.(error);
      return false;
    }

    return true;
  }

  async prepareRetry(error: StreamError): Promise<void> {
    this.state.attempts++;
    this.state.lastError = error;
    this.state.isRecovering = true;

    const delay = this.calculateDelay(this.state.attempts);

    await showToast({
      style: Toast.Style.Animated,
      title: "Reconnecting...",
      message: `Attempt ${this.state.attempts}/${this.config.maxRetries}`,
    });

    this.config.onRetry?.(this.state.attempts, error);

    await new Promise((resolve) => setTimeout(resolve, delay));
  }

  updatePartialContent(content: string, eventId?: string): void {
    if (this.config.enablePartialRecovery) {
      this.state.partialContent = content;
      this.state.lastEventId = eventId;
    }
  }

  getRecoveryHeaders(): Record<string, string> {
    const headers: Record<string, string> = {};

    if (this.state.lastEventId && this.config.enablePartialRecovery) {
      headers["Last-Event-ID"] = this.state.lastEventId;
    }

    return headers;
  }

  reset(): void {
    this.state = {
      attempts: 0,
      isRecovering: false,
    };
    this.abortController?.abort();
    this.abortController = undefined;
  }

  getState(): RecoveryState {
    return { ...this.state };
  }

  createAbortController(): AbortController {
    this.abortController = new AbortController();

    if (this.config.timeout > 0) {
      setTimeout(() => {
        if (this.abortController && !this.abortController.signal.aborted) {
          this.abortController.abort();
        }
      }, this.config.timeout);
    }

    return this.abortController;
  }

  abort(): void {
    this.abortController?.abort();
  }
}
