import { RUNNING_STATE } from "./constants";
import { humanBytes, shortenImageRef, stripCidr } from "./format";

// ---------------------------------------------------------------------------
// Raw shapes — these mirror the JSON emitted by `container ... --format json`.
// Verified against container CLI v1.0.0. Optional fields are marked optional so
// parsing tolerates containers/images in different states.
// ---------------------------------------------------------------------------

export interface RawContainerNetwork {
  network?: string;
  hostname?: string;
  ipv4Address?: string;
  ipv6Address?: string;
}

export interface RawContainer {
  id: string;
  configuration: {
    id: string;
    image: { reference: string; descriptor?: { digest: string; size: number; mediaType?: string } };
    platform: { os: string; architecture: string; variant?: string };
    resources: { cpus: number; memoryInBytes: number; cpuOverhead?: number };
    labels?: Record<string, string>;
    creationDate?: string;
    initProcess?: {
      executable?: string;
      arguments?: string[];
      environment?: string[];
      workingDirectory?: string;
    };
  };
  status: {
    state: string;
    startedDate?: string;
    networks?: RawContainerNetwork[];
  };
}

export interface RawImageVariant {
  digest?: string;
  size?: number;
  platform?: { architecture?: string; os?: string; variant?: string };
  config?: {
    architecture?: string;
    os?: string;
    config?: { Cmd?: string[]; Entrypoint?: string[]; Env?: string[]; WorkingDir?: string };
  };
}

export interface RawImage {
  id: string;
  configuration: {
    name: string;
    creationDate?: string;
    descriptor: { digest: string; size: number; mediaType?: string };
  };
  variants?: RawImageVariant[];
}

export interface RawVolume {
  id: string;
  configuration: {
    name: string;
    driver?: string;
    format?: string;
    sizeInBytes?: number;
    source?: string;
    labels?: Record<string, string>;
    creationDate?: string;
  };
}

export interface SystemStatus {
  status: string; // "running" | "not running" | "unregistered"
  apiServerVersion?: string;
  apiServerBuild?: string;
  apiServerCommit?: string;
  appRoot?: string;
  installRoot?: string;
}

export interface SystemDfEntry {
  active: number;
  reclaimable: number;
  sizeInBytes: number;
  total: number;
}

export interface SystemDf {
  containers: SystemDfEntry;
  images: SystemDfEntry;
  volumes: SystemDfEntry;
}

// ---------------------------------------------------------------------------
// View models — precomputed, presentation-ready shapes consumed by the UI.
// Components never touch the raw JSON shape directly.
// ---------------------------------------------------------------------------

export interface ContainerVM {
  id: string;
  image: string;
  imageShort: string;
  state: string;
  isRunning: boolean;
  ip?: string;
  os: string;
  arch: string;
  cpus: number;
  memory: string;
  startedAt?: Date;
  raw: RawContainer;
}

export function toContainerVM(raw: RawContainer): ContainerVM {
  const firstNetwork = raw.status.networks?.find((network) => network.ipv4Address);
  return {
    id: raw.id,
    image: raw.configuration.image.reference,
    imageShort: shortenImageRef(raw.configuration.image.reference),
    state: raw.status.state,
    isRunning: raw.status.state === RUNNING_STATE,
    ip: stripCidr(firstNetwork?.ipv4Address),
    os: raw.configuration.platform.os,
    arch: raw.configuration.platform.architecture,
    cpus: raw.configuration.resources.cpus,
    memory: humanBytes(raw.configuration.resources.memoryInBytes),
    startedAt: raw.status.startedDate ? new Date(raw.status.startedDate) : undefined,
    raw,
  };
}

export interface ImageVM {
  /** Unique row key — a digest can be shared across tags, so key on the name. */
  key: string;
  name: string;
  nameShort: string;
  id: string;
  digest: string;
  size: string;
  architectures: string[];
  raw: RawImage;
}

export function toImageVM(raw: RawImage): ImageVM {
  const variants = raw.variants ?? [];
  // The real image size lives in the variants; descriptor.size is just the
  // (tiny) manifest/index size, so only fall back to it when there are none.
  const variantSize = variants.reduce((sum, variant) => sum + (variant.size ?? 0), 0);
  const size = variantSize > 0 ? variantSize : raw.configuration.descriptor.size;
  const architectures = Array.from(
    new Set(
      variants
        .map((variant) => variant.platform?.architecture ?? variant.config?.architecture)
        .filter((arch): arch is string => Boolean(arch)),
    ),
  );
  return {
    key: raw.configuration.name,
    name: raw.configuration.name,
    nameShort: shortenImageRef(raw.configuration.name),
    id: raw.id,
    digest: raw.configuration.descriptor.digest,
    size: humanBytes(size),
    architectures,
    raw,
  };
}

export interface VolumeVM {
  name: string;
  driver: string;
  format?: string;
  size: string;
  source?: string;
  raw: RawVolume;
}

export function toVolumeVM(raw: RawVolume): VolumeVM {
  return {
    name: raw.configuration.name,
    driver: raw.configuration.driver ?? "local",
    format: raw.configuration.format,
    size: raw.configuration.sizeInBytes ? humanBytes(raw.configuration.sizeInBytes) : "—",
    source: raw.configuration.source,
    raw,
  };
}
