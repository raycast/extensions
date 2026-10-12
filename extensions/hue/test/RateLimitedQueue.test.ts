import { afterEach, beforeEach, expect, it, vi } from "vitest";
import RateLimitedQueue from "../src/lib/RateLimitedQueue";

let start: number;
let log: string[];

// A request that logs its name and start time in ms, then settles after the given time.
function request(name: string, duration = 0, error?: Error) {
  return () => {
    log.push(`${name}@${Date.now() - start}`);
    return new Promise<string>((resolve, reject) =>
      setTimeout(() => (error ? reject(error) : resolve(name)), duration),
    );
  };
}

const fulfilled = (value: string) => ({ status: "fulfilled", value });
const rejected = (reason: unknown) => ({ status: "rejected", reason });

beforeEach(() => {
  vi.useFakeTimers();
  start = Date.now();
  log = [];
});

afterEach(() => {
  vi.useRealTimers();
});

it.each([
  [10, ["a@0", "b@100", "c@200"]],
  [1, ["a@0", "b@1000", "c@2000"]],
])("starts the first request at once and the next ones 1000/%d ms apart", async (requestsPerSecond, starts) => {
  const queue = new RateLimitedQueue(requestsPerSecond);
  ["a", "b", "c"].forEach((name) => queue.enqueueRequest(request(name)));
  await vi.runAllTimersAsync();
  expect(log).toEqual(starts);
});

it("starts a request only once the previous one settles", async () => {
  const queue = new RateLimitedQueue(10);
  const results = Promise.all([queue.enqueueRequest(request("a", 500)), queue.enqueueRequest(request("b"))]);
  await vi.runAllTimersAsync();
  expect(await results).toEqual(["a", "b"]);
  expect(log).toEqual(["a@0", "b@500"]);
});

it.each<[string, () => Promise<string>]>([
  ["rejects", request("b", 0, new Error("b failed"))],
  [
    "throws",
    () => {
      throw new Error("b failed");
    },
  ],
])("rejects only the request that %s, and goes on", async (_, failing) => {
  const queue = new RateLimitedQueue(10);
  const results = Promise.allSettled([
    queue.enqueueRequest(request("a")),
    queue.enqueueRequest(failing),
    queue.enqueueRequest(request("c")),
  ]);
  await vi.runAllTimersAsync();
  expect(await results).toEqual([fulfilled("a"), rejected(new Error("b failed")), fulfilled("c")]);
  expect(log.at(-1)).toBe("c@200");
});
