ObjC.import("AppKit");
ObjC.import("Foundation");

function isHighlightBundle(info) {
  return (
    !!info &&
    info.CFBundleName === "Highlight" &&
    info.CFBundleExecutable === "Highlight" &&
    info.CFBundleIdentifier === "tv.medal.highlight"
  );
}

function run(argv) {
  const appPath = argv[0];
  const action = argv[1];
  if (!["search", "new-chat", "new-task"].includes(action))
    throw new Error("Unsupported control");
  if (
    !appPath ||
    !appPath.startsWith("/") ||
    !appPath.endsWith("/Highlight.app")
  )
    throw new Error("HIGHLIGHT_IDENTITY");
  const bundle = $.NSBundle.bundleWithPath(appPath);
  const info = ObjC.deepUnwrap(bundle.infoDictionary);
  if (!isHighlightBundle(info)) throw new Error("HIGHLIGHT_IDENTITY");
  const system = Application("System Events");
  const matches = system.applicationProcesses.whose({
    bundleIdentifier: info.CFBundleIdentifier,
  });
  if (matches.length !== 1) throw new Error("HIGHLIGHT_NOT_READY");
  const process = matches[0];
  if (!process.windows.length) throw new Error("HIGHLIGHT_NOT_READY");
  process.frontmost = true;
  for (let attempt = 0; attempt < 20; attempt++) {
    if (
      system.applicationProcesses
        .whose({ frontmost: true })[0]
        .bundleIdentifier() === info.CFBundleIdentifier
    )
      break;
    delay(0.05);
  }
  if (
    system.applicationProcesses
      .whose({ frontmost: true })[0]
      .bundleIdentifier() !== info.CFBundleIdentifier
  )
    throw new Error("Highlight lost foreground");
  const key = action === "search" ? "k" : action === "new-chat" ? "n" : " ";
  system.keystroke(key, {
    using:
      action === "new-task" ? ["command down", "shift down"] : ["command down"],
  });
  return "SHORTCUT_SENT";
}
