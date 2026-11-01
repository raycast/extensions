import { getPreferenceValues } from "@raycast/api";
import { mkdir, readdir, stat, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { basename, extname, join } from "node:path";
import { Instance, NOT_CREATED } from "./instance";
import { createdAt, listInstances, NAME_PATTERN } from "./lima";
import { isTemplateFile, readTemplateFile, TemplateFile } from "./template-file";

/** A lima.yaml of your own in the Manifests Folder. Its instance is named after the file: dev.yaml makes dev. */
export interface Manifest {
  path: string;
  /** "dev.yaml". */
  file: string;
  /** The instance it makes. */
  name: string;
  /** What's in it. Missing when the file can't be read, with `error` saying why. */
  content?: TemplateFile;
  error?: string;
  instance?: Instance;
  /** The file was saved after its instance was made, so the instance doesn't have the changes. */
  changed: boolean;
}

export function manifestStatus(manifest: Manifest): string {
  return manifest.instance?.status ?? NOT_CREATED;
}

function expandHome(path: string): string {
  return path === "~" || path.startsWith("~/") ? join(homedir(), path.slice(1)) : path;
}

export function manifestsFolder(): string {
  return expandHome(getPreferenceValues<Preferences>().manifestsFolder?.trim() || "~/lima");
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/** Every manifest in the folder, with the instance it made. A missing folder has none. */
export async function listManifests(): Promise<Manifest[]> {
  const folder = manifestsFolder();
  let files: string[];
  try {
    files = (await readdir(folder)).filter(isTemplateFile).sort((a, b) => a.localeCompare(b));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
  const instances = await listInstances();
  return Promise.all(
    files.map(async (file): Promise<Manifest> => {
      const path = join(folder, file);
      const name = basename(file, extname(file));
      if (!NAME_PATTERN.test(name)) {
        return {
          path,
          file,
          name,
          changed: false,
          error: "Rename the file: instance names are letters and numbers, with . _ or - between them.",
        };
      }
      const instance = instances.find((entry) => entry.name === name);
      let content: TemplateFile | undefined;
      let error: string | undefined;
      try {
        content = await readTemplateFile(path);
      } catch (failure) {
        error = errorMessage(failure);
      }
      let changed = false;
      if (instance) {
        const made = await createdAt(instance);
        // A second of slack, since the file may be saved in the same moment Lima copies it.
        changed = made !== undefined && (await stat(path)).mtimeMs > made + 1000;
      }
      return { path, file, name, content, error, instance, changed };
    }),
  );
}

/** `name`, or `name-2`, `name-3`… when an instance already has it. */
export function freeName(name: string, instances: Instance[]): string {
  const taken = new Set(instances.map((instance) => instance.name));
  if (!taken.has(name)) return name;
  let count = 2;
  while (taken.has(`${name}-${count}`)) count += 1;
  return `${name}-${count}`;
}

/**
 * A starting point that builds on a template, with the usual settings written out but commented,
 * so the template's own values apply until they're filled in.
 */
function skeleton(name: string, template: string): string {
  return `# ${name}: run it from Run Manifest in Raycast. It makes an instance named ${name}.
# Every setting: https://lima-vm.io/docs/config/
base:
- template:${template}

# cpus: 4
# memory: 8GiB
# disk: 100GiB

# mounts:
# - location: "~/code"
#   writable: true

# portForwards:
# - guestPort: 8080
#   hostPort: 8080

# Runs on every boot, so keep it safe to run twice.
# provision:
# - mode: system
#   script: |
#     #!/bin/sh
#     set -eux
#     apt-get install -y jq
`;
}

/** Writes `<folder>/<name>.yaml`, never over a file that's there. */
export async function createManifest(name: string, template: string): Promise<string> {
  const folder = manifestsFolder();
  await mkdir(folder, { recursive: true });
  const path = join(folder, `${name}.yaml`);
  try {
    await writeFile(path, skeleton(name, template), { flag: "wx" });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "EEXIST") throw new Error(`There's already a ${name}.yaml`);
    throw error;
  }
  return path;
}
