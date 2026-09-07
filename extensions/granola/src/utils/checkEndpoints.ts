import getAccessToken from "./getAccessToken";
import { endpointCatalog } from "./endpointCatalog";
import { granolaFetch, GranolaRequestError } from "./granolaFetch";
import { diagnostic } from "./diagnostics";

export interface EndpointCheck {
  path: string;
  result: "passed" | "failed" | "skipped";
  detail: string;
}

export async function checkEndpoints(signal: AbortSignal): Promise<EndpointCheck[]> {
  const token = await getAccessToken();
  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    "X-Client-Version": "7.543.0",
  };
  let noteId: string | undefined;
  let folderId: string | undefined;
  const checks: EndpointCheck[] = [];
  for (const endpoint of endpointCatalog) {
    signal.throwIfAborted();
    if (endpoint.kind !== "read") {
      checks.push({
        path: endpoint.path,
        result: "skipped",
        detail:
          endpoint.kind === "auth"
            ? "Covered by sign-in/refresh checks"
            : "Not run: modifies data, generates content, or sends to another service",
      });
      continue;
    }
    if ((["note", "batch"].includes(endpoint.input) && !noteId) || (endpoint.input === "folder" && !folderId)) {
      checks.push({ path: endpoint.path, result: "skipped", detail: "No accessible sample resource available" });
      continue;
    }
    const body =
      endpoint.input === "note"
        ? { document_id: noteId }
        : endpoint.input === "batch"
          ? { document_ids: [noteId] }
          : endpoint.input === "folder"
            ? { list_id: folderId }
            : endpoint.path.endsWith("get-document-lists-metadata")
              ? { include_document_ids: true, include_only_joined_lists: false }
              : {};
    try {
      const response = await granolaFetch(`https://api.granola.ai${endpoint.path}`, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
        signal,
      });
      const data = (await response.json()) as {
        docs?: Array<{ id: string }>;
        lists?: Record<string, unknown>;
        id?: string;
      };
      let valid = data !== null && typeof data === "object";
      if (endpoint.path.endsWith("get-documents") || endpoint.path.endsWith("get-documents-batch"))
        valid = Array.isArray(data?.docs);
      if (endpoint.path.endsWith("get-document-transcript")) valid = Array.isArray(data);
      if (endpoint.path.endsWith("get-document-lists-metadata"))
        valid = !!data?.lists && typeof data.lists === "object";
      if (endpoint.path.endsWith("get-user-info")) valid = typeof data?.id === "string";
      if (!valid) {
        diagnostic("response.invalid_schema", { endpoint: `api.granola.ai${endpoint.path}`, status: response.status });
        checks.push({
          path: endpoint.path,
          result: "failed",
          detail: `HTTP ${response.status}, unexpected response shape`,
        });
        continue;
      }
      if (endpoint.path === "/v2/get-documents")
        noteId = data.docs?.find((doc: { id?: unknown }) => typeof doc.id === "string")?.id;
      if (endpoint.path.endsWith("get-document-lists-metadata")) folderId = Object.keys(data.lists ?? {})[0];
      checks.push({ path: endpoint.path, result: "passed", detail: `HTTP ${response.status}; response shape checked` });
    } catch (error) {
      if (signal.aborted) throw error;
      checks.push({
        path: endpoint.path,
        result: "failed",
        detail:
          error instanceof GranolaRequestError
            ? `HTTP ${error.status}; reference ${error.requestId}`
            : "Network or response parsing failure; see diagnostics",
      });
    }
  }
  return checks;
}
