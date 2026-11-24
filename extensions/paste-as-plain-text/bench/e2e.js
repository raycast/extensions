// Measures launch-to-paste latency: time from launching the command until the pasted text is
// visible in a TextEdit document. Run it while nothing else needs the keyboard.
//
//   npm run build
//   osascript -l JavaScript bench/e2e.js 8
//
// Optional 2nd argument: a paste format, e.g. "JSON" (default: Plain Text).
function run(argv) {
  const runs = parseInt(argv[0] || "8");
  const format = argv[1] || "";
  const base = "raycast://extensions/koinzhang/paste-as-plain-text/paste-as-plain-text";
  const link = format
    ? base + "?arguments=" + encodeURIComponent(JSON.stringify({ advancedPasteFormat: format }))
    : base;

  const app = Application.currentApplication();
  app.includeStandardAdditions = true;
  const frontmost = () => Application("System Events").processes.whose({ frontmost: true })[0].name();
  const TextEdit = Application("TextEdit");
  TextEdit.activate();
  TextEdit.Document().make();
  const doc = TextEdit.documents[0]; // always the front document; the handle from make() goes stale
  delay(1);

  const results = [];
  for (let i = 0; i < runs; i++) {
    if (frontmost() !== "TextEdit") {
      results.push("aborted: " + frontmost() + " became frontmost");
      break;
    }
    const marker = "bench-" + Math.random().toString(36).slice(2);
    app.setTheClipboardTo(marker);
    doc.text = "";
    delay(0.5);
    const start = Date.now();
    app.doShellScript("open -g '" + link + "'");
    let elapsed;
    while (true) {
      elapsed = Date.now() - start;
      if (doc.text().includes(marker)) break;
      if (elapsed > 5000) {
        elapsed = NaN;
        break;
      }
    }
    results.push("run " + (i + 1) + ": " + elapsed + " ms");
    delay(0.5);
  }
  doc.close({ saving: "no" });
  return results.join("\n");
}
