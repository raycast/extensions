import * as fs from "fs";
import * as path from "path";
import { DataStorage } from "./DataStorage";

export class LocalFilesDataStorage implements DataStorage {
  constructor(private readonly getFilePath: (date: Date) => string) {}

  save(data: string, date: Date) {
    const filePath = this.getFilePath(date);
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, data);
  }

  dataForDateExists(date: Date): boolean {
    return fs.existsSync(this.getFilePath(date));
  }

  readForDate(date: Date): string {
    return fs.readFileSync(this.getFilePath(date), "utf8");
  }

  deleteAllDataForDate(date: Date): void {
    fs.rmSync(this.getFilePath(date), { force: true });
  }

  describeLocation(date: Date): string {
    return this.getFilePath(date);
  }
}
