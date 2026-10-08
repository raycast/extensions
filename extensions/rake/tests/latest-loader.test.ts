import assert from "node:assert/strict";
import test from "node:test";
import { createLatestLoader } from "../src/latest-loader.ts";

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function setup() {
  const requests: ReturnType<typeof deferred<string[]>>[] = [];
  const state = { tasks: ["previous task"], loading: false, errors: [] as unknown[] };
  const loader = createLatestLoader({
    load: () => {
      const request = deferred<string[]>();
      requests.push(request);
      return request.promise;
    },
    onStart: () => {
      state.tasks = [];
      state.loading = true;
    },
    onSuccess: (tasks) => {
      state.tasks = tasks;
    },
    onError: async (error) => {
      state.errors.push(error);
    },
    onFinish: () => {
      state.loading = false;
    },
  });
  return { loader, requests, state };
}

test("a slower earlier load cannot replace the newest task list", async () => {
  const { loader, requests, state } = setup();
  const oldLoad = loader.run();
  const newLoad = loader.run();
  assert.deepEqual(state.tasks, []);
  assert.equal(state.loading, true);

  requests[1].resolve(["new directory task"]);
  await newLoad;
  requests[0].resolve(["old directory task"]);
  await oldLoad;

  assert.deepEqual(state, { tasks: ["new directory task"], loading: false, errors: [] });
});

test("a stale failure cannot clear successful tasks or show an error", async () => {
  const { loader, requests, state } = setup();
  const oldLoad = loader.run();
  const newLoad = loader.run();
  requests[1].resolve(["current task"]);
  await newLoad;
  requests[0].reject(new Error("old failure"));
  await oldLoad;
  assert.deepEqual(state, { tasks: ["current task"], loading: false, errors: [] });
});

test("stale completion cannot stop the loading indicator for a pending request", async () => {
  const { loader, requests, state } = setup();
  const oldLoad = loader.run();
  const newLoad = loader.run();
  requests[0].resolve(["old task"]);
  await oldLoad;
  assert.deepEqual(state, { tasks: [], loading: true, errors: [] });

  const error = new Error("current failure");
  requests[1].reject(error);
  await newLoad;
  assert.deepEqual(state, { tasks: [], loading: false, errors: [error] });
});

test("cleanup invalidates pending loads, and the loader can be used again", async () => {
  const { loader, requests, state } = setup();
  const oldLoad = loader.run();
  loader.invalidate();
  requests[0].reject(new Error("unmounted failure"));
  await oldLoad;
  assert.deepEqual(state, { tasks: [], loading: true, errors: [] });

  const newLoad = loader.run();
  requests[1].resolve(["remounted task"]);
  await newLoad;
  assert.deepEqual(state, { tasks: ["remounted task"], loading: false, errors: [] });
});

test("a new load started during error handling keeps its loading indicator", async () => {
  const firstRequest = deferred<string[]>();
  const secondRequest = deferred<string[]>();
  const errorHandled = deferred<void>();
  const errorShown = deferred<void>();
  let count = 0;
  let loading = false;
  const loader = createLatestLoader({
    load: () => (++count === 1 ? firstRequest.promise : secondRequest.promise),
    onStart: () => {
      loading = true;
    },
    onSuccess: () => {},
    onError: async () => {
      errorShown.resolve();
      await errorHandled.promise;
    },
    onFinish: () => {
      loading = false;
    },
  });
  const first = loader.run();
  firstRequest.reject(new Error("first failure"));
  await errorShown.promise;
  const second = loader.run();
  errorHandled.resolve();
  await first;
  assert.equal(loading, true);
  secondRequest.resolve([]);
  await second;
  assert.equal(loading, false);
});
