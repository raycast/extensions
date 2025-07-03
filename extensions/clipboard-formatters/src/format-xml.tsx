import { Clipboard, showToast, Toast } from "@raycast/api";
import { XMLParser, XMLBuilder } from "fast-xml-parser";

export default async function Command() {
  try {
    // Get text from clipboard
    const clipboardText = await Clipboard.readText();

    if (!clipboardText) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No text in clipboard",
        message: "Please copy some XML content to clipboard first",
      });
      return;
    }

    // Parse and format XML
    const parser = new XMLParser({
      ignoreAttributes: false,
      preserveOrder: false,
    });

    const builder = new XMLBuilder({
      ignoreAttributes: false,
      format: true,
      indentBy: "  ",
      suppressEmptyNode: false,
    });

    try {
      // Parse XML to validate and then rebuild with formatting
      const parsed = parser.parse(clipboardText);
      const formattedXml = builder.build(parsed);

      // Copy formatted XML back to clipboard
      await Clipboard.copy(formattedXml);

      await showToast({
        style: Toast.Style.Success,
        title: "XML Formatted",
        message: "Formatted XML copied to clipboard",
      });
    } catch (parseError) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Invalid XML",
        message: "The clipboard content is not valid XML",
      });
    }
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Error",
      message: "Failed to format XML",
    });
  }
}
