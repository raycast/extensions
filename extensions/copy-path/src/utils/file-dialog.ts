import { Application } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";

export interface FileDialogResult {
  detected: boolean;
  paths: string[];
}

// Keep native pickers ahead of the host app's document/browser fallbacks.
// Read only the focused window (and its sheets), never unrelated app windows.
export const scriptFileDialogPaths = (app: Application) => `
ObjC.import("Cocoa");
ObjC.import("ApplicationServices");
ObjC.bindFunction("AXUIElementCreateApplication", ["id", ["int"]]);
ObjC.bindFunction("AXUIElementCopyAttributeValue", ["int", ["id", "id", "id*"]]);
ObjC.bindFunction("AXUIElementSetMessagingTimeout", ["int", ["id", "float"]]);
function attr(el, name) {
  if (!el) return null;
  const ref = Ref();
  return $.AXUIElementCopyAttributeValue(el, $(name), ref) === 0 ? ref[0] : null;
}
function text(value) {
  if (!value) return "";
  if (typeof value === "string") return value;
  try {
    return ObjC.unwrap(value.isKindOfClass($.NSURL) ? value.absoluteString : value);
  } catch (_) { return ""; }
}
function children(el, name) {
  const value = attr(el, name || "AXChildren");
  if (!value) return [];
  const result = [];
  for (let i = 0; i < value.count && i < 1000; i++) result.push(value.objectAtIndex(i));
  return result;
}
function filePath(value) {
  const raw = text(value);
  if (typeof raw !== "string" || !raw.startsWith("file://")) return "";
  const url = $.NSURL.URLWithString(raw);
  if (!url || !url.isFileURL) return "";
  const host = text(url.host);
  if (host && host !== "localhost") return "";
  return text(url.path);
}
function pathOf(el) {
  return filePath(attr(el, "AXURL")) || filePath(attr(el, "AXDocument"));
}
function isPanel(el) {
  const id = text(attr(el, "AXIdentifier"));
  return id === "open-panel" || id === "save-panel";
}
function panelOf(win) {
  if (!win) return null;
  if (isPanel(win)) return win;
  const sheets = children(win, "AXSheets").concat(children(win).filter(function(el) {
    return text(attr(el, "AXRole")) === "AXSheet";
  }));
  return sheets.find(isPanel) || null;
}
function selectedPaths(panel) {
  const paths = [];
  const queue = [{ el: panel, depth: 0, inFileList: false }];
  let visited = 0;
  function collect(el, depth) {
    if (!el || depth > 5 || ++visited > 1500) return;
    const path = pathOf(el);
    if (path) { paths.push(path); return; }
    children(el).forEach(function(child) { collect(child, depth + 1); });
  }
  while (queue.length && visited++ < 1500) {
    const item = queue.shift();
    const id = text(attr(item.el, "AXIdentifier"));
    // Sidebar favourites are selection too, but are not selected files.
    if (/sidebar|favorite/i.test(id)) continue;
    const role = text(attr(item.el, "AXRole"));
    const inFileList = item.inFileList || role === "AXBrowser" || /^NSNav.*(File|Browser|Icon|Outline)/i.test(id);
    if (inFileList) {
      children(item.el, "AXSelectedChildren").concat(children(item.el, "AXSelectedRows"))
        .forEach(function(el) { collect(el, 0); });
    }
    if (item.depth < 12) children(item.el).forEach(function(el) {
      queue.push({ el: el, depth: item.depth + 1, inFileList: inFileList });
    });
  }
  return paths.filter(function(path, index) { return paths.indexOf(path) === index; });
}
let result = { detected: false, paths: [] };
const bundleId = ${JSON.stringify(app.bundleId ?? "")};
const apps = $.NSRunningApplication.runningApplicationsWithBundleIdentifier(bundleId);
if (bundleId && apps.count > 0) {
  const app = $.AXUIElementCreateApplication(apps.objectAtIndex(0).processIdentifier);
  $.AXUIElementSetMessagingTimeout(app, 0.25);
  const panel = panelOf(attr(app, "AXFocusedWindow"));
  if (panel) {
    result.detected = true;
    result.paths = selectedPaths(panel);
    if (!result.paths.length) {
      const path = pathOf(panel);
      if (path) result.paths = [path];
    }
  }
}
JSON.stringify(result);
`;

export const getFileDialogPaths = async (app: Application): Promise<FileDialogResult> => {
  if (!app.bundleId) return { detected: false, paths: [] };
  const result: FileDialogResult = JSON.parse(
    await runAppleScript(scriptFileDialogPaths(app), { language: "JavaScript", timeout: 5000 }),
  );
  if (typeof result.detected !== "boolean" || !Array.isArray(result.paths)) {
    throw new Error("Could not inspect the focused file dialog");
  }
  return {
    detected: result.detected,
    paths: result.paths.filter((path) => typeof path === "string" && path.startsWith("/")),
  };
};
