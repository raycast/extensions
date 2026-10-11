import { beforeEach, describe, expect, it, vi } from "vitest";
import { Api } from "teleproto/tl";
import { RPCMessageToError } from "teleproto/errors";

const mocks = vi.hoisted(() => {
  const storage = new Map<string, string>();
  class Client {
    connected = false;
    connect = vi.fn(async () => {
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
    sendCode = vi.fn(async () => ({ phoneCodeHash: "new-hash" }));
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
  getPreferenceValues: () => ({ apiId: "12345", apiHash: "test", phoneNumber: "+15550000000" }),
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

const config = { apiId: 12345, apiHash: "test", phoneNumber: "+15550000000" };
const savedStorage = {
  telegram_session: "invalid-session",
  telegram_user_id: "42",
  telegram_phone_code_hash: "old-hash",
  unrelated: "keep",
};
const rpcError = (code: string) =>
  RPCMessageToError(new Api.RpcError({ errorMessage: code, errorCode: 401 }), new Api.updates.GetState());
function deferred<T = void>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}
const service = () => import("./telegram-client");
const errors = () => import("../utils/errors");
const client = () => mocks.clients[mocks.clients.length - 1];

beforeEach(() => {
  vi.resetModules();
  mocks.clients.length = 0;
  mocks.storage.clear();
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
      await s.getClient(config);
      const old = client();
      const failure = rpcError("AUTH_KEY_UNREGISTERED");
      let request: Promise<unknown>;
      switch (operation) {
        case "dialogs":
          old.getDialogs.mockRejectedValue(failure);
          request = s.getChats({ config });
          break;
        case "chat messages":
          old.getMessages.mockRejectedValue(failure);
          request = s.getChatMessages({ config, chatId: "42" });
          break;
        case "saved messages":
          old.getMessages.mockRejectedValue(failure);
          request = s.getSavedMessages({ config });
          break;
        case "sending":
          old.sendMessage.mockRejectedValue(failure);
          request = s.sendMessage({ config, chatId: "42", message: "test" });
          break;
        case "chat lookup":
          old.getEntity.mockRejectedValue(failure);
          request = s.getChatById(config, "42");
          break;
        default:
          old.connect.mockRejectedValue(failure);
          request = s.getChats({ config });
      }
      await expect(request).rejects.toBeInstanceOf((await errors()).TelegramAuthenticationError);
      expect(await s.isAuthenticated()).toBe(false);
      expect(mocks.storage.has("telegram_user_id")).toBe(false);
      expect(mocks.storage.has("telegram_phone_code_hash")).toBe(false);
      expect(mocks.storage.get("unrelated")).toBe("keep");
      expect(old.destroy).toHaveBeenCalledOnce();
      await s.getClient(config);
      expect(client()).not.toBe(old);
      expect(client().session.value).toBe("");
    },
  );

  it.each(["connect", "getDialogs"] as const)("preserves sessions on network failures in %s", async (method) => {
    const s = await service();
    await s.getClient(config);
    const old = client();
    const failure = new Error("Offline");
    old[method].mockRejectedValue(failure);
    await expect(s.getChats({ config })).rejects.toBe(failure);
    expect(mocks.storage.get("telegram_session")).toBe("invalid-session");
    expect(await s.getClient(config)).toBe(old);
    expect(old.destroy).not.toHaveBeenCalled();
  });
});

describe("sign-in recovery", () => {
  it.each(["connect", "invoke"] as const)(
    "replaces a saved key rejected by %s in the same sign-in attempt",
    async (method) => {
      const s = await service();
      await s.getClient(config);
      const old = client();
      old[method].mockRejectedValue(rpcError("SESSION_REVOKED"));
      expect(await s.authenticate(config)).toEqual({ needsCode: true, needsPassword: false });
      expect(old.destroy).toHaveBeenCalledOnce();
      expect(mocks.clients).toHaveLength(2);
      expect(client().session.value).toBe("");
      expect(client().sendCode).toHaveBeenCalledOnce();
      expect(mocks.storage.get("telegram_phone_code_hash")).toBe("new-hash");
    },
  );

  it("preserves saved credentials when authorization checks fail because of the network", async () => {
    const s = await service();
    await s.getClient(config);
    const old = client();
    old.invoke.mockRejectedValue(new Error("Offline"));
    await expect(s.authenticate(config)).rejects.toThrow("Offline");
    expect(mocks.storage.get("telegram_session")).toBe("invalid-session");
    expect(old.destroy).not.toHaveBeenCalled();
    expect(old.sendCode).not.toHaveBeenCalled();
  });

  it("reuses the login client for code and password steps after a disconnect", async () => {
    mocks.storage.clear();
    const s = await service();
    expect((await s.authenticate(config)).needsCode).toBe(true);
    const login = client();
    login.connected = false;
    login.invoke.mockImplementation(async (request) => {
      if (request instanceof Api.auth.SignIn) throw rpcError("SESSION_PASSWORD_NEEDED");
      return {};
    });
    expect((await s.authenticate(config, { code: "12345" })).needsPassword).toBe(true);
    expect((await s.authenticate(config, { password: "test" })).needsPassword).toBe(false);
    expect(mocks.clients).toHaveLength(1);
    expect(mocks.storage.get("telegram_session")).toBe("new-session");
    expect(mocks.storage.get("telegram_user_id")).toBe("42");
    expect(mocks.storage.has("telegram_phone_code_hash")).toBe(false);
  });

  it("clears expired verification codes without discarding the login client", async () => {
    mocks.storage.clear();
    const s = await service();
    await s.authenticate(config);
    const login = client();
    login.invoke.mockRejectedValue(rpcError("PHONE_CODE_EXPIRED"));
    await expect(s.authenticate(config, { code: "12345" })).rejects.toThrow();
    expect(mocks.storage.has("telegram_phone_code_hash")).toBe(false);
    expect(login.destroy).not.toHaveBeenCalled();
  });
});

describe("overlapping requests", () => {
  it("creates only one client for simultaneous requests", async () => {
    const s = await service();
    const [first, second] = await Promise.all([s.getClient(config), s.getClient(config)]);
    expect(first).toBe(second);
    expect(mocks.clients).toHaveLength(1);
  });

  it("waits for pending storage cleanup before creating a new login client", async () => {
    const s = await service();
    await s.getClient(config);
    client().getDialogs.mockRejectedValue(rpcError("AUTH_KEY_UNREGISTERED"));
    const removing = deferred();
    const removed = deferred();
    mocks.removeItem.mockImplementation(async (key) => {
      if (key === "telegram_session") {
        removing.resolve();
        await removed.promise;
      }
      mocks.storage.delete(key);
    });
    const request = expect(s.getChats({ config })).rejects.toThrow();
    await removing.promise;
    const login = s.authenticate(config);
    await new Promise<void>((resolve) => setImmediate(resolve));
    try {
      expect(mocks.clients).toHaveLength(1);
    } finally {
      removed.resolve();
      await request;
      await login;
    }
    expect((await login).needsCode).toBe(true);
    expect(client().session.value).toBe("");
    await s.authenticate(config, { code: "12345" });
    expect(mocks.storage.get("telegram_session")).toBe("new-session");
    expect(mocks.storage.get("telegram_user_id")).toBe("42");
  });

  it("recovers a rejected connection without waiting for the old client to disconnect", async () => {
    const s = await service();
    await s.getClient(config);
    const old = client();
    old.connect.mockRejectedValue(rpcError("AUTH_KEY_UNREGISTERED"));
    const disconnecting = deferred();
    const disconnected = deferred();
    old.destroy.mockImplementation(() => {
      disconnecting.resolve();
      return disconnected.promise;
    });
    let needsCode = false;
    const recovery = s.authenticate(config).then((result) => {
      needsCode = result.needsCode;
      return result;
    });
    await disconnecting.promise;
    await new Promise<void>((resolve) => setImmediate(resolve));
    try {
      expect(needsCode).toBe(true);
      expect(mocks.clients).toHaveLength(2);
      expect(client().sendCode).toHaveBeenCalledOnce();
    } finally {
      disconnected.resolve();
      await recovery;
    }
  });

  it("does not destroy a replacement client when an older sign-in fails late", async () => {
    const s = await service();
    await s.getClient(config);
    const old = client();
    const started = deferred();
    const check = deferred<object>();
    old.invoke.mockImplementation(() => {
      started.resolve();
      return check.promise;
    });
    const pending = expect(s.authenticate(config, { code: "12345" })).rejects.toThrow();
    await started.promise;
    old.getDialogs.mockRejectedValue(rpcError("SESSION_REVOKED"));
    await expect(s.getChats({ config })).rejects.toThrow();
    await s.getClient(config);
    const replacement = client();
    check.reject(rpcError("SESSION_REVOKED"));
    await pending;
    expect(replacement.destroy).not.toHaveBeenCalled();
    expect(await s.getClient(config)).toBe(replacement);
    expect((await s.authenticate(config)).needsCode).toBe(true);
  });

  it("does not restore credentials from a client invalidated while getMe was pending", async () => {
    const s = await service();
    await s.getClient(config);
    const old = client();
    const started = deferred();
    const me = deferred<{ id: bigint }>();
    old.getMe.mockImplementation(() => {
      started.resolve();
      return me.promise;
    });
    const pending = s.authenticate(config);
    await started.promise;
    old.getDialogs.mockRejectedValue(rpcError("AUTH_KEY_UNREGISTERED"));
    await expect(s.getChats({ config })).rejects.toThrow();
    await s.getClient(config);
    const replacement = client();
    me.resolve({ id: 42n });
    expect((await pending).needsCode).toBe(true);
    expect(mocks.storage.has("telegram_session")).toBe(false);
    expect(replacement.destroy).not.toHaveBeenCalled();
  });

  it("does not save a phone code hash returned by a discarded client", async () => {
    mocks.storage.clear();
    const s = await service();
    await s.getClient(config);
    const old = client();
    const started = deferred();
    const code = deferred<{ phoneCodeHash: string }>();
    old.sendCode.mockImplementation(() => {
      started.resolve();
      return code.promise;
    });
    const pending = expect(s.authenticate(config)).rejects.toThrow();
    await started.promise;
    old.getDialogs.mockRejectedValue(rpcError("AUTH_KEY_UNREGISTERED"));
    await expect(s.getChats({ config })).rejects.toThrow();
    await s.getClient(config);
    const replacement = client();
    code.resolve({ phoneCodeHash: "stale-hash" });
    await pending;
    expect(mocks.storage.has("telegram_phone_code_hash")).toBe(false);
    expect(replacement.destroy).not.toHaveBeenCalled();
  });

  it("shares a code request between simultaneous sign-in actions", async () => {
    mocks.storage.clear();
    const s = await service();
    await Promise.all([s.authenticate(config), s.authenticate(config)]);
    expect(mocks.clients).toHaveLength(1);
    expect(client().sendCode).toHaveBeenCalledOnce();
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
