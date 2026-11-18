import { execFile } from "child_process";
import { homedir } from "os";
import path from "path";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

export function expandHomePath(value: string) {
  const trimmed = value.trim();
  if (trimmed === "~") return homedir();
  if (trimmed.startsWith("~/")) return path.join(homedir(), trimmed.slice(2));
  return trimmed;
}

export function validateRepository(value: string) {
  const repository = value.trim();
  if (!repository) return "Enter a repository URL or owner/repository.";
  if (repository.startsWith("-") || /[\0\r\n]/.test(repository))
    return "Enter a valid repository URL or owner/repository.";
}

interface GetRepositoryOptions {
  rootPath: string;
  ghqPath?: string;
  update?: boolean;
  ssh?: boolean;
  shallow?: boolean;
}

export async function getRepository(repository: string, options: GetRepositoryOptions) {
  const validationError = validateRepository(repository);
  if (validationError) throw new Error(validationError);

  const rootPath = expandHomePath(options.rootPath);
  if (!path.isAbsolute(rootPath)) throw new Error("Set ghq root path to an absolute path or a path starting with ~/.");

  const args = ["get"];
  if (options.update) args.push("--update");
  if (options.ssh) args.push("-p");
  if (options.shallow) args.push("--shallow");
  args.push("--", repository.trim());

  try {
    return await execFileAsync(expandHomePath(options.ghqPath || "ghq"), args, {
      env: {
        ...process.env,
        PATH: [process.env.PATH, "/opt/homebrew/bin", "/usr/local/bin", "/usr/bin", "/bin"]
          .filter(Boolean)
          .join(path.delimiter),
        GHQ_ROOT: rootPath,
        GIT_TERMINAL_PROMPT: "0",
      },
      maxBuffer: 10 * 1024 * 1024,
    });
  } catch (error) {
    const commandError = error as NodeJS.ErrnoException & { stderr?: string };
    if (commandError.code === "ENOENT") {
      throw new Error("ghq was not found. Install ghq or set ghq executable path in the command preferences.");
    }
    throw new Error(commandError.stderr?.trim() || commandError.message || "ghq get failed.");
  }
}
