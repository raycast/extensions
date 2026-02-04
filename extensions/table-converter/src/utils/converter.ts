import { parse, HTMLElement } from "node-html-parser";

export type ConverterMode =
  | "html"
  | "space"
  | "smart"
  | "csv"
  | "xls"
  | "dash"
  | "nessus"
  | "advanced"
  | "json";

export interface ConverterOptions {
  mode: ConverterMode;
  delimiter?: string;
  trimWhiteSpace?: boolean;
  trimBlankLines?: boolean;
  firstRowHeader?: boolean;
  headerStyle?: "" | "**" | "*" | "`";
  firstColumnStyle?: "" | "**" | "*" | "`";
  tableWidth?: "header" | "fill" | "trim" | "custom";
  customWidth?: number[];
  threshold?: number;
  convertLinks?: boolean;
  convertCode?: boolean;
  convertLineBreaks?: boolean;
  escapePipe?: "standard" | "obsidian";
}

const markdownCellSeparator = " | ";
const newLine = "\n";

export class Table2MD {
  private input: string;
  private options: ConverterOptions;

  constructor(input: string, options: ConverterOptions) {
    this.input = input;
    this.options = options;
  }

  convert(): string {
    const { mode } = this.options;

    if (/^\s*$/.test(this.input) && mode !== "advanced") {
      return "";
    }

    if (mode === "html") {
      return this.convertHTMLTables();
    } else if (mode === "json") {
      return this.convertJSON();
    } else if (mode === "space" || mode === "smart" || mode === "advanced") {
      // "space" in original is just a regex delimiter, "smart" and "advanced" use the smart algorithm
      if (mode === "space") {
        // emulate space mode using specific delimiter
        return this.convertWithDelimiter(new RegExp(" {2,}", "g"));
      }
      return this.smartConverter();
    } else if (mode === "nessus") {
      return this.convertNessusToMarkdown();
    } else if (mode === "csv") {
      return this.convertWithDelimiter(/,/);
    } else if (mode === "xls") {
      return this.convertWithDelimiter(/\t/);
    } else if (mode === "dash") {
      return this.convertWithDelimiter(/-/);
    } else {
      // Default fall back to delimiter if provided or simple line split
      return this.convertWithDelimiter(
        this.options.delimiter ? new RegExp(this.options.delimiter) : /\s+/,
      );
    }
  }

  private convertJSON(): string {
    try {
      const jsonData = JSON.parse(this.input);
      if (!Array.isArray(jsonData) || jsonData.length === 0) {
        return "Invalid JSON: Must be a non-empty array of objects.";
      }

      const headers = Object.keys(jsonData[0]);
      const headerRow = headers.map((h) => this.processOptions(h, 0, 0));

      const dividerRow = headers.map(() => "---");

      const rows = jsonData.map((row, index) => {
        return headers
          .map((header, colIndex) => {
            const cellContent =
              row[header] !== undefined && row[header] !== null
                ? String(row[header])
                : "";
            return this.processOptions(cellContent, index + 1, colIndex);
          })
          .join(markdownCellSeparator);
      });

      return [
        `| ${headerRow.join(markdownCellSeparator)} |`,
        `| ${dividerRow.join(markdownCellSeparator)} |`,
        ...rows.map((r) => `| ${r} |`),
      ].join(newLine);
    } catch (e) {
      return "Invalid JSON";
    }
  }

  private convertNessusToMarkdown(): string {
    const portBlocks = this.input
      .split(/Port \d+\/tcp was found to be open/)
      .slice(1);
    const hostPorts: Record<string, string[]> = {};

    portBlocks.forEach((block) => {
      const portLineMatch = block.match(/Hosts\s+([\d]+) \/ tcp/);
      if (!portLineMatch) return;
      const portNum = portLineMatch[1].trim();

      const ips: string[] = [];
      const lines = block.split("\n");
      let foundPortLine = false;
      for (let line of lines) {
        line = line.trim();
        if (foundPortLine && /^\d{1,3}(\.\d{1,3}){3}$/.test(line)) {
          ips.push(line);
        }
        if (line.startsWith(portNum + " / tcp")) {
          foundPortLine = true;
        }
      }
      if (ips.length === 0) {
        const portIdx = lines.findIndex((l) =>
          l.trim().startsWith(portNum + " / tcp"),
        );
        if (portIdx !== -1 && lines[portIdx + 1]) {
          const ipLine = lines[portIdx + 1].trim();
          if (/^\d{1,3}(\.\d{1,3}){3}$/.test(ipLine)) {
            ips.push(ipLine);
          }
        }
      }
      ips.forEach((ip) => {
        if (!hostPorts[ip]) hostPorts[ip] = [];
        hostPorts[ip].push(portNum);
      });
    });

    let md = `| Host | Port(s) |\n|------|---------|\n`;
    Object.entries(hostPorts).forEach(([host, ports]) => {
      const portStr = `\`${ports.join(",")}\``;
      md += `| ${host} | ${portStr} |\n`;
    });
    return md.trim();
  }

  private convertHTMLTables(): string {
    const root = parse(this.input.replace(/\s+/g, " "));
    const tables = root.getElementsByTagName("table");
    let convertedOutput = "";

    if (tables.length > 0) {
      for (let i = 0; i < tables.length; i++) {
        convertedOutput +=
          this.convertHTMLTableElements(tables[i]) + newLine + newLine;
      }
      return convertedOutput.trim();
    } else {
      return "No HTML tables found";
    }
  }

  private convertHTMLTableElements(table: HTMLElement): string {
    const rows = table.getElementsByTagName("tr");
    const tableWidth = this.getHTMLTableWidth(rows);

    if (tableWidth.length < 1) {
      return "";
    } else {
      const convertedRows: string[] = [];
      for (let i = 0; i < rows.length; i++) {
        if (/\S/.test(rows[i].text) || !this.options.trimBlankLines) {
          const convertedRow = this.convertHTMLRowElements(
            i,
            rows[i],
            tableWidth,
          );
          convertedRows.push(convertedRow);
        }
      }
      return convertedRows.join(newLine);
    }
  }

  private getHTMLTableWidth(rows: HTMLElement[]): number[] {
    const { tableWidth, customWidth } = this.options;
    if (tableWidth === "header") {
      return Array.from(
        { length: rows[0].childNodes.filter((n) => n.nodeType === 1).length },
        (_, i) => i + 1,
      );
    } else if (tableWidth === "custom" && customWidth) {
      return customWidth;
    } else {
      let maxLength = Number.NEGATIVE_INFINITY;
      let minLength = Number.POSITIVE_INFINITY;
      for (let i = 0; i < rows.length; i++) {
        const rowLength = rows[i].childNodes.filter(
          (n) => n.nodeType === 1,
        ).length;
        maxLength = Math.max(maxLength, rowLength);
        minLength = Math.min(minLength, rowLength);
      }
      if (tableWidth === "fill") {
        return Array.from({ length: maxLength }, (_, i) => i + 1);
      } else {
        // trim or default
        return Array.from({ length: minLength }, (_, i) => i + 1);
      }
    }
  }

  private convertHTMLRowElements(
    rowIndex: number,
    rowContent: HTMLElement,
    tableWidth: number[],
  ): string {
    const convertedRow: string[] = [""];
    const rowElements = rowContent.childNodes.filter(
      (n) => n.nodeType === 1,
    ) as HTMLElement[];

    for (let i = 0; i < tableWidth.length; i++) {
      // tableWidth contains 1-based indices
      const element = rowElements[tableWidth[i] - 1];
      // We pass the innerHTML to handle things like links inside
      const convertedElement = this.processOptions(
        element ? element.innerHTML : "",
        rowIndex,
        i,
      );
      convertedRow.push(convertedElement);
    }
    convertedRow.push("");

    if (rowIndex === 0) {
      return this.createDividerRow(tableWidth.length, convertedRow);
    }
    return convertedRow.join(markdownCellSeparator).trim();
  }

  private convertWithDelimiter(delimiter: RegExp): string {
    let inputData = this.input;
    if (this.options.trimBlankLines) {
      inputData = inputData.replace(/^\s*[\r\n]/gm, "");
    }
    const tableRows = inputData
      .split(/\r?\n/)
      .filter((line) => !this.options.trimBlankLines || line.trim().length > 0);
    const tableWidth = this.getTableWidth(tableRows, delimiter);

    if (tableWidth.length < 1) return "Unable to generate table";

    const convertedRows: string[] = [];
    for (let rowIndex = 0; rowIndex < tableRows.length; rowIndex++) {
      const convertedRow: string[] = [""];
      const rowElements = tableRows[rowIndex].split(delimiter);

      for (
        let columnIndex = 0;
        columnIndex < tableWidth.length;
        columnIndex++
      ) {
        const content = rowElements[tableWidth[columnIndex] - 1] || "";
        const convertedElement = this.processOptions(
          content,
          rowIndex,
          columnIndex,
        );
        convertedRow.push(convertedElement);
      }
      convertedRow.push("");

      if (rowIndex === 0) {
        convertedRows.push(
          this.createDividerRow(tableWidth.length, convertedRow),
        );
      } else {
        convertedRows.push(convertedRow.join(markdownCellSeparator).trim());
      }
    }
    return convertedRows.join(newLine).trim();
  }

  private getTableWidth(rows: string[], delimiter: RegExp): number[] {
    const { tableWidth, customWidth } = this.options;
    if (tableWidth === "header") {
      return Array.from(
        { length: rows[0].split(delimiter).length },
        (_, i) => i + 1,
      );
    } else if (tableWidth === "custom" && customWidth) {
      return customWidth;
    } else {
      let maxLength = Number.NEGATIVE_INFINITY;
      let minLength = Number.POSITIVE_INFINITY;
      for (let i = 0; i < rows.length; i++) {
        const rowLength = rows[i].split(delimiter).length;
        maxLength = Math.max(maxLength, rowLength);
        minLength = Math.min(minLength, rowLength);
      }
      if (tableWidth === "fill") {
        return Array.from({ length: maxLength }, (_, i) => i + 1);
      } else {
        return Array.from({ length: minLength }, (_, i) => i + 1);
      }
    }
  }

  private smartConverter(): string {
    let inputData = this.input;
    if (this.options.trimBlankLines) {
      inputData = inputData.trim().replace(/^\s*[\r\n]/gm, "");
    }

    const [customRegex, cellStartChars] = this.buildRegexFromInput();
    const tableRows = inputData.split(/\r?\n/);
    const cellIndexPerRow = this.extractCellIndices(
      tableRows,
      customRegex,
      cellStartChars,
    );

    const cellIndex = this.getCellIndex(cellIndexPerRow, tableRows.length);

    // Recalculate 'smartWidth' logic based on cellIndex result size?
    // Original code had `smartWidth` populated by `parseWidthInput` based on user input OR default.
    // If user didn't input width, `smartWidth` might be undefined.
    // Let's assume we want all columns found.

    const convertedRows: string[] = [];

    for (let rowIndex = 0; rowIndex < tableRows.length; rowIndex++) {
      const convertedRow: string[] = [""];
      let previousBoundaryIndex = 0;
      let reachedLastChar = false;
      const boundaries = this.computeBoundaries(
        tableRows[rowIndex],
        customRegex,
        cellStartChars,
      );

      for (let columnIndex = 0; columnIndex < cellIndex.length; columnIndex++) {
        let cellContent = "";
        const boundaryIndex = this.getClosestFromBoundaries(
          cellIndex[columnIndex],
          boundaries,
        );

        cellContent = tableRows[rowIndex].substring(
          previousBoundaryIndex,
          boundaryIndex,
        );
        previousBoundaryIndex = boundaryIndex;

        const convertedElement = this.processOptions(
          cellContent,
          rowIndex,
          columnIndex,
        );
        convertedRow.push(convertedElement);

        if (columnIndex === cellIndex.length - 1 && !reachedLastChar) {
          // Check if we need to grab the rest
          reachedLastChar = true;
          cellContent = tableRows[rowIndex].substring(previousBoundaryIndex);
          const lastElement = this.processOptions(
            cellContent,
            rowIndex,
            columnIndex + 1,
          );
          convertedRow.push(lastElement);
        }
      }

      // Fill logic if needed

      convertedRow.push("");
      if (rowIndex === 0) {
        convertedRows.push(
          this.createDividerRow(convertedRow.length - 2, convertedRow),
        );
      } else {
        convertedRows.push(convertedRow.join(markdownCellSeparator).trim());
      }
    }
    return convertedRows.join(newLine).trim();
  }

  // Helpers for Smart Converter
  private buildRegexFromInput(): [RegExp, RegExp] {
    const cellStartChars = /[a-zA-Z0-9]+/g;
    // In advanced mode we might let user specify chars, but for now use default alphanum
    let customDelimiter = this.options.delimiter || "/\\s+/g";

    if (/^\s+$/g.test(customDelimiter) || customDelimiter === "") {
      customDelimiter = "/\\s+/g";
    }

    // Basic regex parsing from string like "/regex/g"
    const match = customDelimiter.match(new RegExp("^/(.*?)/([gimy]*)$"));
    if (match) {
      return [new RegExp(match[1], "g"), cellStartChars];
    } else {
      // Literal match
      const escaped = customDelimiter.replace(
        /[/[\]\-\\^$*+?.()|[|{}]/g,
        "\\$&",
      );
      return [new RegExp(escaped + "+", "g"), cellStartChars];
    }
  }

  private extractCellIndices(
    tableRows: string[],
    customRegex: RegExp,
    cellStartChars: RegExp,
  ): number[] {
    const cellIndexPerRow: number[] = [];
    for (let rowIndex = 0; rowIndex < tableRows.length; rowIndex++) {
      let match;
      while ((match = customRegex.exec(tableRows[rowIndex])) !== null) {
        cellStartChars.lastIndex = match.index;
        const matchedCharacter = cellStartChars.exec(tableRows[rowIndex]);
        if (matchedCharacter) {
          cellIndexPerRow.push(matchedCharacter.index);
        }
      }
    }
    return cellIndexPerRow;
  }

  private getCellIndex(cellIndexPerRow: number[], rowCount: number): number[] {
    const occurrences = cellIndexPerRow.reduce(
      (acc, n) => {
        acc[n] = (acc[n] || 0) + 1;
        return acc;
      },
      {} as Record<number, number>,
    );

    const thresholdValue = this.options.threshold || 50;

    const groupedByCount: Record<number, number[]> = {};
    Object.entries(occurrences)
      .filter(([count]) => (Number(count) / rowCount) * 100 >= thresholdValue)
      .forEach(([num, count]) => {
        const n = parseInt(num);
        if (!groupedByCount[count]) groupedByCount[count] = [];
        groupedByCount[count].push(n);
      });

    const refined: number[] = [];
    for (const group of Object.values(groupedByCount)) {
      group.sort((a, b) => a - b);
      for (let i = 0; i < group.length; i++) {
        if (i === group.length - 1 || group[i + 1] - group[i] > 1) {
          refined.push(group[i]);
        } else if (Math.random() > 0.5) {
          // The chaotic random shuffling from original code :D
          refined.push(group[i]);
          i++;
        }
      }
    }

    // Shuffle logic from original code, maintaining it for "magic" effect
    const shuffled = this.shuffleArray(refined);
    return shuffled.sort((a, b) => a - b);
  }

  private shuffleArray(array: number[]): number[] {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  private computeBoundaries(
    str: string,
    customRegex: RegExp,
    cellStartChars: RegExp,
  ): number[] {
    const boundaries: number[] = [];
    let match;
    // Reset lastIndex
    customRegex.lastIndex = 0;
    while ((match = customRegex.exec(str)) !== null) {
      boundaries.push(match.index, match.index + match[0].length);
    }
    cellStartChars.lastIndex = 0;
    while ((match = cellStartChars.exec(str)) !== null) {
      boundaries.push(match.index, match.index + match[0].length);
    }
    boundaries.sort((a, b) => a - b);
    return boundaries;
  }

  private getClosestFromBoundaries(idx: number, boundaries: number[]): number {
    if (boundaries.length === 0) return idx;
    let closest = boundaries[0];
    for (let i = 1; i < boundaries.length; i++) {
      if (Math.abs(boundaries[i] - idx) < Math.abs(closest - idx)) {
        closest = boundaries[i];
      }
    }
    return closest;
  }

  private createDividerRow(cellCount: number, convertedRow: string[]): string {
    const headerRow: string[] = [""];
    const dividerRow: string[] = [""]; // Start with empty for pipe
    // Original: var dividerRow = [newLine]; but convertedRow joins with separator.
    // We construct arrays that will be joined by " | ".

    // Logic adjustment: The caller expects a string return.
    // The arrays here (convertedRow) usually start with "" to create the leading pipe when joined by " | ".

    for (let i = 0; i < cellCount; i++) {
      headerRow.push("");
      dividerRow.push("---");
    }
    headerRow.push("");
    dividerRow.push("");

    if (this.options.firstRowHeader) {
      return (
        convertedRow.join(markdownCellSeparator).trim() +
        newLine +
        dividerRow.join(markdownCellSeparator).trim()
      );
    } else {
      return (
        headerRow.join(markdownCellSeparator).trim() +
        newLine +
        dividerRow.join(markdownCellSeparator).trim() +
        newLine +
        convertedRow.join(markdownCellSeparator).trim()
      );
    }
  }

  private processOptions(
    content: string,
    rowIndex: number,
    columnIndex: number,
  ): string {
    // 1. Escape pipes
    let processed = content.replace(/\|/g, "\\|");

    // 2. Links
    if (this.options.convertLinks) {
      processed = processed.replace(
        /<a href="(.*?)".*?>(.*?)<\/a>/g,
        "[$2]($1)",
      );
    }

    // 3. Code
    if (this.options.convertCode) {
      processed = processed.replace(/<code>(.*?)<\/code>/g, "``$1``");
    }

    // 4. Line Breaks
    if (this.options.convertLineBreaks) {
      processed = processed.replace(/<br>/g, "&lt;br&gt;");
    }

    // 5. Trim WS
    if (this.options.trimWhiteSpace) {
      processed = processed.trim();
    }

    // 6. Header/Column Styles
    if (this.options.headerStyle && rowIndex === 0) {
      processed =
        this.options.headerStyle + processed + this.options.headerStyle;
    }
    if (this.options.firstColumnStyle && rowIndex > 0 && columnIndex === 0) {
      processed = processed.replace(/`+/g, "`");
      processed =
        this.options.firstColumnStyle +
        processed +
        this.options.firstColumnStyle;
    }

    // 7. Obsidian Pipe Escape
    if (this.options.escapePipe === "obsidian") {
      processed = processed.replace(/(?<=`[^`]*)\\|(?=[^`]*`)/g, "``&#124``");
    }

    return processed;
  }
}
