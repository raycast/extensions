import { showHUD, Clipboard } from "@raycast/api";
import { format } from "date-fns";
import { vi } from "date-fns/locale";

interface Arguments {
  format?: string;
  customFormat?: string;
}

export default async function InsertDate(props: { arguments: Arguments }) {
  const now = new Date();
  let formatted: string;

  const selectedFormat = props.arguments.format || "iso";

  try {
    switch (selectedFormat) {
      case "iso":
        formatted = format(now, "yyyy-MM-dd");
        break;
      case "full":
        formatted = format(now, "MMMM d, yyyy");
        break;
      case "short":
        formatted = format(now, "MM/dd/yyyy");
        break;
      case "vi":
        formatted = format(now, "dd 'tháng' MM 'năm' yyyy", { locale: vi });
        break;
      case "custom":
        formatted = format(now, props.arguments.customFormat || "yyyy-MM-dd");
        break;
      default:
        formatted = format(now, "yyyy-MM-dd");
    }

    await Clipboard.paste(formatted);
    await showHUD(`✅ Inserted: ${formatted}`);
  } catch (error) {
    await showHUD(`❌ Error: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}
