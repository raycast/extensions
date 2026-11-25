import { Color, Icon } from "@raycast/api";
import { ArtifactDockerImage, ArtifactPackage, ArtifactPackageVersion, ArtifactRepository } from "../../utils/gcpApi";

export interface ParsedRepository {
  location: string;
  repoName: string;
  formatLabel: string;
  modeLabel: string;
  registryUri: string;
  consoleUrl: string;
}

export interface ParsedDockerImage {
  imageName: string;
  digest: string;
  shortDigest: string;
  tags: string[];
  /** Pull URI with the primary tag when tagged, otherwise the digest URI. */
  primaryPullUri: string;
  /** Pull URI pinned by digest (`...@sha256:...`). */
  digestUri: string;
  /** Canonical version resource path used for `DELETE .../packages/{pkg}/versions/{ver}`. */
  versionResourceName: string | null;
  consoleUrl: string;
}

export function formatRepositoryFormat(format?: string): string {
  switch ((format || "").toUpperCase()) {
    case "DOCKER":
      return "Docker";
    case "NPM":
      return "npm";
    case "PYTHON":
      return "Python";
    case "MAVEN":
      return "Maven";
    case "GO":
      return "Go";
    case "APT":
      return "APT";
    case "YUM":
      return "YUM";
    case "KFP":
      return "Kubeflow";
    case "GENERIC":
      return "Generic";
    default:
      return format || "Unknown";
  }
}

export function getFormatPresentation(format?: string): { icon: Icon; color: Color } {
  switch ((format || "").toUpperCase()) {
    case "DOCKER":
      return { icon: Icon.Box, color: Color.Blue };
    case "NPM":
      return { icon: Icon.CodeBlock, color: Color.Red };
    case "PYTHON":
      return { icon: Icon.Code, color: Color.Yellow };
    case "MAVEN":
      return { icon: Icon.Hammer, color: Color.Orange };
    case "GO":
      return { icon: Icon.Terminal, color: Color.Blue };
    case "APT":
    case "YUM":
      return { icon: Icon.HardDrive, color: Color.Purple };
    default:
      return { icon: Icon.Folder, color: Color.SecondaryText };
  }
}

export function formatRepositoryMode(mode?: string): string {
  switch ((mode || "").toUpperCase()) {
    case "STANDARD_REPOSITORY":
      return "Standard";
    case "REMOTE_REPOSITORY":
      return "Remote";
    case "VIRTUAL_REPOSITORY":
      return "Virtual";
    default:
      return mode ? mode.replace(/_REPOSITORY$/i, "") : "Standard";
  }
}

export function parseRepository(repo: ArtifactRepository, projectId: string): ParsedRepository {
  // Format: projects/{project}/locations/{location}/repositories/{repoName}
  const parts = repo.name.split("/");
  const location = parts[3] || "unknown";
  const repoName = parts[5] || repo.name;
  const formatLower = (repo.format || "generic").toLowerCase();

  const registryUri = repo.registryUri || `${location}-${formatLower}.pkg.dev/${projectId}/${repoName}`;

  const consoleUrl = `https://console.cloud.google.com/artifacts/${formatLower}/${encodeURIComponent(projectId)}/${encodeURIComponent(location)}/${encodeURIComponent(repoName)}?project=${encodeURIComponent(projectId)}`;

  return {
    location,
    repoName,
    formatLabel: formatRepositoryFormat(repo.format),
    modeLabel: formatRepositoryMode(repo.mode),
    registryUri,
    consoleUrl,
  };
}

export function getDockerAuthHost(registryUri: string, location: string): string {
  const host = registryUri.split("/")[0];
  return host || `${location}-docker.pkg.dev`;
}

export function parseDockerImage(
  image: ArtifactDockerImage,
  projectId: string,
  location: string,
  repoName: string,
): ParsedDockerImage {
  const tags = image.tags ?? [];

  // image.uri: {location}-docker.pkg.dev/{project}/{repo}/{imageName}@sha256:{hash}
  // Domain-scoped projects (example.com:proj) appear as example.com/proj in Docker URIs.
  const atIdx = image.uri.lastIndexOf("@");
  const baseUri = atIdx >= 0 ? image.uri.slice(0, atIdx) : image.uri;
  const digest = atIdx >= 0 ? image.uri.slice(atIdx + 1) : "";

  const normalizedProjectPath = projectId.replace(":", "/");
  const repoPrefix = `/${normalizedProjectPath}/${repoName}/`;
  const prefixIdx = baseUri.indexOf(repoPrefix);
  const imageName =
    prefixIdx >= 0
      ? baseUri.slice(prefixIdx + repoPrefix.length)
      : baseUri.split("/").slice(3).join("/") || image.name.split("/").pop() || image.uri;

  const shortDigest = digest.startsWith("sha256:") ? `sha256:${digest.slice(7, 19)}…` : digest || "—";

  const primaryPullUri = tags.length > 0 ? `${baseUri}:${tags[0]}` : image.uri;
  const digestUri = image.uri;

  // Build version resource name for deletion:
  // image.name: projects/{p}/locations/{loc}/repositories/{repo}/dockerImages/{encodedPkg}@sha256:{hash}
  let versionResourceName: string | null = null;
  const marker = "/dockerImages/";
  const markerIdx = image.name.lastIndexOf(marker);
  if (markerIdx >= 0) {
    const repoResourcePrefix = image.name.slice(0, markerIdx);
    const tail = image.name.slice(markerIdx + marker.length);
    const tailAt = tail.lastIndexOf("@");
    if (tailAt > 0) {
      const encodedPkg = tail.slice(0, tailAt);
      const versionId = tail.slice(tailAt + 1);
      versionResourceName = `${repoResourcePrefix}/packages/${encodedPkg}/versions/${versionId}`;
    }
  }

  const consoleUrl = `https://console.cloud.google.com/artifacts/docker/${encodeURIComponent(projectId)}/${encodeURIComponent(location)}/${encodeURIComponent(repoName)}/${encodeURIComponent(imageName)}?project=${encodeURIComponent(projectId)}`;

  return {
    imageName,
    digest,
    shortDigest,
    tags,
    primaryPullUri,
    digestUri,
    versionResourceName,
    consoleUrl,
  };
}

function extractTrailingSegment(resourceName: string, marker: string): string {
  const idx = resourceName.lastIndexOf(marker);
  const raw = idx >= 0 ? resourceName.slice(idx + marker.length) : resourceName.split("/").pop() || resourceName;
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

export function extractPackageName(pkg: ArtifactPackage): string {
  if (pkg.displayName) return pkg.displayName;
  return extractTrailingSegment(pkg.name, "/packages/");
}

export function extractVersionId(version: ArtifactPackageVersion): string {
  return extractTrailingSegment(version.name, "/versions/");
}

export function extractTagName(tagResourceName: string): string {
  return extractTrailingSegment(tagResourceName, "/tags/");
}

export function formatBytes(bytesValue?: string | number): string {
  const bytes = typeof bytesValue === "string" ? Number(bytesValue) : bytesValue;
  if (!bytes || Number.isNaN(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / Math.pow(1024, exponent);
  return `${value >= 100 || exponent === 0 ? value.toFixed(0) : value.toFixed(1)} ${units[exponent]}`;
}

export function formatTimestamp(value?: string): string {
  if (!value) return "—";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString();
}

export function formatRelativeTime(value?: string): string {
  if (!value) return "";
  const ts = new Date(value).getTime();
  if (Number.isNaN(ts)) return "";
  const diffMs = Math.max(0, Date.now() - ts);
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 30) return `${diffDays}d ago`;
  return new Date(ts).toLocaleDateString();
}

export function formatMediaType(mediaType?: string): string {
  if (!mediaType) return "—";
  if (mediaType.includes("oci.image.index")) return "OCI Image Index";
  if (mediaType.includes("oci.image.manifest")) return "OCI Image Manifest";
  if (mediaType.includes("docker.distribution.manifest.list")) return "Docker Manifest List";
  if (mediaType.includes("docker.distribution.manifest")) return "Docker Image Manifest";
  return mediaType;
}
