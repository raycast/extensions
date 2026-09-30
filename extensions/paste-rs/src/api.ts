const DEFAULT_BASE_URL = "https://paste.rs/";

export type CreatePasteResult = {
  url: string;
  partial: boolean;
};

export async function createPaste(content: string, baseUrl = DEFAULT_BASE_URL): Promise<CreatePasteResult> {
  if (!content.trim()) {
    throw new Error("Paste content is empty");
  }

  const response = await fetch(baseUrl, {
    method: "POST",
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
    },
    body: content,
  });

  const body = (await response.text()).trim();

  // paste.rs returns 201 on success and 206 when only part of the paste was
  // stored because it exceeded the server's maximum upload size.
  if (response.status === 201 || response.status === 206) {
    return {
      url: body,
      partial: response.status === 206,
    };
  }

  throw new Error(body || `paste.rs returned ${response.status}`);
}

export function getPasteId(input: string): string {
  const value = input.trim();

  try {
    const url = new URL(value);
    if (url.hostname !== "paste.rs") {
      throw new Error("Paste URL must be on paste.rs");
    }

    const id = url.pathname.replace(/^\/+|\/+$/g, "");

    if (!id || id.includes("/")) {
      throw new Error("Paste URL must contain a single paste ID");
    }

    return id;
  } catch {
    if (!value || value.includes("/")) {
      throw new Error("Paste ID is invalid");
    }

    return value;
  }
}

export async function deletePaste(input: string, baseUrl = DEFAULT_BASE_URL): Promise<void> {
  const id = getPasteId(input);

  if (!id) {
    throw new Error("Paste ID is empty");
  }

  const response = await fetch(new URL(id, baseUrl), { method: "DELETE" });

  // Treat a missing paste as already deleted so removing stale history succeeds.
  if (response.ok || response.status === 404 || response.status === 410) {
    return;
  }

  const body = (await response.text()).trim();
  throw new Error(body || `paste.rs returned ${response.status}`);
}
