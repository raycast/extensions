import { getPreferenceValues, Icon, showToast, Toast } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { execFile, execFileSync, execSync, type ExecFileSyncOptions } from "node:child_process";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { promisify } from "node:util";

import { Category, CategoryName, Item, User, Vault } from "./types";

export const isWindows = process.platform === "win32";

// Raycast on Windows may not set LOCALAPPDATA/USERPROFILE, which 1Password CLI needs to find the desktop app
export const windowsEnv = isWindows
  ? {
      ...process.env,
      LOCALAPPDATA: process.env.LOCALAPPDATA || join(homedir(), "AppData", "Local"),
      USERPROFILE: process.env.USERPROFILE || homedir(),
    }
  : undefined;

export type ActionID = string;

const preferences = getPreferenceValues<ExtensionPreferences>();

export class ExtensionError extends Error {
  public title: string;
  constructor(title: string, message?: string) {
    if (!message) message = title;
    super(message);
    this.title = title;
  }
}
export class CommandLineMissingError extends ExtensionError {}
export class ConnectionError extends ExtensionError {}
export class NotFoundError extends ExtensionError {}
export class ZshMissingError extends ExtensionError {}
export const getCliPath = () => {
  const defaultPaths = isWindows
    ? [
        "C:\\Program Files\\1Password CLI\\op.exe",
        join(homedir(), "AppData", "Local", "Microsoft", "WinGet", "Links", "op.exe"),
      ]
    : ["/usr/local/bin/op", "/opt/homebrew/bin/op"];

  const cliPath = [preferences.cliPath, ...defaultPaths]
    .filter(Boolean)
    .find((path) => (path ? existsSync(path) : false));

  if (!cliPath) {
    throw new CommandLineMissingError("1Password CLI is not found. Please set the path in the extension preferences.");
  }

  return cliPath;
};
export const ZSH_PATH = isWindows ? undefined : [preferences.zshPath, "/bin/zsh"].find((path) => existsSync(path));
const OP_LOG_PREFIX = /\[\w+\]\s+\d{4}\/\d{2}\/\d{2}\s+\d{2}:\d{2}:\d{2}\s+/;
const OP_LOG_PREFIX_GLOBAL = new RegExp(OP_LOG_PREFIX, "g");

// `op` puts the cause on its first log line and the steps to fix it on the ones after, so keep
// everything from that line onwards instead of just the first match.
export const extractOpErrorMessage = (message: string): string => {
  const start = message.search(OP_LOG_PREFIX);
  const body = start === -1 ? message : message.slice(start);

  return body.replace(OP_LOG_PREFIX_GLOBAL, "").trim();
};
export function actionsForItem(item: Item): ActionID[] {
  // all actions in the default order
  const defaultActions: ActionID[] = [
    "open-in-1password",
    "open-in-browser",
    "copy-username",
    "copy-password",
    "copy-one-time-password",
    "paste-username",
    "paste-password",
    "paste-one-time-password",
    "share-item",
    "switch-account",
  ];
  // prioritize primary and secondary actions, then append the rest and remove duplicates
  const deduplicatedActions = [
    ...new Set<ActionID>([preferences.primaryAction, preferences.secondaryAction, ...defaultActions]),
  ];

  switch (item.category) {
    case "LOGIN":
      return deduplicatedActions;
    case "PASSWORD":
      return deduplicatedActions.filter((action) => action !== "copy-username" && action !== "paste-username");

    default:
      return ["open-in-1password"];
  }
}
export function capitalizeWords(str: string): string {
  return str.replace(/\b\w/g, (char: string) => char.toUpperCase());
}
export function hrefToOpenInBrowser(item: Item): string | undefined {
  if (item.category === "LOGIN") {
    return item.urls?.find((url) => url.primary)?.href;
  }

  return undefined;
}
const execFileAsync = promisify(execFile);

// After an `op` process disconnects, the Windows 1Password app briefly has no pipe listener
// for the next CLI connection. Any `op` launched inside that window fails instantly with
// "cannot connect to 1Password app" even though the app is running. The extension chains
// `op` calls back-to-back, so on Windows connection failures are retried for a short period
// and `op` invocations run one at a time. macOS does not have this race and keeps the
// original fail-fast, concurrent behavior.
const DESKTOP_APP_CONNECTION_ERROR = "cannot connect to 1Password app";
const CONNECTION_RETRY_ATTEMPTS = 6;
const CONNECTION_RETRY_DELAY_MS = 350;
const OP_MAX_BUFFER = 10 * 1024 * 1024;

const isDesktopAppConnectionError = (output: string) => output.includes(DESKTOP_APP_CONNECTION_ERROR);
const getStderr = (error: unknown) => (error as { stderr?: string | Buffer }).stderr?.toString() ?? "";

const sleepSync = (ms: number) => {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
};

function execOpSync(args: string[], options: ExecFileSyncOptions = {}) {
  const cliPath = getCliPath();
  for (let attempt = 1; ; attempt++) {
    try {
      return execFileSync(cliPath, args, {
        maxBuffer: OP_MAX_BUFFER,
        ...(windowsEnv ? { env: windowsEnv } : {}),
        ...options,
      });
    } catch (error) {
      if (!isWindows || attempt >= CONNECTION_RETRY_ATTEMPTS || !isDesktopAppConnectionError(getStderr(error))) {
        throw error;
      }
      sleepSync(CONNECTION_RETRY_DELAY_MS);
    }
  }
}

// Concurrent `op` processes make the connection race above more likely, so run them one at a time.
let opExecutionChain: Promise<unknown> = Promise.resolve();

export function execOp(args: string[]): Promise<string> {
  const run = async () => {
    const cliPath = getCliPath();
    for (let attempt = 1; ; attempt++) {
      try {
        const { stdout, stderr } = await execFileAsync(cliPath, args, {
          maxBuffer: OP_MAX_BUFFER,
          ...(windowsEnv ? { env: windowsEnv } : {}),
        });
        if (stderr) handleErrors(stderr.toString());
        return stdout.toString();
      } catch (error) {
        if (error instanceof ExtensionError) throw error;
        const stderr = getStderr(error);
        if (isWindows && attempt < CONNECTION_RETRY_ATTEMPTS && isDesktopAppConnectionError(stderr)) {
          await delay(CONNECTION_RETRY_DELAY_MS);
          continue;
        }
        handleErrors(stderr || (error instanceof Error ? error.message : String(error)));
      }
    }
  };

  if (!isWindows) {
    return run();
  }

  const result = opExecutionChain.then(run, run);
  opExecutionChain = result.catch(() => undefined);
  return result;
}

export function op(args: string[], options: ExecFileSyncOptions = {}) {
  return execOpSync(args, options).toString();
}
export const handleErrors = (stderr: string): never => {
  if (stderr.includes("no such host")) {
    throw new ConnectionError("No connection to 1Password.", "Verify Your Internet Connection.");
  } else if (stderr.includes("could not get item") || stderr.includes("isn't an item")) {
    throw new NotFoundError("Item not found on 1Password.", "Check it on your 1Password app.");
  } else if (stderr.includes("ENOENT") || stderr.includes("file") || stderr.includes("enoent")) {
    throw new CommandLineMissingError("1Password CLI not found.");
  } else if (stderr.includes("does not have a field")) {
    throw new ExtensionError(`Item does not contain the field ${stderr.split("does not have a field ")[1].trim()}.`);
  } else {
    throw new ExtensionError(stderr);
  }
};
export const checkZsh = () => {
  if (isWindows) return true;
  if (!ZSH_PATH) {
    return false;
  }
  return true;
};
export const signIn = (account?: string) => {
  if (isWindows) {
    // Keep stderr piped so desktop-app connection failures are recognized and retried.
    execOpSync(["signin", ...(account ? account.split(" ") : [])], {
      stdio: ["inherit", "inherit", "pipe"],
      timeout: 30000,
    });
  } else {
    execSync(`${getCliPath()} signin ${account ? account : ""}`, { shell: ZSH_PATH });
  }
};
const SIGN_IN_STATUS_TIMEOUT_MS = 30000;

export const getSignInStatus = () => {
  try {
    if (isWindows) {
      execOpSync(["whoami"]);
    } else {
      execSync(`${getCliPath()} whoami`);
    }
    return true;
  } catch {
    // With the 1Password app integration and no `op signin` session, `whoami` reports
    // "account is not signed in" even though delegated sessions work. Probe the app
    // directly before asking the user to sign in. This is not a read-only probe: it
    // establishes the delegated session, which is what later lets `useAccount` resolve
    // through `whoami`. It took 6.1s on macOS when it had to set one up, so the timeout
    // here is only a guard against the app waiting forever on a prompt nobody answers.
    try {
      execOpSync(["account", "get"], { timeout: SIGN_IN_STATUS_TIMEOUT_MS });
      return true;
    } catch {
      return false;
    }
  }
};
export const useOp = <T = Buffer>(args: string[], callback?: (data: T) => T) => {
  return useCachedPromise(
    async (...opArgs: string[]) => {
      const data = JSON.parse(await execOp([...opArgs, "--format=json"])) as T;
      return callback ? callback(data) : data;
    },
    args,
    {
      onError: async (e) => {
        await showToast({
          style: Toast.Style.Failure,
          title: e.message,
        });
      },
    },
  );
};
const itemListFlags = () => (preferences.reduceItemListMemoryUsage ? [] : ["--long"]);

export const usePasswords2 = ({
  account,
  execute = true,
  flags = [],
}: {
  account: string;
  execute: boolean;
  flags?: string[];
}) =>
  useCachedPromise(
    async (...args: string[]) => {
      const items = JSON.parse(await execOp(["--account", ...args, "--format=json"])) as Item[];

      return items.sort((a, b) => {
        if (a.favorite && !b.favorite) {
          return -1;
        } else if (!a.favorite && b.favorite) {
          return 1;
        }

        return a.title.localeCompare(b.title);
      });
    },
    [account, "items", "list", ...itemListFlags(), ...flags],
    {
      execute,
      onError: async (e) => {
        await showToast({
          style: Toast.Style.Failure,
          title: e.message,
        });
      },
    },
  );
export const usePasswords = (flags: string[] = []) =>
  useOp<Item[]>(["items", "list", ...itemListFlags(), ...flags], (data) =>
    data.sort((a, b) => a.title.localeCompare(b.title)),
  );
export const useVaults = () =>
  useOp<Vault[]>(["vault", "list"], (data) => data.sort((a, b) => a.name.localeCompare(b.name)));
export const useCategories = () =>
  useOp<Category[]>(["item", "template", "list"], (data) => data.sort((a, b) => a.name.localeCompare(b.name)));
export const useAccount = () =>
  useCachedPromise(
    async () => {
      try {
        return JSON.parse(await execOp(["whoami", "--format=json"])) as User;
      } catch (error) {
        // With the 1Password app integration and no `op signin` session, `whoami` fails
        // even though delegated sessions work. Resolve the account through the app instead.
        try {
          const account = JSON.parse(await execOp(["account", "get", "--format=json"])) as {
            domain: string;
            id: string;
          };
          return { account_uuid: account.id, email: "", url: `${account.domain}.1password.com`, user_uuid: "" } as User;
        } catch {
          throw error;
        }
      }
    },
    [],
    {
      onError: async (e) => {
        await showToast({
          style: Toast.Style.Failure,
          title: e.message,
        });
      },
    },
  );
export const useAccounts = <T = User[]>(execute = true) =>
  useCachedPromise(async () => JSON.parse(await execOp(["account", "list", "--format=json"])) as T, [], {
    execute,
    onError: async (e) => {
      await showToast({
        style: Toast.Style.Failure,
        title: e.message,
      });
    },
  });
export function getCategoryIcon(category: CategoryName) {
  switch (category) {
    case "API_CREDENTIAL":
      return Icon.Code;
    case "BANK_ACCOUNT":
    case "CUSTOM":
      return Icon.Wallet;
    case "CREDIT_CARD":
      return Icon.CreditCard;
    case "CRYPTO_WALLET":
      return Icon.Crypto;
    case "DATABASE":
      return Icon.HardDrive;
    case "DOCUMENT":
      return Icon.Document;
    case "DRIVER_LICENSE":
      return Icon.Car;
    case "EMAIL_ACCOUNT":
      return Icon.Envelope;
    case "IDENTITY":
      return Icon.Person;
    case "LOGIN":
      return Icon.Fingerprint;
    case "MEDICAL_RECORD":
      return Icon.Heartbeat;
    case "MEMBERSHIP":
      return Icon.StarCircle;
    case "OUTDOOR_LICENSE":
      return Icon.Tree;
    case "PASSPORT":
      return Icon.Globe;
    case "PASSWORD":
      return Icon.Key;
    case "REWARD_PROGRAM":
      return Icon.Gift;
    case "SECURE_NOTE":
      return Icon.Lock;
    case "SERVER":
    case "SSH_KEY":
      return Icon.Terminal;
    case "SOCIAL_SECURITY_NUMBER":
      return Icon.Shield;
    case "SOFTWARE_LICENSE":
      return Icon.CodeBlock;
    case "WIRELESS_ROUTER":
      return Icon.Wifi;

    default:
      return Icon.Key;
  }
}
export function titleCaseWord(word: string) {
  if (!word) return word;
  return word[0].toUpperCase() + word.slice(1).toLowerCase();
}
