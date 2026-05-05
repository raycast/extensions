import { execFile } from "./exec-file-async";

export async function setWallpaper(imagePath: string): Promise<void> {
  const safePath = imagePath.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
  // Use NSWorkspace with fill + clipping = CSS object-fit: cover
  const jxa = [
    'ObjC.import("AppKit");',
    `var url=$.NSURL.fileURLWithPath('${safePath}');`,
    "var ws=$.NSWorkspace.sharedWorkspace;",
    "var screens=$.NSScreen.screens;",
    "var opts=$.NSMutableDictionary.alloc.init;",
    // NSImageScaleProportionallyUpOrDown (3) = scale to fill
    "opts.setObjectForKey($.NSNumber.numberWithInt(3),$.NSWorkspaceDesktopImageScalingKey);",
    // allowClipping = true → crop overflow, like object-fit:cover
    "opts.setObjectForKey($.NSNumber.numberWithBool(true),$.NSWorkspaceDesktopImageAllowClippingKey);",
    "for(var i=0;i<screens.count;i++){",
    "  ws.setDesktopImageURLForScreenOptionsError(url,screens.objectAtIndex(i),opts,null);",
    "}",
  ].join("\n");

  await execFile("osascript", ["-l", "JavaScript", "-e", jxa], {
    timeout: 10000,
    stdio: ["pipe", "pipe", "ignore"],
  });
}
