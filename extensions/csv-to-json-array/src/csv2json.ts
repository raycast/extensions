import { showHUD, getSelectedFinderItems } from "@raycast/api";
import { createReadStream, createWriteStream } from "fs";
import { createInterface } from "readline";

interface CSVProcessingOptions {
  inputPath: string;
  outputPath: string;
}

function parseCSVLine(line: string): string[] {
  const values = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"' && (i === 0 || line[i - 1] !== "\\")) {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      values.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  values.push(current.trim());
  return values.map((val) => {
    if (val.startsWith('"') && val.endsWith('"')) {
      return val.substring(1, val.length - 1);
    }
    return val;
  });
}

function processValue(value: string): unknown {
  const processedValue = value.trim();
  if (processedValue === "" || processedValue.toLowerCase() === "null") {
    return null;
  }
  if (processedValue.toLowerCase() === "true" || processedValue.toLowerCase() === "false") {
    return processedValue.toLowerCase() === "true";
  }
  if (!isNaN(Number(processedValue)) && processedValue !== "") {
    return Number(processedValue);
  }
  if (!isNaN(Date.parse(processedValue))) {
    return new Date(processedValue).toISOString();
  }
  return processedValue;
}

function createJSONObject(headers: string[], values: string[]): Record<string, unknown> {
  const obj: Record<string, unknown> = {};
  headers.forEach((header, index) => {
    const value = values[index] !== undefined ? values[index] : "";
    obj[header] = processValue(value);
  });
  return obj;
}

async function processCSVFile({ inputPath, outputPath }: CSVProcessingOptions): Promise<void> {
  const stream = createReadStream(inputPath);
  const outputStream = createWriteStream(outputPath);
  const rl = createInterface({
    input: stream,
    crlfDelay: Infinity,
  });
  outputStream.write("[\n");
  let isFirstLine = true;
  let headers: string[] = [];
  let isFirstDataLine = true;
  for await (const line of rl) {
    if (isFirstLine) {
      headers = line.split(",").map((header) => header.trim());
      isFirstLine = false;
      continue;
    }
    const values = parseCSVLine(line);
    const obj = createJSONObject(headers, values);
    if (!isFirstDataLine) {
      outputStream.write(",\n");
    } else {
      isFirstDataLine = false;
    }
    outputStream.write(JSON.stringify(obj, null, 2));
  }
  outputStream.write("\n]");
  outputStream.end();
}

async function processSingleFile(path: string): Promise<string> {
  const outputPath = path.replace(".csv", ".json");
  await processCSVFile({
    inputPath: path,
    outputPath,
  });
  return outputPath;
}

async function processBatch(files: string[], batchSize: number = 3): Promise<void> {
  for (let i = 0; i < files.length; i += batchSize) {
    const batch = files.slice(i, i + batchSize);
    const results = await Promise.all(
      batch.map(async (path) => {
        try {
          const outputPath = await processSingleFile(path);
          await showHUD(`File ${outputPath} as been converted successfully`);
          return { success: true, path };
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : "Error";
          await showHUD(`Error while converting ${path}: ${errorMessage}`);
          return { success: false, path };
        }
      }),
    );
    const succeeded = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;
    if (succeeded + failed > 1) {
      await showHUD(`Batch compleated: ${succeeded} success, ${failed} errors`);
    }
  }
}

export default async function main(): Promise<void> {
  const selected = await getSelectedFinderItems();
  const csvFiles = selected.map((item) => item.path).filter((path) => path.includes(".csv"));

  if (csvFiles.length === 0) {
    await showHUD("Select one or more CSV");
    return;
  }

  await processBatch(csvFiles);
}
