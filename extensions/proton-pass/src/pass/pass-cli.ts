import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { getPreferenceValues } from "@raycast/api";
import type { ItemDetails, ItemReference, ItemSummary } from "../items/item";
import { findRunnableCli, getCliCandidates } from "./cli-executable";
import { findCreatedVault, getCommandTimeout, isTimeoutError, isVaultCreatedDespiteResponseError } from "./cli-process";

const execFileAsync = promisify(execFile);

export type Vault = { name: string; vaultId: string; shareId: string };
export type SessionStatus =
  | { state: "ready" }
  | { state: "not_installed"; diagnostics: string }
  | { state: "not_authenticated" }
  | { state: "error"; message: string };

export class PassCliError extends Error {}
export class PassCliNotFoundError extends PassCliError {
  constructor(public readonly candidates: string[]) {
    super("Proton Pass CLI is not installed or could not be found.");
  }
}

let cachedCliExecutable: string | undefined;

async function getCliExecutable() {
  if (cachedCliExecutable) return cachedCliExecutable;
  const { cliPath } = getPreferenceValues<Preferences>();
  const candidates = getCliCandidates(process.platform, process.env, undefined, cliPath);
  const executable = await findRunnableCli(candidates, async (candidate) => {
    await execFileAsync(candidate, ["--version"], {
      timeout: getCommandTimeout(["--version"]),
      windowsHide: true,
    });
  });
  if (!executable) throw new PassCliNotFoundError(candidates);
  cachedCliExecutable = executable;
  return cachedCliExecutable;
}

async function run(args: string[]) {
  const executable = await getCliExecutable();
  try {
    const result = await execFileAsync(executable, args, {
      timeout: getCommandTimeout(args),
      maxBuffer: 4 * 1024 * 1024,
      windowsHide: true,
    });
    return result.stdout.trim();
  } catch (error: unknown) {
    const processError = error as {
      code?: string;
      killed?: boolean;
      signal?: string | null;
      stderr?: string;
      stdout?: string;
      message?: string;
    };
    const message = String(
      processError.stderr || processError.stdout || processError.message || "Proton Pass CLI failed",
    );
    if (processError.code === "ENOENT") {
      cachedCliExecutable = undefined;
      throw new PassCliNotFoundError(getCliCandidates());
    }
    if (isTimeoutError(processError)) {
      throw new PassCliError("Proton Pass CLI timed out while loading items. Please try again.");
    }
    if (/not logged|not authenticated|login required|session/i.test(message))
      throw new PassCliError("Proton Pass CLI session is not authenticated.");
    throw new PassCliError(message.replace(/\s+/g, " ").trim());
  }
}

async function json<T>(args: string[]): Promise<T> {
  const output = await run([...args, "--output", "json"]);
  try {
    return JSON.parse(output) as T;
  } catch {
    throw new PassCliError("Proton Pass CLI returned invalid JSON.");
  }
}

export async function getSessionStatus(): Promise<SessionStatus> {
  try {
    await run(["--version"]);
    await listVaults();
    return { state: "ready" };
  } catch (error) {
    if (error instanceof PassCliNotFoundError) {
      return { state: "not_installed", diagnostics: `Checked:\n${error.candidates.join("\n")}` };
    }
    const message = errorMessage(error);
    if (/not authenticated|session/i.test(message)) return { state: "not_authenticated" };
    return { state: "error", message };
  }
}

export async function listVaults() {
  const response = await json<unknown>(["vault", "list"]);
  const vaults = objectArray(response, "vaults");
  return vaults.flatMap((vault) => {
    const name = stringField(vault, "name");
    const vaultId = stringField(vault, "vault_id");
    const shareId = stringField(vault, "share_id");
    return name && vaultId && shareId ? [{ name, vaultId, shareId }] : [];
  });
}

export async function listItems(vaults: Vault[]): Promise<ItemSummary[]> {
  const results = await Promise.all(
    vaults.map(async (vault) => {
      const response = await json<unknown>(["item", "list", "--share-id", vault.shareId]);
      return objectArray(response, "items")
        .filter((item) => stringField(item, "item_type") === "login" || stringField(item, "item_type") === "alias")
        .flatMap((item) => {
          const itemId = stringField(item, "id");
          const title = stringField(item, "title");
          const type = stringField(item, "item_type") as "login" | "alias";
          if (!itemId || !title) return [];
          return [
            {
              itemId,
              shareId: stringField(item, "share_id") || vault.shareId,
              vaultName: vault.name,
              title,
              type,
              modifyTime: stringField(item, "modify_time"),
            },
          ];
        });
    }),
  );
  return results.flat().sort((a, b) => a.title.localeCompare(b.title));
}

export async function viewItem(item: ItemSummary): Promise<ItemDetails> {
  const data = await json<unknown>(["item", "view", "--share-id", item.shareId, "--item-id", item.itemId]);
  if (item.type === "alias") {
    return {
      type: "alias",
      shareId: item.shareId,
      itemId: item.itemId,
      title: findField(data, "title") || item.title,
      email: findField(data, "email"),
      note: findField(data, "note"),
      urls: [],
      hasTotp: false,
    };
  }
  return {
    type: "login",
    shareId: item.shareId,
    itemId: item.itemId,
    title: findField(data, "title") || item.title,
    username: findField(data, "username"),
    email: findField(data, "email"),
    password: findField(data, "password"),
    urls: findStringArray(data, "urls"),
    note: findField(data, "note"),
    hasTotp: Boolean(findField(data, "totp_uri")),
  };
}

export async function generateTotpCode(item: ItemReference) {
  const output = await run(["item", "totp", "--share-id", item.shareId, "--item-id", item.itemId, "--output", "json"]);
  try {
    const values = Object.values(JSON.parse(output) as Record<string, unknown>);
    const code = values.find((value): value is string => typeof value === "string");
    if (code) return code;
  } catch {
    if (output.trim()) return output.trim();
  }
  throw new PassCliError("This item has no TOTP code.");
}

export async function generatePassword(options?: {
  length?: number;
  numbers?: boolean;
  uppercase?: boolean;
  symbols?: boolean;
}) {
  const args = ["password", "generate", "random"];
  if (options?.length) args.push("--length", String(options.length));
  if (options?.numbers !== undefined) args.push("--numbers", String(options.numbers));
  if (options?.uppercase !== undefined) args.push("--uppercase", String(options.uppercase));
  if (options?.symbols !== undefined) args.push("--symbols", String(options.symbols));
  return run(args);
}

export async function createLogin(input: {
  shareId: string;
  title: string;
  username?: string;
  email?: string;
  password?: string;
  url?: string;
}) {
  const args = ["item", "create", "login", "--share-id", input.shareId, "--title", input.title];
  if (input.username) args.push("--username", input.username);
  if (input.email) args.push("--email", input.email);
  if (input.password) args.push("--password", input.password);
  if (input.url) args.push("--url", input.url);
  const id = await run(args);
  return {
    itemId: id,
    shareId: input.shareId,
    vaultName: "",
    title: input.title,
    type: "login" as const,
  };
}

export async function deleteItem(item: ItemReference) {
  await run(["item", "delete", "--share-id", item.shareId, "--item-id", item.itemId]);
}

export async function createVault(name: string) {
  const before = await listVaults();
  try {
    await run(["vault", "create", "--name", name]);
  } catch (error) {
    if (!(error instanceof PassCliError) || !isVaultCreatedDespiteResponseError(error.message)) throw error;
  }

  for (let attempt = 0; attempt < 3; attempt++) {
    const created = findCreatedVault(before, await listVaults(), name);
    if (created) return created;
    if (attempt < 2) await new Promise((resolve) => setTimeout(resolve, 300));
  }
  throw new PassCliError(`Proton Pass did not create the vault "${name}".`);
}

export async function updateVault(vault: Vault, name: string) {
  await run(["vault", "update", "--share-id", vault.shareId, "--name", name]);
}

export async function deleteVault(vault: Vault) {
  await run(["vault", "delete", "--share-id", vault.shareId]);
}

export async function readField(item: ItemReference, field: string) {
  const args = ["item", field === "totp" ? "totp" : "view", "--share-id", item.shareId, "--item-id", item.itemId];
  if (field !== "totp") args.push("--field", field);
  const output = await run([...args, "--output", "json"]);
  let value = output;
  try {
    const parsed = JSON.parse(output) as Record<string, unknown>;
    value = findField(parsed, field) ?? output;
  } catch {
    // Field commands can return plain text, which is the value we want.
  }
  if (!value || !String(value).trim()) throw new PassCliError(`Field "${field}" is empty.`);
  return String(value).trim();
}

function findField(value: unknown, field: string): string | undefined {
  if (!value || typeof value !== "object") return undefined;
  for (const [key, child] of Object.entries(value)) {
    if (key.toLowerCase() === field.toLowerCase() && typeof child === "string") return child;
    const nested = findField(child, field);
    if (nested) return nested;
  }
  return undefined;
}

function objectArray(value: unknown, field: string): Record<string, unknown>[] {
  if (!value || typeof value !== "object") throw new PassCliError("Proton Pass CLI returned an invalid response.");
  const entries = (value as Record<string, unknown>)[field];
  if (!Array.isArray(entries)) throw new PassCliError("Proton Pass CLI returned an invalid response.");
  return entries.filter((entry): entry is Record<string, unknown> => Boolean(entry) && typeof entry === "object");
}

function stringField(value: Record<string, unknown>, field: string) {
  const result = value[field];
  return typeof result === "string" ? result : undefined;
}

function findStringArray(value: unknown, field: string): string[] {
  if (!value || typeof value !== "object") return [];
  for (const [key, child] of Object.entries(value)) {
    if (key.toLowerCase() === field.toLowerCase() && Array.isArray(child)) {
      return child.filter((entry): entry is string => typeof entry === "string");
    }
    const nested = findStringArray(child, field);
    if (nested.length) return nested;
  }
  return [];
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}
