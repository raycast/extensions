import { describe, it, expect, vi, beforeEach } from "vitest";
import { Api } from "teleproto/tl";
import { authenticateWithQr } from "./telegram-client";
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
