import { environment, getPreferenceValues, LocalStorage } from "@raycast/api";
import { execFile } from "node:child_process";
import path from "node:path";
import type { CaptureMode, RecognitionOutcome } from "./types";

export const WINDOWS_LANGUAGE_STORAGE_KEY = "WindowsRecognitionLanguage";

export type WindowsRecognizerLanguage = {
  tag: string;
  displayName: string;
};

type RecognitionPayload =
  | { status: "recognized"; text: string }
  | { status: "no-text" };

type LanguagesPayload = {
  status: "languages";
  languages: WindowsRecognizerLanguage[];
};

type ErrorPayload = {
  status: "error";
  code:
    | "clipboard-empty"
    | "clipboard-unsupported"
    | "clipboard-corrupt"
    | "clipboard-busy";
};

const MAX_OUTPUT_BYTES = 1024 * 1024 * 8;
const PROCESS_TIMEOUT_MS = 90_000;
const LANGUAGE_TAG = /^(auto|[A-Za-z]{2,3}(-[A-Za-z0-9]{2,8}){0,3})$/;

class ProtocolError extends Error {}

function powershellPath(): string {
  const windowsRoot =
    process.env.SystemRoot || process.env.WINDIR || "C:\\Windows";
  return path.win32.resolve(
    windowsRoot,
    "System32",
    "WindowsPowerShell",
    "v1.0",
    "powershell.exe",
  );
}

function helperPath(): string {
  return path.join(environment.assetsPath, "ocr.ps1");
}

function invokeHelper(
  arguments_: string[],
  timeout = PROCESS_TIMEOUT_MS,
): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    execFile(
      powershellPath(),
      [
        "-NoLogo",
        "-NoProfile",
        "-NonInteractive",
        "-STA",
        "-ExecutionPolicy",
        "Bypass",
        "-File",
        helperPath(),
        ...arguments_,
      ],
      {
        encoding: "utf8",
        windowsHide: true,
        timeout,
        maxBuffer: MAX_OUTPUT_BYTES,
      },
      (error, stdout, stderr) => {
        if (error) {
          reject(Object.assign(error, { stdout, stderr }));
          return;
        }
        resolve({ stdout, stderr });
      },
    );
  });
}

function parsePayload<T>(stdout: string): T {
  const raw = stdout.trim();
  if (!raw)
    throw new ProtocolError(
      "The Windows OCR helper returned an empty response.",
    );

  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    throw new ProtocolError(
      "The Windows OCR helper returned an invalid response.",
    );
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new ProtocolError(
      "The Windows OCR helper returned an invalid response.",
    );
  }
  return value as T;
}

function processError(error: unknown, language?: string): RecognitionOutcome {
  if (error instanceof ProtocolError)
    return { status: "error", message: error.message };
  const processFailure = (
    error && typeof error === "object" ? error : {}
  ) as NodeJS.ErrnoException & {
    killed?: boolean;
    signal?: string | null;
  };
  if (processFailure.code === "ERR_CHILD_PROCESS_STDIO_MAXBUFFER") {
    return {
      status: "error",
      message: "The Windows OCR response exceeded its size limit.",
    };
  }
  if (processFailure.killed || processFailure.signal) {
    return { status: "error", message: "Windows text recognition timed out." };
  }

  const exitCode =
    typeof processFailure.code === "number" ? processFailure.code : undefined;
  if (exitCode === 2) return { status: "cancelled" };
  if (exitCode === 3) {
    return {
      status: "error",
      message:
        language && language !== "auto"
          ? `The Windows OCR language pack for ${language} is not installed.`
          : "Windows could not create an OCR engine from your profile languages.",
    };
  }
  if (exitCode === 4) {
    try {
      const payload = parsePayload<ErrorPayload>(
        (processFailure as { stdout?: string }).stdout || "",
      );
      const messages: Record<ErrorPayload["code"], string> = {
        "clipboard-empty": "The clipboard does not contain an image.",
        "clipboard-unsupported":
          "The copied file is not a supported image format.",
        "clipboard-corrupt": "The copied image file could not be decoded.",
        "clipboard-busy": "The clipboard is busy. Try again.",
      };
      if (payload.status === "error" && Object.hasOwn(messages, payload.code)) {
        return { status: "error", message: messages[payload.code] };
      }
    } catch {
      // The exit code remains authoritative when an older helper has no payload.
    }
    return {
      status: "error",
      message: "The clipboard does not contain a supported image.",
    };
  }
  if (processFailure.code === "ENOENT") {
    return {
      status: "error",
      message: "Windows PowerShell 5.1 could not be started.",
    };
  }
  return { status: "error", message: "Windows text recognition failed." };
}

export async function getWindowsRecognitionLanguage(): Promise<string> {
  const value = await LocalStorage.getItem<string>(
    WINDOWS_LANGUAGE_STORAGE_KEY,
  );
  return typeof value === "string" && value.length > 0 ? value : "auto";
}

export async function setWindowsRecognitionLanguage(
  tag: string,
): Promise<void> {
  if (!LANGUAGE_TAG.test(tag))
    throw new Error("Invalid Windows OCR language tag.");
  await LocalStorage.setItem(WINDOWS_LANGUAGE_STORAGE_KEY, tag);
}

export async function getAvailableWindowsLanguages(): Promise<
  WindowsRecognizerLanguage[]
> {
  let stdout: string;
  try {
    ({ stdout } = await invokeHelper(["-ListLanguages"], 15_000));
  } catch (error) {
    const outcome = processError(error);
    throw new Error(
      outcome.status === "error"
        ? outcome.message
        : "Could not load Windows OCR languages.",
    );
  }
  const payload = parsePayload<LanguagesPayload>(stdout);
  if (
    payload.status !== "languages" ||
    Object.keys(payload).sort().join(",") !== "languages,status" ||
    !Array.isArray(payload.languages) ||
    payload.languages.some(
      (language) =>
        !language ||
        typeof language.tag !== "string" ||
        !LANGUAGE_TAG.test(language.tag) ||
        language.tag === "auto" ||
        typeof language.displayName !== "string" ||
        language.displayName.length === 0,
    )
  ) {
    throw new Error(
      "The Windows OCR helper returned an invalid language list.",
    );
  }
  return payload.languages;
}

export async function recognizeWindows(
  mode: CaptureMode,
): Promise<RecognitionOutcome> {
  const preferences = getPreferenceValues<Preferences>();
  const language = await getWindowsRecognitionLanguage();
  if (!LANGUAGE_TAG.test(language)) {
    return {
      status: "error",
      message:
        "The saved Windows OCR language is invalid. Choose a language in Select Recognition Languages.",
    };
  }
  const arguments_ = ["-Mode", mode, "-Language", language];
  if (preferences.ignoreLineBreaks) arguments_.push("-IgnoreLineBreaks");

  try {
    const { stdout } = await invokeHelper(
      arguments_,
      mode === "area" ? 300_000 : PROCESS_TIMEOUT_MS,
    );
    const payload = parsePayload<RecognitionPayload>(stdout);
    if (payload.status === "no-text" && Object.keys(payload).length === 1)
      return { status: "no-text" };
    if (
      payload.status === "recognized" &&
      typeof payload.text === "string" &&
      payload.text.trim().length > 0 &&
      Object.keys(payload).sort().join(",") === "status,text"
    ) {
      return { status: "recognized", text: payload.text };
    }
    return {
      status: "error",
      message: "The Windows OCR helper returned an invalid result.",
    };
  } catch (error) {
    return processError(error, language);
  }
}
