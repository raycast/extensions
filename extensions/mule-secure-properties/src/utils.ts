import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import type { IncomingMessage } from "node:http";
import https from "node:https";
import { pipeline } from "node:stream/promises";
import { useCallback, useEffect, useRef, useState } from "react";
import { LocalStorage, openExtensionPreferences, showHUD, showToast, Toast } from "@raycast/api";
import {
  ERROR_MESSAGES,
  ERROR_PATTERNS,
  FIELD_DEFAULTS,
  FORM_SETTINGS_KEY,
  HOME_DIR,
  JAR_DOWNLOAD_URL,
  JAR_PATH,
  JAR_SHA256,
  KEY_LENGTH_HINTS,
  MAIN_CLASS,
  SUCCESS_MESSAGES,
} from "./constants";

// --- Form settings ---

export interface FormSettings {
  algorithm: string;
  mode: string;
  useRandomIV: boolean;
  wrapOutput: boolean;
  stripWrapper: boolean;
}

export const DEFAULT_FORM_SETTINGS: FormSettings = {
  algorithm: FIELD_DEFAULTS.algorithm,
  mode: FIELD_DEFAULTS.mode,
  useRandomIV: FIELD_DEFAULTS.useRandomIV,
  wrapOutput: FIELD_DEFAULTS.wrapOutput,
  stripWrapper: FIELD_DEFAULTS.stripWrapper,
};

export const buildFormSettings = (
  partial: Partial<FormSettings>,
  previous: FormSettings = DEFAULT_FORM_SETTINGS,
): FormSettings => ({
  algorithm: partial.algorithm ?? previous.algorithm,
  mode: partial.mode ?? previous.mode,
  useRandomIV: partial.useRandomIV ?? previous.useRandomIV,
  wrapOutput: partial.wrapOutput ?? previous.wrapOutput,
  stripWrapper: partial.stripWrapper ?? previous.stripWrapper,
});

const isFormSettings = (value: unknown): value is FormSettings => {
  if (!value || typeof value !== "object") {
    return false;
  }
  const candidate = value as Partial<FormSettings>;
  return (
    typeof candidate.algorithm === "string" &&
    typeof candidate.mode === "string" &&
    typeof candidate.useRandomIV === "boolean" &&
    typeof candidate.wrapOutput === "boolean" &&
    typeof candidate.stripWrapper === "boolean"
  );
};

export const loadFormSettings = async (): Promise<FormSettings> => {
  const raw = await LocalStorage.getItem<string>(FORM_SETTINGS_KEY);
  if (!raw) {
    return { ...DEFAULT_FORM_SETTINGS };
  }

  try {
    const parsed: unknown = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (isFormSettings(parsed)) {
      return parsed;
    }
  } catch {
    // Fall through to defaults.
  }

  return { ...DEFAULT_FORM_SETTINGS };
};

export const saveFormSettings = async (settings: FormSettings): Promise<void> => {
  await LocalStorage.setItem(FORM_SETTINGS_KEY, JSON.stringify(settings));
};

/** Loads form settings once; call `persist` on successful submit only. */
export const usePersistedFormSettings = (): {
  settings: FormSettings | null;
  isLoading: boolean;
  persist: (partial: Partial<FormSettings>) => Promise<void>;
} => {
  const [settings, setSettings] = useState<FormSettings | null>(null);
  const latestRef = useRef<FormSettings>(DEFAULT_FORM_SETTINGS);

  useEffect(() => {
    let cancelled = false;

    void loadFormSettings().then((loaded) => {
      if (cancelled) {
        return;
      }
      latestRef.current = loaded;
      setSettings(loaded);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const persist = useCallback(async (partial: Partial<FormSettings>) => {
    const next = buildFormSettings(partial, latestRef.current);
    latestRef.current = next;
    await saveFormSettings(next);
  }, []);

  return { settings, isLoading: settings === null, persist };
};

// --- Validation ---

const FIXED_KEY_LENGTHS: Record<string, number[]> = {
  AES: [16, 24, 32],
  DES: [8],
  DESede: [24],
};

export const supportsRandomIV = (mode: string): boolean => mode !== "ECB";

export const getKeyLengthHint = (algorithm: string): string =>
  KEY_LENGTH_HINTS[algorithm] ?? "Use the same key configured in your Mule app.";

export const getPasswordFieldInfo = (algorithm: string): string =>
  `${getKeyLengthHint(algorithm)} Prefills from Extension Preferences — edit to override for this run.`;

export const validateKeyLength = (algorithm: string, key: string): string | undefined => {
  const allowed = FIXED_KEY_LENGTHS[algorithm];
  if (!allowed) {
    return undefined;
  }
  if (!allowed.includes(key.length)) {
    return getKeyLengthHint(algorithm);
  }
  return undefined;
};

export const validateInputValue = (value: string): string | undefined => {
  if (value.includes("#")) {
    return ERROR_MESSAGES.HASH_NOT_SUPPORTED;
  }
  return undefined;
};

export const wrapEncryptedValue = (ciphertext: string): string => `![${ciphertext}]`;

// --- Errors ---

export const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }
  return "An unexpected error occurred.";
};

export const getUserFriendlyErrorMessage = (errorMessage: string): string => {
  for (const { pattern, message } of ERROR_PATTERNS) {
    if (errorMessage.includes(pattern)) {
      return `${message}\nOriginal error: ${errorMessage}`;
    }
  }
  return `Something went wrong. Check your inputs and try again.\nOriginal error: ${errorMessage}`;
};

export const handleOperationError = async (error: unknown, operation: "Encryption" | "Decryption"): Promise<void> => {
  const errorMessage = getErrorMessage(error);
  console.error(`${operation} error:`, error);

  await showToast({
    style: Toast.Style.Failure,
    title: `${operation} Error`,
    message: getUserFriendlyErrorMessage(errorMessage),
  });
};

// --- Password ---

export const resolvePassword = async (
  formPassword: string | undefined,
  defaultPassword: string | undefined,
): Promise<string | undefined> => {
  const password = formPassword?.trim() || defaultPassword?.trim();
  if (password) {
    return password;
  }
  await showHUD(ERROR_MESSAGES.PASSWORD_NOT_SET);
  await openExtensionPreferences();
  return undefined;
};

// --- JAR ---

export const doesJarExist = async (): Promise<boolean> => {
  try {
    await fs.promises.access(JAR_PATH, fs.constants.F_OK);
    return true;
  } catch {
    return false;
  }
};

export const verifyJarIntegrity = async (): Promise<boolean> => {
  try {
    const data = await fs.promises.readFile(JAR_PATH);
    const digest = createHash("sha256").update(data).digest("hex");
    return digest === JAR_SHA256;
  } catch {
    return false;
  }
};

export const downloadJar = async (): Promise<void> => {
  const fileStream = fs.createWriteStream(JAR_PATH);

  try {
    const response = await new Promise<IncomingMessage>((resolve, reject) => {
      const request = https.get(JAR_DOWNLOAD_URL, (res) => {
        if (res.statusCode !== 200) {
          res.resume();
          reject(new Error(`${ERROR_MESSAGES.JAR_DOWNLOAD_FAILED} Status code: ${res.statusCode}`));
          return;
        }
        resolve(res);
      });
      request.on("error", (error: Error) => {
        reject(error);
      });
    });

    await pipeline(response, fileStream);

    if (!(await verifyJarIntegrity())) {
      throw new Error(ERROR_MESSAGES.JAR_INTEGRITY_FAILED);
    }
  } catch (error) {
    try {
      await fs.promises.unlink(JAR_PATH);
    } catch {
      // Ignore cleanup failures for incomplete downloads.
    }
    throw error;
  }
};

export const ensureJarAvailable = async (): Promise<void> => {
  if ((await doesJarExist()) && (await verifyJarIntegrity())) {
    return;
  }

  await downloadJar();
  await showToast({
    style: Toast.Style.Success,
    title: "Download Complete",
    message: SUCCESS_MESSAGES.JAR_DOWNLOADED,
  });
};

// --- Secure Properties Tool ---

export type Operation = "encrypt" | "decrypt";

export interface SecurePropertiesOptions {
  operation: Operation;
  input: string;
  password: string;
  algorithm: string;
  mode: string;
  useRandomIV?: boolean;
}

export const cleanEncryptedText = (text: string): string => {
  const trimmed = text.trim();
  if (trimmed.startsWith("![") && trimmed.endsWith("]")) {
    return trimmed.slice(2, -1);
  }
  return trimmed;
};

export const buildSecurePropertiesArgs = ({
  operation,
  input,
  password,
  algorithm,
  mode,
  useRandomIV = false,
}: SecurePropertiesOptions): string[] => {
  const args = ["string", operation, algorithm, mode, password, input];
  if (useRandomIV && supportsRandomIV(mode)) {
    args.push("--use-random-iv");
  }
  return args;
};

const isJavaMissingError = (error: unknown): boolean => {
  if (!(error instanceof Error)) {
    return false;
  }
  const message = error.message.toLowerCase();
  const code = "code" in error ? String((error as NodeJS.ErrnoException).code) : "";
  return code === "ENOENT" || (message.includes("java") && message.includes("not found"));
};

const execJava = (args: string[]): Promise<string> =>
  new Promise((resolve, reject) => {
    // Users install Java in varied locations; resolve via PATH like the CLI would.
    execFile(
      "java", // NOSONAR typescript:S4036 -- intentional PATH lookup for the system Java binary
      ["-cp", JAR_PATH, MAIN_CLASS, ...args],
      { cwd: HOME_DIR, maxBuffer: 10 * 1024 * 1024, encoding: "utf8" },
      (error, stdout) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(stdout.trim());
      },
    );
  });

export const runSecurePropertiesTool = async (args: string[]): Promise<string> => {
  try {
    return await execJava(args);
  } catch (error) {
    if (isJavaMissingError(error)) {
      throw new Error(ERROR_MESSAGES.JAVA_MISSING);
    }
    throw error;
  }
};

export const runSecurePropertiesOperation = async (options: SecurePropertiesOptions): Promise<string> =>
  runSecurePropertiesTool(buildSecurePropertiesArgs(options));

// --- CLI copy helper ---

const SHELL_SINGLE_QUOTE_ESCAPE = String.raw`'\''`;

export const shellQuote = (value: string): string => {
  if (value === "") {
    return "''";
  }
  return `'${value.replaceAll("'", SHELL_SINGLE_QUOTE_ESCAPE)}'`;
};

export const formatCliCommand = (options: SecurePropertiesOptions): string => {
  const args = buildSecurePropertiesArgs(options);
  const quotedArgs = args.map((arg) => (arg === "--use-random-iv" ? arg : shellQuote(arg)));
  return ["java", "-cp", shellQuote(JAR_PATH), MAIN_CLASS, ...quotedArgs].join(" ");
};
