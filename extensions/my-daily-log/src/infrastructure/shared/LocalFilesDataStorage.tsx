import * as fs from "fs";
import * as path from "path";
import { DataStorage } from "./DataStorage";
import { isPathPermissionError, showPathPermissionToast } from "../../shared/pathPermissionError";

export class LocalFilesDataStorage implements DataStorage {
  constructor(private readonly getFilePath: (date: Date) => string) {}

  save(data: string, date: Date) {
    const filePath = this.getFilePath(date);
    const dirPath = path.dirname(filePath);
    try {
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }
      fs.writeFileSync(filePath, data);
    } catch (error) {
      if (isPathPermissionError(error)) {
        showPathPermissionToast(dirPath);
      }
      throw error;
    }
  }

  dataForDateExists(date: Date): boolean {
    return fs.existsSync(this.getFilePath(date));
  }

  readForDate(date: Date): string {
    return fs.readFileSync(this.getFilePath(date), "utf8");
  }

  deleteAllDataForDate(date: Date): void {
    if (!fs.existsSync(this.getFilePath(date))) {
      return;
    }
    fs.rmSync(this.getFilePath(date));
  }
}
