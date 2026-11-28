import { describe, expect, it, vi } from "vitest";
import { requestJson } from "../src/lib/http";
const origin = "https://app.ttrackii.com";
describe("HTTP contracts", () => {
  it("sends bearer auth without cookies, refusing redirects", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue(Response.json({ running: false }));
    await expect(
      requestJson(
        origin,
        "/api/v1/timer",
        "synthetic-session",
        undefined,
        fetcher,
      ),
    ).resolves.toMatchObject({ data: { running: false } });
    expect(fetcher).toHaveBeenCalledWith(
      `${origin}/api/v1/timer`,
      expect.objectContaining({
        method: "GET",
        redirect: "error",
        credentials: "omit",
        headers: expect.objectContaining({
          Authorization: "Bearer synthetic-session",
        }),
      }),
    );
  });
  it("never retries an ambiguous timer mutation", async () => {
    const fetcher = vi.fn().mockRejectedValue(new Error("Connection reset"));
    await expect(
      requestJson(
        origin,
        "/api/v1/timer/start",
        "synthetic-session",
        { taskName: "Task" },
        fetcher,
      ),
    ).rejects.toThrow("Refresh Current Timer");
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it("reports expiry and server conflicts", async () => {
    const unauthorized = vi
      .fn()
      .mockResolvedValue(Response.json({}, { status: 401 }));
    await expect(
      requestJson(origin, "/api/v1/timer", "expired", undefined, unauthorized),
    ).rejects.toMatchObject({ status: 401 });
    const conflict = vi
      .fn()
      .mockResolvedValue(
        Response.json(
          { error: "No timer is currently running" },
          { status: 409 },
        ),
      );
    await expect(
      requestJson(origin, "/api/v1/timer/stop", "synthetic", {}, conflict),
    ).rejects.toMatchObject({
      status: 409,
      message: "No timer is currently running",
    });
  });
  it("retains hourly rate-limit reset information", async () => {
    const fetcher = vi.fn().mockResolvedValue(
      Response.json(
        {},
        {
          status: 429,
          headers: {
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": "2000000000",
          },
        },
      ),
    );
    await expect(
      requestJson(origin, "/api/v1/timer", "synthetic", undefined, fetcher),
    ).rejects.toMatchObject({ status: 429, retryAt: 2000000000000 });
  });
});
