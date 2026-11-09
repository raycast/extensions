// Prints one line per on-screen Raycast window: id, layer, alpha, x, y, width, height.
// CGWindowListCopyWindowInfo needs no Accessibility grant. On macOS 26 a menu-bar command's
// status item is a layer-25 window owned by Control Center, not Raycast, named after the
// command id ("c:n:lachieh/mise::-::outdated-tools"); reading that name needs Screen Recording,
// which shot needs anyway.
ObjC.import("CoreGraphics");

// oxlint-disable-next-line no-unused-vars -- osascript calls run() itself.
function run() {
  const options = $.kCGWindowListOptionOnScreenOnly | $.kCGWindowListExcludeDesktopElements;
  const windows = ObjC.deepUnwrap(ObjC.castRefToObject($.CGWindowListCopyWindowInfo(options, 0))) || [];
  return windows
    .filter(
      (w) =>
        w.kCGWindowOwnerName === "Raycast" ||
        (w.kCGWindowOwnerName === "Control Center" && String(w.kCGWindowName || "").startsWith("c:n:lachieh/mise::")),
    )
    .map((w) => {
      const b = w.kCGWindowBounds;
      return [w.kCGWindowNumber, w.kCGWindowLayer, w.kCGWindowAlpha, b.X, b.Y, b.Width, b.Height].join("\t");
    })
    .join("\n");
}
