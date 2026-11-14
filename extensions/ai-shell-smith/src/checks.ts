import { execFile } from "child_process";
import { accessSync, constants } from "fs";
import { join } from "path";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

export type Risk = "safe" | "caution" | "destructive";

// Ordered: the first match decides the reason shown to the user.
const DESTRUCTIVE: Array<[RegExp, string]> = [
  [
    /\brm\s+(-\w*[rR]\w*\s+-\w*f|-\w*f\w*\s+-\w*[rR]|-\w*[rR]\w*f|-\w*f\w*[rR])\w*/,
    "rm -rf",
  ],
  [/\brm\s+(-\w*\s+)*-\w*[rR]/, "recursive rm"],
  [/\bdd\b[^|;&]*\bof=/, "dd writes a device/file"],
  [
    /\bmkfs(\.\w+)?\b|\bdiskutil\s+(erase\w*|partitionDisk|zeroDisk)/i,
    "formats a disk",
  ],
  [/>\s*\/dev\/(sd|disk|nvme|rdisk)/, "writes to a disk device"],
  [
    /\bchmod\s+(-\w*R\w*\s+)?0?777\b|\bchmod\s+-R\b/,
    "recursive/open permissions",
  ],
  [/\bchown\s+-\w*R/, "recursive chown"],
  [/\bgit\s+push\b[^;&|]*(--force\b|\s-f\b|--force-with-lease)/, "force push"],
  [/\bgit\s+(reset\s+--hard|clean\s+-\w*[fdx])/, "discards git changes"],
  [
    /\bfind\b[^;&|]*\s-delete\b|\bfind\b[^;&|]*-exec\s+rm\b/,
    "find deletes files",
  ],
  [
    /\b(shutdown|reboot|halt)\b|\bkill(all)?\s+-9\s+-1\b/,
    "stops the machine/all processes",
  ],
  [/\bdrop\s+(table|database|schema)\b|\btruncate\s+table\b/i, "drops data"],
  [
    /\b(docker|podman)\s+(system|volume|image)\s+prune\b[^;&|]*(-a|--all|-f)/,
    "prunes containers/volumes",
  ],
  [/\bkubectl\s+delete\b|\bterraform\s+destroy\b/, "deletes infrastructure"],
  [/:\(\)\s*\{\s*:\|:&\s*\};:/, "fork bomb"],
];

const CAUTION: Array<[RegExp, string]> = [
  [
    /\b(curl|wget)\b[^|;&]*\|\s*(sudo\s+)?(ba|z|fi)?sh\b/,
    "runs a downloaded script",
  ],
  [
    /\b(irm|iwr|Invoke-WebRequest|Invoke-RestMethod)\b[^|;]*\|\s*iex\b/i,
    "runs a downloaded script",
  ],
  [/(^|[\s;&|(])sudo\s/, "uses sudo"],
  [/\brm\s/, "deletes files"],
  [/(^|[^>])>\s*[~/\w.]/, "overwrites a file"],
];

export function assessRisk(command: string): { risk: Risk; reason?: string } {
  for (const [re, reason] of DESTRUCTIVE)
    if (re.test(command)) return { risk: "destructive", reason };
  for (const [re, reason] of CAUTION)
    if (re.test(command)) return { risk: "caution", reason };
  return { risk: "safe" };
}

// Words that start a segment but are not programs to look up.
const NOT_PROGRAMS = new Set([
  ...["cd", "echo", "export", "set", "unset", "source", ".", "alias", "eval"],
  ...["exec", "read", "printf", "test", "[", "[[", "true", "false", "type"],
  ...["if", "then", "else", "elif", "fi", "for", "while", "until", "do"],
  ...["done", "case", "esac", "in", "function", "return", "exit", "wait"],
  ...["command", "builtin", "local", "declare", "trap", "shift", "ulimit"],
  ...["pushd", "popd", "history", "jobs", "fg", "bg", "umask", "hash"],
]);
const PREFIXES = new Set(["sudo", "env", "time", "nohup", "xargs", "exec"]);

/** Programs a command runs, e.g. `sudo apt update && jq . | less` → apt, jq, less. */
export function programsIn(command: string): string[] {
  const programs = new Set<string>();
  // shortcut: splits on operators without full shell quoting; good enough for one-liners.
  for (const segment of command.split(/&&|\|\||[|;\n]|\$\(|`/)) {
    const words = segment
      .trim()
      .replace(/^[({\s]+/, "")
      .split(/\s+/);
    let i = 0;
    while (
      i < words.length &&
      (PREFIXES.has(words[i]) ||
        /^\w+=/.test(words[i]) ||
        (words[i].startsWith("-") && i > 0 && PREFIXES.has(words[i - 1])))
    )
      i++;
    const word = words[i]?.replace(/^["']|["')]+$/g, "");
    if (!word || NOT_PROGRAMS.has(word) || !/^[\w.+@/-]+$/.test(word)) continue;
    programs.add(word);
  }
  return [...programs];
}

let loginPath: Promise<string[]> | undefined;

/** The user's login-shell PATH (Raycast's own PATH lacks Homebrew & co.). */
export function getLoginPath(): Promise<string[]> {
  loginPath ??= execFileAsync(
    process.env.SHELL || "/bin/zsh",
    ["-l", "-c", 'printf %s "$PATH"'],
    {
      timeout: 3000,
    },
  )
    .then(({ stdout }) => stdout)
    .catch(() => process.env.PATH ?? "")
    .then((path) => [
      ...new Set([
        ...path.split(":"),
        "/opt/homebrew/bin",
        "/usr/local/bin",
        "/usr/bin",
        "/bin",
        "/usr/sbin",
        "/sbin",
      ]),
    ]);
  return loginPath;
}

const isExecutable = (path: string) => {
  try {
    accessSync(path, constants.X_OK);
    return true;
  } catch {
    return false;
  }
};

/** Programs the command needs that aren't installed on this machine. */
export function missingPrograms(command: string, pathDirs: string[]): string[] {
  return programsIn(command).filter((program) => {
    // Relative paths depend on a cwd we don't know; don't guess.
    if (program.includes("/"))
      return program.startsWith("/") && !isExecutable(program);
    if (pathDirs.some((dir) => dir && isExecutable(join(dir, program))))
      return false;
    // `brew install ffmpeg && ffmpeg …` provides what it later runs; the
    // package must be a whole word in that install step (not `dnf-plugins`).
    const escaped = program.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return !new RegExp(`\\binstall\\b[^;|&]*\\s${escaped}(?=\\s|$)`).test(
      command,
    );
  });
}
