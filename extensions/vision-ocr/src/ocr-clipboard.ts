import { Toast, showToast } from "@raycast/api";
import { ocrClipboard } from "swift:../swift";
import { apply_ocr_output, get_ocr_options } from "./ocr";
import { save_history } from "./ocr-history";

export default async function Command() {
  const { languages, level, output_action } = get_ocr_options();

  try {
    const text = await ocrClipboard(languages, level);
    if (text.trim()) {
      const verb = await apply_ocr_output(text, output_action);
      await save_history(text);
      await showToast({
        style: Toast.Style.Success,
        title: `OCR text ${verb}`,
      });
    } else {
      await showToast({ style: Toast.Style.Failure, title: "No text found" });
    }
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "OCR failed",
      message: error instanceof Error ? error.message : String(error),
    });
  }
}
