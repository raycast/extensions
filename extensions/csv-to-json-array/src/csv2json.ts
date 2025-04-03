import { showHUD, getSelectedFinderItems } from "@raycast/api";
import { createReadStream, createWriteStream, promises as fsPromises } from "fs";
import { createInterface } from "readline";

interface CSVProcessingOptions {
  inputPath: string;
  outputPath: string;
}

interface ProcessResult {
  success: boolean;
  path: string;
  error?: string;
  outputPath?: string;
}

function parseCSVLine(line: string): string[] {
  const values = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      values.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  values.push(current.trim());
  return values.map((val) => {
    if (val.startsWith('"') && val.endsWith('"') && val.length >= 2) {
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

async function validateCSVFile(path: string): Promise<void> {
  if (!path.toLowerCase().endsWith(".csv")) {
    throw new Error(`Not a CSV file: ${path}`);
  }
  try {
    await fsPromises.access(path, fsPromises.constants.R_OK);
  } catch (error) {
    throw new Error(`Cannot read file: ${path}`);
  }
}

async function processCSVFile({ inputPath, outputPath }: CSVProcessingOptions): Promise<void> {
  await validateCSVFile(inputPath);
  let stream: ReturnType<typeof createReadStream> | null = null;
  let outputStream: ReturnType<typeof createWriteStream> | null = null;
  let rl: ReturnType<typeof createInterface> | null = null;
  try {
    stream = createReadStream(inputPath);
    outputStream = createWriteStream(outputPath);
    rl = createInterface({
      input: stream,
      crlfDelay: Infinity,
    });
    outputStream.write("[\n");
    let isFirstLine = true;
    let headers: string[] = [];
    let isFirstDataLine = true;
    let lineNumber = 0;
    for await (const line of rl) {
      lineNumber++;
      if (line.trim() === "") {
        continue;
      }
      if (isFirstLine) {
        headers = parseCSVLine(line);
        if (headers.length === 0) {
          throw new Error(`No headers found in CSV file at line ${lineNumber}`);
        }
        isFirstLine = false;
        continue;
      }
      try {
        const values = parseCSVLine(line);
        const obj = createJSONObject(headers, values);
        if (!isFirstDataLine) {
          outputStream.write(",\n");
        } else {
          isFirstDataLine = false;
        }
        outputStream.write(JSON.stringify(obj, null, 2));
      } catch (parseError) {
        throw new Error(
          `Error parsing line ${lineNumber}: ${parseError instanceof Error ? parseError.message : "Unknown error"}`,
        );
      }
    }
    outputStream.write("\n]");
  } finally {
    if (rl) {
      rl.close();
    }
    if (stream) {
      stream.destroy();
    }
    if (outputStream) {
      outputStream.end();
    }
  }
}

async function processSingleFile(path: string): Promise<ProcessResult> {
  try {
    const outputPath = path.replace(".csv", ".json");
    await processCSVFile({
      inputPath: path,
      outputPath,
    });
    return {
      success: true,
      path,
      outputPath,
    };
  } catch (error) {
    return {
      success: false,
      path,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

async function processBatch(files: string[], batchSize: number = 3): Promise<ProcessResult[]> {
  const allResults: ProcessResult[] = [];

  for (let i = 0; i < files.length; i += batchSize) {
    const batch = files.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map((path) => processSingleFile(path)));
    allResults.push(...batchResults);
  }

  return allResults;
}

export default async function main(): Promise<void> {
  try {
    const selected = await getSelectedFinderItems();
    const csvFiles = selected.map((item) => item.path).filter((path) => path.toLowerCase().endsWith(".csv"));

    if (csvFiles.length === 0) {
      await showHUD("Select one or more CSV files to convert");
      return;
    }

    const results = await processBatch(csvFiles);
    const errors = results.filter((r) => !r.success);
    const succeeded = results.filter((r) => r.success);
    if (errors.length === 0) {
      if (succeeded.length === 1) {
        const filename = succeeded[0].outputPath?.split("/").pop() || "";
        await showHUD(`Success: Converted to ${filename}`);
      } else {
        await showHUD(`Success: Converted all ${succeeded.length} files`);
      }
    } else if (succeeded.length === 0) {
      if (errors.length === 1) {
        await showHUD(`Error: ${errors[0].error}`);
      } else {
        await showHUD(`Failed: All ${errors.length} files failed to convert`);
      }
    } else {
      await showHUD(`Completed: ${succeeded.length} successful, ${errors.length} failed`);
      console.error(
        "Conversion errors:",
        errors.map((e) => `${e.path}: ${e.error}`),
      );
    }
  } catch (error) {
    await showHUD(`Critical error: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}
