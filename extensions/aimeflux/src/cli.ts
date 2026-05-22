import { spawn } from "node:child_process";

export type FieldType = "text" | "textarea" | "dropdown" | "checkbox";
export type OptionSource = "modes" | "models";

export type Option = {
  title: string;
  value: string;
};

export type FieldValue = string | boolean | Date | null | undefined;

export type FormValues = Record<string, FieldValue>;

export type Field = {
  id: string;
  label: string;
  type: FieldType;
  placeholder?: string;
  required?: boolean;
  defaultValue?: string | boolean;
  options?: Option[];
  optionsSource?: OptionSource;
  includeEmptyOption?: boolean;
  emptyOptionTitle?: string;
};

export type CommandRequest = {
  label: string;
  args: string[];
  stdin?: string;
  detached?: boolean;
  requiresAppRunning?: boolean;
};

export type CommandResult = {
  commandLine: string;
  detached: boolean;
  exitCode: number;
  stdout: string;
  stderr: string;
};

let resolvedBinaryPromise: Promise<string> | undefined;
let resolvedPathPromise: Promise<string> | undefined;
let resolvedModelsPromise: Promise<Option[]> | undefined;
const binaryShellOutputStart = "__AIMEFLUX_BINARY_START__";
const binaryShellOutputEnd = "__AIMEFLUX_BINARY_END__";
const pathShellOutputStart = "__AIMEFLUX_PATH_START__";
const pathShellOutputEnd = "__AIMEFLUX_PATH_END__";

export function textValue(values: FormValues, key: string) {
  const value = values[key];
  return typeof value === "string" ? value.trim() : "";
}

export function boolValue(values: FormValues, key: string) {
  return values[key] === true;
}

export function hasValue(value: string | undefined) {
  return Boolean(value && value.trim().length > 0);
}

export function buildCommandLine(binary: string, args: string[]) {
  return [binary, ...args].map(quoteArgument).join(" ");
}

export function buildRequestCommandLine(request: CommandRequest) {
  return buildCommandLine("aimeflux", request.args);
}

export async function runAimeFlux(request: CommandRequest) {
  if (request.requiresAppRunning) {
    await ensureAppRunning();
  }

  const binary = await resolveAimefluxBinary();
  return await runProcess(
    binary,
    [...request.args],
    request.detached === true,
    request.stdin,
  );
}

export function shellSplit(input: string) {
  const args: string[] = [];
  const matcher = /"([^"]*)"|'([^']*)'|(\S+)/g;
  let match: RegExpExecArray | null;

  while ((match = matcher.exec(input)) !== null) {
    args.push(match[1] ?? match[2] ?? match[3] ?? "");
  }

  return args;
}

export async function listModes() {
  const result = await runAimeFlux({
    label: "List Modes",
    args: ["mode", "list"],
  });

  if (result.exitCode !== 0) {
    throw new Error(result.stderr || "Failed to load modes.");
  }

  return parseOptionList(result.stdout);
}

export async function listModeNames() {
  const result = await runAimeFlux({
    label: "List Modes",
    args: ["mode", "list"],
  });

  if (result.exitCode !== 0) {
    throw new Error(result.stderr || "Failed to load modes.");
  }

  return parseModeNameOptions(result.stdout);
}

export async function listModels() {
  if (!resolvedModelsPromise) {
    resolvedModelsPromise = loadModels();
  }

  try {
    return await resolvedModelsPromise;
  } catch (error) {
    resolvedModelsPromise = undefined;
    throw error;
  }
}

async function resolveAimefluxBinary() {
  if (!resolvedBinaryPromise) {
    resolvedBinaryPromise = resolveBinaryFromShell();
  }

  try {
    return await resolvedBinaryPromise;
  } catch (error) {
    resolvedBinaryPromise = undefined;
    throw error;
  }
}

async function resolveBinaryFromShell() {
  const result = await runProcess(
    "/bin/zsh",
    [
      "-lc",
      `printf '${binaryShellOutputStart}'; command -v aimeflux; printf '${binaryShellOutputEnd}'`,
    ],
    false,
  );
  const binary = parseBinaryFromShellOutput(result.stdout);

  if (result.exitCode !== 0 || !binary) {
    throw new Error(
      "Could not find `aimeflux` on your shell PATH. Install it and verify `command -v aimeflux` works in Terminal.",
    );
  }

  return binary;
}

async function loadModels() {
  const result = await runAimeFlux({
    label: "List Models",
    args: ["model", "list"],
  });

  if (result.exitCode !== 0) {
    throw new Error(
      result.stderr || result.stdout || "Failed to load installed models.",
    );
  }

  return parseOptionList(result.stdout);
}

async function ensureAppRunning() {
  const result = await runProcess(
    "/bin/zsh",
    [
      "-lc",
      "ps -ax -o command= | grep -F '/AimeFlux.app/Contents/MacOS/' | grep -v grep",
    ],
    false,
  );

  if (result.exitCode !== 0 || !result.stdout.trim()) {
    throw new Error("AimeFlux.app must be running for this command.");
  }
}

async function runProcess(
  binary: string,
  args: string[],
  detached: boolean,
  stdin?: string,
) {
  const commandLine = buildCommandLine(binary, args);
  const shellPath = await resolveShellPath();
  const env = {
    ...process.env,
    PATH: shellPath,
  };

  if (detached) {
    return await new Promise<CommandResult>((resolve, reject) => {
      const child = spawn(binary, args, {
        detached: true,
        stdio: "ignore",
        env,
      });

      const timer = setTimeout(() => {
        child.unref();
        resolve({
          commandLine,
          detached: true,
          exitCode: 0,
          stdout: "",
          stderr: "",
        });
      }, 50);

      child.on("error", (error) => {
        clearTimeout(timer);
        reject(error);
      });
    });
  }

  return await new Promise<CommandResult>((resolve, reject) => {
    const child = spawn(binary, args, {
      stdio: "pipe",
      env,
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", (error) => {
      reject(error);
    });

    child.on("close", (exitCode) => {
      resolve({
        commandLine,
        detached: false,
        exitCode: exitCode ?? 1,
        stdout: stdout.trim(),
        stderr: stderr.trim(),
      });
    });

    if (stdin) {
      child.stdin.write(stdin);
    }
    child.stdin.end();
  });
}

async function resolveShellPath() {
  if (!resolvedPathPromise) {
    resolvedPathPromise = resolvePathFromShell();
  }

  try {
    return await resolvedPathPromise;
  } catch (error) {
    resolvedPathPromise = undefined;
    throw error;
  }
}

async function resolvePathFromShell() {
  const result = await new Promise<CommandResult>((resolve, reject) => {
    const child = spawn(
      "/bin/zsh",
      [
        "-lc",
        `printf '${pathShellOutputStart}%s${pathShellOutputEnd}' "$PATH"`,
      ],
      {
        stdio: "pipe",
      },
    );

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", (error) => {
      reject(error);
    });

    child.on("close", (exitCode) => {
      resolve({
        commandLine: `/bin/zsh -lc 'printf "${pathShellOutputStart}%s${pathShellOutputEnd}" "$PATH"'`,
        detached: false,
        exitCode: exitCode ?? 1,
        stdout: stdout.trim(),
        stderr: stderr.trim(),
      });
    });
  });
  const shellPath = parsePathFromShellOutput(result.stdout);

  if (result.exitCode !== 0 || !shellPath) {
    return (
      process.env.PATH ||
      "/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin"
    );
  }

  return shellPath;
}

export function parseBinaryFromShellOutput(output: string) {
  const value = extractTaggedShellValue(
    output,
    binaryShellOutputStart,
    binaryShellOutputEnd,
  );

  return value
    .split("\n")
    .map((line) => line.trim())
    .find((line) => line.startsWith("/"));
}

export function parsePathFromShellOutput(output: string) {
  return extractTaggedShellValue(
    output,
    pathShellOutputStart,
    pathShellOutputEnd,
  ).trim();
}

function extractTaggedShellValue(
  output: string,
  startMarker: string,
  endMarker: string,
) {
  const startIndex = output.lastIndexOf(startMarker);
  if (startIndex < 0) {
    return "";
  }

  const valueStart = startIndex + startMarker.length;
  const endIndex = output.indexOf(endMarker, valueStart);
  if (endIndex < 0) {
    return "";
  }

  return output.slice(valueStart, endIndex);
}

function parseOptionList(output: string): Option[] {
  return output
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !/^\d{4}\//.test(line))
    .map((line) => {
      const columns = line
        .split(/\t+/)
        .map((column) => column.trim())
        .filter(Boolean);
      if (columns.length >= 2) {
        return {
          value: columns[0],
          title: `${columns[1]} (${columns[0]})`,
        };
      }

      const compactColumns = line
        .split(/\s{2,}/)
        .map((column) => column.trim())
        .filter(Boolean);
      const value = compactColumns[0] ?? line;
      const label = compactColumns[1] ?? value;
      return {
        value,
        title: label === value ? value : `${label} (${value})`,
      };
    })
    .filter(
      (option, index, array) =>
        option.value &&
        array.findIndex((candidate) => candidate.value === option.value) ===
          index,
    );
}

function parseModeNameOptions(output: string): Option[] {
  return output
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !/^\d{4}\//.test(line))
    .map((line) => {
      const columns = line
        .split(/\t+/)
        .map((column) => column.trim())
        .filter(Boolean);
      if (columns.length >= 2) {
        return {
          value: columns[1],
          title: columns[1],
        };
      }

      const compactColumns = line
        .split(/\s{2,}/)
        .map((column) => column.trim())
        .filter(Boolean);
      const value = compactColumns[1] ?? compactColumns[0] ?? line;
      return {
        value,
        title: value,
      };
    })
    .filter(
      (option, index, array) =>
        option.value &&
        array.findIndex((candidate) => candidate.value === option.value) ===
          index,
    );
}

function quoteArgument(arg: string) {
  if (/^[A-Za-z0-9_./:@-]+$/.test(arg)) {
    return arg;
  }

  return `"${arg.replaceAll("\\", "\\\\").replaceAll('"', '\\"')}"`;
}
