import {
  showToast,
  Toast,
  getSelectedFinderItems,
  open,
  getPreferenceValues,
  closeMainWindow,
  Clipboard,
} from "@raycast/api";
import fs from "fs";
import path from "path";
import {
  detectBackends,
  rankBackendsForFile,
  convertFile,
  fileCategory,
  FileCategory,
  OutputExistsError,
} from "./utils/backends";
import { isStopRequested } from "./utils/stop-signal";

export default async function Command() {
  // The API throws both when nothing is selected and on real failures (e.g. missing
  // automation permission) — surface its message so the second case isn't misreported.
  let selected;
  try {
    selected = await getSelectedFinderItems();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await showToast(Toast.Style.Failure, "No files to convert", message);
    return;
  }
  if (selected.length === 0) {
    await showToast(Toast.Style.Failure, "No file selected", "Select a file in Finder and run the command again.");
    return;
  }

  await closeMainWindow().catch(() => {});

  const prefs = getPreferenceValues<Preferences>();
  // detectBackends always includes the bundled text renderer, so there is at least one engine.
  const available = detectBackends();
  const preferred: Record<FileCategory, string> = {
    presentation: prefs.preferredPresentation,
    document: prefs.preferredDocument,
    spreadsheet: prefs.preferredSpreadsheet,
    image: prefs.preferredImage,
    other: "auto",
  };
  const producedFiles: string[] = [];
  const errors: { base: string; message: string }[] = [];
  const skippedPdfs: string[] = [];
  // The Stop Conversion command asks this run to stop; it reaches this process through
  // LocalStorage, since Raycast gives every command its own. Only files that haven't started are
  // skipped — the running conversion is left to finish. The toast's close button is not a stop:
  // the API reports no callback for it, so it only hides the toast.
  let stopped = false;
  let skipped = 0;
  const toast = await showToast(Toast.Style.Animated, "Converting…");
  const startedAt = Date.now();

  for (const [index, item] of selected.entries()) {
    if (await isStopRequested(startedAt)) {
      stopped = true;
      skipped = selected.length - index;
      break;
    }
    const src = path.resolve(item.path);
    // A path that vanished since selection fails this file only, not the whole batch.
    const stat = fs.statSync(src, { throwIfNoEntry: false });
    if (!stat) {
      errors.push({ base: path.basename(src), message: "File not found — was it moved or deleted?" });
      continue;
    }
    if (stat.isDirectory()) {
      errors.push({ base: path.basename(src), message: "Folders can't be converted" });
      continue;
    }
    const ext = path.extname(src);
    const base = path.basename(src, ext);
    const dir = path.dirname(src);

    // Friendlier than the "no engine" error the capability layer would produce —
    // .pdf is also in BUILTIN_EXCLUDED_EXTS (backends.ts) so no engine ever claims it.
    if (ext.toLowerCase() === ".pdf") {
      skippedPdfs.push(base + ext);
      continue;
    }

    // Strip leading dots and spaces so converting a dotfile (.zshrc) doesn't produce a
    // Finder-hidden output. A name made only of dots leaves nothing to keep, so it gets a
    // neutral one rather than a hidden file — the collision handling below makes it unique.
    const outName = base.replace(/^[.\s]+/, "").trimEnd() || "converted";
    // Never overwrite — an existing report.pdf survives converting report.docx. Finder-style
    // suffixes: report.pdf, then report (2).pdf, report (3).pdf, … until free. Files are
    // converted one at a time, so an earlier success in this batch is already on disk here.
    let outputPath = path.join(dir, `${outName}.pdf`);
    for (let n = 2; fs.existsSync(outputPath); n++) outputPath = path.join(dir, `${outName} (${n}).pdf`);

    const backends = rankBackendsForFile(preferred[fileCategory(ext)], available, ext);

    if (backends.length === 0) {
      const msg = `No engine supports ${ext} files — install LibreOffice for full format support.`;
      console.error(`[slides2pdf] ${msg}`);
      errors.push({ base, message: msg });
      continue;
    }

    // Try each capable engine in order — a flaky native app falls back to the next one.
    toast.title = selected.length > 1 ? `Converting ${index + 1}/${selected.length}: ${base}` : `Converting ${base}`;
    const attemptErrors: string[] = [];
    let converted = false;
    for (const backend of backends) {
      try {
        toast.message = `via ${backend.label}`;
        await convertFile(backend, src, outputPath);
        producedFiles.push(outputPath);
        converted = true;
        break;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`[slides2pdf] ${backend.label} failed for "${base}":`, message);
        attemptErrors.push(`${backend.label}: ${message}`);
        // Another run took the name meanwhile — no engine can change that.
        if (error instanceof OutputExistsError) break;
      }
    }

    if (!converted) {
      errors.push({ base, message: attemptErrors.join(" · ") });
    } else if (selected.length === 1 && prefs.openAfterConvertSingle) {
      await open(outputPath).catch(() => {});
    }
  }

  // Opening the results after a deliberate stop would work against what the user just asked for.
  if (!stopped && selected.length > 1 && prefs.openAfterConvertBatch && producedFiles.length > 0) {
    for (const f of producedFiles) {
      await open(f).catch(() => {});
    }
  }

  const failed = errors.length > 0;
  toast.style = failed ? Toast.Style.Failure : Toast.Style.Success;
  if (failed) {
    // The toast has room for names only; the per-engine messages live in the clipboard.
    toast.primaryAction = {
      title: "Copy Error Details",
      onAction: () => Clipboard.copy(errors.map((e) => `${e.base}: ${e.message}`).join("\n")),
    };
  }
  if (stopped) {
    toast.title = "Stopped";
    const done = producedFiles.length === 1 ? "1 file converted" : `${producedFiles.length} files converted`;
    toast.message = `${done}, ${skipped} skipped${errors.length ? `, ${errors.length} failed` : ""}`;
  } else if (failed && producedFiles.length === 0) {
    toast.title = `Failed: "${errors[0].base}"`;
    toast.message = errors[0].message;
  } else if (failed) {
    toast.title = errors.length === 1 ? "1 file failed" : `${errors.length} files failed`;
    toast.message = errors.map((e) => e.base).join(", ");
  } else if (producedFiles.length === 0) {
    toast.title = "Nothing to convert";
    toast.message = skippedPdfs.length === 1 ? `${skippedPdfs[0]} is already a PDF` : "Selected files are already PDFs";
  } else {
    toast.title = "Converted";
    const summary = producedFiles.length === 1 ? path.basename(producedFiles[0]) : `${producedFiles.length} files`;
    toast.message = skippedPdfs.length > 0 ? `${summary} — skipped ${skippedPdfs.length} already-PDF` : summary;
  }
}
