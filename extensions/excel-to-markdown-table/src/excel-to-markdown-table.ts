import { Clipboard, showHUD } from "@raycast/api";

export default async function Command() {
  try {
    // Get clipboard content
    const data = await Clipboard.readText();

    if (!data) {
      await showHUD("Clipboard is empty! Please copy Excel table content first.");
      return;
    }

    // Split the data into rows and process
    const rows = data.split("\n");
    if (rows.length === 0) {
      await showHUD("No valid data found in clipboard!");
      return;
    }

    let markdownTable = "";
    const processRow = (row: string) => {
      const cells = row.split("\t");
      let line = "|";

      cells.forEach((cell) => {
        // Trim whitespace
        const trimmedCell = cell.trim();

        // Check if number or percentage for alignment
        const isNumeric = /^[0-9,.+-]+$/.test(trimmedCell) || /%$/.test(trimmedCell);
        const formattedCell = isNumeric ? trimmedCell.padStart(12, " ") : trimmedCell.padEnd(12, " ");

        line += ` ${formattedCell} |`;
      });

      return line;
    };

    // Process header
    markdownTable += processRow(rows[0]) + "\n";

    // Add separator
    const columnCount = rows[0].split("\t").length;
    markdownTable += "|" + " --------------|".repeat(columnCount) + "\n";

    // Process data rows
    for (let i = 1; i < rows.length; i++) {
      if (rows[i].trim()) {
        // Skip empty rows
        markdownTable += processRow(rows[i]) + "\n";
      }
    }

    // Copy result to clipboard
    await Clipboard.copy(markdownTable);

    // Show success message
    await showHUD("Table converted and copied to clipboard!");
  } catch (error) {
    await showHUD("Error converting table: " + error);
  }
}
