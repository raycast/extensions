import { useEffect, useState } from "react";
import { vi, type Mock } from "vitest";

type AnyFn = (...args: never[]) => unknown;
type Fixture<F extends AnyFn> = Awaited<ReturnType<F>>;

const fixtures = new Map<AnyFn, { data: unknown } | { error: Error }>();
const revalidates = new Map<AnyFn, Mock<() => void>>();

export const runAppleScript = vi.fn<(script: string) => Promise<string>>(async () => "");

export const useCachedPromiseFixtures = {
  set<F extends AnyFn>(fn: F, data: Fixture<F>) {
    fixtures.set(fn, { data });
  },
  fail(fn: AnyFn, error: Error) {
    fixtures.set(fn, { error });
  },
  revalidateOf(fn: AnyFn): Mock<() => void> {
    let revalidate = revalidates.get(fn);
    if (!revalidate) revalidates.set(fn, (revalidate = vi.fn()));
    return revalidate;
  },
  clear() {
    fixtures.clear();
    revalidates.clear();
  },
};

// A function without a registered fixture (the inline backend search in Search Tools) is called for
// real once per argument set, which is how a test reaches the fetch call it has mocked.
export function useCachedPromise<F extends AnyFn>(
  fn: F,
  args: Parameters<F> = [] as unknown as Parameters<F>,
  options: { execute?: boolean } = {},
) {
  const key = JSON.stringify(args);
  const fixture = fixtures.get(fn);
  const skip = options.execute === false || fixture !== undefined;
  const [resolved, setResolved] = useState<{ key: string; data: unknown }>();

  useEffect(() => {
    if (skip) return;
    let cancelled = false;
    Promise.resolve(fn(...args)).then((data) => {
      if (!cancelled) setResolved({ key, data });
    });
    return () => {
      cancelled = true;
    };
  }, [key, skip]);

  let data: Fixture<F> | undefined;
  let error: Error | undefined;
  if (options.execute === false) data = undefined;
  else if (fixture && "error" in fixture) error = fixture.error;
  else if (fixture) data = fixture.data as Fixture<F>;
  else if (resolved?.key === key) data = resolved.data as Fixture<F>;

  return { data, error, isLoading: false, revalidate: useCachedPromiseFixtures.revalidateOf(fn) };
}
