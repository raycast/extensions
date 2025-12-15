import fs from "fs";
import { runPowerShellScript } from "@raycast/utils";
import { environment } from "@raycast/api";

interface OfficeResult {
  [key: string]: Result;
}
interface Result {
  PPTPath?: string;
  WORDPath?: string;
  EXCELPath?: string;
  OfficeVersion: string;
  Files: RecentPowerpointFile[];
}

interface RecentPowerpointFile {
  ItemName: string;
  FilePath: string;
  TimestampUTC: string;
}

export interface PowerPointFile {
  filename: string;
  timestampUTC: Date;
}

export interface PowerPointFiles {
  files: PowerPointFile[];
  pptExecutable?: string;
}

export interface WordFile {
  filename: string;
  timestampUTC: Date;
}

export interface WordFiles {
  files: WordFile[];
  wordExecutable?: string;
}

export interface ExcelFile {
  filename: string;
  timestampUTC: Date;
}

export interface ExcelFiles {
  files: ExcelFile[];
  excelExecutable?: string;
}

export async function recentMSOfficeFiles() {
  try {
    const data = fs.readFileSync(environment.assetsPath + "/office.ps1", "utf8");
    const result = await runPowerShellScript(data);
    const j = JSON.parse(result) as OfficeResult;
    const adalKey = Object.keys(j).filter((key) => key.startsWith("ADAL"));
    if (!adalKey || adalKey.length <= 0) {
      throw new Error("No ADAL key found in the result");
    }
    return j[adalKey[0]];
  } catch {
    throw new Error("Could not read Office files");
  }
}

function powershellDateStringToDate(dateString: string): Date {
  const ms = parseInt(dateString.replace(/\D/g, ""), 10);
  const date = new Date(ms);
  return date;
}

export async function recentPowerPointFiles(): Promise<PowerPointFiles> {
  const data = await recentMSOfficeFiles();
  const result = data.Files.map<PowerPointFile>((file) => {
    return {
      filename: file.FilePath,
      timestampUTC: powershellDateStringToDate(file.TimestampUTC),
    };
  });
  const files = result
    .filter((f) => f.filename.toLowerCase().endsWith(".pptx") || f.filename.toLowerCase().endsWith(".potx"))
    .sort((a, b) => b.timestampUTC.getTime() - a.timestampUTC.getTime());
  return {
    files,
    pptExecutable: data.PPTPath,
  };
}

export async function recentWordFiles(): Promise<WordFiles> {
  const data = await recentMSOfficeFiles();
  const result = data.Files.map<PowerPointFile>((file) => {
    return {
      filename: file.FilePath,
      timestampUTC: powershellDateStringToDate(file.TimestampUTC),
    };
  });
  const files = result
    .filter((f) => f.filename.toLowerCase().endsWith(".doc") || f.filename.toLowerCase().endsWith(".docx"))
    .sort((a, b) => b.timestampUTC.getTime() - a.timestampUTC.getTime());
  return {
    files,
    wordExecutable: data.WORDPath,
  };
}

export async function recentExcelFiles(): Promise<ExcelFiles> {
  const data = await recentMSOfficeFiles();
  const result = data.Files.map<PowerPointFile>((file) => {
    return {
      filename: file.FilePath,
      timestampUTC: powershellDateStringToDate(file.TimestampUTC),
    };
  });
  const files = result
    .filter((f) => f.filename.toLowerCase().endsWith(".xls") || f.filename.toLowerCase().endsWith(".xlsx"))
    .sort((a, b) => b.timestampUTC.getTime() - a.timestampUTC.getTime());
  return {
    files,
    excelExecutable: data.EXCELPath,
  };
}
