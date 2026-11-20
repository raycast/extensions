import { strict as assert } from "node:assert";
import { test } from "node:test";
import { runInNewContext } from "node:vm";
import { nativeFocusScript } from "../src/core/native-focus";
import { CLAUDE_BUNDLE } from "../src/core/claude-desktop";
import { CODEX_APP_BUNDLE } from "../src/core/adapters/codex";

interface Element {
  [attribute: string]: unknown;
}
const cfurl = (value: string) => ({ kind: "CFURL", value });
const array = (items: unknown[]) => ({ count: items.length, objectAtIndex: (i: number) => items[i] });
const web = (url: string, title: string, children: Element[] = []): Element => ({
  AXRole: "AXWebArea",
  AXURL: cfurl(url),
  AXTitle: title,
  AXChildren: array(children),
});
const window = (children: Element[]): Element => ({
  AXRole: "AXWindow",
  AXTitle: "Claude",
  AXChildren: array(children),
});

function runProbe(
  app: Element,
  running = true,
  bundle = CLAUDE_BUNDLE,
  mode: "focused" | "windows" = "focused",
): unknown {
  const bridge = Object.assign((value: unknown) => value, {
    NSRunningApplication: {
      runningApplicationsWithBundleIdentifier: () => array(running ? [{ processIdentifier: 123 }] : []),
    },
    AXUIElementCreateApplication: () => app,
    AXUIElementCopyAttributeValue: (node: Element, name: string, out: unknown[]) => {
      if (node.denied) return -25211;
      if (!(name in node)) return -25212;
      out[0] = node[name];
      return 0;
    },
    CFGetTypeID: (value: { kind?: string }) => (value?.kind === "CFURL" ? 77 : 7),
    CFURLGetTypeID: () => 77,
    CFURLGetString: (value: { value: string }) => value.value,
  });
  return JSON.parse(
    runInNewContext(nativeFocusScript(mode) + "\nrun(args)", {
      args: [bundle],
      $: bridge,
      Ref: () => [],
      ObjC: {
        import: () => undefined,
        bindFunction: () => undefined,
        unwrap: (value: { kind?: string }) => {
          assert.notEqual(value?.kind, "CFURL", "a CFURL must be converted, not treated as a string");
          return value;
        },
      },
    }),
  );
}

test("native AX converts a CFURL and skips the shell without visiting an artifact document", () => {
  const route = "https://claude.ai/epitaxy/local_current?artifact=ignored";
  const document = web(route, "Current - Claude Code", [web("https://claude.ai/epitaxy/local_wrong", "Artifact")]);
  const focused = window([web("file:///Claude.app/index.html", ""), document]);
  assert.deepEqual(runProbe({ AXFocusedWindow: focused }), { title: "Current - Claude Code", url: route });
});

test("native AX reads a fresh ID when focus switches between cloud and local sessions", () => {
  const app: Element = {};
  for (const id of ["session_cloud123", "local_local123", "session_cloud123"]) {
    const route = `https://claude.ai/epitaxy/${id}`;
    app.AXFocusedWindow = window([web(route, "Same title - Claude Code")]);
    assert.deepEqual(runProbe(app), { title: "Same title - Claude Code", url: route });
  }
});

test("native AX never substitutes a background window or starts an absent application", () => {
  const background = window([web("https://claude.ai/epitaxy/local_old", "Old")]);
  assert.equal(runProbe({ AXWindows: array([background]) }), null);
  assert.equal(runProbe({ AXFocusedWindow: background }, false), null);
});

test("title sampling reads only outer documents of open windows without changing focus", () => {
  const first = window([
    web("file:///Claude.app/index.html", ""),
    web("https://claude.ai/epitaxy/session_one", "One - Claude Code", [
      web("https://claude.ai/epitaxy/session_wrong", "Nested artifact"),
    ]),
  ]);
  const second = window([web("https://claude.ai/epitaxy/session_two", "Two - Claude Code")]);
  const app = { AXWindows: array([first, second]) };
  assert.deepEqual(runProbe(app, true, CLAUDE_BUNDLE, "windows"), [
    { title: "One - Claude Code", url: "https://claude.ai/epitaxy/session_one" },
    { title: "Two - Claude Code", url: "https://claude.ai/epitaxy/session_two" },
  ]);
  assert.equal(runProbe(app), null, "the same app still has no focused window");
  assert.deepEqual(runProbe(app, false, CLAUDE_BUNDLE, "windows"), []);
  assert.equal(
    (
      runProbe(
        { AXWindows: array(Array.from({ length: 30 }, () => first)) },
        true,
        CLAUDE_BUNDLE,
        "windows",
      ) as unknown[]
    ).length,
    12,
  );
});

test("native AX reports the accessibility denial instead of guessing a window", () => {
  assert.throws(() => runProbe({ denied: true }), /AX_ACCESS_DENIED/);
});

test("Codex's generic Electron document preserves the native conversation title and URL", () => {
  const route = "codex://threads/019a1234-1234-7123-a123-123456789abc";
  const focused = {
    ...window([web("app://-/index.html", "Codex")]),
    AXTitle: "Renamed conversation",
    AXDocument: cfurl(route),
  };
  assert.deepEqual(runProbe({ AXFocusedWindow: focused }, true, CODEX_APP_BUNDLE), {
    title: "Renamed conversation",
    url: route,
    documentUrl: "app://-/index.html",
  });
});

test("different document and native titles are both retained for ambiguity checks", () => {
  const focused = { ...window([web("app://-/index.html", "Document name")]), AXTitle: "Native name" };
  assert.deepEqual(runProbe({ AXFocusedWindow: focused }, true, CODEX_APP_BUNDLE), {
    title: "Document name",
    windowTitle: "Native name",
    url: "app://-/index.html",
  });
});
