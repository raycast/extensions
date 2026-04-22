import { describe, expect, it, vi } from "vitest";
import {
  buildMessage,
  exchangeFeishuAuthorizationCode,
  refreshFeishuUserAccessToken,
  sendFeishuTextByUser,
} from "../src/lib/feishu";

describe("buildMessage", () => {
  it("builds a tagged message with trimmed values", () => {
    expect(buildMessage(" 任务已完成 ", " 日报 ")).toBe("日报：任务已完成");
  });

  it("throws when body is empty", () => {
    expect(() => buildMessage("   ", "日报")).toThrow(/Message body is empty/);
  });

  it("throws when prefix is empty", () => {
    expect(() => buildMessage("hello", "   ")).toThrow(/Prefix is empty/);
  });
});

describe("sendFeishuTextByUser", () => {
  it("sends message successfully with user token", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ code: 0, msg: "success" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );

    await expect(
      sendFeishuTextByUser(
        {
          userAccessToken: "u-xxx",
          chatId: "oc_xxx",
          text: "日报：hello",
        },
        fetchMock,
      ),
    ).resolves.toBeUndefined();

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock.mock.calls[0][0]).toMatch(/im\/v1\/messages/);
  });

  it("throws when request returns business error", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ code: 230001, msg: "chat not found" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );

    await expect(
      sendFeishuTextByUser(
        {
          userAccessToken: "u-xxx",
          chatId: "oc_xxx",
          text: "日报：hello",
        },
        fetchMock,
      ),
    ).rejects.toThrow(/Feishu user message error/);
  });

  it("throws for non-2xx status", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response("bad request", {
        status: 400,
        headers: { "content-type": "text/plain" },
      }),
    );

    await expect(
      sendFeishuTextByUser(
        {
          userAccessToken: "u-xxx",
          chatId: "oc_xxx",
          text: "日报：hello",
        },
        fetchMock,
      ),
    ).rejects.toThrow(/HTTP 400/);
  });

  it("throws when user token is missing", async () => {
    await expect(
      sendFeishuTextByUser({
        userAccessToken: "",
        chatId: "oc_xxx",
        text: "日报：hello",
      }),
    ).rejects.toThrow(/user access token is empty/i);
  });
});

describe("refreshFeishuUserAccessToken", () => {
  it("refreshes user access token successfully", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          code: 0,
          msg: "ok",
          data: {
            access_token: "u-at-new",
            refresh_token: "u-rt-new",
            expires_in: 7200,
          },
        }),
        {
          status: 200,
          headers: { "content-type": "application/json" },
        },
      ),
    );

    await expect(
      refreshFeishuUserAccessToken(
        {
          appId: "cli_xxx",
          appSecret: "app_secret_xxx",
          refreshToken: "u-rt-old",
        },
        fetchMock,
      ),
    ).resolves.toEqual({
      accessToken: "u-at-new",
      refreshToken: "u-rt-new",
      expiresIn: 7200,
    });
  });

  it("throws when refresh returns business error", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ code: 20028, msg: "invalid client_id" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );

    await expect(
      refreshFeishuUserAccessToken(
        {
          appId: "cli_xxx",
          appSecret: "app_secret_xxx",
          refreshToken: "u-rt-old",
        },
        fetchMock,
      ),
    ).rejects.toThrow(/Feishu token refresh error/);
  });

  it("throws when refreshed access token is missing", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ code: 0, msg: "ok", data: {} }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );

    await expect(
      refreshFeishuUserAccessToken(
        {
          appId: "cli_xxx",
          appSecret: "app_secret_xxx",
          refreshToken: "u-rt-old",
        },
        fetchMock,
      ),
    ).rejects.toThrow(/did not contain access token/i);
  });
});

describe("exchangeFeishuAuthorizationCode", () => {
  it("exchanges code and returns tokens", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          code: 0,
          data: {
            access_token: "u-at-new",
            refresh_token: "u-rt-new",
            expires_in: 7200,
          },
        }),
        {
          status: 200,
          headers: { "content-type": "application/json" },
        },
      ),
    );

    await expect(
      exchangeFeishuAuthorizationCode(
        {
          appId: "cli_xxx",
          appSecret: "app_secret_xxx",
          code: "auth_code_xxx",
        },
        fetchMock,
      ),
    ).resolves.toEqual({
      accessToken: "u-at-new",
      refreshToken: "u-rt-new",
      expiresIn: 7200,
    });
  });

  it("throws when code exchange returns business error", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ code: 20003, msg: "code is invalid" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );

    await expect(
      exchangeFeishuAuthorizationCode(
        {
          appId: "cli_xxx",
          appSecret: "app_secret_xxx",
          code: "invalid-code",
        },
        fetchMock,
      ),
    ).rejects.toThrow(/Feishu authorization error/);
  });
});
