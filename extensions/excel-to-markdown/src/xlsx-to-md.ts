import { showToast, Toast, showHUD, getSelectedFinderItems, Clipboard } from "@raycast/api";
import XLSX from "xlsx";

// Type for sheet data with proper typing instead of any
type CellValue = string | number | boolean | Date | null;
type SheetData = Array<Array<CellValue>>;

export default async function Command() {
  try {
    // Get selected file using Raycast's native file picker
    const selectedItems = await getSelectedFinderItems();

    if (selectedItems.length === 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No File Selected",
        message: "Please select an Excel file in Finder",
      });
      return;
    }

    const filePath = selectedItems[0].path;

    // Validate file extension
    if (!filePath.toLowerCase().endsWith(".xlsx")) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Invalid File Type",
        message: "Please select a valid .xlsx file",
      });
      return;
    }

    // Read and validate workbook
    const workbook = XLSX.readFile(filePath, {
      type: "binary",
      cellDates: true,
      cellNF: true,
    });

    if (!workbook.SheetNames?.length) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Empty Workbook",
        message: "Selected file contains no sheets",
      });
      return;
    }

    // Get first sheet and convert to JSON
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    const jsonData = XLSX.utils.sheet_to_json<SheetData>(worksheet, {
      header: 1,
      defval: "", // Default value for empty cells
      blankrows: false, // Skip empty rows
    });

    if (!jsonData.length) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Empty Sheet",
        message: "First sheet contains no data",
      });
      return;
    }

    // Convert to markdown and copy to clipboard
    const markdown = convertToMarkdown(jsonData);
    await Clipboard.copy(markdown);

    // Show success message
    await showHUD("✅ Markdown table copied to clipboard");
  } catch (error) {
    console.error("Conversion error:", error);
    await showToast({
      style: Toast.Style.Failure,
      title: "Conversion Failed",
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

function convertToMarkdown(data: SheetData): string {
  if (!data.length) return "";

  const headers = data[0].map(String);
  const rows = data.slice(1);

  // Create header row
  const headerRow = `| ${headers.map((header) => header.trim() || "Column").join(" | ")} |`;

  // Create separator row
  const separator = `| ${headers.map(() => "---").join(" | ")} |`;

  // Create data rows
  const dataRows = rows
    .map((row) => {
      const cells = row.map((cell) => {
        const cellStr = String(cell ?? "").trim();
        // Escape pipe characters in cell content
        return cellStr.replace(/\|/g, "\\|");
      });
      return `| ${cells.join(" | ")} |`;
    })
    .join("\n");

  return `${headerRow}\n${separator}\n${dataRows}`;
}
