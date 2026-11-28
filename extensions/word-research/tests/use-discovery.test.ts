import assert from "node:assert/strict";
import { test } from "node:test";
import { createElement, StrictMode } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { useDiscovery } from "../src/use-discovery.ts";

// Tell React that these tests explicitly flush renders and effects with act().
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}

async function mount(input = "first", enabled = true, strict = false) {
  const calls: { input: string; signal: AbortSignal; task: ReturnType<typeof deferred<string>> }[] = [];
  const check = (input: string, signal: AbortSignal) => {
    const task = deferred<string>();
    calls.push({ input, signal, task });
    return task.promise;
  };
  let discovery!: ReturnType<typeof useDiscovery<string>>;
  function Harness(props: { input: string; enabled: boolean }) {
    discovery = useDiscovery(check, props.input, props.enabled);
    return null;
  }
  const element = (input: string, enabled: boolean) => {
    const child = createElement(Harness, { input, enabled });
    return strict ? createElement(StrictMode, null, child) : child;
  };
  let renderer!: ReactTestRenderer;
  await act(async () => {
    renderer = create(element(input, enabled));
  });
  return {
    calls,
    state: () => discovery.state,
    get discovery() {
      return discovery;
    },
    async update(input: string, enabled = true) {
      await act(async () => {
        renderer.update(element(input, enabled));
      });
    },
    async unmount() {
      await act(async () => {
        renderer.unmount();
      });
    },
  };
}

test("cancels pending work and ignores a late completion even if it ignores abort", async () => {
  const view = await mount();
  try {
    await act(async () => {
      view.discovery.cancel();
    });
    assert.equal(view.calls[0].signal.aborted, true);
    assert.equal(view.state().kind, "cancelled");
    await act(async () => {
      view.calls[0].task.resolve("obsolete");
    });
    assert.equal(view.state().kind, "cancelled");
  } finally {
    await view.unmount();
  }
});

test("repeat inputs abort the previous request and ignore stale successes and failures", async () => {
  const view = await mount();
  try {
    await view.update("second");
    assert.equal(view.calls[0].signal.aborted, true);
    assert.equal(view.calls[1].input, "second");
    assert.equal(view.state().kind, "loading");
    await act(async () => {
      view.calls[1].task.resolve("second result");
    });
    assert.deepEqual(view.state(), { kind: "success", result: "second result" });
    await act(async () => {
      view.calls[0].task.reject(new Error("obsolete failure"));
    });
    assert.deepEqual(view.state(), { kind: "success", result: "second result" });
    await view.update("third");
    await view.update("fourth");
    await act(async () => {
      view.calls[2].task.resolve("obsolete success");
    });
    assert.equal(view.state().kind, "loading");
  } finally {
    await view.unmount();
  }
});

test("failure can be retried with the same input, followed by another discovery", async () => {
  const view = await mount();
  try {
    await act(async () => {
      view.calls[0].task.reject(new Error("offline"));
    });
    assert.deepEqual(view.state(), { kind: "error", message: "offline" });
    await act(async () => {
      view.discovery.retry();
    });
    assert.equal(view.calls[0].signal.aborted, true);
    assert.equal(view.calls[1].input, "first");
    assert.equal(view.state().kind, "loading");
    await act(async () => {
      view.calls[1].task.resolve("success");
    });
    await view.update("another");
    assert.equal(view.calls[2].input, "another");
    assert.equal(view.state().kind, "loading");
  } finally {
    await view.unmount();
  }
});

test("editing or invalid input stops requests; submitting the same input restarts", async () => {
  const view = await mount("same", false);
  try {
    assert.equal(view.calls.length, 0);
    await view.update("same", true);
    await view.update("same", false);
    assert.equal(view.calls[0].signal.aborted, true);
    await act(async () => {
      view.calls[0].task.resolve("late");
    });
    await view.update("same", true);
    assert.equal(view.calls.length, 2);
    await act(async () => {
      view.calls[1].task.resolve("current");
    });
    assert.deepEqual(view.state(), { kind: "success", result: "current" });
  } finally {
    await view.unmount();
  }
});

test("unmount aborts pending work and late rejection is handled", async () => {
  const view = await mount();
  await view.unmount();
  assert.equal(view.calls[0].signal.aborted, true);
  await act(async () => {
    view.calls[0].task.reject(new Error("late"));
  });
});

test("StrictMode cleanup aborts the first request while the replacement succeeds", async () => {
  const view = await mount("first", true, true);
  try {
    assert.equal(view.calls.length, 2);
    assert.equal(view.calls[0].signal.aborted, true);
    await act(async () => {
      view.calls[0].task.resolve("stale");
      view.calls[1].task.resolve("current");
    });
    assert.deepEqual(view.state(), { kind: "success", result: "current" });
  } finally {
    await view.unmount();
  }
});
