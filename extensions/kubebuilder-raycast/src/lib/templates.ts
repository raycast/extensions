const DEFAULT_TEMPLATE_FILE_NAME = "remote-manifest.yaml";
const REQUEST_TIMEOUT_MS = 15_000;

export interface RemoteTemplateManifest {
  yaml: string;
  kind: string;
  fileName: string;
  sourceUrl: string;
}

function parseTemplateUrl(rawUrl: string): URL {
  const normalized = rawUrl.trim();
  if (!normalized) {
    throw new Error("Template URL is required");
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(normalized);
  } catch {
    throw new Error("Template URL must be a valid absolute URL");
  }

  if (!["http:", "https:"].includes(parsedUrl.protocol)) {
    throw new Error("Template URL must start with http:// or https://");
  }

  return parsedUrl;
}

function deriveFileName(url: URL): string {
  const lastSegment = url.pathname
    .split("/")
    .map((segment) => segment.trim())
    .filter(Boolean)
    .pop();

  if (!lastSegment) {
    return DEFAULT_TEMPLATE_FILE_NAME;
  }

  const decoded = decodeURIComponent(lastSegment);
  if (/\.ya?ml$/i.test(decoded)) {
    return decoded;
  }

  return DEFAULT_TEMPLATE_FILE_NAME;
}

function inferKind(yaml: string): string {
  const match = yaml.match(/^\s*kind:\s*["']?([A-Za-z0-9.-]+)["']?\s*$/m);
  return match?.[1] ?? "Remote";
}

function looksLikeHtml(payload: string): boolean {
  const prefix = payload.slice(0, 300).toLowerCase();
  return prefix.includes("<!doctype html") || prefix.includes("<html");
}

export async function fetchRemoteManifest(
  templateUrl: string,
): Promise<RemoteTemplateManifest> {
  const parsedUrl = parseTemplateUrl(templateUrl);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(parsedUrl.toString(), {
      method: "GET",
      headers: {
        accept: "application/yaml, text/yaml, application/x-yaml, text/plain",
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(
        `Template request failed (${response.status} ${response.statusText})`,
      );
    }

    const yaml = (await response.text()).trim();
    if (!yaml) {
      throw new Error("Template URL returned an empty response");
    }

    if (looksLikeHtml(yaml)) {
      throw new Error("Template URL returned HTML instead of YAML");
    }

    return {
      yaml,
      kind: inferKind(yaml),
      fileName: deriveFileName(parsedUrl),
      sourceUrl: parsedUrl.toString(),
    };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(
        `Template request timed out after ${REQUEST_TIMEOUT_MS / 1000}s`,
      );
    }

    throw new Error(
      error instanceof Error
        ? `Failed to fetch template: ${error.message}`
        : "Failed to fetch template",
    );
  } finally {
    clearTimeout(timeout);
  }
}
