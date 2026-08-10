import {
  showToast,
  Toast,
  getSelectedFinderItems,
  open,
  getPreferenceValues,
  closeMainWindow,
  launchCommand,
  LaunchType,
} from "@raycast/api";
import path from "path";
import { detectBackends, rankBackendsForFile, convertFile, fileCategory } from "./utils/backends";
import { loadPreferences, preferredEngine } from "./utils/preferences";

export default async function Command() {
  const selected = await getSelectedFinderItems().catch(() => []);

  if (selected.length === 0) {
    await showToast(Toast.Style.Failure, "No file selected", "Select a file in Finder and run the command again.");
    return;
  }

  await closeMainWindow().catch(() => {});

  const prefs = getPreferenceValues<{ openAfterConvertSingle: boolean; openAfterConvertBatch: boolean }>();
  const preferred = await loadPreferences();
  const available = detectBackends();

  if (available.length === 0) {
    await showToast(Toast.Style.Failure, "No conversion engine found", "Opening setup guide…");
    await launchCommand({ name: "setup", type: LaunchType.UserInitiated }).catch(() => {});
    return;
  }

  const producedFiles: string[] = [];
  const errors: { base: string; message: string }[] = [];
  const targeted = new Set<string>();
  const total = selected.length;
  const toast = await showToast(Toast.Style.Animated, "Converting…");

  for (const [index, item] of selected.entries()) {
    const src = path.resolve(item.path);
    const ext = path.extname(src);
    const base = path.basename(src, ext);
    const dir = path.dirname(src);
    let outputPath = path.join(dir, `${base}.pdf`);
    if (targeted.has(outputPath)) outputPath = path.join(dir, `${base} (${ext.slice(1)}).pdf`);
    targeted.add(outputPath);

    const backends = rankBackendsForFile(preferredEngine(preferred, fileCategory(ext)), available, ext);

    if (backends.length === 0) {
      const msg = `No engine supports ${ext} files — install LibreOffice for full format support.`;
      console.error(`[slides2pdf] ${msg}`);
      errors.push({ base, message: msg });
      continue;
    }

    // Try each capable engine in order — a flaky native app falls back to the next one.
    const attemptErrors: string[] = [];
    let converted = false;
    for (const backend of backends) {
      try {
        toast.title = `Converting ${base} via ${backend.label} — ${index + 1}/${total}`;
        console.log(`[slides2pdf] Converting "${base}" via ${backend.label}`);
        convertFile(backend, src, outputPath);
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
  } else {
    toast.title = "Converted";
    toast.message = producedFiles.length === 1 ? path.basename(producedFiles[0]) : `${producedFiles.length} files`;
  }
}
