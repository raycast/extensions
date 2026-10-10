import { describe, it, expect, vi, beforeEach } from "vitest";
import { Api } from "teleproto/tl";
import { authenticateWithQr, logOut } from "./telegram-client";
import { LocalStorage } from "@raycast/api";

const mockClient = {
  connected: false,
  connect: vi.fn().mockResolvedValue(undefined),
  disconnect: vi.fn().mockResolvedValue(undefined),
  isUserAuthorized: vi.fn(),
  invoke: vi.fn(),
  addEventHandler: vi.fn(),
  removeEventHandler: vi.fn(),
  session: {
    save: vi.fn().mockReturnValue("mock_session_string"),
  },
  getMe: vi.fn().mockResolvedValue({ id: 123456 }),
  apiId: 123456,
  apiHash: "abcdef",
};

vi.mock("teleproto", async (importOriginal) => {
  const actual = await importOriginal<typeof import("teleproto")>();
  return {
    ...actual,
    TelegramClient: vi.fn(() => mockClient),
  };
});

describe("authenticateWithQr", () => {
  const config = { apiId: 123456, apiHash: "abcdef" };

  beforeEach(() => {
    vi.clearAllMocks();
    mockClient.connected = false;
    vi.spyOn(LocalStorage, "setItem").mockResolvedValue(undefined);
    vi.spyOn(LocalStorage, "getItem").mockResolvedValue(undefined);
    vi.spyOn(LocalStorage, "removeItem").mockResolvedValue(undefined);
  });

  it("clears pending 2FA auth session before starting QR auth", async () => {
    mockClient.isUserAuthorized.mockResolvedValue(true);

    await authenticateWithQr(config, {
      onQrCode: vi.fn(),
    });

    expect(LocalStorage.removeItem).toHaveBeenCalledWith("telegram_auth_session");
  });

  it("returns unauthenticated when abortSignal is already aborted", async () => {
    const controller = new AbortController();
    controller.abort();

    mockClient.isUserAuthorized.mockResolvedValue(false);

    const result = await authenticateWithQr(config, {
      onQrCode: vi.fn(),
      abortSignal: controller.signal,
    });

    expect(result).toEqual({ needsPassword: false, success: false });
    expect(mockClient.invoke).not.toHaveBeenCalled();
  });

  it("completes authentication immediately if client is already authorized", async () => {
    mockClient.isUserAuthorized.mockResolvedValue(true);

    const result = await authenticateWithQr(config, {
      onQrCode: vi.fn(),
    });

    expect(result).toEqual({ needsPassword: false, success: true });
    expect(mockClient.invoke).not.toHaveBeenCalled();
  });

  it("catches SESSION_PASSWORD_NEEDED from ExportLoginToken and returns needsPassword", async () => {
    mockClient.isUserAuthorized.mockResolvedValue(false);
    mockClient.invoke.mockRejectedValue(new Error("RPCError: 400: SESSION_PASSWORD_NEEDED"));

    const result = await authenticateWithQr(config, {
      onQrCode: vi.fn(),
    });

    expect(result).toEqual({ needsPassword: true, success: false });
    expect(LocalStorage.setItem).toHaveBeenCalledWith("telegram_auth_session", "mock_session_string");
  });

  it("catches AUTH_TOKEN_ALREADY_ACCEPTED and returns needsPassword when user is not authorized", async () => {
    mockClient.isUserAuthorized.mockResolvedValue(false);
    mockClient.invoke.mockRejectedValue(new Error("AUTH_TOKEN_ALREADY_ACCEPTED"));

    const result = await authenticateWithQr(config, {
      onQrCode: vi.fn(),
    });

    expect(result).toEqual({ needsPassword: true, success: false });
    expect(LocalStorage.setItem).toHaveBeenCalledWith("telegram_auth_session", "mock_session_string");
  });

  it("catches AUTH_TOKEN_ALREADY_ACCEPTED and completes authentication when user is authorized", async () => {
    // Initially not authorized, but authorized after accepted token
    mockClient.isUserAuthorized.mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    mockClient.invoke.mockRejectedValue(new Error("AUTH_TOKEN_ALREADY_ACCEPTED"));

    const result = await authenticateWithQr(config, {
      onQrCode: vi.fn(),
    });

    expect(result).toEqual({ needsPassword: false, success: true });
    expect(LocalStorage.setItem).toHaveBeenCalledWith("telegram_session", "mock_session_string");
  });

  it("handles LoginTokenMigrateTo with SESSION_PASSWORD_NEEDED on ImportLoginToken", async () => {
    mockClient.isUserAuthorized.mockResolvedValue(false);
    (mockClient as unknown as { _switchDC: unknown })._switchDC = vi.fn().mockResolvedValue(undefined);

    const migrateTo = new Api.auth.LoginTokenMigrateTo({
      dcId: 2,
      token: Buffer.from("token"),
    });

    mockClient.invoke.mockResolvedValueOnce(migrateTo).mockRejectedValueOnce(new Error("SESSION_PASSWORD_NEEDED"));

    const result = await authenticateWithQr(config, {
      onQrCode: vi.fn(),
    });

    expect(result).toEqual({ needsPassword: true, success: false });
    expect(LocalStorage.setItem).toHaveBeenCalledWith("telegram_auth_session", "mock_session_string");
  });
});

describe("logOut", () => {
  const config = { apiId: 123456, apiHash: "abcdef" };

  beforeEach(() => {
    vi.clearAllMocks();
    mockClient.connected = false;
    mockClient.invoke.mockReset().mockResolvedValue(undefined);
    mockClient.disconnect.mockReset().mockResolvedValue(undefined);
    mockClient.connect.mockReset().mockResolvedValue(undefined);
    vi.spyOn(LocalStorage, "removeItem").mockResolvedValue(undefined);
  });

  it("invokes LogOut when authorized, revokes remotely, and removes session keys", async () => {
    mockClient.isUserAuthorized.mockResolvedValue(true);

    const result = await logOut(config);

    expect(result).toEqual({ remoteRevoked: true, sessionExpired: false, error: undefined });
    expect(mockClient.invoke).toHaveBeenCalledWith(expect.any(Api.auth.LogOut));
    expect(mockClient.disconnect).toHaveBeenCalled();
    expect(LocalStorage.removeItem).toHaveBeenCalledWith("telegram_session");
    expect(LocalStorage.removeItem).toHaveBeenCalledWith("telegram_auth_session");
    expect(LocalStorage.removeItem).toHaveBeenCalledWith("telegram_user_id");
  });

  it("reports sessionExpired true when user is already not authorized", async () => {
    mockClient.isUserAuthorized.mockResolvedValue(false);

    const result = await logOut(config);

    expect(result).toEqual({ remoteRevoked: false, sessionExpired: true, error: undefined });
    expect(mockClient.invoke).not.toHaveBeenCalled();
    expect(LocalStorage.removeItem).toHaveBeenCalledWith("telegram_session");
    expect(LocalStorage.removeItem).toHaveBeenCalledWith("telegram_auth_session");
    expect(LocalStorage.removeItem).toHaveBeenCalledWith("telegram_user_id");
  });

  it("removes session keys and reports error if invoke LogOut throws an error", async () => {
    const error = new Error("RPCError: 401: AUTH_KEY_UNREGISTERED");
    mockClient.isUserAuthorized.mockResolvedValue(true);
    mockClient.invoke.mockRejectedValue(error);

    const result = await logOut(config);

    expect(result.remoteRevoked).toBe(false);
    expect(result.sessionExpired).toBe(false);
    expect(result.error).toEqual(error);
    expect(LocalStorage.removeItem).toHaveBeenCalledWith("telegram_session");
    expect(LocalStorage.removeItem).toHaveBeenCalledWith("telegram_auth_session");
    expect(LocalStorage.removeItem).toHaveBeenCalledWith("telegram_user_id");
  });
});
