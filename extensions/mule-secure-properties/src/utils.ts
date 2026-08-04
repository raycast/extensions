import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import type { IncomingMessage } from "node:http";
import https from "node:https";
import path from "node:path";
import { pipeline } from "node:stream/promises";
import { useCallback, useEffect, useRef, useState } from "react";
import { LocalStorage, openExtensionPreferences, showHUD, showToast, Toast } from "@raycast/api";
import {
  DEFAULT_JAR_DOWNLOAD_URL,
  DEFAULT_JAR_SHA256,
  ERROR_MESSAGES,
  ERROR_PATTERNS,
  FIELD_DEFAULTS,
  FORM_SETTINGS_KEY,
  JAR_PATH,
  JAR_SOURCE_URL_KEY,
  JAR_VERIFICATION_CACHE_KEY,
  KEY_LENGTH_HINTS,
  MAIN_CLASS,
  JAVA_MAX_BUFFER_BYTES,
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
  console.error(`${operation} error: ${errorMessage}`);

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

export interface JarDownloadConfig {
  url: string;
  sha256: string;
}

export interface MuleSecurePropertiesPreferences {
  defaultPassword: string;
  jarDownloadUrl?: string;
  jarSha256?: string;
}

export const resolveJarDownloadConfig = (
  preferences: Pick<MuleSecurePropertiesPreferences, "jarDownloadUrl" | "jarSha256">,
): JarDownloadConfig => {
  const url = preferences.jarDownloadUrl?.trim() || DEFAULT_JAR_DOWNLOAD_URL;
  const configuredSha256 = preferences.jarSha256?.trim().toLowerCase();
  const sha256 = configuredSha256 || (url === DEFAULT_JAR_DOWNLOAD_URL ? DEFAULT_JAR_SHA256 : undefined);
  if (!sha256) {
    throw new Error(ERROR_MESSAGES.JAR_SHA_REQUIRED);
  }
  return { url, sha256 };
};

export const doesJarExist = async (): Promise<boolean> => {
  try {
    await fs.promises.access(JAR_PATH, fs.constants.F_OK);
    return true;
  } catch {
    return false;
  }
};

export const verifyJarIntegrity = async (expectedSha256: string): Promise<boolean> => {
  try {
    const data = await fs.promises.readFile(JAR_PATH);
    const digest = createHash("sha256").update(data).digest("hex");
    return digest === expectedSha256;
  } catch {
    return false;
  }
};

interface JarVerificationCache {
  url: string;
  sha256: string;
  size: number;
  mtimeMs: number;
}

const getJarFileMetadata = async (): Promise<Pick<JarVerificationCache, "size" | "mtimeMs">> => {
  const { size, mtimeMs } = await fs.promises.stat(JAR_PATH);
  return { size, mtimeMs };
};

const getJarVerificationCacheKey = (url: string): string => `${JAR_VERIFICATION_CACHE_KEY}:${url}`;

const saveJarVerificationCache = async (config: JarDownloadConfig): Promise<void> => {
  try {
    const metadata = await getJarFileMetadata();
    await LocalStorage.setItem(getJarVerificationCacheKey(config.url), JSON.stringify({ ...config, ...metadata }));
  } catch {
    // Integrity is still verified; a cache failure only means the next run will hash again.
  }
};

const isJarIntegrityVerified = async (config: JarDownloadConfig): Promise<boolean> => {
  try {
    const metadata = await getJarFileMetadata();
    const rawCache = await LocalStorage.getItem<string>(getJarVerificationCacheKey(config.url));
    if (rawCache) {
      const cache = JSON.parse(rawCache) as Partial<JarVerificationCache>;
      if (
        cache.url === config.url &&
        cache.sha256 === config.sha256 &&
        cache.size === metadata.size &&
        cache.mtimeMs === metadata.mtimeMs
      ) {
        return true;
      }
    }
  } catch {
    // Missing or invalid cache data falls back to hashing the JAR.
  }

  const verified = await verifyJarIntegrity(config.sha256);
  if (verified) {
    await saveJarVerificationCache(config);
  }
  return verified;
};

export const downloadJar = async ({ url, sha256 }: JarDownloadConfig): Promise<void> => {
  await fs.promises.mkdir(path.dirname(JAR_PATH), { recursive: true });
  const fileStream = fs.createWriteStream(JAR_PATH);

  try {
    const response = await new Promise<IncomingMessage>((resolve, reject) => {
      const request = https.get(url, (res) => {
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

    if (!(await verifyJarIntegrity(sha256))) {
      throw new Error(ERROR_MESSAGES.JAR_INTEGRITY_FAILED);
    }

    await LocalStorage.setItem(JAR_SOURCE_URL_KEY, url);
    await saveJarVerificationCache({ url, sha256 });
  } catch (error) {
    fileStream.destroy();
    try {
      await fs.promises.unlink(JAR_PATH);
    } catch {
      // Ignore cleanup failures for incomplete downloads.
    }
    throw error;
  }
};

export const ensureJarAvailable = async (config: JarDownloadConfig): Promise<void> => {
  const storedUrl = await LocalStorage.getItem<string>(JAR_SOURCE_URL_KEY);
  const exists = await doesJarExist();
  const integrityOk = exists && (await isJarIntegrityVerified(config));
  const sourceMatches = !storedUrl || storedUrl === config.url;

  if (exists && integrityOk && sourceMatches) {
    if (!storedUrl) {
      await LocalStorage.setItem(JAR_SOURCE_URL_KEY, config.url);
    }
    return;
  }

  await downloadJar(config);
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

export const getJavaExecutableCandidates = (javaHome = process.env.JAVA_HOME): string[] => {
  const candidates = [
    javaHome ? path.join(javaHome, "bin", "java") : undefined,
    "/usr/bin/java",
    "/opt/homebrew/opt/openjdk/bin/java",
    "java",
  ];
  return Array.from(new Set(candidates.filter((candidate): candidate is string => Boolean(candidate))));
};

const execJava = (executable: string, args: string[]): Promise<string> =>
  new Promise((resolve, reject) => {
    execFile(
      executable, // NOSONAR typescript:S4036 -- candidates are fixed paths or the system PATH lookup
      ["-cp", JAR_PATH, MAIN_CLASS, ...args],
      { cwd: path.dirname(JAR_PATH), maxBuffer: JAVA_MAX_BUFFER_BYTES, encoding: "utf8" },
      (error, stdout) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(stdout.trim());
      },
    );
  });

const redactToolError = (error: unknown, args: string[]): Error => {
  let message = getErrorMessage(error);
  for (const secret of [args[4], args[5]]) {
    if (secret) {
      message = message.replaceAll(secret, "[redacted]");
    }
  }
  return new Error(message);
};

export const runSecurePropertiesTool = async (args: string[]): Promise<string> => {
  for (const executable of getJavaExecutableCandidates()) {
    try {
      return await execJava(executable, args);
    } catch (error) {
      if (!isJavaMissingError(error)) {
        throw redactToolError(error, args);
      }
    }
  }
  throw new Error(ERROR_MESSAGES.JAVA_MISSING);
};

export const runSecurePropertiesOperation = async (options: SecurePropertiesOptions): Promise<string> =>
  runSecurePropertiesTool(buildSecurePropertiesArgs(options));

// --- CLI copy helper ---

const SHELL_SINGLE_QUOTE_ESCAPE = String.raw`'\''`;

export const shellQuote = (value: string): string => {
  if (process.platform === "win32") {
    const escaped = value
      .replace(/(\\*)"/g, (_match, backslashes: string) => `${backslashes}${backslashes}\\"`)
      .replace(/(\\+)$/g, "$1$1");
    return `"${escaped}"`;
  }
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
