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
function pathsFromSelection(el) {
  const selected=list(el,"AXSelectedChildren").concat(list(el,"AXSelectedRows"));
  const paths=selected.map(function(item) { return selectedPath(item,0); });
  // Never copy a partial selection if one selected item's URL is unreadable.
  return paths.every(Boolean) ? paths.filter(function(path,i) { return paths.indexOf(path)===i; }) : [];
}
function selectionWithin(container) {
  const queue=[{el:container,depth:0}];
  let visited=0;
  while (queue.length && visited++<30) {
    const item=queue.shift();
    const role=text(attr(item.el,"AXRole"));
    if (role === "AXList" || role === "AXOutline" || role === "AXTable") return pathsFromSelection(item.el);
    if (item.depth<4) list(item.el,"AXChildren").forEach(function(el) { queue.push({el:el,depth:item.depth+1}); });
  }
  return [];
}
function columnSelection(browser) {
  const explicit=list(browser,"AXColumns");
  if (explicit.length) return selectionWithin(explicit[explicit.length-1]);

  // Some panels expose columns through scroll-area wrappers instead of AXColumns.
  const stack=list(browser,"AXChildren").reverse().map(function(el) { return {el:el,depth:0}; });
  const columns=[];
  const lists=[];
  let visited=0;
  while (stack.length && visited++<40) {
    const item=stack.pop();
    const role=text(attr(item.el,"AXRole"));
    if (role === "AXColumn") { columns.push(item.el); continue; }
    if (role === "AXList" || role === "AXOutline" || role === "AXTable") { lists.push(item.el); continue; }
    if (item.depth<4) list(item.el,"AXChildren").reverse().forEach(function(el) { stack.push({el:el,depth:item.depth+1}); });
  }
  if (stack.length) return [];
  const containers=columns.length ? columns : lists;
  // Earlier columns retain selected ancestor folders even with no file selected.
  // Only the final column can supply the selection; never fall back to an ancestor.
  return containers.length ? selectionWithin(containers[containers.length-1]) : pathsFromSelection(browser);
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
        result=role === "AXBrowser" || id === "ColumnView" ? columnSelection(item.el) : selectionWithin(item.el);
        break;
      }
      // Never enumerate the entire contents of a file list or sidebar outline.
      if ((role === "AXList" || role === "AXOutline" || role === "AXTable") && !isFileList) continue;
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
