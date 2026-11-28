import type { DeviceCode, TokenResponse } from "./types";
export class DeviceFlowError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}
export function sleep(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    signal.throwIfAborted();
    const abort = () => {
      clearTimeout(timer);
      reject(new DeviceFlowError("cancelled", "Sign-in cancelled"));
    };
    const timer = setTimeout(() => {
      signal.removeEventListener("abort", abort);
      resolve();
    }, ms);
    signal.addEventListener("abort", abort, { once: true });
  });
}
export async function pollDeviceToken(
  code: DeviceCode,
  request: (signal: AbortSignal) => Promise<TokenResponse>,
  signal: AbortSignal,
  wait = sleep,
  now = Date.now,
): Promise<TokenResponse> {
  const deadline = now() + code.expires_in * 1000;
  let interval = Math.max(1, code.interval ?? 5) * 1000;
  while (now() < deadline) {
    await wait(Math.min(interval, deadline - now()), signal);
    signal.throwIfAborted();
    if (now() >= deadline) break;
    try {
      return await request(signal);
    } catch (error) {
      if (!(error instanceof DeviceFlowError)) throw error;
      if (error.code === "slow_down") interval += 5000;
      else if (error.code !== "authorization_pending") throw error;
    }
  }
  throw new DeviceFlowError(
    "expired_token",
    "The code expired. Start sign-in again.",
  );
}
