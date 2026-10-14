import { beforeEach, describe, expect, it, vi } from "vitest";
import { Api } from "teleproto/tl";
import { RPCMessageToError } from "teleproto/errors";

const mocks = vi.hoisted(() => {
  const storage = new Map<string, string>();
  class Client {
    /** Set to make the next connect() call fail, simulating a network or auth failure on dial. */
    static connectFailure: unknown = null;
    connected = false;
    apiId = 12345;
    apiHash = "test";
    connect = vi.fn(async () => {
      if (Client.connectFailure) throw Client.connectFailure;
      this.connected = true;
    });
    destroy = vi.fn(async () => {
      this.connected = false;
    });
    getDialogs = vi.fn(async () => []);
    getMessages = vi.fn(async () => []);
    getEntity = vi.fn(async () => ({}));
    getMe = vi.fn(async () => ({ id: 42n }));
    sendMessage = vi.fn(async () => {});
    invoke = vi.fn<(request: unknown) => Promise<object>>(async () => ({}));
    constructor(public session: { value: string; save: () => string }) {
      clients.push(this);
    }
  }
  const clients: Client[] = [];
  return {
    storage,
    clients,
    Client,
    getItem: vi.fn(async (key: string) => storage.get(key)),
    setItem: vi.fn(async (key: string, value: string) => {
      storage.set(key, value);
    }),
    removeItem: vi.fn(async (key: string) => {
      storage.delete(key);
    }),
    showToast: vi.fn<(toast: unknown) => Promise<void>>(async () => {}),
    launchCommand: vi.fn<(command: unknown) => Promise<void>>(async () => {}),
  };
});

vi.mock("@raycast/api", () => ({
  LocalStorage: { getItem: mocks.getItem, setItem: mocks.setItem, removeItem: mocks.removeItem },
  environment: { supportPath: "/tmp/raycast-telegram-test" },
  getPreferenceValues: () => ({ apiId: "12345", apiHash: "test" }),
  showToast: mocks.showToast,
  Toast: { Style: { Failure: "failure" } },
  LaunchType: { UserInitiated: "user" },
  launchCommand: mocks.launchCommand,
}));
vi.mock("teleproto", async (importOriginal) => ({
  ...(await importOriginal<typeof import("teleproto")>()),
  TelegramClient: mocks.Client,
}));
vi.mock("teleproto/sessions", () => ({
  StringSession: class {
    constructor(public value: string) {}
    save() {
      return this.value || "new-session";
    }
  },
}));
vi.mock("teleproto/Password", () => ({ computeCheck: async () => ({}) }));

const config = { apiId: 12345, apiHash: "test" };
const savedStorage = {
  telegram_session: "invalid-session",
  telegram_user_id: "42",
  unrelated: "keep",
};
const rpcError = (code: string) =>
  RPCMessageToError(new Api.RpcError({ errorMessage: code, errorCode: 401 }), new Api.updates.GetState());
const service = () => import("./telegram-client");
const errors = () => import("../utils/errors");
const client = () => mocks.clients[mocks.clients.length - 1];

beforeEach(() => {
  vi.resetModules();
  mocks.clients.length = 0;
  mocks.storage.clear();
  mocks.Client.connectFailure = null;
  Object.entries(savedStorage).forEach(([key, value]) => mocks.storage.set(key, value));
  mocks.getItem.mockReset().mockImplementation(async (key) => mocks.storage.get(key));
  mocks.setItem.mockReset().mockImplementation(async (key, value) => {
    mocks.storage.set(key, value);
  });
  mocks.removeItem.mockReset().mockImplementation(async (key) => {
    mocks.storage.delete(key);
  });
  mocks.showToast.mockClear();
  mocks.launchCommand.mockClear();
});

describe("invalid Telegram sessions", () => {
  it("recognizes real RPC errors even when their readable messages omit the code", async () => {
    const e = await errors();
    for (const code of [
      "AUTH_KEY_UNREGISTERED",
      "AUTH_KEY_INVALID",
      "AUTH_KEY_DUPLICATED",
      "SESSION_EXPIRED",
      "SESSION_REVOKED",
    ]) {
      const error = rpcError(code);
      expect(error.message).not.toContain(code);
      expect(e.isTelegramAuthenticationError(error)).toBe(true);
    }
    expect(e.isTelegramAuthenticationError(new Error("Connection timed out"))).toBe(false);
    expect(e.isTelegramAuthenticationError(rpcError("SESSION_PASSWORD_NEEDED"))).toBe(false);
  });

  it.each(["dialogs", "chat messages", "saved messages", "sending", "chat lookup", "connection"])(
    "cleans up rejected keys during %s",
    async (operation) => {
      const s = await service();
      const failure = rpcError("AUTH_KEY_UNREGISTERED");
      if (operation === "connection") {
        // getClient() replaces a disconnected client before dialing, so the
        // rejected connect happens on the client the request creates.
        mocks.Client.connectFailure = failure;
      } else {
        await s.getClient(config);
        const old = client();
        old.connected = true;
        switch (operation) {
          case "dialogs":
            old.getDialogs.mockRejectedValue(failure);
            break;
          case "chat messages":
            old.getMessages.mockRejectedValue(failure);
            break;
          case "saved messages":
            old.getMessages.mockRejectedValue(failure);
            break;
          case "sending":
            old.sendMessage.mockRejectedValue(failure);
            break;
          case "chat lookup":
            old.getEntity.mockRejectedValue(failure);
            break;
        }
      }
      let request: Promise<unknown>;
      switch (operation) {
        case "dialogs":
          request = s.getChats({ config });
          break;
        case "chat messages":
          request = s.getChatMessages({ config, chatId: "42" });
          break;
        case "saved messages":
          request = s.getSavedMessages({ config });
          break;
        case "sending":
          request = s.sendMessage({ config, chatId: "42", message: "test" });
          break;
        case "chat lookup":
          request = s.getChatById(config, "42");
          break;
        default:
          request = s.getChats({ config });
      }
      await expect(request).rejects.toBeInstanceOf((await errors()).TelegramAuthenticationError);
      const old = client();
      expect(await s.isAuthenticated()).toBe(false);
      expect(mocks.storage.has("telegram_session")).toBe(false);
      expect(mocks.storage.has("telegram_user_id")).toBe(false);
      expect(mocks.storage.get("unrelated")).toBe("keep");
      expect(old.destroy).toHaveBeenCalledOnce();
      const next = await s.getClient(config);
      expect(next).not.toBe(old);
      expect((next.session as unknown as { value: string }).value).toBe("");
    },
  );

  it("preserves the saved session when a request fails because of the network", async () => {
    const s = await service();
    mocks.Client.connectFailure = new Error("Offline");
    await expect(s.getChats({ config })).rejects.toThrow("Offline");
    const old = client();
    expect(mocks.storage.get("telegram_session")).toBe("invalid-session");
    expect(old.destroy).not.toHaveBeenCalled();
    const next = await s.getClient(config);
    expect(next).not.toBe(old);
    expect((next.session as unknown as { value: string }).value).toBe("invalid-session");
  });
});

it("rejects missing authentication and offers an actionable sign-in toast", async () => {
  mocks.storage.clear();
  const auth = await import("../utils/auth");
  await expect(auth.requireAuthenticated()).rejects.toBeInstanceOf((await errors()).TelegramAuthenticationError);
  await auth.showTelegramError(rpcError("AUTH_KEY_UNREGISTERED"));
  const toast = mocks.showToast.mock.calls[0][0] as { title: string; primaryAction: { onAction: () => Promise<void> } };
  expect(toast.title).toBe("Sign In to Telegram");
  await toast.primaryAction.onAction();
  expect(mocks.launchCommand).toHaveBeenCalledWith({ name: "authenticate", type: "user" });
});
