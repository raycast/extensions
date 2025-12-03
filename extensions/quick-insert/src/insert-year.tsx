import { showHUD, Clipboard } from "@raycast/api";

interface Arguments {
  format?: string;
}

export default async function InsertYear(props: { arguments: Arguments }) {
  const now = new Date();
  const selectedFormat = props.arguments.format || "full";

  const year = selectedFormat === "short" ? now.getFullYear().toString().slice(-2) : now.getFullYear().toString();

  try {
    await Clipboard.paste(year);
    await showHUD(`✅ Inserted: ${year}`);
  } catch (error) {
    await showHUD(`❌ Error: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}
