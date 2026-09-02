import { normalizeItem, normalizeItemDetail, normalizeVault } from "../pass-cli-normalize";
import { Item, ItemDetail, PassCliError, PasswordOptions, Vault } from "../types";
import { CommandDescriptor, ExecCliOptions, execCli, normalizeCliExecutionError } from "./exec";

export function passwordArgs(options: PasswordOptions): string[] {
  if (options.type === "random") {
    const args = ["password", "generate", "random"];
    if (options.length !== undefined) args.push("--length", String(options.length));
    if (options.includeNumbers !== undefined) args.push("--numbers", String(options.includeNumbers));
    if (options.includeUppercase !== undefined) args.push("--uppercase", String(options.includeUppercase));
    if (options.includeSymbols !== undefined) args.push("--symbols", String(options.includeSymbols));
    return args;
  }

  const args = ["password", "generate", "passphrase"];
  if (options.words !== undefined) args.push("--count", String(options.words));
  if (options.separator !== undefined) args.push("--separator", options.separator);
  if (options.capitalize !== undefined) args.push("--capitalise", String(options.capitalize));
  if (options.includeNumbers !== undefined) args.push("--numbers", String(options.includeNumbers));
  return args;
}

export function authCheckArgs(): string[] {
  return ["info"];
}

export function vaultListArgs(): string[] {
  return ["vault", "list", "--output", "json"];
}

export function itemListArgs(shareId: string): string[] {
  return ["item", "list", "--share-id", shareId, "--output", "json", "--show-secrets"];
}

export function itemViewArgs(shareId: string, itemId: string): string[] {
  return ["item", "view", "--share-id", shareId, "--item-id", itemId, "--output", "json"];
}

export function itemTotpArgs(shareId: string, itemId: string): string[] {
  return ["item", "totp", "--share-id", shareId, "--item-id", itemId, "--output", "json"];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parseJson(text: string, context: string): unknown {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new PassCliError(
      `Unexpected ${context} output from pass-cli. Please update pass-cli and try again.`,
      "invalid_output",
    );
  }
}

function unwrapItemResponse(data: unknown): unknown {
  if (!isRecord(data)) return data;
  const wrapperKeys = ["item", "data", "result", "response", "payload"];
  for (const key of wrapperKeys) {
    if (!isRecord(data[key])) continue;
    const inner = data[key] as Record<string, unknown>;
    for (const innerKey of wrapperKeys) {
      if (isRecord(inner[innerKey])) return inner[innerKey];
    }
    return inner;
  }
  return data;
}

function trimOrUndefined(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

export interface PassCliAdapter {
  generatePassword(options: PasswordOptions): Promise<string>;
  checkAuth(): Promise<boolean>;
  listVaults(): Promise<Vault[]>;
  listItems(shareId: string, vaultName: string): Promise<Item[]>;
  getItem(shareId: string, itemId: string): Promise<ItemDetail>;
  getTotpCodes(shareId: string, itemId: string): Promise<Record<string, string>>;
}

export function createPassCliAdapter(command: CommandDescriptor, execOptions: ExecCliOptions = {}): PassCliAdapter {
  async function run(args: readonly string[]): Promise<string> {
    try {
      const { stdout } = await execCli(command, args, execOptions);
      return stdout.trim();
    } catch (error) {
      throw normalizeCliExecutionError(error, command.file);
    }
  }

  return {
    generatePassword: async (options) => run(passwordArgs(options)),
    checkAuth: async () => {
      try {
        await run(authCheckArgs());
        return true;
      } catch (error) {
        if (error instanceof PassCliError && error.type === "not_authenticated") return false;
        throw error;
      }
    },
    listVaults: async () => {
      const data = parseJson(await run(vaultListArgs()), "vault list");
      const rawVaults = Array.isArray(data) ? data : isRecord(data) ? data.vaults : undefined;
      if (!Array.isArray(rawVaults)) {
        throw new PassCliError("Unexpected vault list output from pass-cli.", "invalid_output");
      }
      return rawVaults.map(normalizeVault);
    },
    listItems: async (shareId, vaultName) => {
      const data = parseJson(await run(itemListArgs(shareId)), "item list");
      const rawItems = Array.isArray(data) ? data : isRecord(data) ? data.items : undefined;
      if (!Array.isArray(rawItems)) {
        throw new PassCliError("Unexpected item list output from pass-cli.", "invalid_output");
      }
      return rawItems
        .filter(
          (item): item is Record<string, unknown> =>
            isRecord(item) && trimOrUndefined(item.state)?.toLowerCase() !== "trashed",
        )
        .map((item) => normalizeItem(item, vaultName, shareId));
    },
    getItem: async (shareId, itemId) => {
      const data = parseJson(await run(itemViewArgs(shareId, itemId)), "item view");
      return normalizeItemDetail(unwrapItemResponse(data), undefined, shareId);
    },
    getTotpCodes: async (shareId, itemId) => {
      const data = parseJson(await run(itemTotpArgs(shareId, itemId)), "item totp");
      const raw = isRecord(data) && isRecord(data.totps) ? data.totps : data;
      if (!isRecord(raw)) {
        throw new PassCliError("Unexpected TOTP output from pass-cli.", "invalid_output");
      }
      return Object.fromEntries(
        Object.entries(raw)
          .map(([key, value]) => [key, trimOrUndefined(value)] as const)
          .filter((entry): entry is readonly [string, string] => Boolean(entry[1])),
      );
    },
  };
}
