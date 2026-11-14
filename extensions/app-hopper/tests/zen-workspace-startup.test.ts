import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { compileBrowserScript } from "../scripts/compile-browser-script";

const source = compileBrowserScript("companion/zen-workspace-bridge/bridge.ts");
test("AutoConfig loads without Browser Console globals and waits for browser startup", () => {
  const observers = new Map<string, { observe: () => void }>();
  const callbacks: Array<() => void> = [];
  type Tab = { hasAttribute: () => boolean; title: string };
  const wrapper = {
    getTabs: function* (): Generator<Tab> {
      yield { hasAttribute: () => false, title: "current" };
    },
  };
  const original = wrapper.getTabs;
  const extension = {
    canAccessWindow: (win: { private: boolean }) => !win.private,
    windowManager: { getWrapper: () => wrapper },
    tabManager: { getWrapper: (tab: Tab) => tab },
  };
  const win = {
    private: false,
    closed: false,
    gZenWorkspaces: { allStoredTabs: [{ hasAttribute: () => false, title: "Other space" }] },
    WebExtensionPolicy: {
      getByID: (id: string) => {
        assert.equal(id, "app-hopper-firefox@chenghsj");
        return { extension };
      },
    },
  };
  const services = {
    obs: {
      addObserver: (fn: { observe: () => void }, topic: string) => observers.set(topic, fn),
      removeObserver: (_: unknown, topic: string) => observers.delete(topic),
    },
    wm: { getEnumerator: () => [win] },
  };
  const context = vm.createContext({
    Services: services,
    ChromeUtils: {
      importESModule: (uri: string) =>
        uri.includes("Timer")
          ? {
              setInterval: (fn: () => void) => {
                callbacks.push(fn);
                return 1;
              },
              clearInterval: () => {},
            }
          : (() => {
              throw new Error("Unexpected module import");
            })(),
    },
  });
  assert.doesNotThrow(() => vm.runInContext(source, context));
  assert.equal(wrapper.getTabs, original, "startup must not patch prematurely");
  observers.get("browser-delayed-startup-finished")?.observe();
  callbacks.forEach((fn) => fn());
  assert.equal([...wrapper.getTabs()][0].title, "Other space");
  context.appHopperZenBridge.stop();
  assert.equal(wrapper.getTabs, original);
});

test("optional bridge import failures do not escape into AutoConfig", () => {
  const errors: unknown[] = [];
  const context = vm.createContext({
    ChromeUtils: {
      importESModule: () => {
        throw new Error("Module unavailable at startup");
      },
    },
    Services: { console: { logStringMessage: (message: string) => errors.push(message) } },
  });
  assert.doesNotThrow(() => vm.runInContext(source, context));
  assert.equal(errors.length, 1);
});

test("missing startup services and logger still cannot abort AutoConfig", () => {
  const context = vm.createContext({
    ChromeUtils: { importESModule: () => ({}) },
  });
  assert.doesNotThrow(() => vm.runInContext(source, context));
});
