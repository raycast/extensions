import { createUserDataStore } from "./user-data-store";
import type { UserDataState } from "../user-data/service";
const data = { favorites: [] } as unknown as UserDataState;
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

it("honors and coalesces sign-in requests during a signed-out background load", async () => {
  const backgroundToken = deferred<string | null>();
  const authorizedToken = deferred<string | null>();
  const authorizationStarted = deferred<void>();
  const getToken = jest.fn((allow: boolean) => {
    if (!allow) return backgroundToken.promise;
    authorizationStarted.resolve();
    return authorizedToken.promise;
  });
  const store = createUserDataStore({ getToken, isCurrent: async () => true, load: async () => data });
  const background = store.revalidate(false);
  const firstSignIn = store.revalidate(true);
  const secondSignIn = store.revalidate(true);
  expect(secondSignIn).toBe(firstSignIn);
  let signInFinished = false;
  void firstSignIn.then(() => {
    signInFinished = true;
  });
  backgroundToken.resolve(null);
  await background;
  await Promise.resolve();
  expect(getToken.mock.calls).toEqual([[false], [true]]);
  expect(signInFinished).toBe(false);
  await authorizationStarted.promise;
  authorizedToken.resolve("A");
  await Promise.all([firstSignIn, secondSignIn]);
  expect(store.getSnapshot().data).toBe(data);
  expect(getToken).toHaveBeenCalledTimes(2);
});

it("reuses a successful background account load without prompting or loading twice", async () => {
  const token = deferred<string | null>();
  const getToken = jest.fn(() => token.promise);
  const load = jest.fn(async () => data);
  const store = createUserDataStore({ getToken, isCurrent: async () => true, load });
  const background = store.revalidate(false);
  const signIn = store.revalidate(true);
  token.resolve("A");
  await Promise.all([background, signIn]);
  expect(store.getSnapshot().data).toBe(data);
  expect(getToken).toHaveBeenCalledTimes(1);
  expect(load).toHaveBeenCalledTimes(1);
});

it("cancels queued authorization when the store resets before a background load finishes", async () => {
  const token = deferred<string | null>();
  const getToken = jest.fn(() => token.promise);
  const store = createUserDataStore({ getToken, isCurrent: async () => true, load: async () => data });
  const background = store.revalidate(false);
  const signIn = store.revalidate(true);
  store.reset();
  token.resolve(null);
  await Promise.all([background, signIn]);
  expect(getToken.mock.calls).toEqual([[false]]);
  expect(store.getSnapshot()).toEqual({ data: null, isLoading: false, initialized: false });
});
it("clears previous account data while loading replacement credentials", async () => {
  let token: string | null = "A";
  const next = deferred<UserDataState>();
  const store = createUserDataStore({
    getToken: async () => token,
    isCurrent: async (value) => value === token,
    load: async (value) => (value === "A" ? data : next.promise),
  });
  await store.revalidate();
  expect(store.getSnapshot().data).toBe(data);
  token = "B";
  const pending = store.revalidate();
  await Promise.resolve();
  expect(store.getSnapshot().data).toBeNull();
  next.resolve(data);
  await pending;
  token = null;
  await store.revalidate();
  expect(store.getSnapshot().data).toBeNull();
});
it("ignores an old request after reset", async () => {
  const next = deferred<UserDataState>();
  const store = createUserDataStore({
    getToken: async () => "A",
    isCurrent: async () => true,
    load: () => next.promise,
  });
  const pending = store.revalidate();
  await Promise.resolve();
  store.reset();
  next.resolve(data);
  await pending;
  expect(store.getSnapshot().data).toBeNull();
});

it("clears private data when the last view closes and reopens signed out", async () => {
  let token: string | null = "A";
  const store = createUserDataStore({
    getToken: async () => token,
    isCurrent: async (value) => value === token,
    load: async () => data,
  });
  const closeFirst = store.subscribe(() => {});
  const closeLast = store.subscribe(() => {});
  await store.revalidate();
  closeFirst();
  expect(store.getSnapshot().data).toBe(data);
  token = null;
  closeLast();
  expect(store.getSnapshot().data).toBeNull();
  expect(store.getSnapshot().initialized).toBe(false);
  const closeReopened = store.subscribe(() => {});
  await store.revalidate();
  expect(store.getSnapshot().data).toBeNull();
  expect(store.getSnapshot().initialized).toBe(true);
  closeReopened();
});

it("does not let delayed account validation reset a newer account", async () => {
  let token = "A";
  const current = deferred<boolean>();
  const checked = deferred<void>();
  const replacement = { ...data, favorites: [] };
  const store = createUserDataStore({
    getToken: async () => token,
    isCurrent: async (value) => {
      if (value === "A") {
        checked.resolve();
        return current.promise;
      }
      return true;
    },
    load: async (value) => (value === "A" ? data : replacement),
  });
  const first = store.revalidate();
  await checked.promise;
  store.reset();
  token = "B";
  await store.revalidate();
  current.resolve(false);
  await first;
  expect(store.getSnapshot().data).toBe(replacement);
});
