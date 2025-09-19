import { showToast, Toast, getSelectedFinderItems, open, getPreferenceValues, closeMainWindow } from "@raycast/api";
import { execFileSync, spawnSync } from "child_process";
import path from "path";
import fs from "fs";

export default async function Command() {
  const selected = await getSelectedFinderItems();

  if (!selected || selected.length === 0) {
    await showToast(Toast.Style.Failure, "No file selected", "Select a file in Finder and run the command again.");
    return;
  }

  // Close the Raycast window immediately so conversion continues in background.
  // This makes the command feel non-blocking for the user.
  try {
    closeMainWindow();
  } catch {
    // ignore if unavailable
  }

  // Read preference: openAfterConvert (checkbox)
  // Prefer a typed preference shape: Raycast returns checkbox preferences as boolean.
  const prefs = getPreferenceValues<{
    openAfterConvertSingle?: boolean | string;
    openAfterConvertBatch?: boolean | string;
  }>();

  const openAfterConvertSingle = prefs.openAfterConvertSingle === true || prefs.openAfterConvertSingle === "true";
  const openAfterConvertBatch = prefs.openAfterConvertBatch === true || prefs.openAfterConvertBatch === "true";

  // Try to locate soffice: prefer PATH via `which`, fallback to common macOS/homebrew locations.
  const which = spawnSync("which", ["soffice"]);
  let sofficePath: string | null = null;
  if (which.status === 0) {
    const p = String(which.stdout).trim();
    if (p) {
      sofficePath = p;
    }
  }

  const commonPaths = [
    "/Applications/LibreOffice.app/Contents/MacOS/soffice",
    "/usr/local/bin/soffice",
    "/opt/homebrew/bin/soffice",
  ];

  for (const p of commonPaths) {
    if (!sofficePath && fs.existsSync(p)) {
      sofficePath = p;
    }
  }

  if (!sofficePath) {
    await showToast(
      Toast.Style.Failure,
      "LibreOffice (soffice) not found",
      "Install LibreOffice or ensure 'soffice' is available in PATH.",
    );
    return;
  }

  const producedFiles: string[] = [];
  const total = selected.length;
  for (const item of selected) {
    const src = path.resolve(item.path);
    const ext = path.extname(src);
    const base = path.basename(src, ext);
    const outdir = path.dirname(src);
    const produced = path.join(outdir, `${base}.pdf`);

    // show current file as part of progress updates after conversion
    try {
      // compute progress and show animated toast with percentage
      const completed = producedFiles.length;
      try {
        await showToast(Toast.Style.Animated, `Converting ${base} - ${completed}/${total}`);
      } catch {
        // ignore
      }

      // Call the located soffice binary with args to avoid shell quoting issues
      execFileSync(sofficePath, ["--headless", "--convert-to", "pdf", "--outdir", outdir, src], {
        stdio: "ignore",
      });

      // Check produced file
      if (!fs.existsSync(produced)) {
        throw new Error("Expected output not found: " + produced);
      }

      producedFiles.push(produced);

      // Open immediately only when single file selected and preference enabled
      if (selected.length === 1 && openAfterConvertSingle) {
        await open(produced);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await showToast(Toast.Style.Failure, "Conversion failed", message);
      try {
        await showToast(Toast.Style.Failure, "Conversion failed", message);
      } catch {
        // ignore
      }
    }
  }

  // If multiple files were converted and the batch preference is enabled, open them now
  if (selected.length > 1 && openAfterConvertBatch && producedFiles.length > 0) {
    for (const f of producedFiles) {
      // fire-and-forget open; if one fails it shouldn't stop the others
      try {
        await open(f);
      } catch {
        // ignore
      }
    }
  }

  // Final summary toast
  try {
    if (producedFiles.length === 0) {
      await showToast(Toast.Style.Failure, "No files converted", "No output files were produced.");
    } else if (producedFiles.length === 1) {
      await showToast(Toast.Style.Success, "Converted 1 file", path.basename(producedFiles[0]));
    } else {
      await showToast(Toast.Style.Success, "Converted files", `${producedFiles.length} files converted`);
    }
  } catch {
    // ignore
  }
}
