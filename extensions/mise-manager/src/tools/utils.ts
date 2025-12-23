export class MiseCommandError extends Error {
  stdout: string;
  stderr: string;
  exitCode: number | string | null | undefined;
  args: string[];

  constructor(
    message: string,
    args: string[],
    stdout: string,
    stderr: string,
    exitCode: number | string | null | undefined,
    cause?: unknown,
  ) {
    super(message);
    this.name = "MiseCommandError";
    this.args = args;
    this.stdout = stdout;
    this.stderr = stderr;
    this.exitCode = exitCode;
    if (cause instanceof Error && cause.stack) {
      this.stack = cause.stack;
    }
  }
}

export function formatMiseError(error: unknown): string {
  const stripAnsi = (str: string) =>
    // eslint-disable-next-line no-control-regex
    str.replace(/[][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, "");

  if (error instanceof MiseCommandError) {
    const stderr = stripAnsi(error.stderr.trim());
    if (stderr.length > 0) {
      return stderr.split("\n").slice(-5).join("\n");
    }
    const stdout = stripAnsi(error.stdout.trim());
    if (stdout.length > 0) {
      return stdout.split("\n").slice(-5).join("\n");
    }
    return `${error.message} (exit code ${error.exitCode ?? "unknown"})`;
  }
  if (error instanceof Error) {
    return stripAnsi(error.message);
  }
  return "Unknown mise error";
}

export function deriveToolUrl(backends: string[]): string | undefined {
  for (const backend of backends) {
    if (backend.startsWith("github:")) {
      return `https://github.com/${backend.slice(7)}`;
    }
    if (backend.startsWith("asdf:mise-plugins/")) {
      return `https://github.com/${backend.slice(5)}`;
    }
    if (backend.startsWith("asdf:")) {
      const path = backend.slice(5);
      if (path.split("/").length === 2) {
        return `https://github.com/${path}`;
      }
    }
    if (backend.startsWith("cargo:")) {
      return `https://crates.io/crates/${backend.slice(6)}`;
    }
    if (backend.startsWith("npm:")) {
      return `https://www.npmjs.com/package/${backend.slice(4)}`;
    }
    if (backend.startsWith("pip:")) {
      return `https://pypi.org/project/${backend.slice(4)}`;
    }
    if (backend.startsWith("go:")) {
      return `https://pkg.go.dev/${backend.slice(3)}`;
    }
    if (backend.startsWith("gem:")) {
      return `https://rubygems.org/gems/${backend.slice(4)}`;
    }
    if (backend.startsWith("core:")) {
      const coreMap: Record<string, string> = {
        "core:node": "https://nodejs.org",
        "core:go": "https://go.dev",
        "core:python": "https://www.python.org",
        "core:ruby": "https://www.ruby-lang.org",
        "core:java": "https://dev.java",
        "core:erlang": "https://www.erlang.org",
        "core:elixir": "https://elixir-lang.org",
      };
      if (coreMap[backend]) return coreMap[backend];
    }
  }
  return undefined;
}
