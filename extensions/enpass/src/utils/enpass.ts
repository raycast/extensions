import { execa } from "execa";
import { Clipboard, Toast, getPreferenceValues, showToast } from "@raycast/api";
import { EnpassEntry, EnpassSortMode } from "../types";
import path from "path";

const DEFAULT_CLI_PATH = "/opt/homebrew/bin/enpass-cli";

function getCliPath(preferences: Preferences): string {
  return preferences.cliPath || DEFAULT_CLI_PATH;
}

function getVaultPath(vaultPath?: string): string {
  if (!vaultPath) {
    return "";
  }
  if (vaultPath.endsWith(".enpassdb")) {
    return path.dirname(vaultPath);
  }
  return vaultPath;
}

function normalizeEntries(data: unknown): EnpassEntry[] {
  if (Array.isArray(data)) {
    return data.filter((entry): entry is EnpassEntry =>
      Boolean(entry && typeof entry === "object" && "title" in entry),
    );
  }
  if (data && typeof data === "object" && "title" in data) {
    return [data as EnpassEntry];
  }
  return [];
}

function parseJsonOutput(output: string): unknown {
  const jsonStart = output.search(/[[{]/);
  if (jsonStart === -1) {
    throw new Error("No JSON found in Enpass CLI output");
  }
  return JSON.parse(output.substring(jsonStart));
}

async function runCliCommand(
  cliPath: string,
  args: string[],
  password?: string,
): Promise<string> {
  if (!password) {
    const result = await execa(cliPath, args, { reject: false });

    if (result.exitCode !== 0) {
      throw new Error(
        result.stderr ||
          result.stdout ||
          `Enpass CLI failed with exit code ${result.exitCode}`,
      );
    }

    return result.stdout;
  }

  const wrapperPath = path.join(__dirname, "../scripts/enpass_wrapper.exp");
  const result = await execa(
    "expect",
    [wrapperPath, cliPath || DEFAULT_CLI_PATH, ...args],
    {
      env: {
        ENPASS_MASTER_PASSWORD: password,
      },
      reject: false,
    },
  );

  if (result.exitCode !== 0) {
    throw new Error(
      result.stderr ||
        result.stdout ||
        `Enpass CLI failed with exit code ${result.exitCode}`,
    );
  }

  return result.stdout;
}

function buildBaseArgs(preferences: Preferences): string[] {
  const vaultPath = getVaultPath(preferences.vaultPath);
  const args: string[] = [];
  if (vaultPath) {
    args.push("-vault", vaultPath);
  }
  if (preferences.keyfilePath) {
    args.push("-keyfile", preferences.keyfilePath);
  }
  return args;
}

export function getDisplayLogin(entry: EnpassEntry): string {
  return entry.login || entry.username || "";
}

export function getEntryUrl(entry: EnpassEntry): string | undefined {
  if (entry.url) {
    return entry.url;
  }

  return entry.fields?.find((field) => {
    const label = field.label?.toLowerCase() ?? "";
    const type = field.type?.toLowerCase() ?? "";
    const value = field.value ?? "";
    return (
      value.startsWith("http") ||
      label.includes("url") ||
      label.includes("website") ||
      type.includes("url")
    );
  })?.value;
}

function getCliSort(
  sortMode?: EnpassSortMode,
): "updated" | "created" | "used" | "usage" | undefined {
  if (
    sortMode === "updated" ||
    sortMode === "created" ||
    sortMode === "used" ||
    sortMode === "usage"
  ) {
    return sortMode;
  }
  return undefined;
}

export async function listEntries(
  pin?: string,
  sortMode?: EnpassSortMode,
): Promise<EnpassEntry[]> {
  const preferences = getPreferenceValues<Preferences>();
  const cliSort = getCliSort(sortMode);
  const args = cliSort
    ? [...buildBaseArgs(preferences), "-json", `-sort=${cliSort}`, "list", ""]
    : [...buildBaseArgs(preferences), "-json", "-details", "search", ""];
  const output = await runCliCommand(getCliPath(preferences), args, pin);
  return normalizeEntries(parseJsonOutput(output)).filter(
    (entry) => !entry.trashed,
  );
}

export async function getEntryDetails(
  entry: EnpassEntry,
  pin?: string,
): Promise<EnpassEntry> {
  const preferences = getPreferenceValues<Preferences>();
  const args = [...buildBaseArgs(preferences), "-json", "show", entry.title];
  const output = await runCliCommand(getCliPath(preferences), args, pin);
  const matches = normalizeEntries(parseJsonOutput(output));
  const login = getDisplayLogin(entry);
  const exactMatch =
    matches.find(
      (candidate) =>
        candidate.title === entry.title &&
        getDisplayLogin(candidate) === login &&
        (candidate.label ?? "") === (entry.label ?? "") &&
        (candidate.category ?? "") === (entry.category ?? ""),
    ) ??
    matches.find(
      (candidate) =>
        candidate.title === entry.title && getDisplayLogin(candidate) === login,
    ) ??
    matches[0];

  if (!exactMatch) {
    throw new Error("Credential not found");
  }

  return {
    ...entry,
    ...exactMatch,
    uuid: entry.uuid,
  };
}

export async function copyEntryField(
  label: string,
  entry: EnpassEntry,
  field: "password" | "login",
  pin?: string,
) {
  const detail =
    field === "password" && !entry.password
      ? await getEntryDetails(entry, pin)
      : entry;
  const value =
    field === "password" ? detail.password : getDisplayLogin(detail);

  await copyValue(label, value, field === "password");
}

export async function pasteEntryField(
  label: string,
  entry: EnpassEntry,
  field: "password" | "login",
  pin?: string,
) {
  const detail =
    field === "password" && !entry.password
      ? await getEntryDetails(entry, pin)
      : entry;
  const value =
    field === "password" ? detail.password : getDisplayLogin(detail);

  await pasteValue(label, value, field === "password");
}

export async function pasteValue(
  label: string,
  value?: string,
  concealed = false,
) {
  if (!value) {
    await showToast({ style: Toast.Style.Failure, title: `${label} is empty` });
    return;
  }

  await Clipboard.copy(value, { concealed });
  await Clipboard.paste(value);
  await showToast({ style: Toast.Style.Success, title: `${label} pasted` });
}

export async function copyValue(
  label: string,
  value?: string,
  concealed = false,
) {
  if (!value) {
    await showToast({ style: Toast.Style.Failure, title: `${label} is empty` });
    return;
  }

  await Clipboard.copy(value, { concealed });
  await showToast({ style: Toast.Style.Success, title: `${label} copied` });
}
