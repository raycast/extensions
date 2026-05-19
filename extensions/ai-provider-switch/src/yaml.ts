import { getPreferenceValues } from "@raycast/api";
import * as fs from "fs";
import * as path from "path";
import * as yaml from "js-yaml";
import { ProvidersConfig } from "./types";
import { DEFAULT_PROVIDERS_PATH } from "./constants";

export class ProvidersFileChangedError extends Error {
  constructor() {
    super(
      "providers.yaml changed outside Raycast. Reload before saving or confirm overwrite.",
    );
    this.name = "ProvidersFileChangedError";
  }
}

interface WriteProvidersOptions {
  expectedMtimeMs?: number;
  force?: boolean;
}

const DEFAULT_PROVIDERS_FILE_MODE = 0o600;

function getFileMode(filePath: string): number {
  return fs.existsSync(filePath)
    ? fs.statSync(filePath).mode & 0o777
    : DEFAULT_PROVIDERS_FILE_MODE;
}

function expandHome(filePath: string): string {
  if (filePath.startsWith("~/")) {
    return path.join(process.env.HOME || "", filePath.slice(2));
  }
  return filePath;
}

export function getProvidersPath(): string {
  const prefs = getPreferenceValues<Preferences>();
  const customPath = prefs.providersYamlPath?.trim();
  return expandHome(customPath || DEFAULT_PROVIDERS_PATH);
}

export function readProviders(): ProvidersConfig {
  const filePath = getProvidersPath();

  if (!fs.existsSync(filePath)) {
    return { providers: [] };
  }

  const content = fs.readFileSync(filePath, "utf-8");
  const parsed = yaml.load(content) as ProvidersConfig | null;

  if (!parsed || !parsed.providers) {
    return { providers: [] };
  }

  return parsed;
}

export function getProvidersMtimeMs(): number | undefined {
  const filePath = getProvidersPath();
  if (!fs.existsSync(filePath)) return undefined;
  return fs.statSync(filePath).mtimeMs;
}

export function getProvidersBackupPath(): string {
  return path.join(path.dirname(getProvidersPath()), ".providers.yaml.bak");
}

export function hasProvidersBackup(): boolean {
  return fs.existsSync(getProvidersBackupPath());
}

function backupFile(filePath: string): void {
  if (fs.existsSync(filePath)) {
    const backupPath = getProvidersBackupPath();
    fs.copyFileSync(filePath, backupPath);
    fs.chmodSync(backupPath, getFileMode(filePath));
  }
}

function assertUnchanged(filePath: string, expectedMtimeMs?: number): void {
  const currentMtimeMs = fs.existsSync(filePath)
    ? fs.statSync(filePath).mtimeMs
    : undefined;
  if (currentMtimeMs !== expectedMtimeMs) {
    throw new ProvidersFileChangedError();
  }
}

export function writeProviders(
  config: ProvidersConfig,
  options: WriteProvidersOptions = {},
): number | undefined {
  const filePath = getProvidersPath();
  const dir = path.dirname(filePath);
  const fileMode = getFileMode(filePath);

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  if (!options.force && "expectedMtimeMs" in options) {
    assertUnchanged(filePath, options.expectedMtimeMs);
  }

  backupFile(filePath);

  const content = yaml.dump(config, {
    indent: 2,
    lineWidth: -1,
    noRefs: true,
    sortKeys: false,
  });

  const tempPath = path.join(
    dir,
    `.${path.basename(filePath)}.${process.pid}.${Date.now()}.tmp`,
  );

  try {
    fs.writeFileSync(tempPath, content, { encoding: "utf-8", mode: fileMode });
    fs.chmodSync(tempPath, fileMode);
    fs.renameSync(tempPath, filePath);
  } finally {
    if (fs.existsSync(tempPath)) {
      fs.unlinkSync(tempPath);
    }
  }

  return getProvidersMtimeMs();
}

export function restoreProvidersBackup(): ProvidersConfig {
  const filePath = getProvidersPath();
  const backupPath = getProvidersBackupPath();

  if (!fs.existsSync(backupPath)) {
    throw new Error("No providers.yaml backup found");
  }

  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const tempPath = path.join(
    dir,
    `.${path.basename(filePath)}.restore.${process.pid}.${Date.now()}.tmp`,
  );
  try {
    const backupMode = getFileMode(backupPath);
    fs.copyFileSync(backupPath, tempPath);
    fs.chmodSync(tempPath, backupMode);
    fs.renameSync(tempPath, filePath);
  } finally {
    if (fs.existsSync(tempPath)) {
      fs.unlinkSync(tempPath);
    }
  }

  return readProviders();
}
