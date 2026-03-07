import { Clipboard, getPreferenceValues, Keyboard, showToast, Toast } from "@raycast/api";
import { getProviderForRequest, getProviderHost } from "./providers";

type Prefs = {
  debug?: boolean;
};

type ChatCompletionResponse = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
};

type DebugDetails = {
  provider: string;
  endpoint: string;
  model: string;
  status?: number;
  statusText?: string;
  contentType?: string;
  requestBody: string;
  responsePreview?: string;
};

type EnhanceOptions = {
  paste?: boolean;
  abortController?: AbortController;
  providerId?: string;
};

type LoadingFrame = {
  title: string;
  message: string;
};

const DEBUG_PREFIX = "[Prompt Enhancer]";
const RESPONSE_PREVIEW_LENGTH = 400;
const LOADING_FRAME_INTERVAL_MS = 1400;
const LOADING_ACCENT_MARKERS = ["🟡", "🟠"];
const SUCCESS_MARKER = "🟢";
const FAILURE_MARKER = "🔴";
const CANCEL_MARKER = "🟠";
const TOAST_BRAND = "Prompt Forge";
const MAX_MODEL_LABEL_LENGTH = 22;
const MAX_TOAST_MESSAGE_LENGTH = 90;
const LOADING_TITLES = [
  "Doing Some Magic",
  "Crafting an Amazing Prompt",
  "Preparing Something Magnificent",
  "Enhancing Your Words",
  "Refining the Details",
  "Polishing the Final Touches",
  "Transforming Ideas into Brilliance",
  "Composing Something Special",
  "Elevating Your Text",
  "Building Something Remarkable"
];
const SYSTEM_PROMPT = [
  "You rewrite user input into a single clear, direct, short prompt for an LLM agent.",
  "Return only the revised prompt text.",
  "Do not ask follow-up questions.",
  "Do not add explanations, options, headings, bullet points, or markdown.",
  "Keep the original intent, but make the wording concise and professional."
].join(" ");

export async function enhanceAndCopy(input: string, options: EnhanceOptions = {}) {
  const { debug = false } = getPreferenceValues<Prefs>();
  const provider = await getProviderForRequest(options.providerId);
  const { apiKey, apiBaseUrl, model } = provider;
  const endpoint = getChatCompletionsEndpoint(apiBaseUrl);
  const abortController = options.abortController ?? new AbortController();
  const loadingFrames = createLoadingFrames(provider.name, apiBaseUrl, model, input);
  const retryOptions: EnhanceOptions = { paste: options.paste, providerId: provider.id };
  let toast: Toast | undefined;
  let stopLoadingToastAnimation: (() => void) | undefined;
  const requestBody = JSON.stringify({
    model,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: input }
    ]
  });
  let debugDetails = formatDebugDetails({ provider: provider.name, endpoint, model, requestBody });

  try {
    toast = await showToast({
      style: Toast.Style.Animated,
      title: loadingFrames[0].title,
      message: loadingFrames[0].message,
      primaryAction: {
        title: "Abort Request",
        shortcut: {
          modifiers: ["cmd"],
          key: "."
        },
        onAction: (activeToast) => {
          if (abortController.signal.aborted) {
            return;
          }

          activeToast.title = createToastTitle(CANCEL_MARKER, model, "Canceling");
          activeToast.message = `${TOAST_BRAND} · stopping request`;
          activeToast.primaryAction = undefined;
          abortController.abort();
        }
      }
    });
    stopLoadingToastAnimation = startLoadingToastAnimation(toast, loadingFrames);

    if (debug) {
      console.log(`${DEBUG_PREFIX} Request\n${debugDetails}`);
    }

    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      },
      body: requestBody,
      signal: abortController.signal
    });

    const contentType = res.headers.get("content-type") ?? "unknown";
    const rawResponse = await res.text();
    const responsePreview = getResponsePreview(rawResponse);

    throwIfAborted(abortController.signal);

    debugDetails = formatDebugDetails({
      provider: provider.name,
      endpoint,
      model,
      status: res.status,
      statusText: res.statusText,
      contentType,
      requestBody,
      responsePreview
    });

    if (debug) {
      console.log(`${DEBUG_PREFIX} Response\n${debugDetails}`);
    }

    if (!res.ok) {
      throw new Error(getHttpErrorMessage(res.status, res.statusText, contentType, responsePreview));
    }

    if (!contentType.toLowerCase().includes("application/json")) {
      throw new Error(getNonJsonErrorMessage(contentType, responsePreview));
    }

    if (toast) {
      toast.title = createToastTitle(LOADING_ACCENT_MARKERS[0], model, "Reviewing Result");
      toast.message = `${TOAST_BRAND} · validating response payload`;
    }

    const data = parseChatCompletionResponse(rawResponse);
    const enhanced = sanitizeEnhancedText(data.choices?.[0]?.message?.content);

    throwIfAborted(abortController.signal);

    if (!enhanced) {
      throw new Error("API response did not include enhanced text.");
    }

    if (toast) {
      toast.title = createToastTitle(LOADING_ACCENT_MARKERS[1], model, options.paste ? "Preparing Replace" : "Preparing Copy");
      toast.message = `${TOAST_BRAND} · final polish in progress`;
    }

    await Clipboard.copy(enhanced);

    if (options.paste) {
      await Clipboard.paste(enhanced);
    }

    if (toast) {
      stopLoadingToastAnimation?.();
      toast.style = Toast.Style.Success;
      toast.title = createToastTitle(SUCCESS_MARKER, model, options.paste ? "Prompt Replaced" : "Prompt Ready");
      toast.message = formatSuccessToastMessage(provider.name, enhanced, options.paste);
      toast.primaryAction = undefined;
      toast.secondaryAction = undefined;
    }
  } catch (err) {
    if (isAbortError(err)) {
      if (debug) {
        console.log(`${DEBUG_PREFIX} Request canceled\n${debugDetails}`);
      }

      if (toast) {
        stopLoadingToastAnimation?.();
        toast.style = Toast.Style.Success;
        toast.title = createToastTitle(CANCEL_MARKER, model, "Canceled");
        toast.message = `${TOAST_BRAND} · request stopped`;
        toast.primaryAction = undefined;
        toast.secondaryAction = undefined;
      }

      return;
    }

    const message = err instanceof Error ? err.message : String(err);

    if (debug) {
      console.error(`${DEBUG_PREFIX} ${message}\n${debugDetails}`, err);
    } else {
      console.error(`${DEBUG_PREFIX} ${message}`, err);
    }

    if (toast) {
      stopLoadingToastAnimation?.();
      toast.style = Toast.Style.Failure;
      toast.title = createToastTitle(FAILURE_MARKER, model, "Enhancement Failed");
      toast.message = formatFailureToastMessage(provider.name, message);
      toast.primaryAction = {
        title: "Retry",
        onAction: () => {
          void enhanceAndCopy(input, retryOptions);
        }
      };
      toast.secondaryAction = debug
        ? {
            title: "Copy Debug Details",
            onAction: async () => {
              await Clipboard.copy(debugDetails);
            }
          }
        : {
            title: "Copy Error",
            onAction: async () => {
              await Clipboard.copy(message);
            }
          };
    } else {
      await showToast({
        style: Toast.Style.Failure,
        title: createToastTitle(FAILURE_MARKER, model, "Enhancement Failed"),
        message: formatFailureToastMessage(provider.name, message),
        primaryAction: {
          title: "Retry",
          onAction: () => {
            void enhanceAndCopy(input, retryOptions);
          }
        },
        secondaryAction: debug
          ? {
              title: "Copy Debug Details",
              onAction: async () => {
                await Clipboard.copy(debugDetails);
              }
            }
          : {
              title: "Copy Error",
              onAction: async () => {
                await Clipboard.copy(message);
              }
            }
      });
    }
  }
}

function getChatCompletionsEndpoint(apiBaseUrl: string) {
  const normalizedBaseUrl = apiBaseUrl.trim().replace(/\/+$/, "");

  if (normalizedBaseUrl.endsWith("/chat/completions")) {
    return normalizedBaseUrl;
  }

  return `${normalizedBaseUrl}/chat/completions`;
}

function parseChatCompletionResponse(rawResponse: string): ChatCompletionResponse {
  try {
    return JSON.parse(rawResponse) as ChatCompletionResponse;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Invalid JSON response: ${message}`);
  }
}

function throwIfAborted(signal: AbortSignal) {
  if (!signal.aborted) {
    return;
  }

  throw createAbortError();
}

function createAbortError() {
  if (typeof DOMException !== "undefined") {
    return new DOMException("Request aborted", "AbortError");
  }

  const error = new Error("Request aborted");
  error.name = "AbortError";
  return error;
}

function isAbortError(error: unknown) {
  return error instanceof Error && error.name === "AbortError";
}

function createLoadingFrames(providerName: string, apiBaseUrl: string, model: string, input: string): LoadingFrame[] {
  const shuffledTitles = [...LOADING_TITLES];
  shuffleArray(shuffledTitles);
  const providerHost = getProviderHost(apiBaseUrl);
  const modelLabel = getCompactModelLabel(model);
  const inputSize = formatCharacterCount(input.length);

  const loadingMessages = [
    `${TOAST_BRAND} · ${providerHost} · Cmd+. aborts`,
    `${providerName} · ${inputSize} in`,
    `${modelLabel} · tightening wording`,
    `${TOAST_BRAND} · polishing the final pass`,
    `${providerName} · preserving intent`
  ];

  return shuffledTitles.map((title, index) => ({
    title: `${LOADING_ACCENT_MARKERS[index % LOADING_ACCENT_MARKERS.length]} ${modelLabel} | ${title}`,
    message: loadingMessages[index % loadingMessages.length]
  }));
}

function createToastTitle(marker: string, model: string, label: string) {
  return `${marker} ${getCompactModelLabel(model)} | ${label}`;
}

function getCompactModelLabel(model: string) {
  if (model.length <= MAX_MODEL_LABEL_LENGTH) {
    return model;
  }

  return `${model.slice(0, MAX_MODEL_LABEL_LENGTH - 1)}…`;
}

function formatFailureToastMessage(providerName: string, message: string) {
  const compactMessage = message.replace(/\s+/g, " ").trim();
  const truncatedMessage =
    compactMessage.length > MAX_TOAST_MESSAGE_LENGTH
      ? `${compactMessage.slice(0, MAX_TOAST_MESSAGE_LENGTH - 1)}…`
      : compactMessage;

  return `${providerName} · ${truncatedMessage}`;
}

function formatSuccessToastMessage(providerName: string, enhanced: string, paste: boolean | undefined) {
  return `${providerName} · ${formatCharacterCount(enhanced.length)} · ${paste ? "selection updated" : "copied to clipboard"}`;
}

function formatCharacterCount(value: number) {
  return `${value} chars`;
}

function startLoadingToastAnimation(toast: Toast, frames: LoadingFrame[]) {
  if (frames.length < 2) {
    return () => {};
  }

  let frameIndex = 1;
  const intervalId = setInterval(() => {
    const frame = frames[frameIndex];
    toast.title = frame.title;
    toast.message = frame.message;
    frameIndex = (frameIndex + 1) % frames.length;
  }, LOADING_FRAME_INTERVAL_MS);

  return () => clearInterval(intervalId);
}

function shuffleArray(values: string[]) {
  for (let index = values.length - 1; index > 0; index -= 1) {
    const nextIndex = Math.floor(Math.random() * (index + 1));
    const currentValue = values[index];
    values[index] = values[nextIndex];
    values[nextIndex] = currentValue;
  }
}

function sanitizeEnhancedText(content?: string) {
  if (!content) {
    return "";
  }

  return content
    .trim()
    .replace(/^```[a-zA-Z]*\s*/, "")
    .replace(/\s*```$/, "")
    .replace(/^\s*(?:revised prompt|enhanced prompt|prompt)\s*:\s*/i, "")
    .replace(/^['"]+|['"]+$/g, "")
    .trim();
}

function getResponsePreview(rawResponse: string) {
  return rawResponse.replace(/\s+/g, " ").trim().slice(0, RESPONSE_PREVIEW_LENGTH);
}

function getHttpErrorMessage(status: number, statusText: string, contentType: string, responsePreview: string) {
  const preview = responsePreview ? ` Preview: ${responsePreview}` : "";
  return `API request failed with ${status} ${statusText}. Content-Type: ${contentType}.${preview}`;
}

function getNonJsonErrorMessage(contentType: string, responsePreview: string) {
  const looksLikeHtml = responsePreview.startsWith("<");
  const hint = looksLikeHtml ? " The server returned HTML, which usually means the API Base URL is wrong." : "";
  const preview = responsePreview ? ` Preview: ${responsePreview}` : "";

  return `Expected JSON but received ${contentType}.${hint}${preview}`;
}

function formatDebugDetails(details: DebugDetails) {
  return [
    `provider: ${details.provider}`,
    `endpoint: ${details.endpoint}`,
    `model: ${details.model}`,
    `status: ${details.status ?? "pending"}`,
    `statusText: ${details.statusText ?? "pending"}`,
    `contentType: ${details.contentType ?? "pending"}`,
    `requestBody: ${details.requestBody}`,
    `responsePreview: ${details.responsePreview ?? "pending"}`
  ].join("\n");
}