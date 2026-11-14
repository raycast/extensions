import { exec } from "node:child_process";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

const execAsync = promisify(exec);

// Official Plaud third-party API, same one the Plaud CLI uses.
// Auth is delegated to the CLI: `plaud login` creates ~/.plaud/tokens.json
// and any CLI command refreshes an expired token as a side effect.
const API_BASE = "https://platform.plaud.ai/developer/api";
const TOKENS_PATH = join(homedir(), ".plaud", "tokens.json");

// Raycast doesn't inherit a login shell PATH; cover common install locations
const PATH = [process.env.PATH, "/opt/homebrew/bin", "/usr/local/bin", `${homedir()}/.local/bin`]
  .filter(Boolean)
  .join(":");

export class NotLoggedInError extends Error {
  constructor() {
    super("Not logged in to Plaud CLI");
    this.name = "NotLoggedInError";
  }
}

export function webLink(id: string): string {
  return `https://web.plaud.ai/file/${id}`;
}

export interface PlaudRecording {
  id: string;
  name: string;
  created_at: string;
  duration: number; // milliseconds
}

interface TokenSet {
  access_token: string;
  expires_at?: number; // epoch ms
}

async function readTokens(): Promise<TokenSet | null> {
  try {
    return JSON.parse(await readFile(TOKENS_PATH, "utf8")) as TokenSet;
  } catch {
    return null;
  }
}

// Cheapest authenticated CLI command; the CLI refreshes tokens.json if needed
async function refreshViaCli(): Promise<void> {
  await execAsync("plaud me", { env: { ...process.env, PATH }, timeout: 30_000 });
}

async function getToken(allowRefresh = true): Promise<string> {
  const tokens = await readTokens();
  if (!tokens) throw new NotLoggedInError();
  if (tokens.expires_at && Date.now() > tokens.expires_at - 60_000) {
    if (!allowRefresh) throw new NotLoggedInError();
    try {
      await refreshViaCli();
    } catch {
      throw new NotLoggedInError();
    }
    return getToken(false);
  }
  return tokens.access_token;
}

// Fake data for store screenshots; enable with `touch ~/.plaud/raycast-demo`
const DEMO_FLAG = join(homedir(), ".plaud", "raycast-demo");
const DEMO_RECORDINGS: Array<[string, number, number]> = [
  ["Weekly Team Standup", 32 * 60_000, 3],
  ["Product Roadmap Brainstorm", 58 * 60_000, 5],
  ["Customer Interview — Onboarding Feedback", 41 * 60_000, 8],
  ["1:1 with Alex", 27 * 60_000, 24],
  ["Q3 Planning Session", 74 * 60_000, 30],
  ["Design Review — Mobile App", 45 * 60_000, 50],
  ["Sales Call Debrief", 22 * 60_000, 74],
  ["All-Hands Notes", 63 * 60_000, 98],
  ["Vendor Negotiation Prep", 35 * 60_000, 120],
  ["Podcast Episode Draft", 52 * 60_000, 144],
];

function demoRecordings(): PlaudRecording[] {
  return DEMO_RECORDINGS.map(([name, duration, hoursAgo], i) => ({
    id: `demo${i}`,
    name,
    created_at: new Date(Date.now() - hoursAgo * 3_600_000).toISOString(),
    duration,
  }));
}

export const PAGE_SIZE = 100;

export async function listRecordings(page: number): Promise<PlaudRecording[]> {
  if (existsSync(DEMO_FLAG)) return page === 1 ? demoRecordings() : [];
  const token = await getToken();
  const res = await fetch(`${API_BASE}/open/third-party/files/?page=${page}&page_size=${PAGE_SIZE}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status === 401 || res.status === 403) throw new NotLoggedInError();
  if (!res.ok) throw new Error(`Plaud API error: ${res.status}`);
  const data = (await res.json()) as { data?: PlaudRecording[] };
  return data.data ?? [];
}
