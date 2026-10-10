import { describe, it, expect, vi, beforeEach } from "vitest";
import { getConfig, handleQrAuthFlow, handlePasswordAuthFlow, handleLogOut } from "./auth";
import { __setPreferencesMock } from "../../test/raycast-api.stub";
import * as telegramClient from "../services/telegram-client";

vi.mock("../services/telegram-client", () => ({
  authenticateWithQr: vi.fn(),
  authenticateWithPassword: vi.fn(),
  logOut: vi.fn(),
}));

describe("getConfig", () => {
  it("parses valid preferences", () => {
    __setPreferencesMock({
      apiId: "123456",
      apiHash: "abcdef1234567890",
    });

    const config = getConfig();
    expect(config).toEqual({
      apiId: 123456,
      apiHash: "abcdef1234567890",
    });
  });

  it("trims whitespace from credentials", () => {
    __setPreferencesMock({
      apiId: "  987654  ",
      apiHash: "  hash123  ",
    });

    const config = getConfig();
    expect(config).toEqual({
      apiId: 987654,
      apiHash: "hash123",
    });
  });

  it("throws when apiId is missing or invalid", () => {
    __setPreferencesMock({
      apiId: "",
      apiHash: "hash",
    });
    expect(() => getConfig()).toThrow("API ID is required");

    __setPreferencesMock({
      apiId: "abc",
      apiHash: "hash",
    });
    expect(() => getConfig()).toThrow("Invalid API ID");
  });

  it("throws when apiHash is missing", () => {
    __setPreferencesMock({
      apiId: "123",
      apiHash: "   ",
    });
    expect(() => getConfig()).toThrow("API Hash is required");
  });
});

describe("handleQrAuthFlow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    __setPreferencesMock({
      apiId: "123456",
      apiHash: "abcdef1234567890",
    });
  });

  it("completes successfully when QR code is scanned and authorized", async () => {
    const onQrCodeMock = vi.fn();
    const qrData = { tgUrl: "tg://login?token=abc", dataUrl: "data:image/png;base64,xyz" };

    vi.mocked(telegramClient.authenticateWithQr).mockImplementation(async (_config, callbacks) => {
      await callbacks.onQrCode(qrData);
      return { success: true, needsPassword: false };
    });

    const result = await handleQrAuthFlow({ onQrCode: onQrCodeMock });

    expect(result).toEqual({ success: true, needsPassword: false });
    expect(onQrCodeMock).toHaveBeenCalledWith(qrData);
    expect(telegramClient.authenticateWithQr).toHaveBeenCalledTimes(1);
  });

  it("returns needsPassword when 2-Step Verification is required", async () => {
    const onQrCodeMock = vi.fn();

    vi.mocked(telegramClient.authenticateWithQr).mockResolvedValue({
      success: false,
      needsPassword: true,
    });

    const result = await handleQrAuthFlow({ onQrCode: onQrCodeMock });

    expect(result).toEqual({ success: false, needsPassword: true });
  });

  it("returns unauthenticated without success when login is aborted", async () => {
    const onQrCodeMock = vi.fn();
    const controller = new AbortController();

    vi.mocked(telegramClient.authenticateWithQr).mockImplementation(async (_config, callbacks) => {
      controller.abort();
      if (callbacks.abortSignal?.aborted) {
        return { success: false, needsPassword: false };
      }
      return { success: true, needsPassword: false };
    });

    const result = await handleQrAuthFlow({
      onQrCode: onQrCodeMock,
      abortSignal: controller.signal,
    });

    expect(result).toEqual({ success: false, needsPassword: false });
  });

  it("catches and reports authentication errors when not aborted", async () => {
    const onQrCodeMock = vi.fn();

    vi.mocked(telegramClient.authenticateWithQr).mockRejectedValue(new Error("AUTH_TOKEN_EXPIRED"));

    await expect(handleQrAuthFlow({ onQrCode: onQrCodeMock })).rejects.toThrow("The QR code has expired");
  });

  it("suppresses error rejection if flow was aborted", async () => {
    const onQrCodeMock = vi.fn();
    const controller = new AbortController();

    vi.mocked(telegramClient.authenticateWithQr).mockImplementation(async () => {
      controller.abort();
      throw new Error("Connection cancelled");
    });

    const result = await handleQrAuthFlow({
      onQrCode: onQrCodeMock,
      abortSignal: controller.signal,
    });

    expect(result).toEqual({ success: false, needsPassword: false });
  });
});

describe("handlePasswordAuthFlow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    __setPreferencesMock({
      apiId: "123456",
      apiHash: "abcdef1234567890",
    });
  });

  it("returns true on successful 2FA password verification", async () => {
    vi.mocked(telegramClient.authenticateWithPassword).mockResolvedValue({
      success: true,
      needsPassword: false,
    });

    const result = await handlePasswordAuthFlow("secret123");
    expect(result).toBe(true);
    expect(telegramClient.authenticateWithPassword).toHaveBeenCalledWith(
      { apiId: 123456, apiHash: "abcdef1234567890" },
      "secret123",
    );
  });

  it("throws and logs error on invalid password", async () => {
    vi.mocked(telegramClient.authenticateWithPassword).mockRejectedValue(new Error("PASSWORD_HASH_INVALID"));

    await expect(handlePasswordAuthFlow("wrong-password")).rejects.toThrow("Incorrect 2-Step Verification password");
  });
});

describe("handleLogOut", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    __setPreferencesMock({
      apiId: "123456",
      apiHash: "abcdef1234567890",
    });
  });

  it("calls logOut and returns true on success when remoteRevoked is true", async () => {
    vi.mocked(telegramClient.logOut).mockResolvedValue({ remoteRevoked: true });

    const result = await handleLogOut();

    expect(result).toBe(true);
    expect(telegramClient.logOut).toHaveBeenCalled();
  });

  it("calls logOut and returns true when remoteRevoked is false", async () => {
    vi.mocked(telegramClient.logOut).mockResolvedValue({ remoteRevoked: false });

    const result = await handleLogOut();

    expect(result).toBe(true);
    expect(telegramClient.logOut).toHaveBeenCalled();
  });

  it("returns false on error", async () => {
    vi.mocked(telegramClient.logOut).mockRejectedValue(new Error("Network failed"));

    const result = await handleLogOut();

    expect(result).toBe(false);
  });
});
