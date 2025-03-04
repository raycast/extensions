import { getPreferenceValues, Icon, showToast, Toast } from "@raycast/api";
import { execSync } from "node:child_process";

import { execFileSync } from "child_process";
import { existsSync } from "fs";

import { Category, CategoryName, Item, User, Vault } from "./types";
import { useExec } from "@raycast/utils";

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

export class NotFoundError extends ExtensionError {}
export class CommandLineMissingError extends ExtensionError {}
export class ZshMissingError extends ExtensionError {}
export class ConnectionError extends ExtensionError {}

export const getCliPath = () => {
  const cliPath = [preferences.cliPath, "/usr/local/bin/op", "/opt/homebrew/bin/op"]
    .filter(Boolean)
    .find((path) => (path ? existsSync(path) : false));

  if (!cliPath) {
    throw new CommandLineMissingError("1Password CLI is not found. Please set the path in the extension preferences.");
  }
  return cliPath;
};

export const ZSH_PATH = [preferences.zshPath, "/bin/zsh"].find((path) => existsSync(path));

export const errorRegex = new RegExp(/\[\w+\]\s+\d{4}\/\d{2}\/\d{2}\s+\d{2}:\d{2}:\d{2}\s+(.*)$/m);

export function capitalizeWords(str: string): string {
  return str.replace(/\b\w/g, (char: string) => char.toUpperCase());
}

export function hrefToOpenInBrowser(item: Item): string | undefined {
  if (item.category === "LOGIN") {
    return item.urls?.find((url) => url.primary)?.href;
  } else {
    return undefined;
  }
}

export function actionsForItem(item: Item): ActionID[] {
  // all actions in the default order
  const defaultActions: ActionID[] = [
    "open-in-1password",
    "open-in-browser",
    "copy-username",
    "copy-password",
    "copy-one-time-password",
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
      return deduplicatedActions.filter((action) => action !== "copy-username");
    default:
      return ["open-in-1password"];
  }
}

export function op(args: string[]) {
  const cliPath = getCliPath();
  if (cliPath) {
    const stdout = execFileSync(cliPath, args, { maxBuffer: 4096 * 1024 });
    return stdout.toString();
  }
  throw Error("1Password CLI is not found!");
}

export const handleErrors = (stderr: string) => {
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
  if (!ZSH_PATH) {
    return false;
  }
  return true;
};

export const signIn = (account?: string) =>
  execSync(`${getCliPath()} signin ${account ? account : ""}`, { shell: ZSH_PATH });

export const getSignInStatus = () => {
  try {
    execSync(`${getCliPath()} whoami`);
    return true;
  } catch (stderr) {
    return false;
  }
};

export const useOp = <T = Buffer, U = undefined>(args: string[], callback?: (data: T) => T) => {
  return useExec<T, U>(getCliPath(), [...args, "--format=json"], {
    parseOutput: ({ stdout, stderr, error, exitCode }) => {
      if (error) handleErrors(error.message);
      if (stderr) handleErrors(stderr);
      if (exitCode != 0) handleErrors(stdout);
      if (callback) return callback(JSON.parse(stdout));
      return JSON.parse(stdout);
    },
    onError: async (e) => {
      await showToast({
        style: Toast.Style.Failure,
        title: e.message,
      });
    },
  });
};

export const usePasswords2 = ({
  flags = [],
  account,
  execute = true,
}: {
  flags?: string[];
  account: string;
  execute: boolean;
}) =>
  useExec<Item[], ExtensionError>(
    getCliPath(),
    ["--account", account, "items", "list", "--long", "--format=json", ...flags],
    {
      parseOutput: ({ stdout, stderr, error, exitCode }) => {
        if (error) handleErrors(error.message);
        if (stderr) handleErrors(stderr);
        if (exitCode != 0) handleErrors(stdout);
        const items = JSON.parse(stdout) as Item[];
        return items.sort((a, b) => {
          if (a.favorite && !b.favorite) {
            return -1;
          } else if (!a.favorite && b.favorite) {
            return 1;
          } else {
            return a.title.localeCompare(b.title);
          }
        });
      },
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
  useOp<Item[], ExtensionError>(["items", "list", "--long", ...flags], (data) =>
    data.sort((a, b) => a.title.localeCompare(b.title)),
  );

export const useVaults = () =>
  useOp<Vault[], ExtensionError>(["vault", "list"], (data) => data.sort((a, b) => a.name.localeCompare(b.name)));

export const useCategories = () =>
  useOp<Category[], ExtensionError>(["item", "template", "list"], (data) =>
    data.sort((a, b) => a.name.localeCompare(b.name)),
  );

export const useAccount = () => useOp<User, ExtensionError>(["whoami"]);

export const useAccounts = <T = User[], U = ExtensionError>(execute = true) =>
  useExec<T, U>(getCliPath(), ["account", "list", "--format=json"], {
    parseOutput: ({ stdout, stderr, error, exitCode }) => {
      if (error) handleErrors(error.message);
      if (stderr) handleErrors(stderr);
      if (exitCode != 0) handleErrors(stdout);
      return JSON.parse(stdout);
    },
    onError: async (e) => {
      await showToast({
        style: Toast.Style.Failure,
        title: e.message,
      });
    },
    execute: execute,
  });

export function getCategoryIcon(category: CategoryName) {
  switch (category) {
    case "API_CREDENTIAL":
      return Icon.Code;
    case "CREDIT_CARD":
      return Icon.CreditCard;
    case "CRYPTO_WALLET":
      return Icon.Crypto;
    case "BANK_ACCOUNT":
    case "CUSTOM":
      return Icon.Wallet;
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
    case "SOCIAL_SECURITY_NUMBER":
      return Icon.Shield;
    case "SOFTWARE_LICENSE":
      return Icon.CodeBlock;
    case "SERVER":
    case "SSH_KEY":
      return Icon.Terminal;
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
