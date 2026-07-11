import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getApiKey,
  getInstallationToken,
  setInstallationToken,
  getServerPublicKey,
  setServerPublicKey,
  getDeviceId,
  setDeviceId,
  getSessionToken,
  setSessionToken,
  getUserId,
  setUserId,
  getRsaPublicKey,
  setRsaPublicKey,
  getRsaPrivateKey,
  setRsaPrivateKey,
  isConfigured,
  hasCompletedSetup,
  getAllCredentials,
  clearAll,
  getApiKeyFingerprint,
  setApiKeyFingerprint,
  getStoredEnvironment,
  setStoredEnvironment,
  getCurrentEnvironment,
  credentialsMatchPreferences,
} from "./storage";
import { LocalStorage, getPreferenceValues } from "@raycast/api";

describe("storage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getPreferenceValues).mockReturnValue({
      apiKey: "test-api-key",
      environment: "sandbox",
    });
  });

  describe("getApiKey", () => {
    it("returns API key from preferences", () => {
      expect(getApiKey()).toBe("test-api-key");
    });
  });

  describe("installation token", () => {
    it("gets installation token from LocalStorage", async () => {
      vi.mocked(LocalStorage.getItem).mockResolvedValue("install-token");
      const result = await getInstallationToken();
      expect(result).toBe("install-token");
      expect(LocalStorage.getItem).toHaveBeenCalledWith("bunq_installation_token");
    });

    it("sets installation token in LocalStorage", async () => {
      await setInstallationToken("new-token");
      expect(LocalStorage.setItem).toHaveBeenCalledWith("bunq_installation_token", "new-token");
    });
  });

  describe("server public key", () => {
    it("gets server public key from LocalStorage", async () => {
      vi.mocked(LocalStorage.getItem).mockResolvedValue("server-key");
      const result = await getServerPublicKey();
      expect(result).toBe("server-key");
    });

    it("sets server public key in LocalStorage", async () => {
      await setServerPublicKey("new-server-key");
      expect(LocalStorage.setItem).toHaveBeenCalledWith("bunq_server_public_key", "new-server-key");
    });
  });

  describe("device ID", () => {
    it("gets device ID from LocalStorage", async () => {
      vi.mocked(LocalStorage.getItem).mockResolvedValue("device-123");
      const result = await getDeviceId();
      expect(result).toBe("device-123");
    });

    it("sets device ID in LocalStorage", async () => {
      await setDeviceId("device-456");
      expect(LocalStorage.setItem).toHaveBeenCalledWith("bunq_device_id", "device-456");
    });
  });

  describe("session token", () => {
    it("gets session token from LocalStorage", async () => {
      vi.mocked(LocalStorage.getItem).mockResolvedValue("session-abc");
      const result = await getSessionToken();
      expect(result).toBe("session-abc");
    });

    it("sets session token in LocalStorage", async () => {
      await setSessionToken("session-xyz");
      expect(LocalStorage.setItem).toHaveBeenCalledWith("bunq_session_token", "session-xyz");
    });
  });

  describe("user ID", () => {
    it("gets user ID from LocalStorage", async () => {
      vi.mocked(LocalStorage.getItem).mockResolvedValue("user-999");
      const result = await getUserId();
      expect(result).toBe("user-999");
    });

    it("sets user ID in LocalStorage", async () => {
      await setUserId("user-123");
      expect(LocalStorage.setItem).toHaveBeenCalledWith("bunq_user_id", "user-123");
    });
  });

  describe("RSA public key", () => {
    it("gets RSA public key from LocalStorage", async () => {
      vi.mocked(LocalStorage.getItem).mockResolvedValue("rsa-public");
      const result = await getRsaPublicKey();
      expect(result).toBe("rsa-public");
    });

    it("sets RSA public key in LocalStorage", async () => {
      await setRsaPublicKey("new-rsa-public");
      expect(LocalStorage.setItem).toHaveBeenCalledWith("bunq_rsa_public_key", "new-rsa-public");
    });
  });

  describe("RSA private key", () => {
    it("gets RSA private key from LocalStorage", async () => {
      vi.mocked(LocalStorage.getItem).mockResolvedValue("rsa-private");
      const result = await getRsaPrivateKey();
      expect(result).toBe("rsa-private");
    });

    it("sets RSA private key in LocalStorage", async () => {
      await setRsaPrivateKey("new-rsa-private");
      expect(LocalStorage.setItem).toHaveBeenCalledWith("bunq_rsa_private_key", "new-rsa-private");
    });
  });

  describe("isConfigured", () => {
    it("returns true when all required credentials exist", async () => {
      vi.mocked(LocalStorage.getItem).mockImplementation((key) => {
        const values: Record<string, string> = {
          bunq_session_token: "session",
          bunq_user_id: "user",
        };
        return Promise.resolve(values[key as string]);
      });

      expect(await isConfigured()).toBe(true);
    });

    it("returns false when session token is missing", async () => {
      vi.mocked(LocalStorage.getItem).mockImplementation((key) => {
        if (key === "bunq_user_id") return Promise.resolve("user");
        return Promise.resolve(undefined);
      });

      expect(await isConfigured()).toBe(false);
    });

    it("returns false when user ID is missing", async () => {
      vi.mocked(LocalStorage.getItem).mockImplementation((key) => {
        if (key === "bunq_session_token") return Promise.resolve("session");
        return Promise.resolve(undefined);
      });

      expect(await isConfigured()).toBe(false);
    });

    it("returns false when API key is missing", async () => {
      vi.mocked(getPreferenceValues).mockReturnValue({
        apiKey: "",
        environment: "sandbox",
      });
      vi.mocked(LocalStorage.getItem).mockResolvedValue("value");

      expect(await isConfigured()).toBe(false);
    });
  });

  describe("hasCompletedSetup", () => {
    it("returns true when setup credentials exist", async () => {
      vi.mocked(LocalStorage.getItem).mockImplementation((key) => {
        const values: Record<string, string> = {
          bunq_installation_token: "install",
          bunq_device_id: "device",
        };
        return Promise.resolve(values[key as string]);
      });

      expect(await hasCompletedSetup()).toBe(true);
    });

    it("returns false when installation token is missing", async () => {
      vi.mocked(LocalStorage.getItem).mockImplementation((key) => {
        if (key === "bunq_device_id") return Promise.resolve("device");
        return Promise.resolve(undefined);
      });

      expect(await hasCompletedSetup()).toBe(false);
    });

    it("returns false when device ID is missing", async () => {
      vi.mocked(LocalStorage.getItem).mockImplementation((key) => {
        if (key === "bunq_installation_token") return Promise.resolve("install");
        return Promise.resolve(undefined);
      });

      expect(await hasCompletedSetup()).toBe(false);
    });
  });

  describe("getAllCredentials", () => {
    it("returns all credentials", async () => {
      vi.mocked(LocalStorage.getItem).mockImplementation((key) => {
        const values: Record<string, string> = {
          bunq_installation_token: "install-token",
          bunq_server_public_key: "server-key",
          bunq_device_id: "device-id",
          bunq_session_token: "session-token",
          bunq_user_id: "user-id",
          bunq_rsa_public_key: "rsa-public",
          bunq_rsa_private_key: "rsa-private",
        };
        return Promise.resolve(values[key as string]);
      });

      const credentials = await getAllCredentials();

      expect(credentials).toEqual({
        apiKey: "test-api-key",
        installationToken: "install-token",
        serverPublicKey: "server-key",
        deviceId: "device-id",
        sessionToken: "session-token",
        userId: "user-id",
        rsaPublicKey: "rsa-public",
        rsaPrivateKey: "rsa-private",
      });
    });

    it("returns undefined for missing credentials", async () => {
      vi.mocked(LocalStorage.getItem).mockResolvedValue(undefined);

      const credentials = await getAllCredentials();

      expect(credentials.apiKey).toBe("test-api-key");
      expect(credentials.installationToken).toBeUndefined();
    });
  });

  describe("clearAll", () => {
    it("removes all bunq credentials from LocalStorage", async () => {
      await clearAll();

      expect(LocalStorage.removeItem).toHaveBeenCalledTimes(9);
      expect(LocalStorage.removeItem).toHaveBeenCalledWith("bunq_installation_token");
      expect(LocalStorage.removeItem).toHaveBeenCalledWith("bunq_server_public_key");
      expect(LocalStorage.removeItem).toHaveBeenCalledWith("bunq_device_id");
      expect(LocalStorage.removeItem).toHaveBeenCalledWith("bunq_session_token");
      expect(LocalStorage.removeItem).toHaveBeenCalledWith("bunq_user_id");
      expect(LocalStorage.removeItem).toHaveBeenCalledWith("bunq_rsa_public_key");
      expect(LocalStorage.removeItem).toHaveBeenCalledWith("bunq_rsa_private_key");
      expect(LocalStorage.removeItem).toHaveBeenCalledWith("bunq_api_key_fingerprint");
      expect(LocalStorage.removeItem).toHaveBeenCalledWith("bunq_stored_environment");
    });
  });

  describe("API key fingerprint", () => {
    it("gets fingerprint from LocalStorage", async () => {
      vi.mocked(LocalStorage.getItem).mockResolvedValue("abc123hash");
      const result = await getApiKeyFingerprint();
      expect(result).toBe("abc123hash");
      expect(LocalStorage.getItem).toHaveBeenCalledWith("bunq_api_key_fingerprint");
    });

    it("sets fingerprint as SHA-256 hash in LocalStorage", async () => {
      await setApiKeyFingerprint("my-api-key");
      // Should store a 64-character hex SHA-256 hash, not the original key
      expect(LocalStorage.setItem).toHaveBeenCalledWith(
        "bunq_api_key_fingerprint",
        expect.stringMatching(/^[a-f0-9]{64}$/),
      );
    });

    it("produces consistent hash for same input", async () => {
      await setApiKeyFingerprint("test-key");
      const firstCall = vi.mocked(LocalStorage.setItem).mock.calls[0]?.[1];

      vi.mocked(LocalStorage.setItem).mockClear();
      await setApiKeyFingerprint("test-key");
      const secondCall = vi.mocked(LocalStorage.setItem).mock.calls[0]?.[1];

      expect(firstCall).toBeDefined();
      expect(secondCall).toBeDefined();
      expect(firstCall).toBe(secondCall);
    });

    it("produces different hash for different input", async () => {
      await setApiKeyFingerprint("key-one");
      const firstHash = vi.mocked(LocalStorage.setItem).mock.calls[0]?.[1];

      vi.mocked(LocalStorage.setItem).mockClear();
      await setApiKeyFingerprint("key-two");
      const secondHash = vi.mocked(LocalStorage.setItem).mock.calls[0]?.[1];

      expect(firstHash).toBeDefined();
      expect(secondHash).toBeDefined();
      expect(firstHash).not.toBe(secondHash);
    });
  });

  describe("stored environment", () => {
    it("gets environment from LocalStorage", async () => {
      vi.mocked(LocalStorage.getItem).mockResolvedValue("production");
      const result = await getStoredEnvironment();
      expect(result).toBe("production");
      expect(LocalStorage.getItem).toHaveBeenCalledWith("bunq_stored_environment");
    });

    it("sets environment in LocalStorage", async () => {
      await setStoredEnvironment("sandbox");
      expect(LocalStorage.setItem).toHaveBeenCalledWith("bunq_stored_environment", "sandbox");
    });
  });

  describe("getCurrentEnvironment", () => {
    it("returns environment from preferences", () => {
      expect(getCurrentEnvironment()).toBe("sandbox");
    });
  });

  describe("credentialsMatchPreferences", () => {
    it("returns true when fingerprint and environment match", async () => {
      // First, compute the actual hash for "test-api-key"
      await setApiKeyFingerprint("test-api-key");
      const actualHash = vi
        .mocked(LocalStorage.setItem)
        .mock.calls.find((call) => call[0] === "bunq_api_key_fingerprint")?.[1] as string;

      vi.mocked(LocalStorage.setItem).mockClear();
      vi.mocked(LocalStorage.getItem).mockImplementation((key) => {
        const values: Record<string, string> = {
          bunq_api_key_fingerprint: actualHash,
          bunq_stored_environment: "sandbox",
        };
        return Promise.resolve(values[key as string]);
      });

      const result = await credentialsMatchPreferences();
      expect(result).toBe(true);
    });

    it("returns false when API key has changed", async () => {
      vi.mocked(LocalStorage.getItem).mockImplementation((key) => {
        const values: Record<string, string> = {
          bunq_api_key_fingerprint: "different-hash-value-here",
          bunq_stored_environment: "sandbox",
        };
        return Promise.resolve(values[key as string]);
      });

      const result = await credentialsMatchPreferences();
      expect(result).toBe(false);
    });

    it("returns false when environment has changed", async () => {
      // First, compute the actual hash for "test-api-key"
      await setApiKeyFingerprint("test-api-key");
      const actualHash = vi
        .mocked(LocalStorage.setItem)
        .mock.calls.find((call) => call[0] === "bunq_api_key_fingerprint")?.[1] as string;

      vi.mocked(LocalStorage.setItem).mockClear();
      vi.mocked(LocalStorage.getItem).mockImplementation((key) => {
        const values: Record<string, string> = {
          bunq_api_key_fingerprint: actualHash,
          bunq_stored_environment: "production", // Different from current "sandbox"
        };
        return Promise.resolve(values[key as string]);
      });

      const result = await credentialsMatchPreferences();
      expect(result).toBe(false);
    });

    it("returns true when no stored fingerprint and no existing credentials (first setup)", async () => {
      vi.mocked(LocalStorage.getItem).mockResolvedValue(undefined);

      const result = await credentialsMatchPreferences();
      expect(result).toBe(true);
    });

    it("returns false when existing credentials but no fingerprint (upgrade scenario)", async () => {
      // Old installations have credentials but no fingerprint
      vi.mocked(LocalStorage.getItem).mockImplementation((key) => {
        const values: Record<string, string | undefined> = {
          bunq_installation_token: "old-install-token",
          bunq_api_key_fingerprint: undefined,
          bunq_stored_environment: undefined,
        };
        return Promise.resolve(values[key as string]);
      });

      const result = await credentialsMatchPreferences();
      expect(result).toBe(false);
    });
  });
});
