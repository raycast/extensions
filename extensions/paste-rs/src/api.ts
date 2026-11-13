import { getLanguageExtension } from "./languages";

const DEFAULT_BASE_URL = "https://paste.rs/";

export type CreatePasteResult = {
  url: string;
  partial: boolean;
};

export async function createPaste(
  content: string,
  language = "",
  signal: AbortSignal = AbortSignal.timeout(30_000),
): Promise<CreatePasteResult> {
  if (!content.trim()) {
    throw new Error("Paste content is empty");
  }

  const extension = getLanguageExtension(language);
  const response = await fetch(DEFAULT_BASE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
    },
    body: content,
    signal,
    redirect: "error",
  });

  const body = (await response.text()).trim();

  // paste.rs returns 201 on success and 206 when only part of the paste was
  // stored because it exceeded the server's maximum upload size.
  if (response.status === 201 || response.status === 206) {
    if (!/^https:\/\/paste\.rs\/[A-Za-z0-9]+$/.test(body)) {
      throw new Error("paste.rs returned an invalid paste URL");
    }
    return {
      url: new URL(`${getPasteId(body)}${extension ? `.${extension}` : ""}`, DEFAULT_BASE_URL).href,
      partial: response.status === 206,
    };
  }

  throw new Error(body || `paste.rs returned ${response.status}`);
}

export function getPasteId(input: string): string {
  const value = input.trim();
  let path = value;
  if (value.includes(":") || value.includes("/")) {
    const url = new URL(value);
    if (
      url.origin !== "https://paste.rs" ||
      url.username ||
      url.password ||
      url.search ||
      url.hash ||
      url.href !== value
    ) {
      throw new Error("Paste URL must be an HTTPS URL on paste.rs without credentials, query, or fragment");
    }
    path = url.pathname.slice(1);
  }

  // The service stores one alphanumeric ID; a suffix changes rendering only.
  const match = /^([A-Za-z0-9]+)(?:\.[A-Za-z0-9][A-Za-z0-9.+-]*)?$/.exec(path);
  if (!match) throw new Error("Paste ID is invalid");
  return match[1];
}

export async function deletePaste(input: string): Promise<void> {
  const id = getPasteId(input);

  if (!id) {
    throw new Error("Paste ID is empty");
  }

  const response = await fetch(new URL(id, DEFAULT_BASE_URL), {
    method: "DELETE",
    signal: AbortSignal.timeout(30_000),
    redirect: "error",
  });

  // Treat a missing paste as already deleted so removing stale history succeeds.
  if (response.ok || response.status === 404 || response.status === 410) {
    return;
  }

  const body = (await response.text()).trim();
  throw new Error(body || `paste.rs returned ${response.status}`);
}
