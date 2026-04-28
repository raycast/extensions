// Unit tests for ServerService, ClusterService, and BaseService stale cache fallback

import { LocalStorage, showToast } from "@raycast/api";
import { CLIExecutor } from "../core/CLIExecutor";
import { ResourceCache } from "../core/ResourceCache";
import { ConfigManager } from "../config/ConfigManager";
import { ServerService } from "../services/ServerService";
import { ClusterService } from "../services/ClusterService";
import { BaseService } from "../services/BaseService";
import { CLIError } from "../core/errors";
import { Server, MagnumCluster } from "../services/types";

const mockShowToast = showToast as jest.MockedFunction<typeof showToast>;

// Access the underlying Map for test cleanup
const mockStorage = (LocalStorage as unknown as { __storage: Map<string, string> }).__storage;

/**
 * Concrete subclass of BaseService for testing fetchData.
 */
class TestService extends BaseService {
  async fetchItems<T>(args: string[]): Promise<T> {
    return this.fetchData<T>(args);
  }
}

/**
 * Creates a mock CLIExecutor with controllable run/exec methods.
 */
function createMockCLI(): jest.Mocked<CLIExecutor> {
  return {
    run: jest.fn(),
    exec: jest.fn(),
  } as unknown as jest.Mocked<CLIExecutor>;
}

/**
 * Creates a mock ConfigManager (not used directly in these tests,
 * but required by the BaseService constructor).
 */
function createMockConfigManager(): ConfigManager {
  return {} as ConfigManager;
}

// ─── ServerService ───────────────────────────────────────────────────────────

describe("ServerService - Unit Tests", () => {
  let cli: jest.Mocked<CLIExecutor>;
  let cache: ResourceCache;
  let service: ServerService;

  const realisticServers: Server[] = [
    {
      id: "abc-123-def-456",
      name: "web-server-01",
      status: "ACTIVE",
      flavor: "m1.large",
      image: "Ubuntu 22.04",
      networks: "private=10.0.0.5; public=203.0.113.10",
      security_groups: "default, web-sg",
      availability_zone: "az-1",
      key_name: "my-keypair",
      created: "2024-01-15T10:30:00Z",
      updated: "2024-01-15T12:00:00Z",
    },
    {
      id: "ghi-789-jkl-012",
      name: "db-server-01",
      status: "SHUTOFF",
      flavor: "m1.xlarge",
      image: "CentOS 9",
      networks: "private=10.0.0.10",
      security_groups: "default, db-sg",
      availability_zone: "az-2",
      key_name: null,
      created: "2024-02-01T08:00:00Z",
      updated: "2024-02-10T14:30:00Z",
    },
  ];

  beforeEach(() => {
    mockShowToast.mockClear();
    mockStorage.clear();
    cli = createMockCLI();
    cache = new ResourceCache();
    service = new ServerService(cli, cache, createMockConfigManager());
  });

  // Validates: Requirements 3.1
  it("listServers returns parsed server data from CLI", async () => {
    cli.run.mockResolvedValueOnce(realisticServers);

    const result = await service.listServers();

    expect(result).toEqual(realisticServers);
    expect(result).toHaveLength(2);
    expect(result[0].name).toBe("web-server-01");
    expect(result[0].status).toBe("ACTIVE");
    expect(result[1].flavor).toBe("m1.xlarge");
    expect(cli.run).toHaveBeenCalledWith(["server", "list"]);
  });

  // Validates: Requirements 3.1
  it("listServers returns empty array on CLI error", async () => {
    cli.run.mockRejectedValueOnce(new CLIError("Connection refused", 1, "Connection refused", ["server", "list"]));

    const result = await service.listServers();

    expect(result).toEqual([]);
    expect(mockShowToast).toHaveBeenCalled();
  });

  // Validates: Requirements 3.2
  it("getServer returns detailed server data", async () => {
    cli.run.mockResolvedValueOnce(realisticServers[0]);

    const result = await service.getServer("abc-123-def-456");

    expect(result).toEqual(realisticServers[0]);
    expect(cli.run).toHaveBeenCalledWith(["server", "show", "abc-123-def-456"]);
  });

  // Validates: Requirements 3.3
  it("startServer calls exec with correct args", async () => {
    cli.exec.mockResolvedValueOnce(undefined);

    await service.startServer("abc-123-def-456");

    expect(cli.exec).toHaveBeenCalledWith(["server", "start", "abc-123-def-456"]);
  });

  // Validates: Requirements 3.4
  it("stopServer calls exec with correct args", async () => {
    cli.exec.mockResolvedValueOnce(undefined);

    await service.stopServer("ghi-789-jkl-012");

    expect(cli.exec).toHaveBeenCalledWith(["server", "stop", "ghi-789-jkl-012"]);
  });

  // Validates: Requirements 3.5
  it("rebootServer calls exec with --soft flag", async () => {
    cli.exec.mockResolvedValueOnce(undefined);

    await service.rebootServer("abc-123-def-456");

    expect(cli.exec).toHaveBeenCalledWith(["server", "reboot", "--soft", "abc-123-def-456"]);
  });

  // Validates: Requirements 3.7
  it("startServer throws on failure", async () => {
    cli.exec.mockRejectedValueOnce(new CLIError("Server locked", 1, "Server locked", []));

    await expect(service.startServer("abc-123-def-456")).rejects.toThrow(CLIError);
  });
});

// ─── ClusterService ──────────────────────────────────────────────────────────

describe("ClusterService - Unit Tests", () => {
  let cli: jest.Mocked<CLIExecutor>;
  let cache: ResourceCache;
  let service: ClusterService;

  const realisticClusters: MagnumCluster[] = [
    {
      uuid: "cluster-001",
      name: "k8s-prod",
      status: "CREATE_COMPLETE",
      status_reason: "Stack CREATE completed successfully",
      cluster_template_id: "tmpl-abc",
      master_count: 3,
      node_count: 5,
      keypair: "my-key",
      api_address: "https://10.0.0.100:6443",
      discovery_url: "https://discovery.example.com/abc",
      created_at: "2024-01-10T09:00:00Z",
      updated_at: "2024-01-10T09:30:00Z",
      labels: { kube_tag: "v1.28.0" },
      coe_version: "v1.28.0",
    },
  ];

  beforeEach(() => {
    mockShowToast.mockClear();
    mockStorage.clear();
    cli = createMockCLI();
    cache = new ResourceCache();
    service = new ClusterService(cli, cache, createMockConfigManager());
  });

  // Validates: Requirements 8.1
  it("listClusters returns parsed cluster data from CLI", async () => {
    cli.run.mockResolvedValueOnce(realisticClusters);

    const result = await service.listClusters();

    expect(result).toEqual(realisticClusters);
    expect(result[0].name).toBe("k8s-prod");
    expect(cli.run).toHaveBeenCalledWith(["coe", "cluster", "list"]);
  });

  // Validates: Requirements 8.6
  describe("Magnum unavailable detection from stderr patterns", () => {
    const unavailablePatterns = [
      "endpoint not found",
      "No endpoint for service",
      "service not available",
      "ERROR (CommandError): endpoint not found for container-infra",
      "No endpoint for service type container-infra",
    ];

    it.each(unavailablePatterns)(
      'returns empty array and shows informational Toast for stderr: "%s"',
      async (stderrMessage) => {
        cli.run.mockRejectedValueOnce(new CLIError(stderrMessage, 1, stderrMessage, ["coe", "cluster", "list"]));

        const result = await service.listClusters();

        expect(result).toEqual([]);
        expect(mockShowToast).toHaveBeenCalledWith(
          expect.objectContaining({
            title: "Magnum not available",
          }),
        );
      },
    );

    it("shows failure Toast for non-Magnum CLI errors", async () => {
      cli.run.mockRejectedValueOnce(
        new CLIError("Authentication failed", 1, "Authentication failed", ["coe", "cluster", "list"]),
      );

      const result = await service.listClusters();

      expect(result).toEqual([]);
      expect(mockShowToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Failed to list clusters",
        }),
      );
    });
  });
});

// ─── BaseService fetchData ───────────────────────────────────────────────────

describe("BaseService - fetchData calls CLI directly", () => {
  let cli: jest.Mocked<CLIExecutor>;
  let cache: ResourceCache;
  let service: TestService;

  beforeEach(() => {
    mockShowToast.mockClear();
    mockStorage.clear();
    cli = createMockCLI();
    cache = new ResourceCache();
    service = new TestService(cli, cache, createMockConfigManager());
  });

  it("fetches from CLI and returns result", async () => {
    const freshData = [{ id: "2", name: "fresh-server" }];
    cli.run.mockResolvedValueOnce(freshData);

    const result = await service.fetchItems<typeof freshData>(["server", "list"]);

    expect(result).toEqual(freshData);
    expect(cli.run).toHaveBeenCalledWith(["server", "list"]);
  });

  it("throws when CLI fails", async () => {
    cli.run.mockRejectedValueOnce(new CLIError("Connection refused", 1, "Connection refused", ["server", "list"]));

    await expect(service.fetchItems(["server", "list"])).rejects.toThrow(CLIError);
  });
});
