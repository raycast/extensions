import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import type {
  AuthStatusResponse,
  CodexUsageData,
  GetAccountRateLimitsResponse,
  RateLimitResetCredit,
  RateLimitResetCreditsResponse,
  RpcResponse,
  Skill,
  SkillsListResponse,
  Thread,
  ThreadListResponse,
} from "./codex-usage-types";

const REQUEST_TIMEOUT_MS = 20000;
const OPTIONAL_DATA_TIMEOUT_MS = 3000;
const RESET_CREDITS_TIMEOUT_MS = 5000;
const RESET_CREDITS_URL = "https://chatgpt.com/backend-api/wham/rate-limit-reset-credits";
const CODEX_EXECUTABLE_CANDIDATES = [
  "/opt/homebrew/bin/codex",
  "/usr/local/bin/codex",
  "/usr/bin/codex",
  join(homedir(), ".local/bin/codex"),
  join(homedir(), ".npm-global/bin/codex"),
  "codex",
];

export const THREAD_LIST_LIMIT = 99;

export function fetchCodexUsage(
  onResetCredits: (resetCredits: RateLimitResetCreditsResponse | null) => void,
): Promise<CodexUsageData> {
  return new Promise((resolve, reject) => {
    const child = spawn(resolveCodexExecutable(), ["app-server"], {
      env: {
        ...process.env,
        PATH: getExtendedPath(),
      },
      stdio: ["pipe", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";
    let settled = false;
    let resetCreditsPublished = false;
    let rateLimits: GetAccountRateLimitsResponse | null = null;
    let threads: Thread[] = [];
    let skills: Skill[] = [];
    let threadListFinished = false;
    let skillsListFinished = false;
    let authStatusFinished = false;
    let optionalDataTimeout: NodeJS.Timeout | undefined;

    const requestTimeout = setTimeout(() => {
      finish(new Error("Timed out while waiting for Codex rate limits."));
    }, REQUEST_TIMEOUT_MS);

    child.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString("utf8");
      const lines = stdout.split("\n");
      stdout = lines.pop() ?? "";

      for (const line of lines) {
        handleRpcLine(line);
      }
    });

    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString("utf8");
    });

    child.on("error", (error) => {
      if ("code" in error && error.code === "ENOENT") {
        finish(
          new Error(
            `Could not find the Codex CLI. Checked: ${CODEX_EXECUTABLE_CANDIDATES.join(", ")}. Install Codex or add it to a standard PATH location like /opt/homebrew/bin/codex.`,
          ),
        );
        return;
      }

      finish(error);
    });

    child.on("exit", (code) => {
      if (!settled && code !== 0) {
        finish(new Error(`Codex app-server exited with code ${code}.${formatStderr(stderr)}`));
      }
    });

    child.stdin.write(
      JSON.stringify({
        id: 1,
        method: "initialize",
        params: { clientInfo: { name: "raycast-codex-usage", version: "0.0.0" } },
      }) + "\n",
    );

    function handleRpcLine(line: string) {
      let message: RpcResponse;

      try {
        message = JSON.parse(line) as RpcResponse;
      } catch {
        return;
      }

      if (message.id === 1) {
        requestUsageData();
        scheduleOptionalDataTimeout();
        return;
      }

      if (message.id !== 2 && message.id !== 3 && message.id !== 4 && message.id !== 5) {
        return;
      }

      if (message.error) {
        handleRpcError(message);
        return;
      }

      if (!message.result && message.id === 2) {
        finish(new Error("Codex returned an empty rate-limit response."));
        return;
      }

      if (message.id === 2) {
        rateLimits = message.result as GetAccountRateLimitsResponse;
      }

      if (message.id === 3) {
        threads = ((message.result as ThreadListResponse | undefined)?.data ?? []).filter(Boolean);
        threadListFinished = true;
      }

      if (message.id === 4) {
        const entries = (message.result as SkillsListResponse | undefined)?.data ?? [];
        skills = entries.flatMap((entry) => entry.skills).filter((skill) => skill.enabled);
        skillsListFinished = true;
      }

      if (message.id === 5) {
        authStatusFinished = true;
        startResetCreditsRequest((message.result as AuthStatusResponse | undefined)?.authToken ?? null);
      }

      finishIfReady();
    }

    function requestUsageData() {
      child.stdin.write(JSON.stringify({ id: 2, method: "account/rateLimits/read" }) + "\n");
      child.stdin.write(
        JSON.stringify({
          id: 3,
          method: "thread/list",
          params: {
            limit: THREAD_LIST_LIMIT,
            sortKey: "updated_at",
            sortDirection: "desc",
            archived: false,
            sourceKinds: ["cli", "vscode", "exec", "appServer"],
          },
        }) + "\n",
      );
      child.stdin.write(JSON.stringify({ id: 4, method: "skills/list", params: { cwd: homedir() } }) + "\n");
      child.stdin.write(
        JSON.stringify({
          id: 5,
          method: "getAuthStatus",
          params: { includeToken: true, refreshToken: true },
        }) + "\n",
      );
    }

    function handleRpcError(message: RpcResponse) {
      if (message.id === 2) {
        finish(new Error(`${message.error?.message}.${formatStderr(stderr)}`));
        return;
      }

      if (message.id === 3) {
        threadListFinished = true;
      }
      if (message.id === 4) {
        skillsListFinished = true;
      }
      if (message.id === 5) {
        authStatusFinished = true;
        publishResetCredits(null);
      }

      finishIfReady();
    }

    function startResetCreditsRequest(authToken: string | null) {
      if (!authToken) {
        publishResetCredits(null);
        return;
      }

      void fetchRateLimitResetCredits(authToken, AbortSignal.timeout(RESET_CREDITS_TIMEOUT_MS))
        .then(publishResetCredits)
        .catch(() => publishResetCredits(null));
    }

    function publishResetCredits(resetCredits: RateLimitResetCreditsResponse | null) {
      if (resetCreditsPublished) {
        return;
      }

      resetCreditsPublished = true;
      onResetCredits(resetCredits);
    }

    function finishIfReady() {
      if (rateLimits && threadListFinished && skillsListFinished && authStatusFinished) {
        finish(null, { rateLimits, threads, skills });
      }
    }

    function finish(error: Error | null, result?: CodexUsageData) {
      if (settled) {
        return;
      }

      settled = true;
      clearTimeout(requestTimeout);
      clearTimeout(optionalDataTimeout);
      child.kill();

      if (error) {
        publishResetCredits(null);
        reject(error);
        return;
      }

      resolve(result as CodexUsageData);
    }

    function scheduleOptionalDataTimeout() {
      optionalDataTimeout = setTimeout(() => {
        if (!rateLimits) {
          scheduleOptionalDataTimeout();
          return;
        }

        if (!authStatusFinished) {
          authStatusFinished = true;
          publishResetCredits(null);
        }

        finish(null, { rateLimits, threads, skills });
      }, OPTIONAL_DATA_TIMEOUT_MS);
    }
  });
}

async function fetchRateLimitResetCredits(
  authToken: string,
  signal?: AbortSignal,
): Promise<RateLimitResetCreditsResponse> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${authToken}`,
    "OpenAI-Beta": "codex-1",
    originator: "Codex Desktop",
    "User-Agent": "raycast-codex-usage/0.0.0",
  };
  const accountId = getChatGptAccountId(authToken);

  if (accountId) {
    headers["ChatGPT-Account-Id"] = accountId;
  }

  const response = await fetch(RESET_CREDITS_URL, { headers, signal });
  if (!response.ok) {
    throw new Error(`Codex reset credits returned HTTP ${response.status}.`);
  }

  return parseRateLimitResetCredits(await response.json());
}

function parseRateLimitResetCredits(value: unknown): RateLimitResetCreditsResponse {
  if (!isRecord(value) || !Array.isArray(value.credits)) {
    throw new Error("Codex returned an invalid reset-credit response.");
  }

  const credits = value.credits.filter(isRateLimitResetCredit);
  const availableCount = credits.filter((credit) => credit.status === "available").length;

  return { credits, available_count: availableCount };
}

function isRateLimitResetCredit(value: unknown): value is RateLimitResetCredit {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.status === "string" &&
    typeof value.granted_at === "string" &&
    Number.isFinite(Date.parse(value.granted_at)) &&
    typeof value.expires_at === "string" &&
    Number.isFinite(Date.parse(value.expires_at)) &&
    (value.title == null || typeof value.title === "string") &&
    (value.description == null || typeof value.description === "string")
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getChatGptAccountId(authToken: string): string | null {
  try {
    const payload = JSON.parse(Buffer.from(authToken.split(".")[1], "base64url").toString("utf8")) as {
      "https://api.openai.com/auth"?: { chatgpt_account_id?: string };
    };
    return payload["https://api.openai.com/auth"]?.chatgpt_account_id ?? null;
  } catch {
    return null;
  }
}

function resolveCodexExecutable(): string {
  for (const candidate of CODEX_EXECUTABLE_CANDIDATES) {
    if (candidate !== "codex" && existsSync(candidate)) {
      return candidate;
    }
  }

  return "codex";
}

function getExtendedPath(): string {
  return [
    process.env.PATH,
    "/opt/homebrew/bin",
    "/usr/local/bin",
    "/usr/bin",
    "/bin",
    join(homedir(), ".local/bin"),
    join(homedir(), ".npm-global/bin"),
  ]
    .filter(Boolean)
    .join(":");
}

function formatStderr(stderr: string): string {
  const meaningfulLine = stderr
    .split("\n")
    .map((line) => line.trim())
    .find((line) => line && !line.startsWith("WARNING:"));

  return meaningfulLine ? ` ${meaningfulLine}` : "";
}
