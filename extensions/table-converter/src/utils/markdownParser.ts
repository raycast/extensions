export class MarkdownTableConverter {
  private input: string;

  constructor(input: string) {
    this.input = input;
  }

  private parse(): string[][] {
    const lines = this.input.trim().split(/\r?\n/);
    const data: string[][] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.length === 0) continue;

      // Check if it's a separator row (e.g. |---|---|)
      if (/^\|?[\s-:]+(\|[\s-:]+)+\|?$/.test(line)) {
        continue;
      }

      // Split by pipe, handling escaped pipes if possible (simple split for now)
      // A better regex for splitting by pipe not preceded by backslash would be ideal but complex
      const cells = line.split("|");

      // Remove first and last if empty (common in | data | format)
      if (line.startsWith("|") && cells.length > 0 && cells[0].trim() === "") {
        cells.shift();
      }
      if (
        line.endsWith("|") &&
        cells.length > 0 &&
        cells[cells.length - 1].trim() === ""
      ) {
        cells.pop();
      }

      const trimmedCells = cells.map((c) => c.trim());
      data.push(trimmedCells);
    }
    return data;
  }

  toCSV(): string {
    const data = this.parse();
    return data
      .map((row) =>
        row
          .map((cell) => {
            // Escape quotes
            if (
              cell.includes(",") ||
              cell.includes('"') ||
              cell.includes("\n")
            ) {
              return `"${cell.replace(/"/g, '""')}"`;
            }
            return cell;
          })
          .join(","),
      )
      .join("\n");
  }

  toTSV(): string {
    const data = this.parse();
    return data
      .map((row) =>
        row
          .map((cell) => {
            // Basic escaping for TSV (tabs and newlines)
            let escaped = cell.replace(/"/g, '""');
            if (
              cell.includes("\t") ||
              cell.includes("\n") ||
              cell.includes('"')
            ) {
              escaped = `"${escaped}"`;
            }
            return escaped;
          })
          .join("\t"),
      )
      .join("\n");
  }

  toJSON(): string {
    const data = this.parse();
    if (data.length === 0) return "[]";

    const header = data[0];
    const body = data.slice(1);

    const result = body.map((row) => {
      const obj: Record<string, string> = {};
      header.forEach((h, i) => {
        obj[h] = row[i] || "";
      });
      return obj;
    });

    return JSON.stringify(result, null, 2);
  }

  toHTML(): string {
    const data = this.parse();
    if (data.length === 0) return "";

    let html = "<table>\n";
    // Header
    html += "  <thead>\n    <tr>\n";
    data[0].forEach((cell) => {
      html += `      <th>${cell}</th>\n`;
    });
    html += "    </tr>\n  </thead>\n";

    // Body
    html += "  <tbody>\n";
    for (let i = 1; i < data.length; i++) {
      html += "    <tr>\n";
      data[i].forEach((cell) => {
        html += `      <td>${cell}</td>\n`;
      });
      html += "    </tr>\n";
    }
    html += "  </tbody>\n</table>";
    return html;
  }
}
