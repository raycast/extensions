import { describe, expect, it, vi } from "vitest";
import { runSearchRequest } from "../api/search/search-request.service";

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

describe("runSearchRequest", () => {
  it("ignores results and loading updates from a stale search", async () => {
    const oldSearch = deferred<string[]>();
    const newSearch = deferred<string[]>();
    const onResults = vi.fn();
    const onSettled = vi.fn();
    let oldSearchCancelled = false;

    const oldRequest = runSearchRequest({
      search: () => oldSearch.promise,
      isStale: () => oldSearchCancelled,
      onResults,
      onSettled,
    });

    oldSearchCancelled = true;
    const newRequest = runSearchRequest({
      search: () => newSearch.promise,
      isStale: () => false,
      onResults,
      onSettled,
    });

    newSearch.resolve(["new result"]);
    await newRequest;
    oldSearch.resolve(["old result"]);
    await oldRequest;

    expect(onResults).toHaveBeenCalledOnce();
    expect(onResults).toHaveBeenCalledWith(["new result"]);
    expect(onSettled).toHaveBeenCalledOnce();
  });
});
