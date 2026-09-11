import { webcrypto } from "node:crypto";

if (typeof (globalThis as { crypto?: unknown }).crypto === "undefined") {
  (globalThis as { crypto: unknown }).crypto = webcrypto;
}

import {
  generateKey,
  exportKey,
  importKey,
  encrypt,
  decrypt,
  wrapKeyWithPassphrase,
  unwrapKeyWithPassphrase,
} from "@vaulted/crypto";
import { createSecret, retrieveSecret } from "./api-client";
import { ApiError, ValidationError } from "./errors";
import { EXPIRY_SECONDS, type Expiry, type MaxViews } from "./secret-config";
import { parseVaultedUrl, validateLength } from "./validation";

export interface CreateSecretFlowInput {
  plaintext: string;
  host: string;
  views: MaxViews;
  expiry: Expiry;
  passphrase?: string;
}

export interface CreateSecretFlowResult {
  url: string;
  id: string;
  statusToken: string;
}

export async function createSecretFlow(
  input: CreateSecretFlowInput,
): Promise<CreateSecretFlowResult> {
  validateLength(input.plaintext);

  const key = await generateKey();
  const { ciphertext, iv } = await encrypt(input.plaintext, key);

  let fragment: string;
  const hasPassphrase = Boolean(input.passphrase);
  if (input.passphrase) {
    const { wrappedKey, salt } = await wrapKeyWithPassphrase(
      key,
      input.passphrase,
    );
    fragment = `${wrappedKey}.${salt}`;
  } else {
    fragment = await exportKey(key);
  }

  const { id, statusToken } = await createSecret(input.host, {
    ciphertext,
    iv,
    maxViews: input.views,
    ttl: EXPIRY_SECONDS[input.expiry],
    hasPassphrase,
  });

  return {
    id,
    statusToken,
    url: `${input.host}/s/${id}#${fragment}`,
  };
}

export interface ViewSecretFlowInput {
  url: string;
  passphrase?: string;
}

export interface ViewSecretFlowResult {
  plaintext: string;
  viewsRemaining: number;
}

export async function viewSecretFlow(
  input: ViewSecretFlowInput,
): Promise<ViewSecretFlowResult> {
  const parsed = parseVaultedUrl(input.url);
  const remote = await retrieveSecret(parsed.origin, parsed.id);

  let key;
  if (remote.hasPassphrase) {
    if (!input.passphrase) {
      throw new ValidationError(
        "This secret requires a passphrase.",
        "PASSPHRASE_REQUIRED",
      );
    }
    const [wrappedKey, salt] = parsed.fragment.split(".");
    if (!wrappedKey || !salt) {
      throw new ValidationError(
        "Malformed passphrase-wrapped fragment.",
        "INVALID_URL",
      );
    }
    try {
      key = await unwrapKeyWithPassphrase(wrappedKey, salt, input.passphrase);
    } catch {
      throw new ValidationError("Incorrect passphrase.", "PASSPHRASE_INVALID");
    }
  } else {
    key = await importKey(parsed.fragment);
  }

  let plaintext: string;
  try {
    plaintext = await decrypt(remote.ciphertext, remote.iv, key);
  } catch {
    throw new ApiError(
      "Failed to decrypt secret (key/IV mismatch).",
      0,
      "ENCRYPTION_FAILED",
    );
  }

  return { plaintext, viewsRemaining: remote.viewsRemaining };
}
