import { getPreferenceValues } from "@raycast/api";
import { promises as fs } from "node:fs";
import { dirname, join } from "node:path";
import { homedir } from "node:os";

export type ClaudeQuestionChoice = {
  label: string;
  detail?: string;
};

export type ClaudeQuestion = {
  prompt: string;
  header?: string | null;
  type?: "choice" | "text" | "yesno";
  multiSelect: boolean;
  choices: ClaudeQuestionChoice[];
  placeholder?: string | null;
};

export type ClaudeQuestionRequest = {
  requestId: string;
  createdAt?: string;
  sessionId?: string | null;
  toolUseId?: string | null;
  cwd?: string | null;
  transcriptPath?: string | null;
  source?: string | null;
  returnUrl?: string | null;
  title?: string | null;
  questions: ClaudeQuestion[];
  requestFileName?: string;
};

export type ClaudeQuestionResponse = {
  requestId: string;
  status: "submitted" | "cancelled";
  submittedAt: string;
  answers?: Record<string, string | string[]>;
};

type StoredQuestionRequest = ClaudeQuestionRequest & {
  requestFileName: string;
};

export function decodeQuestionPayload(payload: string): ClaudeQuestionRequest {
  const json = Buffer.from(payload, "base64").toString("utf8");
  return JSON.parse(json) as ClaudeQuestionRequest;
}

export async function writeQuestionResponse(
  response: ClaudeQuestionResponse,
): Promise<void> {
  const filePath = responseFilePath(response.requestId);
  await fs.mkdir(dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(response, null, 2));
}

export async function loadQuestionRequests(): Promise<ClaudeQuestionRequest[]> {
  const dir = requestsDirPath();

  try {
    const entries = await fs.readdir(dir);
    const requests: Array<StoredQuestionRequest | null> = await Promise.all(
      entries
        .filter((entry) => entry.endsWith(".json"))
        .map(async (entry) => {
          try {
            const raw = await fs.readFile(join(dir, entry), "utf8");
            return {
              ...(JSON.parse(raw) as ClaudeQuestionRequest),
              requestFileName: entry,
            };
          } catch {
            return null;
          }
        }),
    );

    return requests
      .filter(isStoredQuestionRequest)
      .sort((left, right) =>
        (right.createdAt ?? "").localeCompare(left.createdAt ?? ""),
      );
  } catch {
    return [];
  }
}

export async function removeQuestionRequest(
  request:
    | Pick<ClaudeQuestionRequest, "requestId" | "requestFileName">
    | string,
): Promise<void> {
  const fileName =
    typeof request === "string"
      ? `${request}.json`
      : (request.requestFileName ?? `${request.requestId}.json`);

  try {
    await fs.rm(join(requestsDirPath(), fileName), { force: true });
  } catch {
    // Ignore cleanup failures. The hook-side timeout path will still recover.
  }
}

function responseFilePath(requestId: string): string {
  const preferences = getPreferenceValues<Preferences>();
  const rootDir = preferences.notifierRootPath.replace(/^~(?=\/)/, homedir());
  return join(rootDir, "responses", `${requestId}.json`);
}

function requestsDirPath(): string {
  const preferences = getPreferenceValues<Preferences>();
  const rootDir = preferences.notifierRootPath.replace(/^~(?=\/)/, homedir());
  return join(rootDir, "requests");
}

function isStoredQuestionRequest(
  request: StoredQuestionRequest | null,
): request is StoredQuestionRequest {
  return request !== null;
}
