import { access, readFile, stat } from "node:fs/promises";
import { constants } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { FENN_MIN_VERSION } from "./fenn-config";
import {
  fileTypeFilters,
  generatedImageUrl,
  parseSearchResponse,
  SearchMode,
} from "./search-model";

const ORIGIN = "http://127.0.0.1:5001";
const TOKEN_PATH = join(homedir(), ".fenn", "user_preferences", "mcp_token");

const ERROR_TITLES = {
  setup: "Finish Setting Up Fenn",
  connection: "Open Fenn to Search",
  update: "Update Fenn to Continue",
  license: "Activate Fenn to Search",
  verification: "Fenn Is Verifying Your License",
  authentication: "Reconnect Fenn",
  optimization: "Fenn Is Optimizing Its Index",
} as const;

export class FennError extends Error {
  readonly title: string;
  constructor(
    readonly kind: keyof typeof ERROR_TITLES,
    message: string,
  ) {
    super(message);
    this.name = "FennError";
    this.title = ERROR_TITLES[kind];
  }
}

export type SearchRequest = {
  query: string;
  mode: SearchMode;
  fileTypes: string[];
  clientId: string;
  requestId: number;
};

export function searchPayload(request: SearchRequest) {
  return {
    query: request.query.trim(),
    mode: request.mode,
    file_types: fileTypeFilters(request.fileTypes),
    limit: 20,
    match_limit: 50,
    client_id: request.clientId,
    request_id: request.requestId,
  };
}

export async function readToken(override?: string): Promise<string> {
  const configured = override?.trim();
  if (configured) return configured;
  try {
    const token = (await readFile(TOKEN_PATH, "utf8")).trim();
    if (/^[a-f0-9]{64}$/i.test(token)) return token;
  } catch {
    // Do not expose local credential paths or contents in an error.
  }
  throw new FennError(
    "setup",
    `Install Fenn ${FENN_MIN_VERSION} or newer, open it, and finish license activation and setup. Then retry. The connection is configured automatically.`,
  );
}

export function responseError(
  status: number,
  payload: Record<string, unknown>,
  mode: SearchMode,
): Error {
  if (payload.index_optimization)
    return new FennError(
      "optimization",
      "Fenn is optimizing its index. Wait for it to finish, then retry.",
    );
  if (status === 401)
    return new FennError(
      "authentication",
      "Fenn could not authenticate this extension. Clear any old Fenn API Token in Extension Settings, open Fenn, then retry.",
    );
  if (status === 423)
    return new FennError(
      "verification",
      "Open Fenn and wait for license verification to finish, then retry.",
    );
  if (status === 403)
    return new FennError(
      "license",
      "Open Fenn and activate your license using the key from your purchase email. Finish license verification, then retry.",
    );
  if (
    status === 404 ||
    (status === 400 &&
      mode === "discover" &&
      String(payload.error).includes("mode"))
  ) {
    return new FennError(
      "update",
      `Update Fenn to ${FENN_MIN_VERSION} or newer. Download the latest version, quit the old Fenn app, install the update, and reopen Fenn before retrying.`,
    );
  }
  if (payload.code === "mcp_not_initialized")
    return new FennError(
      "setup",
      `Open Fenn ${FENN_MIN_VERSION} or newer and finish setup, then retry. The connection is configured automatically.`,
    );
  return new Error(
    typeof payload.error === "string"
      ? payload.error
      : `Fenn returned an error (HTTP ${status}).`,
  );
}

export async function searchFenn(
  request: SearchRequest,
  tokenOverride: string | undefined,
  signal: AbortSignal,
) {
  const token = await readToken(tokenOverride);
  signal.throwIfAborted();
  const timeout = AbortSignal.timeout(120_000);
  let response: Response;
  try {
    response = await fetch(`${ORIGIN}/api/mcp/search-files`, {
      method: "POST",
      redirect: "error",
      headers: {
        "Content-Type": "application/json",
        "X-Fenn-MCP-Token": token,
      },
      body: JSON.stringify(searchPayload(request)),
      signal: AbortSignal.any([signal, timeout]),
    });
  } catch (error) {
    if (signal.aborted) throw error;
    if (timeout.aborted)
      throw new Error(
        "Fenn took too long to respond. Wait for indexing to finish or try Keyword or Filename mode.",
      );
    throw new FennError(
      "connection",
      `Cannot connect to Fenn. Open Fenn ${FENN_MIN_VERSION} or newer, wait for startup, and keep it running while you search. If Fenn is not installed, choose Download Fenn.`,
    );
  }
  let payload: Record<string, unknown>;
  try {
    payload = (await response.json()) as Record<string, unknown>;
  } catch {
    throw new Error(
      "Fenn returned an unreadable response. Update or restart Fenn and retry.",
    );
  }
  if (!response.ok)
    throw responseError(response.status, payload ?? {}, request.mode);
  const sections = parseSearchResponse(payload);
  // Missing previews (e.g. an offline drive or cleared image cache) should
  // not leave broken image placeholders or prevent showing search details.
  const previews = new Map<string, Promise<boolean>>();
  await Promise.all(
    sections.flatMap((section) =>
      section.results.map(async (result) => {
        if (!generatedImageUrl(result)) return;
        const imagePath = result.generated_file!;
        let readable = previews.get(imagePath);
        if (!readable) {
          readable = Promise.all([
            stat(imagePath),
            access(imagePath, constants.R_OK),
          ])
            .then(([info]) => info.isFile())
            .catch(() => false);
          previews.set(imagePath, readable);
        }
        if (!(await readable)) result.generated_file = null;
      }),
    ),
  );
  return sections;
}
