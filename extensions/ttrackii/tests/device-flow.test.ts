import { describe, expect, it, vi } from "vitest";
import {
  DeviceFlowError,
  pollDeviceToken,
  sleep,
} from "../src/lib/device-flow";
import type { DeviceCode } from "../src/lib/types";
const code: DeviceCode = {
  device_code: "synthetic-device",
  user_code: "ABCD-EFGH",
  verification_uri: "/device",
  expires_in: 60,
  interval: 5,
};
function clock() {
  let time = 0;
  const waits: number[] = [];
  return {
    now: () => time,
    waits,
    wait: async (ms: number) => {
      waits.push(ms);
      time += ms;
    },
  };
}
describe("device authorization polling", () => {
  it("waits for approval and honors slowdown before saving the token", async () => {
    const time = clock();
    const request = vi
      .fn()
      .mockRejectedValueOnce(
        new DeviceFlowError("authorization_pending", "Pending"),
      )
      .mockRejectedValueOnce(new DeviceFlowError("slow_down", "Wait"))
      .mockResolvedValue({ access_token: "synthetic-session" });
    expect(
      await pollDeviceToken(
        code,
        request,
        new AbortController().signal,
        time.wait,
        time.now,
      ),
    ).toEqual({ access_token: "synthetic-session" });
    expect(time.waits).toEqual([5000, 5000, 10000]);
  });
  it.each(["access_denied", "expired_token", "server_error"])(
    "stops polling on %s",
    async (reason) => {
      const time = clock();
      const request = vi
        .fn()
        .mockRejectedValue(new DeviceFlowError(reason, reason));
      await expect(
        pollDeviceToken(
          code,
          request,
          new AbortController().signal,
          time.wait,
          time.now,
        ),
      ).rejects.toMatchObject({ code: reason });
      expect(request).toHaveBeenCalledTimes(1);
    },
  );
  it("does not request another token after the code expires", async () => {
    const time = clock();
    const request = vi
      .fn()
      .mockRejectedValue(
        new DeviceFlowError("authorization_pending", "Pending"),
      );
    await expect(
      pollDeviceToken(
        { ...code, expires_in: 5 },
        request,
        new AbortController().signal,
        time.wait,
        time.now,
      ),
    ).rejects.toMatchObject({ code: "expired_token" });
    expect(request).not.toHaveBeenCalled();
  });
  it("cancels waiting promptly without making a token request", async () => {
    const controller = new AbortController();
    const request = vi.fn();
    const result = pollDeviceToken(code, request, controller.signal);
    controller.abort();
    await expect(result).rejects.toMatchObject({ code: "cancelled" });
    expect(request).not.toHaveBeenCalled();
  });
  it("does not retry transport errors", async () => {
    const time = clock();
    const request = vi.fn().mockRejectedValue(new Error("Offline"));
    await expect(
      pollDeviceToken(
        code,
        request,
        new AbortController().signal,
        time.wait,
        time.now,
      ),
    ).rejects.toThrow("Offline");
    expect(request).toHaveBeenCalledTimes(1);
  });
  it("rejects an already cancelled wait", async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(sleep(10, controller.signal)).rejects.toBeDefined();
  });
});
