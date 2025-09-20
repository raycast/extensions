import fs from "fs";
import crypto from "crypto";
import path from "path";

export interface DataItem {
  data: string;
  remark: string;
  id: string;
  createTime: number;
  updateTime: number;
  lastUsedTime: number;
  args?: Arg[];
}

export interface Arg {
  name: string;
  value: string;
}

interface GeneratedInterface {
  data: DataItem[];
  createTime: number;
  updateTime: number;
}

export interface DataSource {
  add(data: string, remark: string, args: Arg[]): void;
  update(id: string, data: string, remark: string, args: Arg[]): void;
  updateLastUsedTime(id: string): void;
  delete(id: string): void;
  getAll(): DataItem[];
}

class FileDataSource implements DataSource {
  private filePath: string;

  constructor(filePath: string) {
    if (!fs.existsSync(filePath)) {
      this.createFileAndWriteEmptyDataStructure(filePath);
    }

    this.filePath = filePath;
  }

  getAll(): DataItem[] {
    const dataStructure = this.parseDatasourceFile();
    return this.sortDataByTimestamps(dataStructure);
  }

  private getFilePath(): string {
    return this.filePath;
  }

  createFileAndWriteEmptyDataStructure(filePath: string): void {
    const currentTimestamp = Date.now();
    const initialData: DataItem[] = [
      {
        id: "f5f71a916c248e56d00c3507365716c2",
        data: "echo 'Hello, World!'",
        remark: "",
        args: [],
        createTime: currentTimestamp,
        updateTime: currentTimestamp,
        lastUsedTime: currentTimestamp,
      },
      {
        id: "31aef2adf7115a36fd918e5542873613",
        data: "docker build -t {{image-name}}:{{tag}} . ",
        remark: "build docker image",
        args: [
          {
            name: "image-name",
            value: "",
          },
          {
            name: "tag",
            value: "",
          },
        ],
        createTime: currentTimestamp,
        updateTime: currentTimestamp,
        lastUsedTime: currentTimestamp,
      },
      {
        id: "c8dec60c50c26c402777c516bb1c91e5",
        data: "Tip: Press ⌘ + N to add a new command. For more actions, press ⌘ + K",
        remark: "",
        args: [],
        createTime: currentTimestamp,
        updateTime: currentTimestamp,
        lastUsedTime: currentTimestamp,
      },
    ];
    const emptyGeneratedInterface: GeneratedInterface = {
      data: initialData,
      createTime: currentTimestamp,
      updateTime: currentTimestamp,
    };

    const folderPath = path.dirname(filePath);
    try {
      fs.mkdirSync(folderPath, { recursive: true });
    } catch (error) {
      throw new Error(`Failed to create datasource file: ${error}`);
    }
    this.writeFile(filePath, emptyGeneratedInterface);
  }

  parseDatasourceFile(): GeneratedInterface {
    const filePath = this.getFilePath();
    return this.readFile(filePath);
  }
  sortDataByTimestamps(dataStructure: GeneratedInterface): DataItem[] {
    return dataStructure.data.sort((a, b) => {
      // lastUsedTime not exist, use updateTime
      const aLastUsed = a.lastUsedTime || a.updateTime;
      const bLastUsed = b.lastUsedTime || b.updateTime;

      if (aLastUsed !== bLastUsed) {
        return bLastUsed - aLastUsed;
      }
      if (a.updateTime !== b.updateTime) {
        return b.updateTime - a.updateTime;
      }
      return b.createTime - a.createTime;
    });
  }

  add(data: string, remark: string, args: Arg[]): void {
    const filePath = this.getFilePath();
    const nowTimestamp = Date.now();

    const newItem: DataItem = {
      id: crypto.createHash("md5").update(data).digest("hex"), // Using md5 hex value as a unique ID
      data: data,
      remark: remark,
      args: args,
      createTime: nowTimestamp,
      updateTime: nowTimestamp,
      lastUsedTime: nowTimestamp,
    };

    const dataStructure = this.readFile(filePath);

    dataStructure.data.push(newItem);
    dataStructure.updateTime = nowTimestamp;

    this.writeFile(filePath, dataStructure);
  }

  private updateDataItem(id: string, updateFn: (item: DataItem) => void): void {
    const filePath = this.getFilePath();
    const nowTimestamp = Date.now();

    const dataStructure = this.readFile(filePath);

    const itemIndex = dataStructure.data.findIndex((item) => item.id === id);
    if (itemIndex === -1) {
      throw new Error(`Data item with id ${id} not found`);
    }

    updateFn(dataStructure.data[itemIndex]);
    dataStructure.data[itemIndex].updateTime = nowTimestamp;
    dataStructure.updateTime = nowTimestamp;

    this.writeFile(filePath, dataStructure);
  }

  update(id: string, data: string, remark: string, args: Arg[]): void {
    this.updateDataItem(id, (item) => {
      item.data = data;
      item.remark = remark;
      item.args = args;
      item.lastUsedTime = Date.now();
      item.updateTime = Date.now();
    });
  }

  updateLastUsedTime(id: string): void {
    this.updateDataItem(id, (item) => {
      item.lastUsedTime = Date.now();
    });
  }

  delete(id: string): void {
    const filePath = this.getFilePath();
    const nowTimestamp = Date.now();

    const dataStructure = this.readFile(filePath);

    const itemIndex = dataStructure.data.findIndex((item) => item.id === id);
    if (itemIndex === -1) {
      throw new Error(`Data item with id ${id} not found`);
    }

    dataStructure.data.splice(itemIndex, 1);
    dataStructure.updateTime = nowTimestamp;

    this.writeFile(filePath, dataStructure);
  }

  private readFile(filePath: string): GeneratedInterface {
    try {
      const fileContent = fs.readFileSync(filePath, "utf-8");
      return JSON.parse(fileContent);
    } catch (error) {
      throw new Error(`Failed to read or parse JSON file: ${error}`);
    }
  }

  private writeFile(filePath: string, data: GeneratedInterface): void {
    try {
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    } catch (error) {
      throw new Error(`Failed to write to JSON file: ${error}`);
    }
  }
}

export function createDataSource(filePath: string): DataSource {
  return new FileDataSource(filePath);
}
