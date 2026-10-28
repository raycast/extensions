import { Application } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";

// Only read explicit selections in a focused native Open panel. An empty or
// unreadable selection returns nothing, allowing the original handlers to run.
export const scriptSelectedPickerPaths = (bundleId: string) => `
ObjC.import("Cocoa");
ObjC.import("ApplicationServices");
ObjC.bindFunction("AXUIElementCreateApplication", ["id", ["int"]]);
ObjC.bindFunction("AXUIElementCopyAttributeValue", ["int", ["id", "id", "id*"]]);
ObjC.bindFunction("AXUIElementSetMessagingTimeout", ["int", ["id", "float"]]);
function attr(el, name) {
  if (!el) return null;
  const ref=Ref();
  return $.AXUIElementCopyAttributeValue(el,$(name),ref) === 0 ? ref[0] : null;
}
function text(v) {
  if (!v) return "";
  if (typeof v === "string") return v;
  try { return ObjC.unwrap(v.isKindOfClass($.NSURL) ? v.absoluteString : v); }
  catch (_) { return ""; }
}
function list(el,name) {
  const a=attr(el,name);
  if (!a) return [];
  if (a.count > 200) throw new Error("Selection too large to inspect");
  const out=[];
  for (let i=0;i<a.count;i++) out.push(a.objectAtIndex(i));
  return out;
}
function filePath(el) {
  const raw=text(attr(el,"AXURL"));
  if (typeof raw !== "string" || !raw.startsWith("file://")) return "";
  const url=$.NSURL.URLWithString(raw);
  if (!url || !url.isFileURL) return "";
  const resolved=url.filePathURL;
  const path=resolved ? text(resolved.path) : "";
  return path.startsWith("/") && !path.startsWith("/.file/") ? path : "";
}
function selectedPath(el,depth) {
  if (depth>3) return "";
  const path=filePath(el);
  if (path) return path;
  for (const child of list(el,"AXChildren")) {
    const path=selectedPath(child,depth+1);
    if (path) return path;
  }
  return "";
}
const apps=$.NSRunningApplication.runningApplicationsWithBundleIdentifier(${JSON.stringify(bundleId)});
let result=[];
if (apps.count) {
  const app=$.AXUIElementCreateApplication(apps.objectAtIndex(0).processIdentifier);
  $.AXUIElementSetMessagingTimeout(app,0.1);
  const panel=attr(app,"AXFocusedWindow");
  if (text(attr(panel,"AXIdentifier")) === "open-panel") {
    const queue=[{el:panel,depth:0}];
    let visited=0;
    while (queue.length && visited++<80) {
      const item=queue.shift();
      const id=text(attr(item.el,"AXIdentifier"));
      const role=text(attr(item.el,"AXRole"));
      if (/sidebar|favorite/i.test(id) || role === "AXWebArea") continue;
      const isFileList=["IconView","ListView","ColumnView"].indexOf(id)>=0 || role === "AXBrowser";
      if (isFileList) {
        const selected=list(item.el,"AXSelectedChildren").concat(list(item.el,"AXSelectedRows"));
        if (selected.length) {
          const paths=selected.map(function(el) { return selectedPath(el,0); });
          // Do not silently copy a partial selection.
          if (paths.every(Boolean)) result=paths.filter(function(path,i) { return paths.indexOf(path)===i; });
          break;
        }
      }
      // Never enumerate the entire contents of a file list or sidebar outline.
      if ((role === "AXList" || role === "AXOutline" || role === "AXTable") && !isFileList) continue;
      if (isFileList && role !== "AXBrowser" && id !== "ColumnView") continue;
      if (item.depth<8) list(item.el,"AXChildren").forEach(function(el) { queue.push({el:el,depth:item.depth+1}); });
    }
  }
}
JSON.stringify(result);
`;

export const getSelectedPickerPaths = async (app: Application): Promise<string[]> => {
  if (!app.bundleId) return [];
  try {
    const paths: unknown = JSON.parse(
      await runAppleScript(scriptSelectedPickerPaths(app.bundleId), { language: "JavaScript", timeout: 3000 }),
    );
    return Array.isArray(paths) && paths.every((path) => typeof path === "string" && path.startsWith("/")) ? paths : [];
  } catch {
    return [];
  }
};
