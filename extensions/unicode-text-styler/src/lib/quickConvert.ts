import { getSelectedText, Clipboard, showToast, Toast, closeMainWindow } from "@raycast/api";
import { toUnicodeVariant, VariantType } from "./toUnicodeVariant";

export async function quickConvert(variant: VariantType, variantName: string) {
  try {
    // Fetch currently selected text (fresh, not from buffer/cache)
    const selectedText = await getSelectedText();

    if (!selectedText) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No text selected",
        message: "Please select some text first",
      });
      return;
    }

    const converted = toUnicodeVariant(selectedText, variant);

    await Clipboard.paste(converted);
    await closeMainWindow();

    await showToast({
      style: Toast.Style.Success,
      title: `Styled as ${variantName}`,
      message: converted.substring(0, 50) + (converted.length > 50 ? "..." : ""),
    });
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Styling failed",
      message: String(error),
    });
  }
}
