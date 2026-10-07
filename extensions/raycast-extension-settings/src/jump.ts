// Raycast has no API or deeplink that opens another extension's settings, so this drives the
// Settings window through the macOS accessibility API, called directly from JavaScript for
// Automation (one in-process call per attribute; System Events scripting is ~50x slower). It never
// sends keystrokes, so nothing can land in another app and keyboard focus does not matter.
// Steps: open Settings through its built-in command's deeplink, put the title in the search box,
// press result rows titled exactly the extension's name, in order, until the page's one heading
// reads that name (an app or AI entry of the same name can come first). Each failure returns a
// code that `reasonFor` turns into a sentence.
export const SETTINGS_DEEPLINK = "raycast://extensions/raycast/raycast/settings";

export type JumpFailure =
  | "no-accessibility"
  | "settings-not-opened"
  | "no-search-box"
  | "no-result"
  | "wrong-page"
  | "unknown";

export type JumpResult = { ok: true } | { ok: false; code: JumpFailure; detail?: string };

// JavaScript for Automation; the title arrives as argv, so it never needs escaping.
export const JUMP_SCRIPT = `
ObjC.import("AppKit");
ObjC.bindFunction("AXUIElementCreateApplication", ["void *", ["int"]]);
ObjC.bindFunction("AXUIElementCopyAttributeValue", ["int", ["void *", "void *", "void **"]]);
ObjC.bindFunction("AXUIElementSetAttributeValue", ["int", ["void *", "void *", "void *"]]);
ObjC.bindFunction("AXUIElementPerformAction", ["int", ["void *", "void *"]]);
ObjC.bindFunction("AXIsProcessTrusted", ["bool", []]);

const refs = {};
const ref = (s) => refs[s] || (refs[s] = ObjC.castObjectToRef($(s)));
function attr(el, name) {
  const out = Ref();
  return $.AXUIElementCopyAttributeValue(el, ref(name), out) === 0 ? ObjC.castRefToObject(out[0]) : null;
}
function text(el, name) {
  const v = attr(el, name);
  return v && v.isKindOfClass($.NSString) ? v.js : null;
}
// Depth-first, document order; stops when fn returns true and returns that element.
function find(root, fn) {
  const stack = [root];
  while (stack.length) {
    const el = stack.pop();
    if (fn(el)) return el;
    const kids = attr(el, "AXChildren");
    if (kids) for (let i = kids.count - 1; i >= 0; i--) stack.push(ObjC.castObjectToRef(kids.objectAtIndex(i)));
  }
  return null;
}
function findAll(root, fn) {
  const out = [];
  find(root, (el) => void (fn(el) && out.push(el)));
  return out;
}
function poll(seconds, fn) {
  const end = Date.now() + seconds * 1000;
  for (;;) {
    const v = fn();
    if (v || Date.now() > end) return v;
    delay(0.1);
  }
}
const label = (el) => text(el, "AXTitle") || text(el, "AXDescription") || "";
function settingsWindow(app) {
  const wins = attr(app, "AXWindows");
  if (!wins) return null;
  for (let i = 0; i < wins.count; i++) {
    const w = ObjC.castObjectToRef(wins.objectAtIndex(i));
    if (text(w, "AXTitle") === "Settings") return w;
  }
  return null;
}
function headingText(win) {
  const h = find(win, (el) => text(el, "AXRole") === "AXHeading");
  if (!h) return null;
  const t = find(h, (el) => text(el, "AXRole") === "AXStaticText");
  return t ? text(t, "AXValue") || label(t) : label(h);
}

function run(argv) {
  const target = argv[0];
  if (!$.AXIsProcessTrusted()) return "no-accessibility";
  const running = $.NSRunningApplication.runningApplicationsWithBundleIdentifier("com.raycast.macos");
  if (running.count === 0) return "settings-not-opened";
  const app = $.AXUIElementCreateApplication(running.objectAtIndex(0).processIdentifier);

  $.NSWorkspace.sharedWorkspace.openURL($.NSURL.URLWithString("${SETTINGS_DEEPLINK}"));
  const win = poll(5, () => settingsWindow(app));
  if (!win) return "settings-not-opened";

  const box = poll(2, () => find(win, (el) => text(el, "AXRole") === "AXTextField" && label(el) === "Search settings"));
  if (!box) return "no-search-box";
  // The box reports a new value to Settings only while it has focus, so focus it (inside Raycast,
  // no keystrokes) before filling it. A window that is still rendering can reset the box, so the
  // wait for results refills it whenever it no longer holds the title.
  const fill = () => {
    $.AXUIElementSetAttributeValue(box, ref("AXFocused"), ObjC.castObjectToRef($.NSNumber.numberWithBool(true)));
    $.AXUIElementSetAttributeValue(box, ref("AXValue"), ObjC.castObjectToRef($(target)));
  };
  fill();

  // A result row's label is its title, then a line holding its ⌘-number hint. Apps and AI
  // entries can share an extension's name and sort above it, so press each exact match in order
  // until the page heading confirms the extension.
  const isHit = (el) => {
    if (text(el, "AXRole") !== "AXButton") return false;
    const l = label(el);
    return l === target || l.startsWith(target + "\\n");
  };
  const hits = () => {
    if (text(box, "AXValue") !== target) return void fill();
    const all = findAll(win, isHit);
    return all.length ? all : null;
  };
  if (!poll(4, hits)) return "no-result";

  let seen = "";
  for (let i = 0; ; i++) {
    const rows = poll(2, hits) || [];
    if (i >= rows.length) break;
    const before = headingText(win);
    $.AXUIElementPerformAction(rows[i], ref("AXPress"));
    // Move on as soon as the page changes; wait the full 3 s only when the heading doesn't move.
    const now = poll(3, () => {
      const h = headingText(win);
      return h === target || (h && h !== before) ? h : null;
    });
    if (now === target) {
      $.AXUIElementSetAttributeValue(box, ref("AXValue"), ObjC.castObjectToRef($("")));
      return "ok";
    }
    seen = seen || headingText(win) || "";
  }
  // Leave the search in place so the user can pick the right row themselves.
  fill();
  return "wrong-page:" + seen;
}
`;

export function parseJumpOutput(output: string): JumpResult {
  const code = output.trim();
  if (code === "ok") return { ok: true };
  if (code.startsWith("wrong-page:")) {
    return { ok: false, code: "wrong-page", detail: code.slice("wrong-page:".length) || undefined };
  }
  const known: JumpFailure[] = [
    "no-accessibility",
    "settings-not-opened",
    "no-search-box",
    "no-result",
  ];
  return known.includes(code as JumpFailure)
    ? { ok: false, code: code as JumpFailure }
    : { ok: false, code: "unknown", detail: code };
}

// macOS refuses accessibility calls when Raycast lacks Accessibility permission (-1719, -25211).
export function failureFromError(message: string): JumpResult {
  if (/-1719|-25211|assistive access|not allowed/i.test(message)) {
    return { ok: false, code: "no-accessibility" };
  }
  return { ok: false, code: "unknown", detail: message };
}

export function reasonFor(title: string, result: Exclude<JumpResult, { ok: true }>): string {
  switch (result.code) {
    case "no-accessibility":
      return "Raycast needs Accessibility permission";
    case "settings-not-opened":
      return "Raycast Settings didn't open within 5 seconds";
    case "no-search-box":
      return "Couldn't find the Settings search box";
    case "no-result":
      return `Raycast Settings has no extension named “${title}”`;
    case "wrong-page":
      return result.detail
        ? `Settings opened ${result.detail} instead`
        : `Settings opened, but not on ${title}'s page`;
    default:
      return result.detail ? `Unexpected error: ${result.detail}` : "Unexpected error";
  }
}
