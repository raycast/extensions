import { Color, Icon, Image } from "@raycast/api";
import { homedir } from "node:os";

export interface Mount {
  location: string;
  mountPoint?: string;
  writable?: boolean;
}

export interface PortForward {
  guestPort?: number;
  hostPort?: number;
}

/** One line of `limactl list --format json`, the fields shown here. */
export interface Instance {
  name: string;
  status: string;
  dir: string;
  vmType: string;
  arch: string;
  cpus: number;
  /** Bytes. */
  memory: number;
  /** Bytes. */
  disk: number;
  /** The template's note for after it starts, often how to use it. */
  message?: string;
  sshAddress?: string;
  sshLocalPort?: number;
  sshConfigFile?: string;
  hostname?: string;
  errors?: string[] | null;
  /** Protected instances can't be deleted until `limactl unprotect`. */
  protected?: boolean;
  limaVersion?: string;
  config?: {
    os?: string;
    mounts?: Mount[] | null;
    portForwards?: PortForward[] | null;
    /** The images Lima can boot it from, one per architecture. */
    images?: { location: string }[] | null;
    containerd?: { archives?: { location: string }[] | null };
    /** Lima disks attached to it, by name, or as `{ name }`. */
    additionalDisks?: (string | { name?: string })[] | null;
  };
}

/** Set while something started from here is running on an instance. */
export type Pending = "Creating" | "Starting" | "Stopping" | "Restarting" | "Recreating" | "Deleting";

/** A manifest whose instance hasn't been made yet. Not a status Lima has. */
export const NOT_CREATED = "Not Created";

/** Running first, then stopped, then anything Lima couldn't make sense of, then manifests not run yet. */
const STATUS_ORDER = ["Running", "Stopped", "Broken"];

function rank(status: string): number {
  if (status === NOT_CREATED) return STATUS_ORDER.length + 1;
  const index = STATUS_ORDER.indexOf(status);
  return index < 0 ? STATUS_ORDER.length : index;
}

/** A group per status, in STATUS_ORDER. */
export function groupByStatus<T>(items: T[], statusOf: (item: T) => string): { status: string; items: T[] }[] {
  const statuses = [...new Set(items.map(statusOf))].sort((a, b) => rank(a) - rank(b) || a.localeCompare(b));
  return statuses.map((status) => ({ status, items: items.filter((item) => statusOf(item) === status) }));
}

export function isRunning(instance: Instance): boolean {
  return instance.status === "Running";
}

export function statusColor(status: string): Color {
  if (status === "Running") return Color.Green;
  if (status === "Stopped" || status === NOT_CREATED) return Color.SecondaryText;
  return Color.Red;
}

export function statusIcon(status: string, pending?: Pending): Image.ImageLike {
  if (pending)
    return {
      source: Icon.CircleProgress50,
      tintColor: pending === "Deleting" || pending === "Recreating" ? Color.Red : Color.Blue,
    };
  if (status === "Running") return { source: Icon.CircleFilled, tintColor: Color.Green };
  if (status === "Stopped") return { source: Icon.Circle, tintColor: Color.SecondaryText };
  if (status === NOT_CREATED) return { source: Icon.Dot, tintColor: Color.SecondaryText };
  return { source: Icon.Warning, tintColor: Color.Red };
}

/** The names of the Lima disks (volumes) attached to an instance. */
export function volumeNames(instance: Instance): string[] {
  return (instance.config?.additionalDisks ?? []).flatMap((disk) =>
    typeof disk === "string" ? [disk] : disk?.name ? [disk.name] : [],
  );
}

/** "254 MiB" under a GiB, "2.3 GiB" over. */
export function size(bytes: number): string {
  if (bytes < 1024 ** 3) return `${Math.max(1, Math.round(bytes / 1024 ** 2))} MiB`;
  return `${(bytes / 1024 ** 3).toFixed(1)} GiB`;
}

/** "6 GiB", or "1.5 GiB" when it isn't whole. */
export function gib(bytes: number): string {
  const value = bytes / 1024 ** 3;
  return `${Number.isInteger(value) ? value : value.toFixed(1)} GiB`;
}

/** "VZ", "QEMU" and friends, as Lima's docs write them. */
export function vmTypeLabel(vmType: string): string {
  const known: Record<string, string> = { vz: "VZ", qemu: "QEMU", wsl2: "WSL2", krunkit: "krunkit" };
  return known[vmType] ?? vmType;
}

/** Paths under the home folder start with ~, so they fit the panel. */
export function tildify(path: string): string {
  const home = homedir();
  return path === home || path.startsWith(`${home}/`) ? `~${path.slice(home.length)}` : path;
}

export function shellCommand(instance: Instance): string {
  return `limactl shell ${instance.name}`;
}

export function sshCommand(instance: Instance): string | undefined {
  if (!instance.sshConfigFile) return undefined;
  return `ssh -F ${quote(instance.sshConfigFile)} ${instance.hostname ?? `lima-${instance.name}`}`;
}

/** Single quotes for a shell, only when needed. */
function quote(value: string): string {
  return /^[\w@%+=:,./-]+$/.test(value) ? value : `'${value.replace(/'/g, `'\\''`)}'`;
}

/** "2 Instances · 1 Running". */
export function summarize(instances: Instance[]): string {
  const running = instances.filter(isRunning).length;
  const count = `${instances.length} ${instances.length === 1 ? "Instance" : "Instances"}`;
  return instances.length ? `${count} · ${running} Running` : count;
}
