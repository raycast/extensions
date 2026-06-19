import { LocalStorage, Toast, open, showToast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { checkRetraceInstallation } from "./utils/checkInstall";

const LAST_DEEPLINK_ATTEMPT_KEY = "lastRetraceDeeplinkAttempt";

type OpenRetraceDeeplinkOptions = {
  context: string;
  urls: string[];
  metadata?: Record<string, unknown>;
};

type DeeplinkAttemptRecord = {
  context: string;
  startedAt: string;
  status: "sent" | "failed";
  urls: string[];
  metadata?: Record<string, unknown>;
  error?: string;
};

function normalizeUrls(urls: string[]): string[] {
  return Array.from(new Set(urls.map((url) => url.trim()).filter((url) => url.length > 0)));
}

async function persistAttempt(record: DeeplinkAttemptRecord) {
  await LocalStorage.setItem(LAST_DEEPLINK_ATTEMPT_KEY, JSON.stringify(record));
}

function stringifyError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  return "Unknown error";
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function openRetraceDeeplink(options: OpenRetraceDeeplinkOptions) {
  const installed = await checkRetraceInstallation();
  if (!installed) {
    return;
  }

  const urls = normalizeUrls(options.urls);
  if (urls.length === 0) {
    await showFailureToast("No deeplink URL provided", { title: "Retrace Deeplink Error" });
    return;
  }

  const startedAt = new Date().toISOString();
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Opening Retrace",
    message: urls[0],
  });

  console.log(`[Retrace Deeplink] context=${options.context} startedAt=${startedAt}`);
  console.log(`[Retrace Deeplink] urls=${JSON.stringify(urls)}`);
  if (options.metadata) {
    console.log(`[Retrace Deeplink] metadata=${JSON.stringify(options.metadata)}`);
  }

  let openedUrl: string | null = null;
  let lastError: unknown = null;

  for (let index = 0; index < urls.length; index += 1) {
    const url = urls[index];
    const label = index === 0 ? "primary" : `fallback-${index}`;

    try {
      console.log(`[Retrace Deeplink] opening (${label}) ${url}`);
      await open(url);
      openedUrl = url;
      break;
    } catch (error: unknown) {
      lastError = error;
      const url = urls[index];
      const message = stringifyError(error);
      console.log(`[Retrace Deeplink] failed (${label}) ${url} error=${message}`);

      if (index < urls.length - 1) {
        // Give macOS a brief beat before attempting a fallback URL.
        await delay(120);
      }
    }
  }

  if (openedUrl) {
    const record: DeeplinkAttemptRecord = {
      context: options.context,
      startedAt,
      status: "sent",
      urls,
      metadata: options.metadata,
    };

    await persistAttempt(record);

    toast.style = Toast.Style.Success;
    toast.title = "Sent deeplink to Retrace";
    toast.message = openedUrl;
    return;
  }

  const message = stringifyError(lastError);
  const record: DeeplinkAttemptRecord = {
    context: options.context,
    startedAt,
    status: "failed",
    urls,
    metadata: options.metadata,
    error: message,
  };

  await persistAttempt(record);

  toast.style = Toast.Style.Failure;
  toast.title = "Failed to open Retrace";
  toast.message = message;

  console.log(`[Retrace Deeplink] failed error=${message}`);
  await showFailureToast(lastError ?? "Failed to open Retrace deeplink", { title: "Error opening Retrace deeplink" });
}
