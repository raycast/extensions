import { access, stat } from "node:fs/promises";
import { constants } from "node:fs";
import { homedir } from "node:os";
import { isAbsolute, join } from "node:path";
import type { Project } from "./model";

export interface NewSessionInput {
  projectId?: string;
  name?: string;
  directory?: string;
}

export interface NewSessionFormValues extends Omit<NewSessionInput, "directory"> {
  directory?: string[];
}

export function sessionInputFromForm({ directory, ...values }: NewSessionFormValues): NewSessionInput {
  if (!values.projectId) throw new SessionInputError("projectId", "Select an existing project first.");
  // Raycast's single-folder picker still returns an array; clearing it restores the default.
  return { ...values, directory: directory?.[0] };
}

export class SessionInputError extends Error {
  constructor(
    public readonly field: keyof NewSessionInput,
    message: string,
  ) {
    super(message);
    this.name = "SessionInputError";
  }
}

export async function newSessionArgs(input: NewSessionInput, projects: Project[], home = homedir()): Promise<string[]> {
  const project = input.projectId ? projects.find((project) => project.id === input.projectId) : undefined;
  if (input.projectId && !project) {
    // Kero creates a project when --project does not match. Never pass a stale ID.
    throw new SessionInputError("projectId", "This project no longer exists. Refresh projects and select another.");
  }
  const name = input.name?.trim();
  if (name && /[\0\r\n]/.test(name)) {
    throw new SessionInputError("name", "Use a single-line name without null characters.");
  }
  const rawDirectory = input.directory?.trim() ? input.directory : project?.dir || home;
  const directory =
    rawDirectory === "~" ? home : rawDirectory.startsWith("~/") ? join(home, rawDirectory.slice(2)) : rawDirectory;
  if (!isAbsolute(directory) || directory.includes("\0")) {
    throw new SessionInputError("directory", "Enter an absolute directory path or a path starting with ~/.");
  }
  try {
    if (!(await stat(directory)).isDirectory()) throw new Error("Not a directory");
    await access(directory, constants.R_OK | constants.X_OK);
  } catch {
    throw new SessionInputError(
      "directory",
      "The directory does not exist or cannot be accessed. Choose an existing folder.",
    );
  }

  // Always specify a directory: Raycast's cwd is not the user's terminal cwd.
  // Pass values as separate arguments; neither a shell nor command parsing is involved.
  const args = ["new", "--json", "--dir", directory];
  if (project) args.push("--project", project.id);
  if (name) args.push("--name", name);
  return args;
}
