import { execFile } from "node:child_process";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import yaml from "js-yaml";
import { resolveShellEnv } from "./shell-env";
import type {
  ColimaCreateOptions,
  ColimaInstance,
  ColimaTemplateDefaults,
  DockerContainer,
  DockerImage,
  DockerNetwork,
} from "./types";

const execFileAsync = promisify(execFile);

const BASE_PATH = [
  "/opt/homebrew/bin",
  "/usr/local/bin",
  "/opt/homebrew/sbin",
  "/usr/local/sbin",
  "/usr/bin",
  "/bin",
  process.env.PATH ?? "",
].join(":");

/**
 * Lazily resolved CLI environment that includes COLIMA_HOME and XDG_CONFIG_HOME
 * from the user's login shell. Cached after first resolution.
 */
let resolvedCliEnv: NodeJS.ProcessEnv | null = null;

export async function getCliEnv(): Promise<NodeJS.ProcessEnv> {
  if (resolvedCliEnv) {
    return resolvedCliEnv;
  }

  const shellEnv = await resolveShellEnv();

  resolvedCliEnv = {
    ...process.env,
    PATH: BASE_PATH,
    ...(shellEnv.COLIMA_HOME ? { COLIMA_HOME: shellEnv.COLIMA_HOME } : {}),
    ...(shellEnv.XDG_CONFIG_HOME ? { XDG_CONFIG_HOME: shellEnv.XDG_CONFIG_HOME } : {}),
  };

  return resolvedCliEnv;
}

/**
 * Synchronous env snapshot for hooks that need env at import time (e.g. useExec).
 * Prefer getCliEnv() in async contexts for full shell-resolved values.
 */
export const CLI_ENV: NodeJS.ProcessEnv = {
  ...process.env,
  PATH: BASE_PATH,
};

interface RawColimaInstance {
  name?: string;
  status?: string;
  arch?: string;
  cpus?: number;
  memory?: number;
  disk?: number;
  runtime?: string;
  address?: string;
}

interface RawDockerContainer {
  ID?: string;
  Names?: string;
  Image?: string;
  Status?: string;
  State?: string;
  Ports?: string;
  CreatedAt?: string;
}

interface RawDockerImage {
  ID?: string;
  Repository?: string;
  Tag?: string;
  Size?: string;
  CreatedAt?: string;
  CreatedSince?: string;
}

interface RawDockerNetwork {
  ID?: string;
  Name?: string;
  Driver?: string;
  Scope?: string;
}

export async function execCommand(
  file: string,
  args: string[],
  options?: { timeout?: number; shell?: boolean },
): Promise<string> {
  const env = await getCliEnv();
  try {
    const { stdout } = await execFileAsync(file, args, {
      env,
      timeout: options?.timeout ?? 15_000,
      shell: options?.shell ?? false,
      maxBuffer: 10 * 1024 * 1024,
    });
    return stdout;
  } catch (error) {
    const err = error as NodeJS.ErrnoException & { stderr?: string };
    if (err.code === "ENOENT") {
      throw new Error(`Binary '${file}' not found in PATH. Please install ${file}.`);
    }

    const stderr = err.stderr?.trim();
    if (stderr) {
      throw new Error(stderr);
    }

    throw new Error(`Command failed: ${file} ${args.join(" ")}`);
  }
}

function parseNdjson<T>(output: string): T[] {
  const trimmed = output.trim();
  if (!trimmed) {
    return [];
  }

  try {
    return trimmed
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => JSON.parse(line) as T);
  } catch {
    return [];
  }
}

const BYTES_PER_GIB = 1024 * 1024 * 1024;

function bytesToGiB(bytes: number): number {
  return Math.round(bytes / BYTES_PER_GIB);
}

export async function colimaList(): Promise<ColimaInstance[]> {
  const output = await execCommand("colima", ["list", "--json"]);
  const trimmed = output.trim();
  if (!trimmed) {
    return [];
  }

  return trimmed
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const instance = JSON.parse(line) as RawColimaInstance;
      return {
        name: instance.name ?? "",
        status: instance.status ?? "",
        arch: instance.arch ?? "",
        cpus: Number(instance.cpus ?? 0),
        memory: bytesToGiB(Number(instance.memory ?? 0)),
        disk: bytesToGiB(Number(instance.disk ?? 0)),
        runtime: instance.runtime ?? "",
        address: instance.address ?? "",
      };
    });
}

export async function colimaStart(profile?: string): Promise<void> {
  const args = ["start", ...(profile ? [profile] : [])];
  await execCommand("colima", args, { timeout: 120_000 });
}

export async function colimaStop(profile?: string): Promise<void> {
  const args = ["stop", ...(profile ? [profile] : [])];
  await execCommand("colima", args, { timeout: 30_000 });
}

export async function colimaDelete(profile: string, opts?: { data?: boolean }): Promise<void> {
  const args = ["delete", profile, "--force"];
  if (opts?.data) {
    args.push("--data");
  }
  await execCommand("colima", args);
}

export async function colimaCreate(opts: ColimaCreateOptions): Promise<void> {
  const args = ["start", opts.profile];

  if (typeof opts.cpus === "number") {
    args.push("--cpus", String(opts.cpus));
  }
  if (typeof opts.memory === "number") {
    args.push("--memory", String(opts.memory));
  }
  if (typeof opts.disk === "number") {
    args.push("--disk", String(opts.disk));
  }
  if (opts.runtime) {
    args.push("--runtime", opts.runtime);
  }
  if (opts.vmType) {
    args.push("--vm-type", opts.vmType);
  }
  if (opts.kubernetes) {
    args.push("--kubernetes");
  }

  await execCommand("colima", args, { timeout: 120_000 });
}

export async function dockerPs(): Promise<DockerContainer[]> {
  const output = await execCommand("docker", ["ps", "-a", "--format", "json"]);
  const parsed = parseNdjson<RawDockerContainer>(output);
  return parsed.map((container) => ({
    id: container.ID ?? "",
    names: container.Names ?? "",
    image: container.Image ?? "",
    status: container.Status ?? "",
    state: container.State ?? "",
    ports: container.Ports ?? "",
    createdAt: container.CreatedAt ?? "",
  }));
}

export async function dockerStart(id: string): Promise<void> {
  await execCommand("docker", ["start", id]);
}

export async function dockerStop(id: string): Promise<void> {
  await execCommand("docker", ["stop", id], { timeout: 30_000 });
}

export async function dockerRestart(id: string): Promise<void> {
  await execCommand("docker", ["restart", id], { timeout: 30_000 });
}

export async function dockerRm(id: string, force?: boolean): Promise<void> {
  const args = ["rm", ...(force ? ["-f"] : []), id];
  await execCommand("docker", args);
}

export async function dockerLogs(id: string, tail = 100): Promise<string> {
  const env = await getCliEnv();
  try {
    const { stdout, stderr } = await execFileAsync("docker", ["logs", "--tail", String(tail), id], {
      env,
      timeout: 15_000,
      shell: false,
      maxBuffer: 10 * 1024 * 1024,
    });
    return `${stdout}${stderr}`;
  } catch (error) {
    const err = error as NodeJS.ErrnoException & { stdout?: string; stderr?: string };
    if (err.code === "ENOENT") {
      throw new Error("Binary 'docker' not found in PATH. Please install docker.");
    }

    const stderr = err.stderr?.trim();
    if (stderr) {
      throw new Error(stderr);
    }

    throw new Error(`Command failed: docker logs --tail ${tail} ${id}`);
  }
}

export async function dockerImages(): Promise<DockerImage[]> {
  const output = await execCommand("docker", ["images", "--format", "json"]);
  const parsed = parseNdjson<RawDockerImage>(output);
  return parsed.map((image) => ({
    id: image.ID ?? "",
    repository: image.Repository ?? "",
    tag: image.Tag ?? "",
    size: image.Size ?? "",
    createdAt: image.CreatedAt ?? "",
    createdSince: image.CreatedSince ?? "",
  }));
}

export async function dockerRmi(id: string, force?: boolean): Promise<void> {
  const args = ["rmi", ...(force ? ["-f"] : []), id];
  await execCommand("docker", args);
}

export async function dockerPull(image: string): Promise<void> {
  await execCommand("docker", ["pull", image], { timeout: 300_000 });
}

export async function dockerRun(args: string[]): Promise<string> {
  return execCommand("docker", ["run", ...args]);
}

export async function dockerNetworkLs(): Promise<DockerNetwork[]> {
  const output = await execCommand("docker", ["network", "ls", "--format", "json"]);
  const parsed = parseNdjson<RawDockerNetwork>(output);
  return parsed.map((network) => ({
    id: network.ID ?? "",
    name: network.Name ?? "",
    driver: network.Driver ?? "",
    scope: network.Scope ?? "",
  }));
}

export async function checkDependency(binary: string): Promise<boolean> {
  const env = await getCliEnv();
  try {
    await execFileAsync(binary, ["--version"], {
      env,
      timeout: 5_000,
      shell: false,
    });
    return true;
  } catch {
    return false;
  }
}

export async function checkColima(): Promise<boolean> {
  return checkDependency("colima");
}

export async function checkDocker(): Promise<boolean> {
  return checkDependency("docker");
}

const COLIMA_DEFAULTS: ColimaTemplateDefaults = {
  cpus: 2,
  memory: 2,
  disk: 100,
  runtime: "docker",
  vmType: "qemu",
  kubernetes: false,
};

const VALID_RUNTIMES = new Set(["docker", "containerd", "incus"]);
const VALID_VM_TYPES = new Set(["qemu", "vz", "krunkit"]);

interface RawColimaTemplate {
  cpu?: number;
  memory?: number;
  disk?: number;
  runtime?: string;
  vmType?: string;
  kubernetes?: { enabled?: boolean };
}

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function colimaConfigHomeCandidates(): Promise<string[]> {
  const home = homedir();
  const shellEnv = await resolveShellEnv();
  const candidates: string[] = [];

  // $COLIMA_HOME takes highest priority — check process.env first, then shell-resolved
  const colimaHome = process.env.COLIMA_HOME ?? shellEnv.COLIMA_HOME;
  if (colimaHome) {
    candidates.push(colimaHome);
  }

  // $XDG_CONFIG_HOME/colima — check process.env first, then shell-resolved, then default
  const xdgConfig = process.env.XDG_CONFIG_HOME ?? shellEnv.XDG_CONFIG_HOME ?? join(home, ".config");
  candidates.push(join(xdgConfig, "colima"));

  // Legacy ~/.colima
  candidates.push(join(home, ".colima"));

  return candidates;
}

async function resolveColimaConfigHome(): Promise<string | null> {
  const candidates = await colimaConfigHomeCandidates();

  for (const candidate of candidates) {
    if (await fileExists(candidate)) {
      return candidate;
    }
  }

  return null;
}

async function resolveColimaConfigHomeForWrite(): Promise<string> {
  const existingHome = await resolveColimaConfigHome();
  if (existingHome) {
    return existingHome;
  }

  const candidates = await colimaConfigHomeCandidates();
  return candidates[0];
}

function parseColimaConfig(parsed: RawColimaTemplate): ColimaTemplateDefaults {
  return {
    cpus: typeof parsed.cpu === "number" ? parsed.cpu : COLIMA_DEFAULTS.cpus,
    memory: typeof parsed.memory === "number" ? parsed.memory : COLIMA_DEFAULTS.memory,
    disk: typeof parsed.disk === "number" ? parsed.disk : COLIMA_DEFAULTS.disk,
    runtime:
      typeof parsed.runtime === "string" && VALID_RUNTIMES.has(parsed.runtime)
        ? (parsed.runtime as ColimaTemplateDefaults["runtime"])
        : COLIMA_DEFAULTS.runtime,
    vmType:
      typeof parsed.vmType === "string" && VALID_VM_TYPES.has(parsed.vmType)
        ? (parsed.vmType as ColimaTemplateDefaults["vmType"])
        : COLIMA_DEFAULTS.vmType,
    kubernetes: parsed.kubernetes?.enabled === true,
  };
}

async function readColimaYaml(filePath: string): Promise<ColimaTemplateDefaults | null> {
  try {
    const content = await readFile(filePath, "utf-8");
    const parsed = yaml.load(content) as RawColimaTemplate | null;
    if (!parsed || typeof parsed !== "object") {
      return null;
    }
    return parseColimaConfig(parsed);
  } catch {
    return null;
  }
}

export async function colimaTemplateDefaults(): Promise<ColimaTemplateDefaults> {
  try {
    const configHome = await resolveColimaConfigHome();
    if (!configHome) {
      return COLIMA_DEFAULTS;
    }

    // Read from the template for new instances (survives instance deletion)
    const templateConfig = join(configHome, "_templates", "default.yaml");
    const fromTemplate = await readColimaYaml(templateConfig);
    if (fromTemplate) {
      return fromTemplate;
    }

    return COLIMA_DEFAULTS;
  } catch {
    return COLIMA_DEFAULTS;
  }
}

export async function colimaSaveTemplateDefaults(defaults: ColimaTemplateDefaults): Promise<void> {
  const configHome = await resolveColimaConfigHomeForWrite();
  const templateDirectory = join(configHome, "_templates");
  const templatePath = join(templateDirectory, "default.yaml");

  const content = yaml.dump({
    cpu: defaults.cpus,
    memory: defaults.memory,
    disk: defaults.disk,
    runtime: defaults.runtime,
    vmType: defaults.vmType,
    kubernetes: {
      enabled: defaults.kubernetes,
    },
  });

  await mkdir(templateDirectory, { recursive: true });
  await writeFile(templatePath, content, "utf-8");
}
