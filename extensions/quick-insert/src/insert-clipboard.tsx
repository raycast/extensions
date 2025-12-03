import { showHUD, Clipboard } from "@raycast/api";

interface Arguments {
  transform?: string;
  prefix?: string;
  suffix?: string;
}

function toTitleCase(str: string): string {
  return str.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
}

export default async function InsertClipboard(props: { arguments: Arguments }) {
  try {
    const clipboardText = await Clipboard.readText();

    if (!clipboardText) {
      await showHUD("❌ Clipboard is empty");
      return;
    }

    let transformed = clipboardText;
    const selectedTransform = props.arguments.transform || "none";

    switch (selectedTransform) {
      case "uppercase":
        transformed = clipboardText.toUpperCase();
        break;
      case "lowercase":
        transformed = clipboardText.toLowerCase();
        break;
      case "titlecase":
        transformed = toTitleCase(clipboardText);
        break;
      case "trim":
        transformed = clipboardText.trim();
        break;
      case "none":
      default:
        transformed = clipboardText;
    }

    const final = `${props.arguments.prefix || ""}${transformed}${props.arguments.suffix || ""}`;

    await Clipboard.paste(final);
    await showHUD(`✅ Inserted transformed clipboard`);
  } catch (error) {
    await showHUD(`❌ Error: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}
