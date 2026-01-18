import {
  Container,
  ContainerPort,
  DockerImage,
  Stack,
  StackType,
} from "../api/types";

/**
 * Format container name (remove leading slash)
 */
export function formatContainerName(container: Container): string {
  const name = container.Names[0] || "Unknown";
  return name.startsWith("/") ? name.slice(1) : name;
}

/**
 * Format container ports for display
 */
export function formatPorts(ports: ContainerPort[]): string {
  if (!ports || ports.length === 0) return "No ports";

  return (
    ports
      .filter((p) => p.PublicPort)
      .map((p) => `${p.PublicPort}:${p.PrivatePort}/${p.Type}`)
      .join(", ") || "No exposed ports"
  );
}

/**
 * Format container short ID
 */
export function formatShortId(id: string): string {
  return id.slice(0, 12);
}

/**
 * Format bytes to human readable size
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";

  const units = ["B", "KB", "MB", "GB", "TB"];
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${units[i]}`;
}

/**
 * Format Unix timestamp to relative time
 */
export function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const date = timestamp * 1000; // Convert to milliseconds if seconds
  const diff = now - date;

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30);

  if (months > 0) return `${months} month${months > 1 ? "s" : ""} ago`;
  if (weeks > 0) return `${weeks} week${weeks > 1 ? "s" : ""} ago`;
  if (days > 0) return `${days} day${days > 1 ? "s" : ""} ago`;
  if (hours > 0) return `${hours} hour${hours > 1 ? "s" : ""} ago`;
  if (minutes > 0) return `${minutes} minute${minutes > 1 ? "s" : ""} ago`;
  return "Just now";
}

/**
 * Format ISO date string to relative time
 */
export function formatDateToRelative(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days} day${days > 1 ? "s" : ""} ago`;
  if (hours > 0) return `${hours} hour${hours > 1 ? "s" : ""} ago`;
  if (minutes > 0) return `${minutes} minute${minutes > 1 ? "s" : ""} ago`;
  return "Just now";
}

/**
 * Format image repository and tag
 */
export function formatImageName(image: DockerImage): string {
  if (!image.RepoTags || image.RepoTags.length === 0) {
    return "<none>:<none>";
  }
  return image.RepoTags[0];
}

/**
 * Get image repository without tag
 */
export function getImageRepository(image: DockerImage): string {
  const fullName = formatImageName(image);
  const colonIndex = fullName.lastIndexOf(":");
  return colonIndex > 0 ? fullName.slice(0, colonIndex) : fullName;
}

/**
 * Get image tag
 */
export function getImageTag(image: DockerImage): string {
  const fullName = formatImageName(image);
  const colonIndex = fullName.lastIndexOf(":");
  return colonIndex > 0 ? fullName.slice(colonIndex + 1) : "latest";
}

/**
 * Format stack type
 */
export function formatStackType(type: StackType): string {
  switch (type) {
    case StackType.SwarmStack:
      return "Swarm";
    case StackType.ComposeStack:
      return "Compose";
    case StackType.KubernetesStack:
      return "Kubernetes";
    default:
      return "Unknown";
  }
}

/**
 * Get Portainer web UI URL for a resource
 */
export function getPortainerWebUrl(
  baseUrl: string,
  endpointId: string,
  type: string,
  id: string | number,
): string {
  const cleanBaseUrl = baseUrl.replace(/\/$/, "");

  switch (type) {
    case "container":
      return `${cleanBaseUrl}/#!/${endpointId}/docker/containers/${id}`;
    case "stack":
      return `${cleanBaseUrl}/#!/${endpointId}/docker/stacks/${id}`;
    case "image":
      return `${cleanBaseUrl}/#!/${endpointId}/docker/images/${id}`;
    case "volume":
      return `${cleanBaseUrl}/#!/${endpointId}/docker/volumes/${id}`;
    case "network":
      return `${cleanBaseUrl}/#!/${endpointId}/docker/networks/${id}`;
    default:
      return cleanBaseUrl;
  }
}

/**
 * Get container environment variables as formatted string
 */
export function formatEnvVars(env: string[]): string {
  return env.map((e) => `- ${e}`).join("\n");
}

/**
 * Check if a container is running
 */
export function isContainerRunning(container: Container): boolean {
  return container.State === "running";
}

/**
 * Check if a stack is active
 */
export function isStackActive(stack: Stack): boolean {
  return stack.Status === 1;
}

/**
 * Extract stack name from container labels
 */
export function getStackNameFromLabels(
  labels: Record<string, string>,
): string | null {
  return labels["com.docker.compose.project"] || null;
}
