import { execFile } from "child_process";
import { promisify } from "util";
import { existsSync } from "fs";
import { getPreferenceValues } from "@raycast/api";

const execFileAsync = promisify(execFile);

interface Preferences {
  m365Path: string;
}

const COMMON_PATHS = [
  "/opt/homebrew/bin/m365",
  "/usr/local/bin/m365",
  `${process.env.HOME}/.npm-global/bin/m365`,
  `${process.env.HOME}/.npm/bin/m365`,
];

function getM365Path(): string {
  const { m365Path } = getPreferenceValues<Preferences>();
  if (m365Path && existsSync(m365Path)) {
    return m365Path;
  }
  for (const p of COMMON_PATHS) {
    if (existsSync(p)) return p;
  }
  throw new Error(
    "m365 CLI not found. Install it with:\n  npm install -g @pnp/cli-microsoft365\n\nThen set the path in extension preferences if needed.",
  );
}

export interface EmailAddress {
  name: string;
  address: string;
}

export interface Message {
  id: string;
  subject: string;
  from: { emailAddress: EmailAddress };
  toRecipients?: Array<{ emailAddress: EmailAddress }>;
  receivedDateTime: string;
  isRead: boolean;
  bodyPreview: string;
  body: {
    contentType: "html" | "text";
    content: string;
  };
}

const EXEC_ENV = {
  ...process.env,
  PATH: ["/opt/homebrew/bin", "/usr/local/bin", "/usr/bin", "/bin", process.env.PATH ?? ""].join(":"),
};

async function runM365<T>(args: string[]): Promise<T> {
  const m365 = getM365Path();
  try {
    const { stdout, stderr } = await execFileAsync(m365, args, { env: EXEC_ENV });
    if (!stdout.trim()) {
      throw new Error(`No output from: ${m365} ${args.join(" ")}\nstderr: ${stderr}`);
    }
    return JSON.parse(stdout) as T;
  } catch (err: unknown) {
    const e = err as NodeJS.ErrnoException & { stdout?: string; stderr?: string };
    const detail = e.stderr?.trim() || e.stdout?.trim() || e.message;
    throw new Error(`m365 ${args.join(" ")} failed:\n${detail}`);
  }
}

export async function listMessages(folder = "inbox"): Promise<Message[]> {
  const result = await runM365<{ value: Message[] }>(["mail", "list", "--folder", folder]);
  return result.value ?? [];
}

export async function getMessage(id: string): Promise<Message> {
  return runM365<Message>(["mail", "get", id]);
}

export async function sendMessage(to: string, subject: string, body: string): Promise<void> {
  const m365 = getM365Path();
  await execFileAsync(m365, ["mail", "send", "--to", to, "--subject", subject, "--body", body], { env: EXEC_ENV });
}

export async function replyToMessage(id: string, body: string): Promise<void> {
  const m365 = getM365Path();
  await execFileAsync(m365, ["mail", "reply", id, "--body", body], { env: EXEC_ENV });
}

export async function deleteMessage(id: string): Promise<void> {
  const m365 = getM365Path();
  await execFileAsync(m365, ["mail", "delete", id], { env: EXEC_ENV });
}

export async function markMessageAsRead(id: string): Promise<void> {
  const m365 = getM365Path();
  await execFileAsync(
    m365,
    [
      "request",
      "--method",
      "PATCH",
      "--url",
      `https://graph.microsoft.com/v1.0/me/messages/${id}`,
      "--body",
      `{"isRead":true}`,
    ],
    { env: EXEC_ENV },
  );
}

/** Strip HTML tags and decode common entities for display in Raycast markdown */
export function htmlToMarkdown(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
