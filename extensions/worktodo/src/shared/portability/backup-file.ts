import { randomUUID } from "node:crypto";
import {
  chmodSync,
  closeSync,
  fsyncSync,
  linkSync,
  mkdirSync,
  openSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { basename, dirname, isAbsolute, join } from "node:path";
import { PortabilityError } from "./backup-contract";

export const WORKTODO_MAX_BACKUP_BYTES = 100 * 1024 * 1024;

function errorCode(error: unknown): string | undefined {
  return error instanceof Error && "code" in error && typeof error.code === "string" ? error.code : undefined;
}

function removeCandidate(path: string): void {
  try {
    unlinkSync(path);
  } catch (error) {
    if (errorCode(error) !== "ENOENT") {
      return;
    }
  }
}

function closeCandidate(descriptor: number): void {
  try {
    closeSync(descriptor);
  } catch {
    return;
  }
}

function syncDirectory(directory: string): void {
  const descriptor = openSync(directory, "r");
  try {
    fsyncSync(descriptor);
  } catch (error) {
    closeCandidate(descriptor);
    throw error;
  }
  closeSync(descriptor);
}

export function assertBackupSize(contents: string, maximumBytes = WORKTODO_MAX_BACKUP_BYTES): void {
  if (Buffer.byteLength(contents, "utf8") > maximumBytes) {
    throw new PortabilityError("FILE_TOO_LARGE", "The Worktodo backup exceeds the 100 MiB limit.");
  }
}

export function ensurePrivateDirectory(directory: string): void {
  if (!isAbsolute(directory)) {
    throw new PortabilityError("INVALID_DESTINATION", "The Worktodo recovery folder must be absolute.");
  }
  try {
    mkdirSync(directory, { recursive: true, mode: 0o700 });
    chmodSync(directory, 0o700);
    if (!statSync(directory).isDirectory()) {
      throw new Error("Recovery destination is not a directory");
    }
    syncDirectory(directory);
    syncDirectory(dirname(directory));
  } catch (error) {
    throw new PortabilityError("FILE_WRITE_FAILED", "Worktodo could not prepare the recovery folder.", error);
  }
}

export function publishBackupFile(directory: string, filename: string, contents: string): string {
  if (!isAbsolute(directory) || basename(filename) !== filename || !filename.endsWith(".json")) {
    throw new PortabilityError("INVALID_DESTINATION", "Choose an existing folder for the Worktodo backup.");
  }

  try {
    if (!statSync(directory).isDirectory()) {
      throw new Error("Destination is not a directory");
    }
  } catch (error) {
    throw new PortabilityError("INVALID_DESTINATION", "Choose an existing folder for the Worktodo backup.", error);
  }

  assertBackupSize(contents);
  const destination = join(directory, filename);
  const candidate = join(directory, `.${filename}.${randomUUID()}.tmp`);
  let descriptor: number | undefined;
  let linked = false;

  try {
    descriptor = openSync(candidate, "wx", 0o600);
    chmodSync(candidate, 0o600);
    writeFileSync(descriptor, contents, "utf8");
    fsyncSync(descriptor);
    closeSync(descriptor);
    descriptor = undefined;
    linkSync(candidate, destination);
    linked = true;
    syncDirectory(directory);
    unlinkSync(candidate);
    syncDirectory(directory);
  } catch (error) {
    if (descriptor !== undefined) {
      closeCandidate(descriptor);
    }
    if (linked) {
      removeCandidate(destination);
    }
    removeCandidate(candidate);
    if (errorCode(error) === "EEXIST") {
      throw new PortabilityError("DESTINATION_EXISTS", "A backup with this name already exists.", error);
    }
    throw new PortabilityError("FILE_WRITE_FAILED", "Worktodo could not write the backup file.", error);
  }

  return destination;
}
