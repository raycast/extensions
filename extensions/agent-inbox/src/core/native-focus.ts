import { selectWindowDocument } from "./focus-selection";

/** Native AX attributes retain CFURL values that System Events cannot serialize. */
export function nativeFocusScript(bundleId: string, mode: "focused" | "windows" = "focused"): string {
  return `
ObjC.import("AppKit");
ObjC.import("ApplicationServices");
ObjC.bindFunction("AXUIElementCreateApplication", ["id", ["int"]]);
ObjC.bindFunction("AXUIElementCopyAttributeValue", ["int", ["id", "id", "id*"]]);
ObjC.bindFunction("CFGetTypeID", ["unsigned long", ["id"]]);
ObjC.bindFunction("CFURLGetTypeID", ["unsigned long", []]);
ObjC.bindFunction("CFURLGetString", ["id", ["id"]]);
const bundle = ${JSON.stringify(bundleId)};
const selectDocument = ${selectWindowDocument.toString()};
function attribute(node, name) {
  const value = Ref();
  const error = $.AXUIElementCopyAttributeValue(node, $(name), value);
  if (error === -25211) throw new Error("AX_ACCESS_DENIED");
  return error === 0 ? value[0] : null;
}
function text(value) {
  if (!value) return "";
  if ($.CFGetTypeID(value) === $.CFURLGetTypeID()) return String(ObjC.unwrap($.CFURLGetString(value)));
  const unwrapped = ObjC.unwrap(value);
  return typeof unwrapped === "string" ? unwrapped : "";
}
function readWindow(window) {
  let result = { title: text(attribute(window, "AXTitle")), url: text(attribute(window, "AXDocument")) };
  const queue = [{ node: window, depth: 0 }];
  let visited = 0;
  while (queue.length && visited++ < 80) {
    const item = queue.shift();
    if (text(attribute(item.node, "AXRole")) === "AXWebArea") {
      const url = text(attribute(item.node, "AXURL"));
      const title = text(attribute(item.node, "AXTitle"));
      if (bundle === "com.anthropic.claudefordesktop" && (url.startsWith("file:") || (!url && !title))) continue;
      if (!url && !title) continue;
      return selectDocument(result, { title, url });
    }
    if (item.depth < 8) {
      const children = attribute(item.node, "AXChildren");
      if (children) for (let i = 0; i < children.count && queue.length < 80; i++) queue.push({ node: children.objectAtIndex(i), depth: item.depth + 1 });
    }
  }
  return result;
}
function readApplication() {
  const apps = $.NSRunningApplication.runningApplicationsWithBundleIdentifier($(bundle));
  if (!apps.count) return ${mode === "windows" ? "[]" : "null"};
  const app = $.AXUIElementCreateApplication(apps.objectAtIndex(0).processIdentifier);
  ${
    mode === "windows"
      ? `
  const windows = attribute(app, "AXWindows");
  const results = [];
  if (windows) for (let i = 0; i < windows.count && i < 12; i++) results.push(readWindow(windows.objectAtIndex(i)));
  return results;
  `
      : `
  const window = attribute(app, "AXFocusedWindow");
  return window ? readWindow(window) : null;
  `
  }
}
JSON.stringify(readApplication());
`;
}
