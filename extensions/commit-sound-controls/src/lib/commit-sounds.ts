import { execFile } from "node:child_process";
import { constants } from "node:fs";
import {
  access,
  chmod,
  copyFile,
  mkdir,
  readFile,
  unlink,
  writeFile,
} from "node:fs/promises";
import { homedir } from "node:os";
import { basename, extname, join } from "node:path";
import { randomUUID } from "node:crypto";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export const supportDirectory = join(homedir(), ".git-commit-sounds");
export const hooksDirectory = join(supportDirectory, "hooks");
export const hookPath = join(hooksDirectory, "post-commit");
export const configPath = join(supportDirectory, "config");
export const soundsDirectory = join(supportDirectory, "sounds");

const supportedAudioExtensions = new Set([
  ".aac",
  ".aiff",
  ".m4a",
  ".mp3",
  ".wav",
]);
const maximumDownloadBytes = 20 * 1024 * 1024;

export type CommitSoundAccount = {
  id: string;
  owner: string;
  soundPath: string;
  source: string;
  volume: number;
  managed: boolean;
};

export type ConnectedGitHubAccount = {
  login: string;
  tokenSlot: string;
};

export type CommitSoundsConfig = {
  enabled: boolean;
  /** The selected login used to prefill new sound rules. */
  connectedGitHubAccount?: string;
  /** OAuth identities stored by Commit Sounds. Sound rules do not require one. */
  connectedGitHubAccounts: ConnectedGitHubAccount[];
  accounts: CommitSoundAccount[];
};

export type InstallationState = {
  config: CommitSoundsConfig;
  hookInstalled: boolean;
  conflictingHookPath?: string;
  missingSoundIds: string[];
};

const hookContents = `#!/bin/sh
# Managed by the Commit Sounds Raycast extension.
config_path="$HOME/.git-commit-sounds/config"

[ -r "$config_path" ] || exit 0
enabled="$(sed -n 's/^enabled=//p' "$config_path" | head -n 1)"
[ "$enabled" = "true" ] || exit 0

remote_url="$(git config --get remote.origin.url 2>/dev/null || true)"
github_owner="$(printf '%s' "$remote_url" | sed -nE 's#.*github\\.com[:/]([^/]+)/.*#\\1#p' | tr '[:upper:]' '[:lower:]')"
[ -n "$github_owner" ] || exit 0

account_count="$(sed -n 's/^account_count=//p' "$config_path" | head -n 1)"
case "$account_count" in ''|*[!0-9]*) exit 0 ;; esac

index=0
while [ "$index" -lt "$account_count" ]; do
  owner="$(sed -n "s/^account_\${index}_owner=//p" "$config_path" | head -n 1 | tr '[:upper:]' '[:lower:]')"
  if [ "$owner" = "$github_owner" ]; then
    sound_file="$(sed -n "s/^account_\${index}_sound=//p" "$config_path" | head -n 1)"
    volume="$(sed -n "s/^account_\${index}_volume=//p" "$config_path" | head -n 1)"
    case "$volume" in ''|*[!0-9.]*|*.*.*) volume=1 ;; esac
    [ -f "$sound_file" ] && afplay -v "$volume" "$sound_file" >/dev/null 2>&1 &
    exit 0
  fi
  index=$((index + 1))
done
`;

function parseKeyValueConfig(contents: string): Map<string, string> {
  return new Map(
    contents
      .split("\n")
      .filter(Boolean)
      .flatMap((line) => {
        const separator = line.indexOf("=");
        return separator > 0
          ? [[line.slice(0, separator), line.slice(separator + 1)] as const]
          : [];
      }),
  );
}

function validVolume(value: string | undefined): number {
  const volume = Number(value);
  return Number.isFinite(volume) && volume >= 0 && volume <= 1 ? volume : 1;
}

function normalizedOwner(value: string): string {
  return value.trim().toLowerCase();
}

function validateConfigValue(value: string): string {
  if (/\r|\n/.test(value)) {
    throw new Error("Audio paths and URLs cannot contain line breaks.");
  }
  return value;
}

function legacyAccounts(values: Map<string, string>): CommitSoundAccount[] {
  const legacy = [
    ["koushik-databrain", values.get("koushik_sound")],
    ["wicolian", values.get("wicolian_sound")],
  ] as const;

  return legacy.flatMap(([owner, soundPath]) =>
    soundPath
      ? [
          {
            id: owner,
            owner,
            soundPath,
            source: "Migrated from the original setup",
            volume: 1,
            managed: false,
          },
        ]
      : [],
  );
}

export async function readConfig(): Promise<CommitSoundsConfig> {
  try {
    const values = parseKeyValueConfig(await readFile(configPath, "utf8"));
    const accountCount = Number(values.get("account_count"));

    if (!Number.isInteger(accountCount) || accountCount < 0) {
      const legacyLogin = values.get("connected_github_account");
      return {
        enabled: values.get("enabled") === "true",
        connectedGitHubAccount: legacyLogin || undefined,
        connectedGitHubAccounts: legacyLogin
          ? [{ login: legacyLogin, tokenSlot: "legacy" }]
          : [],
        accounts: legacyAccounts(values),
      };
    }

    const accounts = Array.from({ length: accountCount }, (_, index) => {
      const owner = values.get(`account_${index}_owner`);
      const soundPath = values.get(`account_${index}_sound`);
      if (!owner || !soundPath) return undefined;
      return {
        id: values.get(`account_${index}_id`) || `${owner}-${index}`,
        owner,
        soundPath,
        source: values.get(`account_${index}_source`) || soundPath,
        volume: validVolume(values.get(`account_${index}_volume`)),
        managed: values.get(`account_${index}_managed`) === "true",
      };
    }).filter((account): account is CommitSoundAccount => Boolean(account));

    const legacyLogin = values.get("connected_github_account");
    const connectedAccountCount = Number(values.get("github_account_count"));
    const connectedGitHubAccounts = Number.isInteger(connectedAccountCount)
      ? Array.from(
          { length: Math.max(0, connectedAccountCount) },
          (_, index) => {
            const login = values.get(`github_account_${index}_login`);
            const tokenSlot = values.get(`github_account_${index}_token_slot`);
            return login && tokenSlot ? { login, tokenSlot } : undefined;
          },
        ).filter((account): account is ConnectedGitHubAccount =>
          Boolean(account),
        )
      : legacyLogin
        ? [{ login: legacyLogin, tokenSlot: "legacy" }]
        : [];

    return {
      enabled: values.get("enabled") === "true",
      connectedGitHubAccount: legacyLogin || undefined,
      connectedGitHubAccounts,
      accounts,
    };
  } catch {
    return { enabled: false, accounts: [], connectedGitHubAccounts: [] };
  }
}

export function serializeConfig(config: CommitSoundsConfig): string {
  const lines = [
    "version=2",
    `enabled=${config.enabled}`,
    `connected_github_account=${config.connectedGitHubAccount || ""}`,
    `github_account_count=${config.connectedGitHubAccounts.length}`,
    `account_count=${config.accounts.length}`,
  ];

  config.connectedGitHubAccounts.forEach((account, index) => {
    lines.push(
      `github_account_${index}_login=${validateConfigValue(account.login)}`,
      `github_account_${index}_token_slot=${validateConfigValue(account.tokenSlot)}`,
    );
  });

  config.accounts.forEach((account, index) => {
    lines.push(
      `account_${index}_id=${validateConfigValue(account.id)}`,
      `account_${index}_owner=${validateConfigValue(account.owner)}`,
      `account_${index}_sound=${validateConfigValue(account.soundPath)}`,
      `account_${index}_source=${validateConfigValue(account.source)}`,
      `account_${index}_volume=${account.volume}`,
      `account_${index}_managed=${account.managed}`,
    );
  });

  return `${lines.join("\n")}\n`;
}

export async function writeConfig(config: CommitSoundsConfig): Promise<void> {
  await mkdir(supportDirectory, { recursive: true, mode: 0o700 });
  await writeFile(configPath, serializeConfig(config), { mode: 0o600 });
  await chmod(configPath, 0o600);
}

type ConfigMutation<T> = {
  config: CommitSoundsConfig;
  result: T;
};

let pendingConfigMutation: Promise<void> = Promise.resolve();

/**
 * Serializes read-modify-write operations so concurrent Raycast actions cannot
 * overwrite each other's latest configuration.
 */
export async function mutateConfig<T>(
  mutation: (
    config: CommitSoundsConfig,
  ) => ConfigMutation<T> | Promise<ConfigMutation<T>>,
): Promise<T> {
  const operation = pendingConfigMutation.then(async () => {
    const current = await readConfig();
    const { config, result } = await mutation(current);
    await writeConfig(config);
    return result;
  });
  pendingConfigMutation = operation.then(
    () => undefined,
    () => undefined,
  );
  return operation;
}

export async function pathExists(path: string): Promise<boolean> {
  try {
    await access(path, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

export async function getGlobalHooksPath(): Promise<string | undefined> {
  try {
    const { stdout } = await execFileAsync("git", [
      "config",
      "--global",
      "--get",
      "core.hooksPath",
    ]);
    return stdout.trim() || undefined;
  } catch {
    return undefined;
  }
}

export async function getState(): Promise<InstallationState> {
  const [config, configuredHooksPath, hookExists] = await Promise.all([
    readConfig(),
    getGlobalHooksPath(),
    pathExists(hookPath),
  ]);
  const soundPresence = await Promise.all(
    config.accounts.map((account) => pathExists(account.soundPath)),
  );

  return {
    config,
    hookInstalled: configuredHooksPath === hooksDirectory && hookExists,
    conflictingHookPath:
      configuredHooksPath && configuredHooksPath !== hooksDirectory
        ? configuredHooksPath
        : undefined,
    missingSoundIds: config.accounts.flatMap((account, index) =>
      soundPresence[index] ? [] : [account.id],
    ),
  };
}

export async function installOrRepairHook(): Promise<void> {
  const configuredHooksPath = await getGlobalHooksPath();
  if (configuredHooksPath && configuredHooksPath !== hooksDirectory) {
    throw new Error(
      `Git already uses a different global hooks path: ${configuredHooksPath}`,
    );
  }

  await mkdir(hooksDirectory, { recursive: true, mode: 0o700 });
  await writeFile(hookPath, hookContents, { mode: 0o755 });
  await chmod(hookPath, 0o755);
  await mkdir(soundsDirectory, { recursive: true, mode: 0o700 });

  if (!(await pathExists(configPath))) {
    await writeConfig({
      enabled: true,
      accounts: [],
      connectedGitHubAccounts: [],
    });
  }

  await execFileAsync("git", [
    "config",
    "--global",
    "core.hooksPath",
    hooksDirectory,
  ]);
}

function validateOwner(owner: string): string {
  const normalized = normalizedOwner(owner);
  if (!/^[a-z\d](?:[a-z\d-]{0,37})$/.test(normalized)) {
    throw new Error("Enter a valid GitHub owner name, without @ or a URL.");
  }
  return normalized;
}

function audioExtension(fileName: string): string {
  const extension = extname(fileName).toLowerCase();
  if (!supportedAudioExtensions.has(extension)) {
    throw new Error("Use an .mp3, .m4a, .wav, .aiff, or .aac audio file.");
  }
  return extension;
}

async function copyAudioFile(
  sourcePath: string,
  owner: string,
): Promise<string> {
  const extension = audioExtension(sourcePath);
  await mkdir(soundsDirectory, { recursive: true, mode: 0o700 });
  const destination = join(
    soundsDirectory,
    `${owner}-${randomUUID()}${extension}`,
  );
  await copyFile(sourcePath, destination, constants.COPYFILE_EXCL);
  await chmod(destination, 0o600);
  return destination;
}

async function downloadAudioFile(url: string, owner: string): Promise<string> {
  const parsedUrl = new URL(url);
  if (parsedUrl.protocol !== "https:" && parsedUrl.protocol !== "http:") {
    throw new Error("Audio links must use http:// or https://.");
  }

  const response = await fetch(parsedUrl, { redirect: "follow" });
  if (!response.ok) {
    throw new Error(`Audio download failed (${response.status}).`);
  }

  const extension = audioExtension(basename(parsedUrl.pathname));
  const length = Number(response.headers.get("content-length"));
  if (Number.isFinite(length) && length > maximumDownloadBytes) {
    throw new Error("Audio files must be 20 MB or smaller.");
  }

  const content = Buffer.from(await response.arrayBuffer());
  if (content.length > maximumDownloadBytes) {
    throw new Error("Audio files must be 20 MB or smaller.");
  }

  await mkdir(soundsDirectory, { recursive: true, mode: 0o700 });
  const destination = join(
    soundsDirectory,
    `${owner}-${randomUUID()}${extension}`,
  );
  await writeFile(destination, content, { mode: 0o600, flag: "wx" });
  return destination;
}

export type SaveAccountInput = {
  id?: string;
  existingAccount?: CommitSoundAccount;
  owner: string;
  audioFile?: string;
  audioUrl?: string;
  volume: number;
};

export async function saveAccount(
  input: SaveAccountInput,
): Promise<CommitSoundAccount> {
  const owner = validateOwner(input.owner);
  const audioFile = input.audioFile?.trim();
  const audioUrl = input.audioUrl?.trim();
  if (Boolean(audioFile) && Boolean(audioUrl)) {
    throw new Error(
      "Choose one audio source: a local file or an HTTPS link, not both.",
    );
  }
  if (!audioFile && !audioUrl && !input.existingAccount) {
    throw new Error("Choose an audio source: a local file or an HTTPS link.");
  }

  const soundPath = audioFile
    ? await copyAudioFile(audioFile, owner)
    : audioUrl
      ? await downloadAudioFile(audioUrl, owner)
      : input.existingAccount?.soundPath;
  if (!soundPath) throw new Error("Could not determine an audio source.");
  return {
    id: input.id || randomUUID(),
    owner,
    soundPath,
    source: audioFile
      ? `Uploaded: ${basename(audioFile)}`
      : audioUrl || input.existingAccount?.source || soundPath,
    volume: Math.min(1, Math.max(0, input.volume)),
    managed:
      audioFile || audioUrl ? true : Boolean(input.existingAccount?.managed),
  };
}

export async function removeManagedAudio(
  account: CommitSoundAccount,
): Promise<void> {
  if (
    !account.managed ||
    !account.soundPath.startsWith(`${soundsDirectory}/`)
  ) {
    return;
  }
  await unlink(account.soundPath).catch(() => undefined);
}

export async function upsertSoundRule(
  account: CommitSoundAccount,
): Promise<void> {
  const replaced = await mutateConfig((config) => {
    const replacedAccounts = config.accounts.filter(
      (item) => item.id === account.id || item.owner === account.owner,
    );
    return {
      config: {
        ...config,
        enabled: true,
        accounts: [
          ...config.accounts.filter(
            (item) => item.id !== account.id && item.owner !== account.owner,
          ),
          account,
        ],
      },
      result: replacedAccounts,
    };
  });

  await Promise.all(
    replaced
      .filter((item) => item.soundPath !== account.soundPath)
      .map(removeManagedAudio),
  );
}

export async function removeSoundRule(accountId: string): Promise<void> {
  const removed = await mutateConfig((config) => {
    const removedAccounts = config.accounts.filter(
      (item) => item.id === accountId,
    );
    return {
      config: {
        ...config,
        accounts: config.accounts.filter((item) => item.id !== accountId),
      },
      result: removedAccounts,
    };
  });
  await Promise.all(removed.map(removeManagedAudio));
}

export async function playSound(path: string, volume: number): Promise<void> {
  if (!(await pathExists(path))) {
    throw new Error(`Could not find ${path}`);
  }
  await execFileAsync("afplay", ["-v", String(volume), path]);
}

export async function setConnectedGitHubAccount(login: string): Promise<void> {
  const normalizedLogin = validateOwner(login);
  await mutateConfig((config) => ({
    config: {
      ...config,
      connectedGitHubAccount: normalizedLogin,
      connectedGitHubAccounts: [
        ...config.connectedGitHubAccounts.filter(
          (account) => account.login !== normalizedLogin,
        ),
        { login: normalizedLogin, tokenSlot: "legacy" },
      ],
    },
    result: undefined,
  }));
}

export async function addConnectedGitHubAccount(
  login: string,
  tokenSlot: string,
): Promise<ConnectedGitHubAccount> {
  const normalizedLogin = validateOwner(login);
  return mutateConfig((config) => {
    const existing = config.connectedGitHubAccounts.find(
      (account) => account.login === normalizedLogin,
    );
    if (existing) {
      return {
        config: { ...config, connectedGitHubAccount: normalizedLogin },
        result: existing,
      };
    }
    const connectedAccount = { login: normalizedLogin, tokenSlot };
    return {
      config: {
        ...config,
        connectedGitHubAccount: normalizedLogin,
        connectedGitHubAccounts: [
          ...config.connectedGitHubAccounts.filter(
            (account) => account.tokenSlot !== tokenSlot,
          ),
          connectedAccount,
        ],
      },
      result: connectedAccount,
    };
  });
}

export async function selectConnectedGitHubAccount(
  login: string,
): Promise<void> {
  const normalizedLogin = validateOwner(login);
  await mutateConfig((config) => {
    if (
      !config.connectedGitHubAccounts.some(
        (account) => account.login === normalizedLogin,
      )
    ) {
      throw new Error("This GitHub account is not connected.");
    }
    return {
      config: { ...config, connectedGitHubAccount: normalizedLogin },
      result: undefined,
    };
  });
}

export async function removeConnectedGitHubAccount(
  login: string,
): Promise<void> {
  const normalizedLogin = validateOwner(login);
  await mutateConfig((config) => {
    const remaining = config.connectedGitHubAccounts.filter(
      (account) => account.login !== normalizedLogin,
    );
    return {
      config: {
        ...config,
        connectedGitHubAccount:
          config.connectedGitHubAccount === normalizedLogin
            ? remaining.at(-1)?.login
            : config.connectedGitHubAccount,
        connectedGitHubAccounts: remaining,
      },
      result: undefined,
    };
  });
}
