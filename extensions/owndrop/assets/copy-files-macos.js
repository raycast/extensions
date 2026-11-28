ObjC.import("AppKit");
ObjC.import("Foundation");

function run(paths) {
  if (!paths.length) throw new Error("No files selected");
  const urls = $.NSMutableArray.alloc.init;
  paths.forEach(function (path) {
    if (!$.NSFileManager.defaultManager.fileExistsAtPath($(path))) {
      throw new Error("Selected file is unavailable");
    }
    urls.addObject($.NSURL.fileURLWithPath($(path)));
  });
  const clipboard = $.NSPasteboard.generalPasteboard;
  clipboard.clearContents;
  if (!clipboard.writeObjects(urls)) throw new Error("Could not copy selected files");
}
