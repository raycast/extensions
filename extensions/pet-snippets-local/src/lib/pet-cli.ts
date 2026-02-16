import { execFileSync } from "child_process";
import { createHash } from "crypto";
import fs from "fs";
import os from "os";
import path from "path";
import { PetSnippet } from "./pet";

const COMMAND_CONTINUATION_PREFIX = "             ";

interface MutableSnippet {
  description: string;
  commandLines: string[];
  outputLines: string[];
  tags: string[];
}

function parseTagList(raw: string): string[] {
  const value = raw.trim();
  if (!value) {
    return [];
  }

  return value
    .split(/\s+/)
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0);
}

function trimTrailingEmptyLines(lines: string[]): string[] {
  const next = [...lines];
  while (next.length > 0 && next[next.length - 1].length === 0) {
    next.pop();
  }
  return next;
}

function buildSnippetId(
  description: string,
  command: string,
  tags: string[],
): string {
  const hash = createHash("sha1");
  hash.update(`${description}\n${command}\n${tags.join(",")}`);
  return hash.digest("hex");
}

function titleFromCommand(command: string): string {
  const firstLine = command.split("\n").find((line) => line.trim().length > 0);
  return firstLine?.trim().slice(0, 80) || "Untitled snippet";
}

export function parsePetListOutput(output: string): PetSnippet[] {
  const lines = output.split(/\r?\n/);
  const snippets: PetSnippet[] = [];

  let current: MutableSnippet | undefined;
  let activeSection: "command" | "output" | undefined;

  const finalizeCurrent = () => {
    if (!current) {
      return;
    }

    const commandLines = trimTrailingEmptyLines(current.commandLines);
    const outputLines = trimTrailingEmptyLines(current.outputLines);
    const command = commandLines.join("\n");
    const description = current.description || titleFromCommand(command);
    const tags = current.tags;

    if (description && command) {
      snippets.push({
        id: buildSnippetId(description, command, tags),
        description,
        command,
        output: outputLines.join("\n"),
        tags,
        searchBlob: `${description} ${command} ${tags.join(" ")}`.toLowerCase(),
      });
    }

    current = undefined;
    activeSection = undefined;
  };

  for (const line of lines) {
    if (/^-{5,}$/.test(line.trim())) {
      finalizeCurrent();
      continue;
    }

    const descriptionMatch = line.match(/^Description:\s*(.*)$/);
    if (descriptionMatch) {
      finalizeCurrent();
      current = {
        description: descriptionMatch[1].trim(),
        commandLines: [],
        outputLines: [],
        tags: [],
      };
      activeSection = undefined;
      continue;
    }

    const commandMatch = line.match(/^\s*Command:\s?(.*)$/);
    if (commandMatch) {
      if (!current) {
        current = {
          description: "",
          commandLines: [],
          outputLines: [],
          tags: [],
        };
      }
      current.commandLines = [commandMatch[1]];
      activeSection = "command";
      continue;
    }

    const tagMatch = line.match(/^\s*Tag:\s?(.*)$/);
    if (tagMatch) {
      if (current) {
        current.tags = parseTagList(tagMatch[1]);
      }
      activeSection = undefined;
      continue;
    }

    const outputMatch = line.match(/^\s*Output:\s?(.*)$/);
    if (outputMatch) {
      if (!current) {
        current = {
          description: "",
          commandLines: [],
          outputLines: [],
          tags: [],
        };
      }
      current.outputLines = [outputMatch[1]];
      activeSection = "output";
      continue;
    }

    if (
      activeSection === "command" &&
      line.startsWith(COMMAND_CONTINUATION_PREFIX)
    ) {
      current?.commandLines.push(
        line.slice(COMMAND_CONTINUATION_PREFIX.length),
      );
      continue;
    }

    if (activeSection === "output" && /^\s{5,}/.test(line)) {
      current?.outputLines.push(line.replace(/^\s{5,}/, ""));
    }
  }

  finalizeCurrent();
  return snippets;
}

export interface PetCliSnippetsResult {
  snippets: PetSnippet[];
  snapshot: string;
}

function getPetBinaryCandidates(preferredBinaryPath?: string): string[] {
  if (preferredBinaryPath) {
    return [preferredBinaryPath];
  }

  return [
    "pet",
    "/opt/homebrew/bin/pet",
    "/usr/local/bin/pet",
    path.join(os.homedir(), ".nix-profile", "bin", "pet"),
    "/nix/var/nix/profiles/default/bin/pet",
  ];
}

function isCommandNotFoundError(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }

  const maybeError = error as NodeJS.ErrnoException;
  if (maybeError.code === "ENOENT") {
    return true;
  }
  if (
    typeof maybeError.message === "string" &&
    maybeError.message.includes("ENOENT")
  ) {
    return true;
  }
  return false;
}

function errorDetails(error: unknown): string {
  if (error instanceof Error) {
    const withStderr = error as Error & {
      stderr?: string | Buffer;
    };
    const stderr =
      typeof withStderr.stderr === "string"
        ? withStderr.stderr
        : Buffer.isBuffer(withStderr.stderr)
          ? withStderr.stderr.toString("utf8")
          : "";
    if (stderr.trim()) {
      return `${error.message} ${stderr.trim()}`;
    }
    return error.message;
  }
  return String(error);
}

function isExecutableFile(filePath: string): boolean {
  try {
    fs.accessSync(filePath, fs.constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

export function loadPetSnippetsFromCli(
  configPath?: string,
  preferredBinaryPath?: string,
): PetCliSnippetsResult {
  const args = ["list"];
  if (configPath) {
    args.unshift(configPath);
    args.unshift("--config");
  }

  const candidates = getPetBinaryCandidates(preferredBinaryPath);
  const attempted: string[] = [];

  for (const candidate of candidates) {
    if (candidate.includes(path.sep) && !isExecutableFile(candidate)) {
      attempted.push(candidate);
      continue;
    }

    attempted.push(candidate);
    try {
      const stdout = execFileSync(candidate, args, {
        encoding: "utf8",
        maxBuffer: 16 * 1024 * 1024,
        stdio: ["ignore", "pipe", "pipe"],
      });

      const snapshot = createHash("sha1").update(stdout).digest("hex");
      return {
        snippets: parsePetListOutput(stdout),
        snapshot,
      };
    } catch (error) {
      if (isCommandNotFoundError(error)) {
        if (preferredBinaryPath) {
          throw new Error(
            `Configured pet binary was not found: ${preferredBinaryPath}. Update "Pet Binary Path" or leave it empty to auto-detect.`,
          );
        }
        continue;
      }

      throw new Error(
        `Failed to run \`${candidate} list\`. ${errorDetails(error)}`,
      );
    }
  }

  throw new Error(
    `pet executable was not found. Tried: ${attempted.join(", ")}. Set "Pet Binary Path" in extension preferences.`,
  );
}
