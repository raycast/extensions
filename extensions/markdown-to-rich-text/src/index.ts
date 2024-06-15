import { getSelectedText, showToast, Toast, getPreferenceValues, closeMainWindow } from "@raycast/api";
import { exec } from "child_process";
import { promisify } from "util";
import { writeFileSync, unlinkSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";

const execAsync = promisify(exec);

export default async function main() {
  let tempMarkdownPath: string | null = null;
  let tempHtmlPath: string | null = null;
  let tempRtfPath: string | null = null;

  try {
    await closeMainWindow();
    const preferences = getPreferenceValues();
    const pandocPath = preferences.pandocPath;
    let cssHtmlPath = preferences.cssHtmlPath;
    const pasteAfterCopy = preferences.pasteAfterCopy;

    if (!pandocPath) {
      showToast(Toast.Style.Failure, "Pandoc path is not configured", "Please set the Pandoc path in preferences.");
      return;
    }

    const text = await getSelectedText();
    if (!text) {
      showToast(Toast.Style.Failure, "No text selected", "Select the text you want to convert.");
      return;
    }

    const fontFamily = preferences.fontFamily;
    const fontSize = preferences.fontSize;
    const textColor = preferences.textColor;
    const useExternalCss = preferences.useExternalCss;

    let cssContent = '<style type="text/css">\n  body {\n';

    if (!useExternalCss && fontFamily) {
      cssContent += `    font-family: ${fontFamily};\n`;
    }
    if (fontSize) {
      cssContent += `    font-size: ${fontSize}px;\n`;
    }
    if (textColor) {
      cssContent += `    color: ${textColor};\n`;
    }

    cssContent += "  }\n</style>\n";
    if (useExternalCss && cssHtmlPath) {
      cssHtmlPath = preferences.cssHtmlPath;
    } else {
      cssHtmlPath = join(tmpdir(), "temp.css.html");
      writeFileSync(cssHtmlPath, cssContent);
    }

    tempMarkdownPath = join(tmpdir(), "temp.md");
    writeFileSync(tempMarkdownPath, text);

    tempHtmlPath = join(tmpdir(), "temp.html");
    await execAsync(`${pandocPath} -f markdown-smart -t html -H ${cssHtmlPath} ${tempMarkdownPath} -o ${tempHtmlPath}`);

    tempRtfPath = join(tmpdir(), "temp.rtf");
    await execAsync(`textutil -inputencoding utf-8 -format html -convert rtf ${tempHtmlPath} -output ${tempRtfPath}`);

    await execAsync(`pbcopy < ${tempRtfPath}`);

    if (pasteAfterCopy) {
      const pasteScript = `osascript -e 'tell application "System Events" to keystroke "v" using {command down}'`;
      await execAsync(pasteScript);
    }

    showToast(Toast.Style.Success, "Markdown converted to RTF", "The text is now on your clipboard.");
  } catch (error) {
    console.error("Conversion error:", error);
    showToast(Toast.Style.Failure, "Failed to convert Markdown", (error as Error).message);
  } finally {
    [tempMarkdownPath, tempHtmlPath, tempRtfPath].forEach((filePath) => {
      if (filePath) {
        try {
          unlinkSync(filePath);
        } catch (error) {
          console.error(`Failed to delete temporary file: ${filePath}`, error);
        }
      }
    });
  }
}
