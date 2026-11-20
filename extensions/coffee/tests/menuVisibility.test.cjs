const assert = require("node:assert/strict");
const { test } = require("node:test");
const { loadSource } = require("./helpers.cjs");

const { createMenuVisibility, observeMenuVisibility, keepMenuVisible, getMenuVisibility } = loadSource(
  "menuVisibility.ts",
  {},
);
const inactive = {
  isRunning: false,
  isUserInitiated: false,
  hideWhenInactive: true,
  isLoading: false,
  hasError: false,
};

test("background inactivity hides immediately; a user launch receives exactly five seconds", () => {
  const background = createMenuVisibility(inactive, 1000);
  assert.equal(getMenuVisibility(background, inactive, 1000).isVisible, false);
  const user = { ...inactive, isUserInitiated: true };
  const state = createMenuVisibility(user, 1000);
  assert.equal(getMenuVisibility(state, user, 5999).isVisible, true);
  assert.equal(getMenuVisibility(state, user, 6000).isVisible, false);
  assert.equal(createMenuVisibility(inactive, 1000, true).visibleUntil, 6000);
});

test("activity ending starts grace once and unchanged observations do not extend it", () => {
  const active = { ...inactive, isRunning: true };
  const state = createMenuVisibility(active, 1000);
  const stopped = observeMenuVisibility(state, inactive, 2000);
  assert.equal(stopped.visibleUntil, 7000);
  assert.equal(observeMenuVisibility(stopped, inactive, 6000), stopped);
  assert.equal(getMenuVisibility(stopped, inactive, 7000).isVisible, false);
});

test("a subsequent user launch and completed stop renew the grace deadline", () => {
  const state = createMenuVisibility(inactive, 1000);
  const user = { ...inactive, isUserInitiated: true };
  const launched = observeMenuVisibility(state, user, 8000);
  assert.equal(launched.visibleUntil, 13000);
  assert.equal(observeMenuVisibility(launched, user, 9000), launched);
  const completed = keepMenuVisible(launched, 10000);
  assert.equal(completed.visibleUntil, 15000);
  assert.equal(getMenuVisibility(completed, user, 14999).isVisible, true);
  assert.equal(getMenuVisibility(completed, user, 15000).isVisible, false);
});

test("external or managed activity stays visible and clears an inactive grace deadline", () => {
  const active = { ...inactive, isRunning: true };
  const state = keepMenuVisible(createMenuVisibility(inactive, 1000), 2000);
  const running = observeMenuVisibility(state, active, 3000);
  assert.equal(running.visibleUntil, 0);
  assert.equal(getMenuVisibility(running, active, 100000).isVisible, true);
  assert.equal(getMenuVisibility(running, active, 100000).hideAt, null);
  assert.equal(observeMenuVisibility(running, active, 100000), running);
});

test("loading, errors, unknown activity, and disabled hiding keep the menu visible without expiry timers", () => {
  const state = createMenuVisibility(inactive, 1000);
  for (const override of [
    { isLoading: true },
    { hasError: true },
    { isRunning: undefined },
    { hideWhenInactive: false },
  ]) {
    const result = getMenuVisibility(state, { ...inactive, ...override }, 100000);
    assert.equal(result.isVisible, true);
    assert.equal(result.hideAt, null);
  }
});

test("enabling hiding while already inactive does not invent a new grace period", () => {
  const shown = { ...inactive, hideWhenInactive: false };
  const state = createMenuVisibility(shown, 1000);
  const updated = observeMenuVisibility(state, inactive, 10000);
  assert.equal(getMenuVisibility(updated, inactive, 10000).isVisible, false);
});

// This small harness checks the hook's timer wiring and effect cleanup. The
// transition rules above are tested directly, independently of React rendering.
function visibilityHook(initial = {}) {
  let now = 1000;
  let inputs = { ...inactive, initialUserInitiated: false, ...initial };
  const states = [];
  const effects = [];
  const timers = new Map();
  let stateIndex = 0;
  let effectIndex = 0;
  let nextTimer = 0;
  let pendingEffects = [];
  let dirty = false;
  let result;
  const react = {
    useState(initialValue) {
      const index = stateIndex++;
      if (!Object.hasOwn(states, index)) {
        states[index] = typeof initialValue === "function" ? initialValue() : initialValue;
      }
      return [
        states[index],
        (update) => {
          const value = typeof update === "function" ? update(states[index]) : update;
          if (!Object.is(value, states[index])) {
            states[index] = value;
            dirty = true;
          }
        },
      ];
    },
    useEffect(callback, dependencies) {
      const index = effectIndex++;
      const previous = effects[index];
      if (!previous || dependencies.some((dependency, i) => !Object.is(dependency, previous.dependencies[i]))) {
        pendingEffects.push(() => {
          previous?.cleanup?.();
          effects[index] = { dependencies, cleanup: callback() };
        });
      }
    },
  };
  const { useMenuVisibility } = loadSource(
    "hooks/useMenuVisibility.ts",
    { react },
    {
      Date: { now: () => now },
      setTimeout(callback, delay) {
        const id = ++nextTimer;
        timers.set(id, { at: now + delay, callback });
        return id;
      },
      clearTimeout: (id) => timers.delete(id),
    },
  );
  function render(next = {}) {
    inputs = { ...inputs, ...next };
    let firstFrame;
    let renders = 0;
    do {
      assert.ok(++renders < 10, "hook should settle without a render loop");
      stateIndex = effectIndex = 0;
      dirty = false;
      pendingEffects = [];
      result = useMenuVisibility(inputs);
      firstFrame ??= result;
      for (const effect of pendingEffects) effect();
    } while (dirty);
    return firstFrame;
  }
  function advanceTo(target) {
    while (true) {
      const next = [...timers].filter(([, timer]) => timer.at <= target).sort((a, b) => a[1].at - b[1].at)[0];
      if (!next) break;
      now = next[1].at;
      timers.delete(next[0]);
      next[1].callback();
      render();
    }
    now = target;
  }
  render();
  return {
    render,
    advanceTo,
    timers,
    get result() {
      return result;
    },
    unmount: () => effects.forEach((effect) => effect.cleanup?.()),
  };
}

test("the hook shows a pending inactive transition before effects and expires it with one timer", () => {
  const h = visibilityHook({ isRunning: true });
  assert.equal(h.timers.size, 0);
  h.advanceTo(2000);
  assert.equal(h.render({ isRunning: false }).isVisible, true);
  assert.equal(h.timers.size, 1);
  h.advanceTo(6999);
  assert.equal(h.result.isVisible, true);
  h.advanceTo(7000);
  assert.equal(h.result.isVisible, false);
  assert.equal(h.timers.size, 0);
});

test("successful stop renews the single expiry timer; activity and unmount cancel it", () => {
  const h = visibilityHook({ isUserInitiated: true, initialUserInitiated: true });
  assert.equal(h.timers.size, 1);
  h.advanceTo(3000);
  h.result.keepVisibleAfterStop();
  h.render();
  assert.equal(h.timers.size, 1);
  assert.equal([...h.timers.values()][0].at, 8000);
  h.render({ isRunning: true });
  assert.equal(h.timers.size, 0);
  h.render({ isRunning: false });
  assert.equal(h.timers.size, 1);
  h.unmount();
  assert.equal(h.timers.size, 0);
});

test("loading and errors suspend the expiry timer and do not restart elapsed grace", () => {
  const h = visibilityHook({ isUserInitiated: true, initialUserInitiated: true });
  h.render({ isLoading: true });
  assert.equal(h.timers.size, 0);
  h.advanceTo(3000);
  h.render({ isLoading: false });
  assert.equal([...h.timers.values()][0].at, 6000);
  h.render({ hasError: true });
  assert.equal(h.timers.size, 0);
  h.advanceTo(7000);
  h.render({ hasError: false });
  assert.equal(h.result.isVisible, false);
  assert.equal(h.timers.size, 0);
});
