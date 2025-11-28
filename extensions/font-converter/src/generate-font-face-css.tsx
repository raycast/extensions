import { showToast, Toast, getSelectedFinderItems, Clipboard, showHUD, environment } from "@raycast/api";
import path from "path";
import fs from "fs";
import { createFont, woff2, FontEditor, TTF } from "fonteditor-core";

export default async function Command() {
  try {
    const items = await getSelectedFinderItems();
    if (items.length === 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No file selected",
        message: "Please select a font file in Finder",
      });
      return;
    }

    const filePath = items[0].path;
    const ext = path.extname(filePath).slice(1).toLowerCase();
    const fileName = path.basename(filePath);
    const fontFamily = path.basename(filePath, path.extname(filePath));

    if (!["ttf", "woff", "woff2", "eot", "svg", "otf"].includes(ext)) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Unsupported format",
        message: "Selected file is not a supported font format",
      });
      return;
    }

    const buffer = fs.readFileSync(filePath);

    // Initialize woff2 if needed
    if (ext === "woff2") {
      const wasmSource = path.join(environment.assetsPath, "woff2.wasm");
      const wasmDest = path.join(path.dirname(__filename), "woff2.wasm");

      if (!fs.existsSync(wasmDest)) {
        fs.copyFileSync(wasmSource, wasmDest);
      }
      await woff2.init();
    }

    const font = createFont(buffer, {
      type: ext as FontEditor.FontType,
      hinting: true,
      kerning: true,
    });

    const fontObj = font.get();
    const os2 = fontObj["OS/2"] as TTF.OS2;
    const head = fontObj.head as TTF.Head;
    const name = fontObj.name as TTF.Name;

    let fontWeight = "normal";
    if (os2?.usWeightClass) {
      fontWeight = os2.usWeightClass.toString();
    }

    let fontStyle = "normal";
    // Check macStyle bit 1 (italic)
    if (head?.macStyle && head.macStyle & 2) {
      fontStyle = "italic";
    } else if (name?.fontSubFamily?.toLowerCase().includes("italic")) {
      fontStyle = "italic";
    }

    const css = `@font-face {
  font-family: '${name?.fontFamily || fontFamily}';
  src: url('${fileName}') format('${ext}');
  font-weight: ${fontWeight};
  font-style: ${fontStyle};
  font-display: swap;
}`;

    await Clipboard.copy(css);
    await showHUD("CSS copied to clipboard");
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to generate CSS",
      message: error instanceof Error ? error.message : String(error),
    });
  }
}
