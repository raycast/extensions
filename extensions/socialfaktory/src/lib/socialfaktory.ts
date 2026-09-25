import { environment } from "@raycast/api";
import { join } from "node:path";
import {
  MCP_URL,
  accountKey,
  credentials,
  forgetTokens,
  hasFreshCredentials,
  localStore,
  renewAccessToken,
  signInAgain as startOver,
} from "./auth";
import { fileLock } from "./lock";
import { McpClient } from "./mcp";
import { createSession } from "./session";
import type { Brand, PostPage, PostStatus, Wallet } from "./types";
import { abortableSleep } from "./time";
import {
  findSameWrite,
  lastWriteOrMessage,
  loadWrite,
  pollWrite,
  startWrite,
  targetFrom,
  writeForTool,
  type PollOptions,
  type PolledWrite,
  type ToolInput,
  type ToolResult,
  type WriteDependencies,
  type WriteRecord,
  type WriteRequest,
  type WriteTarget,
} from "./writing";

export type { PolledWrite, ToolInput, WriteRecord, WriteRequest, WriteTarget } from "./writing";
export { WRITE_RESERVE_CREDITS } from "./writing";

const BRAND_NAMES_KEY = "brand-names";

const { call, reset } = createSession({
  credentials,
  renew: renewAccessToken,
  forget: forgetTokens,
  connect: (token) =>
    new McpClient({ url: MCP_URL, token, clientName: "socialfaktory-raycast", clientVersion: "1.0.0" }),
});

const writing: WriteDependencies = {
  call,
  now: () => Date.now(),
  sleep: abortableSleep,
  lock: fileLock(join(environment.supportPath, "locks"), { now: () => Date.now(), sleep: abortableSleep }),
  storage: localStore,
  signIn: async () => {
    await credentials();
  },
  account: accountKey,
  sent: new Map(),
};

export async function listBrands(signal?: AbortSignal): Promise<Brand[]> {
  const { brands } = await call<{ brands: Brand[] }>("list_brands", {}, { signal });
  const names = Object.fromEntries(brands.map((brand) => [brand.id, brand.name]));
  await localStore.setItem(BRAND_NAMES_KEY, JSON.stringify(names)).catch(() => undefined);
  return brands;
}

export async function cachedBrandName(brandId: string): Promise<string | undefined> {
  try {
    const names = JSON.parse((await localStore.getItem(BRAND_NAMES_KEY)) ?? "{}") as Record<string, string>;
    return names[brandId];
  } catch {
    return undefined;
  }
}

export function listPosts(
  filter: { brandId?: string; status?: PostStatus; page?: number } = {},
  signal?: AbortSignal,
): Promise<PostPage> {
  return call<PostPage>(
    "list_posts",
    { brand_id: filter.brandId, status: filter.status, page: filter.page },
    { signal },
  );
}

export function getWallet(signal?: AbortSignal): Promise<Wallet> {
  return call<Wallet>("get_wallet", {}, { signal });
}

export async function startWriting(request: WriteRequest, signal?: AbortSignal): Promise<WriteTarget> {
  return targetFrom(await startWrite(writing, request, signal));
}

export function pollWriting(target: WriteTarget, options: PollOptions = {}): Promise<PolledWrite> {
  return pollWrite(writing, target, options);
}

export function lastWrite(): Promise<WriteRecord | undefined> {
  return loadWrite(writing);
}

export function lastWriteForCheck(): Promise<WriteRecord | string> {
  return lastWriteOrMessage(writing);
}

export async function sameWriteWithoutSignIn(input: ToolInput): Promise<WriteRecord | undefined> {
  if (!(await hasFreshCredentials())) return undefined;
  return findSameWrite(writing, input, { signIn: false });
}

export async function signInAgain(): Promise<void> {
  reset();
  await startOver();
  reset();
}

export function writeWithTool(input: ToolInput): Promise<ToolResult> {
  return writeForTool(writing, input);
}
