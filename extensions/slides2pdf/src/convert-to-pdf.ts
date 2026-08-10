import { showToast, Toast, getSelectedFinderItems, open, getPreferenceValues, closeMainWindow } from "@raycast/api";
import fs from "fs";
import path from "path";
import { detectBackends, rankBackendsForFile, convertFile, fileCategory } from "./utils/backends";
import { loadPreferences } from "./utils/preferences";

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

  const prefs = getPreferenceValues<Preferences.ConvertToPdf>();
  // detectBackends always includes the bundled text renderer, so there is at least one engine.
  const available = detectBackends();
  const preferred = await loadPreferences();
  const producedFiles: string[] = [];
  const errors: { base: string; message: string }[] = [];
  const skippedPdfs: string[] = [];
  const targeted = new Set<string>();
  // Never overwrite: a name is taken if another file in this batch targets it OR it
  // already exists on disk — an existing report.pdf survives converting report.docx.
  const taken = (p: string) => targeted.has(p) || fs.existsSync(p);
  const toast = await showToast(Toast.Style.Animated, "Converting…");

  for (const [index, item] of selected.entries()) {
    const src = path.resolve(item.path);
    // statSync throws on paths that vanished since selection — that must fail this
    // file only, not abort the whole batch.
    let isDirectory: boolean;
    try {
      isDirectory = fs.statSync(src).isDirectory();
    } catch {
      errors.push({ base: path.basename(src), message: "File not found — was it moved or deleted?" });
      continue;
    }
    if (isDirectory) {
      errors.push({ base: path.basename(src), message: "Folders can't be converted" });
      continue;
    }
    const ext = path.extname(src);
    const base = path.basename(src, ext);
    const dir = path.dirname(src);

    // Friendlier than the "no engine" error the capability layer would produce —
    // .pdf is also in BUILTIN_EXCLUDED_EXTS (backends.ts) so no engine ever claims it.
    // Its name needs no reservation: it exists on disk, so `taken` below blocks it.
    if (ext.toLowerCase() === ".pdf") {
      skippedPdfs.push(base + ext);
      continue;
    }

    // Strip leading dots so converting a dotfile (.zshrc) doesn't produce a Finder-hidden output
    const outName = base.replace(/^\.+/, "") || base;
    let outputPath = path.join(dir, `${outName}.pdf`);
    if (taken(outputPath) && ext) outputPath = path.join(dir, `${outName} (${ext.slice(1)}).pdf`);
    for (let n = 2; taken(outputPath); n++) outputPath = path.join(dir, `${outName} (${n}).pdf`);
    targeted.add(outputPath);

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
        console.log(`[slides2pdf] Converting "${base}" via ${backend.label}`);
        await convertFile(backend, src, outputPath);
        producedFiles.push(outputPath);
        converted = true;
        break;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`[slides2pdf] ${backend.label} failed for "${base}":`, message);
        attemptErrors.push(`${backend.label}: ${message}`);
      }
    }

    if (!converted) {
      errors.push({ base, message: attemptErrors.join(" · ") });
    } else if (selected.length === 1 && prefs.openAfterConvertSingle) {
      await open(outputPath);
    }
  }

  if (selected.length > 1 && prefs.openAfterConvertBatch && producedFiles.length > 0) {
    for (const f of producedFiles) {
      await open(f).catch(() => {});
    }
  }

  const failed = errors.length > 0;
  toast.style = failed ? Toast.Style.Failure : Toast.Style.Success;
  if (failed && producedFiles.length === 0) {
    toast.title = `Failed: "${errors[0].base}"`;
    toast.message = errors[0].message;
  } else if (failed) {
    toast.title = `${errors.length} file(s) failed`;
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
