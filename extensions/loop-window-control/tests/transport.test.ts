import assert from "node:assert/strict";
import { test } from "node:test";
import { ACTIONS } from "../src/lib/actions";
import { buildURL, deliver, dispatch, inspectInstallation, resolveAppPath, Runner } from "../src/lib/transport";

const plist = JSON.stringify({
  CFBundleIdentifier: "com.MrKai77.Loop",
  CFBundleShortVersionString: "1.4.2",
  CFBundleURLTypes: [{ CFBundleURLSchemes: ["loop"] }],
});
test("all actions have distinct, valid URL paths", () => {
  assert.equal(new Set(ACTIONS.map((a) => a.id)).size, ACTIONS.length);
  for (const action of ACTIONS)
    assert.equal(new URL(buildURL({ kind: "action", value: action.id })).pathname, `/${action.id}`);
  assert.equal(buildURL({ kind: "list", value: "keybinds" }), "loop://list/keybinds");
});
test("names are a single encoded path component, never shell code", async () => {
  const name = '工作 & "$(touch nope)" #?%';
  const url = buildURL({ kind: "keybind", value: name });
  assert.equal(decodeURIComponent(new URL(url).pathname.slice(1)), name);
  const calls: unknown[] = [];
  await dispatch("/Applications/My Loop.app", url, async (...args) => {
    calls.push(args);
    return "";
  });
  assert.deepEqual(calls, [["/usr/bin/open", ["-g", "-a", "/Applications/My Loop.app", url]]]);
});
test("invalid keybind names and relative app paths fail early", () => {
  for (const value of ["", " ", "a/b", "\n", "list", "LIST", ".", ".."])
    assert.throws(() => buildURL({ kind: "keybind", value }));
  assert.throws(() => resolveAppPath("Loop.app"));
  assert.throws(() => resolveAppPath("/tmp/foo"));
  assert.match(resolveAppPath("~/Applications/Loop.app"), /\/Applications\/Loop.app$/);
});
test("installation checks identity, scheme, unreadable plist", async () => {
  assert.equal((await inspectInstallation(undefined, async () => plist)).version, "1.4.2");
  await assert.rejects(
    inspectInstallation(undefined, async () => "{}"),
    /not Loop/,
  );
  await assert.rejects(
    inspectInstallation(undefined, async () => JSON.stringify({ CFBundleIdentifier: "com.MrKai77.Loop" })),
    /does not declare/,
  );
  await assert.rejects(
    inspectInstallation(undefined, async () => {
      throw new Error("missing");
    }),
    /Cannot read/,
  );
});
test("validate and check installation before closing; restore focus before dispatch", async () => {
  const order: string[] = [];
  await deliver({ kind: "action", value: "LeftHalf" }, 250, {
    inspect: async () => {
      order.push("inspect");
      return { appPath: "/Applications/Loop.app", version: "1.4.2" };
    },
    close: async () => {
      order.push("close");
    },
    wait: async (ms) => {
      order.push(`wait:${ms}`);
    },
    send: async (_, url) => {
      order.push(url);
    },
  });
  assert.deepEqual(order, ["inspect", "close", "wait:250", "loop://action/LeftHalf"]);
});
test("missing installation never closes Raycast or dispatches", async () => {
  const unexpected = async () => {
    assert.fail("must not run");
  };
  await assert.rejects(
    deliver({ kind: "action", value: "Maximize" }, 250, {
      inspect: async () => {
        throw new Error("missing");
      },
      close: unexpected,
      wait: unexpected,
      send: unexpected,
    }),
    /missing/,
  );
});
test("Launch Services failure includes recovery instructions", async () => {
  const failed: Runner = async () => {
    throw new Error("Launch Services error");
  };
  await assert.rejects(dispatch("/Applications/Loop.app", "loop://action/Center", failed), /Open Loop manually/);
});
