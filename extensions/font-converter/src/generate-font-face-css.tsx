import { getSelectedFinderItems, Clipboard, showHUD } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import path from "path";
import fs from "fs";
import { createFont, FontEditor, TTF } from "fonteditor-core";
import fontverter from "fontverter";

export default async function Command() {
  try {
    const items = await getSelectedFinderItems();
    if (items.length === 0) {
      await showFailureToast("No file selected", { message: "Please select a font file in Finder" });
      return;
    }

    const filePath = items[0].path;
    const ext = path.extname(filePath).slice(1).toLowerCase();
    const fileName = path.basename(filePath);
    const fontFamily = path.basename(filePath, path.extname(filePath));

    if (!["ttf", "woff", "woff2", "eot", "otf"].includes(ext)) {
      await showFailureToast("Unsupported format", { message: "Selected file is not a supported font format" });
      return;
    }

    let buffer = fs.readFileSync(filePath);

    if (ext === "woff2") {
      buffer = await fontverter.convert(buffer, "sfnt");
    }

    const inputType = ext === "woff2" ? "ttf" : ext;
    const font = createFont(buffer, {
      type: inputType as FontEditor.FontType,
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
    await showFailureToast(error, { title: "Failed to generate CSS" });
  }
}
