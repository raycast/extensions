import {
  Clipboard,
  showHUD,
  showToast,
  Toast,
  environment,
} from "@raycast/api";
import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs";
import path from "path";

const execAsync = promisify(exec);

export default async function Command() {
  const tempPath = path.join("/tmp", `3up-screenshot-${Date.now()}.png`);
  // Ensure we use the correct script path. environment.assetsPath points to the assets folder of the extension
  const scriptPath = path.join(environment.assetsPath, "ocr.swift");

  try {
    // 1. Capture screenshot interactively
    await showHUD("Выберите область экрана для 3up-screenshot...");

    try {
      // Added -x to disable sound, might help if sound is blocked
      await execAsync(`/usr/sbin/screencapture -i "${tempPath}"`);
    } catch (e: unknown) {
      console.error("Screencapture error:", e);
      // If file exists, it might have succeeded despite error code (sometimes happens)
      if (!fs.existsSync(tempPath)) {
        const errorMsg = e instanceof Error ? e.message : String(e);
        if (errorMsg.includes("permission") || errorMsg.includes("denied")) {
          await showToast({
            style: Toast.Style.Failure,
            title: "Ошибка доступа",
            message:
              "Разрешите запись экрана для Raycast в Системных настройках",
          });
        } else {
          await showHUD(
            `Захват отменен или произошла ошибка: ${errorMsg.slice(0, 50)}`,
          );
        }
        return;
      }
    }

    if (!fs.existsSync(tempPath)) {
      await showHUD("Файл скриншота не был создан");
      return;
    }

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Распознавание текста...",
    });

    // 2. Run OCR using Swift script
    // Note: We use the system's 'swift' command to run the script.
    try {
      const { stdout, stderr } = await execAsync(
        `swift "${scriptPath}" "${tempPath}"`,
      );

      if (stderr && !stdout) {
        throw new Error(`Swift OCR Error: ${stderr}`);
      }

      const recognizedText = stdout.trim();

      if (!recognizedText) {
        await showHUD("Текст не найден");
        toast.hide();
      } else {
        // 3. Copy to clipboard
        await Clipboard.copy(recognizedText);
        await showHUD("Текст скопирован в буфер обмена");
        toast.style = Toast.Style.Success;
        toast.title = "Готово!";
      }
    } catch (ocrError: unknown) {
      console.error("OCR Execution Error:", ocrError);
      throw new Error(
        `Ошибка распознавания: ${
          ocrError instanceof Error ? ocrError.message : String(ocrError)
        }`,
      );
    }
  } catch (error: unknown) {
    console.error("Top level Error:", error);
    await showToast({
      style: Toast.Style.Failure,
      title: "Произошла ошибка",
      message: error instanceof Error ? error.message : String(error),
    });
  } finally {
    // 4. Cleanup
    if (fs.existsSync(tempPath)) {
      try {
        fs.unlinkSync(tempPath);
      } catch (err) {
        console.error("Cleanup error:", err);
      }
    }
  }
}
