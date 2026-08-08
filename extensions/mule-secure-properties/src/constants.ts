import path from "node:path";
import { environment } from "@raycast/api";

const JAR_NAME = "secure-properties-tool.jar";
export const JAR_PATH = path.join(environment.supportPath, JAR_NAME);
export const MAIN_CLASS = "com.mulesoft.tools.SecurePropertiesTool";
/** Official Java 17 tool published by MuleSoft on November 22, 2024. */
export const DEFAULT_JAR_DOWNLOAD_URL =
  "https://docs.mulesoft.com/mule-runtime/latest/_attachments/secure-properties-tool-j17.jar";
export const DEFAULT_JAR_SHA256 = "802bb7ead7b5a5811cb69333fb05ec6dd507c615058663553c87c84ae404437c";

export const FORM_SETTINGS_KEY = "secure-properties-form";
export const JAR_SOURCE_URL_KEY = "secure-properties-jar-source-url";
export const JAR_VERIFICATION_CACHE_KEY = "secure-properties-jar-verification";
/** Allows verbose Java failures without truncating normal tool output. */
export const JAVA_MAX_BUFFER_BYTES = 10 * 1024 * 1024;

/** Algorithms supported out of the box by the Secure Properties Tool. */
export const ALGORITHMS = [
  { value: "AES", label: "AES (default)" },
  { value: "Blowfish", label: "Blowfish" },
  { value: "DES", label: "DES" },
  { value: "DESede", label: "DESede" },
  { value: "RC2", label: "RC2" },
  // "RCA" is intentional and matches MuleSoft's Secure Properties Tool documentation.
  { value: "RCA", label: "RCA" },
] as const;

/** Cipher modes supported by the Secure Properties Tool. */
export const MODES = [
  { value: "CBC", label: "CBC (default)" },
  { value: "CFB", label: "CFB" },
  { value: "ECB", label: "ECB" },
  { value: "OFB", label: "OFB" },
] as const;

export const ERROR_MESSAGES = {
  REQUIRED_INPUT: "Enter a value to process.",
  PASSWORD_NOT_SET: "No password set. Enter one below or configure the default in preferences.",
  JAVA_MISSING: "Java was not found. Install Java 17+ and configure JAVA_HOME or add `java` to your PATH.",
  JAR_DOWNLOAD_FAILED: "Could not download the Secure Properties Tool JAR.",
  JAR_SHA_REQUIRED: "A SHA-256 digest is required when using a custom Secure Properties Tool URL.",
  JAR_INTEGRITY_FAILED:
    "The Secure Properties Tool download failed the SHA-256 check. Confirm the Expected JAR SHA-256 preference.",
  HASH_NOT_SUPPORTED: "The Secure Properties Tool does not support the # character in the value.",
} as const;

export const SUCCESS_MESSAGES = {
  JAR_DOWNLOADED: "Secure Properties Tool downloaded successfully.",
  ENCRYPT_SUCCESS: "Encrypted and copied to clipboard",
  DECRYPT_SUCCESS: "Decrypted and copied to clipboard",
  COMMAND_COPIED: "CLI command copied to clipboard",
} as const;

export const ERROR_PATTERNS = [
  {
    pattern: "Input length must be multiple of 8",
    message: "The encrypted value looks incomplete or missing padding. Paste the full ciphertext and try again.",
  },
  {
    pattern: "Input byte array has wrong",
    message: "The value doesn't look like a valid encrypted string. Check the format and try again.",
  },
  {
    pattern: "Base64",
    message: "Invalid Base64 encoding. Paste a complete, unmodified encrypted value.",
  },
  {
    pattern: "Given final block not properly padded",
    message: "Decryption failed — likely a wrong password, mode/algorithm mismatch, or missing Random IV setting.",
  },
  {
    pattern: "Illegal key size",
    message: "Unsupported key size. AES keys must be 16, 24, or 32 characters; DES 8; DESede 24.",
  },
] as const;

/** Docs defaults: AES + CBC. */
export const FIELD_DEFAULTS = {
  algorithm: "AES",
  mode: "CBC",
  useRandomIV: false,
  wrapOutput: true,
  stripWrapper: true,
} as const;

/** Key length rules for algorithms that enforce fixed sizes. */
export const KEY_LENGTH_HINTS: Record<string, string> = {
  AES: "AES keys must be 16, 24, or 32 characters.",
  DES: "DES keys must be exactly 8 characters.",
  DESede: "DESede keys must be exactly 24 characters.",
  Blowfish: "Blowfish accepts a variable-length key.",
  RC2: "RC2 accepts a variable-length key.",
  RCA: "RCA accepts a variable-length key.",
};
