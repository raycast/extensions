import { describe, it, expect, vi, beforeEach } from "vitest";
import { createInstallation, registerDevice, createSession, performFullSetup, refreshSession } from "./auth";
import { getPreferenceValues } from "@raycast/api";

// Mock dependencies
vi.mock("./client", () => ({
  post: vi.fn(),
}));

vi.mock("../lib/crypto", () => ({
  generateRsaKeyPair: vi.fn(() => ({
    publicKey: "mock-public-key",
    privateKey: "mock-private-key",
  })),
}));

vi.mock("../lib/storage", () => ({
  getApiKey: vi.fn(() => "test-api-key"),
  getInstallationToken: vi.fn(),
  setInstallationToken: vi.fn(),
  getServerPublicKey: vi.fn(),
  setServerPublicKey: vi.fn(),
  getDeviceId: vi.fn(),
  setDeviceId: vi.fn(),
  getSessionToken: vi.fn(),
  setSessionToken: vi.fn(),
  getUserId: vi.fn(),
  setUserId: vi.fn(),
  getRsaPublicKey: vi.fn(),
  setRsaPublicKey: vi.fn(),
  getRsaPrivateKey: vi.fn(),
  setRsaPrivateKey: vi.fn(),
  setApiKeyFingerprint: vi.fn(),
  setStoredEnvironment: vi.fn(),
  getCurrentEnvironment: vi.fn(() => "sandbox"),
}));

vi.mock("../lib/logger", () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe("auth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getPreferenceValues).mockReturnValue({
      apiKey: "test-api-key",
      environment: "sandbox",
    });
  });

  describe("createInstallation", () => {
    it("creates installation and returns token and server public key", async () => {
      const { post } = await import("./client");
      vi.mocked(post).mockResolvedValue({
        Response: [
          { Token: { token: "installation-token" } },
          { ServerPublicKey: { server_public_key: "server-pub-key" } },
        ],
      });

      const result = await createInstallation("client-public-key");

      expect(result.token).toBe("installation-token");
      expect(result.serverPublicKey).toBe("server-pub-key");
      expect(post).toHaveBeenCalledWith("/installation", {
        client_public_key: "client-public-key",
      });
    });

    it("throws error when no token in response", async () => {
      const { post } = await import("./client");
      vi.mocked(post).mockResolvedValue({
        Response: [{ ServerPublicKey: { server_public_key: "key" } }],
      });

      await expect(createInstallation("key")).rejects.toThrow("No installation token received");
    });

    it("handles response without server public key", async () => {
      const { post } = await import("./client");
      vi.mocked(post).mockResolvedValue({
        Response: [{ Token: { token: "token" } }],
      });

      const result = await createInstallation("key");

      expect(result.token).toBe("token");
      expect(result.serverPublicKey).toBe("");
    });
  });

  describe("registerDevice", () => {
    it("registers device and returns device ID", async () => {
      const { post } = await import("./client");
      vi.mocked(post).mockResolvedValue({
        Response: [{ Id: { id: 12345 } }],
      });

      const result = await registerDevice("install-token", "api-key", "private-key");

      expect(result).toBe(12345);
      expect(post).toHaveBeenCalledWith(
        "/device-server",
        {
          description: "Raycast bunq Extension",
          secret: "api-key",
          permitted_ips: ["*"],
        },
        {
          authToken: "install-token",
          sign: true,
          privateKey: "private-key",
        },
      );
    });

    it("throws error when no device ID in response", async () => {
      const { post } = await import("./client");
      vi.mocked(post).mockResolvedValue({
        Response: [],
      });

      await expect(registerDevice("token", "key", "pk")).rejects.toThrow("No device ID received");
    });
  });

  describe("createSession", () => {
    it("creates session with UserPerson", async () => {
      const { post } = await import("./client");
      vi.mocked(post).mockResolvedValue({
        Response: [{ Token: { token: "session-token" } }, { UserPerson: { id: 999 } }],
      });

      const result = await createSession("install-token", "api-key", "private-key");

      expect(result.token).toBe("session-token");
      expect(result.userId).toBe(999);
    });

    it("creates session with UserCompany", async () => {
      const { post } = await import("./client");
      vi.mocked(post).mockResolvedValue({
        Response: [{ Token: { token: "session-token" } }, { UserCompany: { id: 888 } }],
      });

      const result = await createSession("install-token", "api-key", "private-key");

      expect(result.userId).toBe(888);
    });

    it("creates session with UserApiKey", async () => {
      const { post } = await import("./client");
      vi.mocked(post).mockResolvedValue({
        Response: [{ Token: { token: "session-token" } }, { UserApiKey: { id: 777 } }],
      });

      const result = await createSession("install-token", "api-key", "private-key");

      expect(result.userId).toBe(777);
    });

    it("throws error for invalid session response", async () => {
      const { post } = await import("./client");
      vi.mocked(post).mockResolvedValue({
        Response: [{ Token: { token: "token" } }],
      });

      await expect(createSession("t", "k", "pk")).rejects.toThrow("Invalid session response");
    });

    it("throws error when no token", async () => {
      const { post } = await import("./client");
      vi.mocked(post).mockResolvedValue({
        Response: [{ UserPerson: { id: 123 } }],
      });

      await expect(createSession("t", "k", "pk")).rejects.toThrow("Invalid session response");
    });
  });

  describe("performFullSetup", () => {
    it("performs complete setup flow", async () => {
      const { post } = await import("./client");
      const storage = await import("../lib/storage");

      // Mock installation response
      vi.mocked(post).mockResolvedValueOnce({
        Response: [{ Token: { token: "install-token" } }, { ServerPublicKey: { server_public_key: "server-key" } }],
      });

      // Mock device registration response
      vi.mocked(post).mockResolvedValueOnce({
        Response: [{ Id: { id: 12345 } }],
      });

      // Mock session response
      vi.mocked(post).mockResolvedValueOnce({
        Response: [{ Token: { token: "session-token" } }, { UserPerson: { id: 999 } }],
      });

      await performFullSetup();

      expect(storage.setRsaPublicKey).toHaveBeenCalledWith("mock-public-key");
      expect(storage.setRsaPrivateKey).toHaveBeenCalledWith("mock-private-key");
      expect(storage.setInstallationToken).toHaveBeenCalledWith("install-token");
      expect(storage.setServerPublicKey).toHaveBeenCalledWith("server-key");
      expect(storage.setDeviceId).toHaveBeenCalledWith("12345");
      expect(storage.setSessionToken).toHaveBeenCalledWith("session-token");
      expect(storage.setUserId).toHaveBeenCalledWith("999");
    });

    it("throws error when API key not configured", async () => {
      const storage = await import("../lib/storage");
      vi.mocked(storage.getApiKey).mockReturnValue("");

      await expect(performFullSetup()).rejects.toThrow("API key not configured");
    });
  });

  describe("refreshSession", () => {
    beforeEach(async () => {
      const storage = await import("../lib/storage");
      // Default: API key is set
      vi.mocked(storage.getApiKey).mockReturnValue("test-api-key");
    });

    it("refreshes session using existing credentials", async () => {
      const { post } = await import("./client");
      const storage = await import("../lib/storage");

      vi.mocked(storage.getInstallationToken).mockResolvedValue("existing-install-token");
      vi.mocked(storage.getRsaPrivateKey).mockResolvedValue("existing-private-key");

      vi.mocked(post).mockResolvedValueOnce({
        Response: [{ Token: { token: "new-session-token" } }, { UserPerson: { id: 111 } }],
      });

      await refreshSession();

      expect(post).toHaveBeenCalledWith(
        "/session-server",
        { secret: "test-api-key" },
        expect.objectContaining({
          authToken: "existing-install-token",
          privateKey: "existing-private-key",
        }),
      );
      expect(storage.setSessionToken).toHaveBeenCalledWith("new-session-token");
      expect(storage.setUserId).toHaveBeenCalledWith("111");
    });

    it("performs full setup when installation token missing", async () => {
      const { post } = await import("./client");
      const storage = await import("../lib/storage");

      vi.mocked(storage.getInstallationToken).mockResolvedValue(undefined);
      vi.mocked(storage.getRsaPrivateKey).mockResolvedValue("private-key");

      // Mock full setup responses
      vi.mocked(post).mockResolvedValueOnce({
        Response: [{ Token: { token: "install-token" } }, { ServerPublicKey: { server_public_key: "server-key" } }],
      });
      vi.mocked(post).mockResolvedValueOnce({
        Response: [{ Id: { id: 123 } }],
      });
      vi.mocked(post).mockResolvedValueOnce({
        Response: [{ Token: { token: "session" } }, { UserPerson: { id: 456 } }],
      });

      await refreshSession();

      // Should have called installation endpoint (full setup)
      expect(post).toHaveBeenCalledWith("/installation", expect.any(Object));
    });

    it("performs full setup when private key missing", async () => {
      const { post } = await import("./client");
      const storage = await import("../lib/storage");

      vi.mocked(storage.getInstallationToken).mockResolvedValue("token");
      vi.mocked(storage.getRsaPrivateKey).mockResolvedValue(undefined);

      // Mock full setup responses
      vi.mocked(post).mockResolvedValueOnce({
        Response: [{ Token: { token: "install" } }, { ServerPublicKey: { server_public_key: "server" } }],
      });
      vi.mocked(post).mockResolvedValueOnce({
        Response: [{ Id: { id: 1 } }],
      });
      vi.mocked(post).mockResolvedValueOnce({
        Response: [{ Token: { token: "session" } }, { UserPerson: { id: 2 } }],
      });

      await refreshSession();

      expect(post).toHaveBeenCalledWith("/installation", expect.any(Object));
    });

    it("throws error when API key not configured", async () => {
      const storage = await import("../lib/storage");
      vi.mocked(storage.getApiKey).mockReturnValue("");

      await expect(refreshSession()).rejects.toThrow("API key not configured");
    });
  });
});
