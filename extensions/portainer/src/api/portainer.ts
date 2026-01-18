import { getPreferenceValues } from "@raycast/api";
import {
  Preferences,
  Endpoint,
  Container,
  ContainerDetails,
  Stack,
  DockerImage,
  Volume,
  VolumeListResponse,
  Network,
} from "./types";

class PortainerAPI {
  private baseUrl: string;
  private apiKey: string;
  private configuredEndpointId: string;
  private discoveredEndpointId: string | null = null;
  private endpointDiscoveryPromise: Promise<string> | null = null;

  constructor() {
    const preferences = getPreferenceValues<Preferences>();
    this.baseUrl = preferences.portainerUrl.replace(/\/$/, "");
    this.apiKey = preferences.apiKey;
    this.configuredEndpointId = preferences.defaultEndpointId || "";
  }

  private async request<T>(
    path: string,
    options: RequestInit = {},
  ): Promise<T> {
    const url = `${this.baseUrl}/api${path}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        "X-API-Key": this.apiKey,
        "Content-Type": "application/json",
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage: string;
      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.message || errorJson.details || errorText;
      } catch {
        errorMessage =
          errorText || `HTTP ${response.status}: ${response.statusText}`;
      }
      throw new Error(errorMessage);
    }

    // Handle empty responses
    const contentType = response.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      return {} as T;
    }

    const text = await response.text();
    if (!text) {
      return {} as T;
    }

    return JSON.parse(text) as T;
  }

  // Auto-discover the first available endpoint
  private async discoverEndpoint(): Promise<string> {
    // If already discovered, return cached value
    if (this.discoveredEndpointId) {
      return this.discoveredEndpointId;
    }

    // If discovery is in progress, wait for it
    if (this.endpointDiscoveryPromise) {
      return this.endpointDiscoveryPromise;
    }

    // Start discovery
    this.endpointDiscoveryPromise = (async () => {
      const endpoints = await this.getEndpoints();

      if (!endpoints || endpoints.length === 0) {
        throw new Error(
          "No environments found in Portainer. Please add an environment first.",
        );
      }

      // Use the first available endpoint
      this.discoveredEndpointId = String(endpoints[0].Id);
      return this.discoveredEndpointId;
    })();

    return this.endpointDiscoveryPromise;
  }

  // Get the endpoint ID - uses configured value or auto-discovers
  async getEndpointId(): Promise<string> {
    // If user configured an endpoint ID, try to use it
    if (this.configuredEndpointId) {
      return this.configuredEndpointId;
    }

    // Otherwise, auto-discover
    return this.discoverEndpoint();
  }

  // Synchronous version for URLs (uses cached value)
  getEndpointIdSync(): string {
    return this.discoveredEndpointId || this.configuredEndpointId || "1";
  }

  getPortainerUrl(): string {
    return this.baseUrl;
  }

  // Endpoints (Environments)
  async getEndpoints(): Promise<Endpoint[]> {
    return this.request<Endpoint[]>("/endpoints");
  }

  async getEndpoint(id: string | number): Promise<Endpoint> {
    return this.request<Endpoint>(`/endpoints/${id}`);
  }

  // Containers
  async getContainers(
    endpointId?: string | number,
    all = true,
  ): Promise<Container[]> {
    const id = endpointId || (await this.getEndpointId());
    return this.request<Container[]>(
      `/endpoints/${id}/docker/containers/json?all=${all}`,
    );
  }

  async getContainerDetails(
    containerId: string,
    endpointId?: string | number,
  ): Promise<ContainerDetails> {
    const id = endpointId || (await this.getEndpointId());
    return this.request<ContainerDetails>(
      `/endpoints/${id}/docker/containers/${containerId}/json`,
    );
  }

  async startContainer(
    containerId: string,
    endpointId?: string | number,
  ): Promise<void> {
    const id = endpointId || (await this.getEndpointId());
    await this.request(
      `/endpoints/${id}/docker/containers/${containerId}/start`,
      {
        method: "POST",
      },
    );
  }

  async stopContainer(
    containerId: string,
    endpointId?: string | number,
  ): Promise<void> {
    const id = endpointId || (await this.getEndpointId());
    await this.request(
      `/endpoints/${id}/docker/containers/${containerId}/stop`,
      {
        method: "POST",
      },
    );
  }

  async restartContainer(
    containerId: string,
    endpointId?: string | number,
  ): Promise<void> {
    const id = endpointId || (await this.getEndpointId());
    await this.request(
      `/endpoints/${id}/docker/containers/${containerId}/restart`,
      {
        method: "POST",
      },
    );
  }

  async getContainerLogs(
    containerId: string,
    endpointId?: string | number,
    options: { tail?: number; timestamps?: boolean } = {},
  ): Promise<string> {
    const id = endpointId || (await this.getEndpointId());
    const { tail = 100, timestamps = true } = options;

    const url = `${this.baseUrl}/api/endpoints/${id}/docker/containers/${containerId}/logs?stdout=true&stderr=true&tail=${tail}&timestamps=${timestamps}`;

    const response = await fetch(url, {
      headers: {
        "X-API-Key": this.apiKey,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch logs: ${response.statusText}`);
    }

    const buffer = await response.arrayBuffer();
    return decodeDockerLogs(buffer);
  }

  // Stacks
  async getStacks(): Promise<Stack[]> {
    return this.request<Stack[]>("/stacks");
  }

  async getStack(stackId: number): Promise<Stack> {
    return this.request<Stack>(`/stacks/${stackId}`);
  }

  async startStack(
    stackId: number,
    endpointId?: string | number,
  ): Promise<void> {
    const id = endpointId || (await this.getEndpointId());
    await this.request(`/stacks/${stackId}/start?endpointId=${id}`, {
      method: "POST",
    });
  }

  async stopStack(
    stackId: number,
    endpointId?: string | number,
  ): Promise<void> {
    const id = endpointId || (await this.getEndpointId());
    await this.request(`/stacks/${stackId}/stop?endpointId=${id}`, {
      method: "POST",
    });
  }

  // Images
  async getImages(endpointId?: string | number): Promise<DockerImage[]> {
    const id = endpointId || (await this.getEndpointId());
    return this.request<DockerImage[]>(`/endpoints/${id}/docker/images/json`);
  }

  async deleteImage(
    imageId: string,
    endpointId?: string | number,
    force = false,
  ): Promise<void> {
    const id = endpointId || (await this.getEndpointId());
    await this.request(
      `/endpoints/${id}/docker/images/${imageId}?force=${force}`,
      {
        method: "DELETE",
      },
    );
  }

  // Volumes
  async getVolumes(endpointId?: string | number): Promise<Volume[]> {
    const id = endpointId || (await this.getEndpointId());
    const response = await this.request<VolumeListResponse>(
      `/endpoints/${id}/docker/volumes`,
    );
    return response.Volumes || [];
  }

  async deleteVolume(
    volumeName: string,
    endpointId?: string | number,
    force = false,
  ): Promise<void> {
    const id = endpointId || (await this.getEndpointId());
    await this.request(
      `/endpoints/${id}/docker/volumes/${volumeName}?force=${force}`,
      {
        method: "DELETE",
      },
    );
  }

  // Networks
  async getNetworks(endpointId?: string | number): Promise<Network[]> {
    const id = endpointId || (await this.getEndpointId());
    return this.request<Network[]>(`/endpoints/${id}/docker/networks`);
  }

  async deleteNetwork(
    networkId: string,
    endpointId?: string | number,
  ): Promise<void> {
    const id = endpointId || (await this.getEndpointId());
    await this.request(`/endpoints/${id}/docker/networks/${networkId}`, {
      method: "DELETE",
    });
  }
}

// Helper to decode Docker log stream format
// Docker logs use a multiplexed format with 8-byte headers
function decodeDockerLogs(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const lines: string[] = [];
  let i = 0;

  while (i < bytes.length) {
    // Check if we have Docker multiplexed format (header starts with 0x01 or 0x02)
    if (bytes[i] === 0x01 || bytes[i] === 0x02) {
      // Skip 8-byte header
      if (i + 8 > bytes.length) break;

      // Read payload size from bytes 4-7 (big-endian)
      const size =
        (bytes[i + 4] << 24) |
        (bytes[i + 5] << 16) |
        (bytes[i + 6] << 8) |
        bytes[i + 7];
      i += 8;

      if (i + size > bytes.length) break;

      // Extract the log line
      const lineBytes = bytes.slice(i, i + size);
      const line = new TextDecoder().decode(lineBytes);
      lines.push(line.trimEnd());
      i += size;
    } else {
      // Plain text format - read until end or next potential header
      let end = i;
      while (end < bytes.length && bytes[end] !== 0x01 && bytes[end] !== 0x02) {
        end++;
      }
      if (end > i) {
        const line = new TextDecoder().decode(bytes.slice(i, end));
        lines.push(line.trimEnd());
      }
      i = end;
    }
  }

  return lines.join("\n");
}

// Export singleton instance
export const portainerApi = new PortainerAPI();

// Export class for testing
export { PortainerAPI };
