import { getPreferenceValues, Icon, showToast, Toast } from "@raycast/api";

import { execFileSync } from "child_process";
import { existsSync } from "fs";

import { Category, CategoryName, Item, User } from "./types";
import { useExec } from "@raycast/utils";

export type ActionID = string;

const preferences = getPreferenceValues();

export const CLI_PATH =
  preferences.cliPath || ["/usr/local/bin/op", "/opt/homebrew/bin/op"].find((path) => existsSync(path));

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
  if (CLI_PATH) {
    const stdout = execFileSync(CLI_PATH, args, { maxBuffer: 4096 * 1024 });
    return stdout.toString();
  }
  throw Error("1Password CLI is not found!");
}

export const handleErrors = (stderr: string) => {
  if (stderr.includes("no such host"))
    throw new ConnectionError("No connection to 1Password.", "Verify Your Internet Connection.");
  if (stderr.includes("could not get item") || stderr.includes("isn't an item"))
    throw new NotFoundError("Item not found on 1password.", "Check it on your 1Password app.");
  if (stderr.includes("ENOENT")) throw new CommandLineMissingError("1Password CLI not found.");
  if (stderr.includes("does not have a field"))
    throw new ExtensionError(`Item does not contain the field ${stderr.split("does not have a field ")[1].trim()}.`);
};

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
export class ConnectionError extends ExtensionError {}

const useOp = <T = Buffer, U = undefined>(args: string[], callback?: (data: T) => T) =>
  useExec<T, U>(CLI_PATH, [...args, "--format=json"], {
    parseOutput: ({ stdout, stderr, error }) => {
      if (error) handleErrors(error.message);
      if (stderr) handleErrors(stderr);
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

export const usePasswords = () =>
  useOp<Item[], ExtensionError>(["item", "list", "--long"], (data) =>
    data.sort((a, b) => a.title.localeCompare(b.title))
  );
export const useCategories = () =>
  useOp<Category[], ExtensionError>(["item", "template", "list"], (data) =>
    data.sort((a, b) => a.name.localeCompare(b.name))
  );

export const useAccount = () => useOp<User, ExtensionError>(["whoami"]);
export const useAccounts = () => useOp<User[], ExtensionError>(["account", "list"]);

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
  return word[0].toUpperCase() + word.substr(1).toLowerCase();
}
