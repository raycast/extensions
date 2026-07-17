import { createDataSource } from "../src/datasource";
import fs from "fs";
import path from "path";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
const TEST_FOLDER = "__tests__";

describe("FileDataSource", () => {
  const filePath = path.join(TEST_FOLDER, "test_folder", "test.json");
  let dataSource;

  beforeEach(() => {
    dataSource = createDataSource(filePath);
    const folderPath = path.dirname(filePath);
    if (fs.existsSync(folderPath)) {
      fs.rmSync(folderPath, { recursive: true, force: true });
    }
  });

  afterEach(() => {
    const folderPath = path.dirname(filePath);
    if (fs.existsSync(folderPath)) {
      fs.rmSync(folderPath, { recursive: true, force: true });
    }
  });

  test("FileDataSource constructor should create a file with an empty data structure", () => {
    dataSource = createDataSource(filePath);

    expect(fs.existsSync(filePath)).toBe(true);

    const fileContent = fs.readFileSync(filePath, "utf-8");
    const parsedContent = JSON.parse(fileContent);

    const currentTimestamp = Date.now();
    expect(parsedContent).toHaveProperty("createTime");
    expect(parsedContent).toHaveProperty("updateTime");
    expect(parsedContent.createTime).toBeLessThanOrEqual(currentTimestamp);
    expect(parsedContent.updateTime).toBeLessThanOrEqual(currentTimestamp);
    expect(Object.keys(parsedContent)).toEqual(["data", "createTime", "updateTime"]);
  });

  test("FileDataSource constructor should create the folder if it does not exist", () => {
    dataSource = createDataSource(filePath);

    const folderPath = path.dirname(filePath);
    expect(fs.existsSync(folderPath)).toBe(true);
  });

  test("FileDataSource constructor should throw an error if it fails to create the file", () => {
    const invalidFilePath = "/invalid_folder_path/test.json";

    expect(() => {
      createDataSource(invalidFilePath);
    }).toThrow();
  });

  test("parseDatasourceFile should parse the datasource file correctly", () => {
    const dataStructure = {
      data: [
        {
          data: "sample data",
          remark: "sample remark",
          id: "1",
          createTime: 1234567890,
          updateTime: 1234567890,
          lastUsedTime: 1234567890,
          args: [],
        },
      ],
      createTime: 1234567890,
      updateTime: 1234567890,
    };

    fs.writeFileSync(filePath, JSON.stringify(dataStructure, null, 2));

    const parsedContent = dataSource.parseDatasourceFile();

    expect(parsedContent).toEqual(dataStructure);
  });

  test("parseDatasourceFile should throw an error if the file does not exist", () => {
    fs.rmSync(filePath);
    expect(() => {
      dataSource.parseDatasourceFile();
    }).toThrow("Failed to read or parse JSON file: Error: ENOENT: no such file or directory");
  });

  test("parseDatasourceFile should throw an error if the file content is invalid JSON", () => {
    fs.writeFileSync(filePath, "invalid json content");

    expect(() => {
      dataSource.parseDatasourceFile();
    }).toThrow("Failed to read or parse JSON file: SyntaxError: Unexpected token");
  });

  test("sortDataByTimestamps should sort data items correctly", () => {
    const dataStructure = {
      data: [
        {
          data: "data1",
          remark: "remark1",
          id: "1",
          createTime: 1000,
          updateTime: 2000,
          lastUsedTime: 3000,
          args: [],
        },
        {
          data: "data2",
          remark: "remark2",
          id: "2",
          createTime: 1500,
          updateTime: 2500,
          lastUsedTime: undefined,
          args: [],
        },
        {
          data: "data3",
          remark: "remark3",
          id: "3",
          createTime: 2000,
          updateTime: 3000,
          lastUsedTime: 3000,
          args: [],
        },
      ],
      createTime: 1000,
      updateTime: 3000,
    };

    const sortedData = dataSource.sortDataByTimestamps(dataStructure);

    expect(sortedData).toEqual([
      {
        data: "data3",
        remark: "remark3",
        id: "3",
        createTime: 2000,
        updateTime: 3000,
        lastUsedTime: 3000,
        args: [],
      },
      {
        data: "data1",
        remark: "remark1",
        id: "1",
        createTime: 1000,
        updateTime: 2000,
        lastUsedTime: 3000,
        args: [],
      },
      {
        data: "data2",
        remark: "remark2",
        id: "2",
        createTime: 1500,
        updateTime: 2500,
        lastUsedTime: undefined,
        args: [],
      },
    ]);
  });

  test("sortDataByTimestamps should handle edge cases", () => {
    const dataStructure = {
      data: [
        {
          data: "data1",
          remark: "remark1",
          id: "1",
          createTime: 1000,
          updateTime: 2000,
          lastUsedTime: 2000,
          args: [],
        },
        {
          data: "data2",
          remark: "remark2",
          id: "2",
          createTime: 1500,
          updateTime: 2000,
          lastUsedTime: 2000,
          args: [],
        },
        {
          data: "data3",
          remark: "remark3",
          id: "3",
          createTime: 2000,
          updateTime: 2000,
          lastUsedTime: 2000,
          args: [],
        },
      ],
      createTime: 1000,
      updateTime: 2000,
    };

    const sortedData = dataSource.sortDataByTimestamps(dataStructure);

    expect(sortedData).toEqual([
      {
        data: "data3",
        remark: "remark3",
        id: "3",
        createTime: 2000,
        updateTime: 2000,
        lastUsedTime: 2000,
        args: [],
      },
      {
        data: "data2",
        remark: "remark2",
        id: "2",
        createTime: 1500,
        updateTime: 2000,
        lastUsedTime: 2000,
        args: [],
      },
      {
        data: "data1",
        remark: "remark1",
        id: "1",
        createTime: 1000,
        updateTime: 2000,
        lastUsedTime: 2000,
        args: [],
      },
    ]);
  });

  const initialDataStructure = {
    data: [
      {
        data: "data1",
        remark: "remark1",
        id: "1",
        createTime: 1234567890,
        updateTime: 1234567891,
        lastUsedTime: 1234567891,
        args: [],
      },
      {
        data: "data2",
        remark: "remark2",
        id: "2",
        createTime: 1234567890,
        updateTime: 1234567893,
        lastUsedTime: 1234567891,
        args: [],
      },
    ],
    createTime: 1234567890,
    updateTime: 1234567890,
  };

  beforeEach(() => {
    const folderPath = path.dirname(filePath);
    if (fs.existsSync(folderPath)) {
      fs.rmSync(folderPath, { recursive: true, force: true });
    }
    fs.mkdirSync(folderPath, { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(initialDataStructure, null, 2));
  });

  test("add should add a new data item", () => {
    const newData = "newData";
    const newRemark = "newRemark";
    const newArgs = [{ name: "arg1", value: "value1" }];

    dataSource.add(newData, newRemark, newArgs);

    const updatedDataStructure = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    const newItem = updatedDataStructure.data.find((item) => item.data === newData);

    expect(newItem).toBeDefined();
    expect(newItem.data).toBe(newData);
    expect(newItem.remark).toBe(newRemark);
    expect(newItem.args).toEqual(newArgs);
    expect(updatedDataStructure.data.length).toBe(3);
  });

  test("add should update the updateTime of the data structure", () => {
    const newData = "newData";
    const newRemark = "newRemark";
    const newArgs = [{ name: "arg1", value: "value1" }];

    const beforeAddDataStructure = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    const beforeUpdateTime = beforeAddDataStructure.updateTime;

    dataSource.add(newData, newRemark, newArgs);

    const afterAddDataStructure = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    const afterUpdateTime = afterAddDataStructure.updateTime;

    expect(afterUpdateTime).toBeGreaterThan(beforeUpdateTime);
  });

  test("update should update the data item by id", () => {
    const update = {
      data: "updatedData1",
      remark: "updatedRemark1",
      id: "1",
      createTime: 1234567890,
      updateTime: 0, // will be updated in the function
      lastUsedTime: 0, // will be updated in the function
      args: [{ name: "updatedArg", value: "updatedValue" }],
    };

    dataSource.update(update.id, update.data, update.remark, update.args);

    const updatedDataStructure = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    const updatedDataItem = updatedDataStructure.data.find((item) => item.id === update.id);

    expect(updatedDataItem).toMatchObject({
      data: "updatedData1",
      remark: "updatedRemark1",
      id: "1",
      createTime: 1234567890,
      args: [{ name: "updatedArg", value: "updatedValue" }],
    });
    expect(updatedDataItem.updateTime).not.toBe(0);
    expect(updatedDataItem.lastUsedTime).not.toBe(0);
  });

  test("update should throw an error if the data item id is not found", () => {
    const update = {
      data: "nonExistentData",
      remark: "nonExistentRemark",
      id: "nonExistentId",
      createTime: 1234567890,
      updateTime: 0,
      lastUsedTime: 0,
      args: [],
    };

    expect(() => {
      dataSource.update(update.id, update.data, update.remark, update.args);
    }).toThrow(`Data item with id ${update.id} not found`);
  });

  beforeEach(() => {
    const folderPath = path.dirname(filePath);
    if (fs.existsSync(folderPath)) {
      fs.rmSync(folderPath, { recursive: true, force: true });
    }
    fs.mkdirSync(folderPath, { recursive: true });

    const initialDataStructure = {
      data: [
        {
          data: "data1",
          remark: "remark1",
          id: "1",
          createTime: 1234567890,
          updateTime: 1234567890,
          lastUsedTime: 1234567890,
          args: [],
        },
        {
          data: "data2",
          remark: "remark2",
          id: "2",
          createTime: 1234567891,
          updateTime: 1234567891,
          lastUsedTime: 1234567891,
          args: [],
        },
      ],
      createTime: 1234567890,
      updateTime: 1234567890,
    };

    fs.writeFileSync(filePath, JSON.stringify(initialDataStructure, null, 2));
  });

  test("updateLastUsedTime should update the lastUsedTime of a specific data item", () => {
    const idToUpdate = "1";
    const beforeUpdate = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    const beforeLastUsedTime = beforeUpdate.data.find((item) => item.id === idToUpdate).lastUsedTime;

    dataSource.updateLastUsedTime(idToUpdate);

    const afterUpdate = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    const afterLastUsedTime = afterUpdate.data.find((item) => item.id === idToUpdate).lastUsedTime;

    expect(afterLastUsedTime).toBeGreaterThan(beforeLastUsedTime);
  });

  test("updateLastUsedTime should throw an error if the data item id is not found", () => {
    const nonExistentId = "nonExistentId";

    expect(() => {
      dataSource.updateLastUsedTime(nonExistentId);
    }).toThrow(`Data item with id ${nonExistentId} not found`);
  });

  test("updateLastUsedTime should update the updateTime of the data structure", () => {
    const idToUpdate = "1";
    const beforeUpdate = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    const beforeUpdateTime = beforeUpdate.updateTime;

    dataSource.updateLastUsedTime(idToUpdate);

    const afterUpdate = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    const afterUpdateTime = afterUpdate.updateTime;

    expect(afterUpdateTime).toBeGreaterThan(beforeUpdateTime);
  });

  test("delete should delete the data item by id", () => {
    const idToDelete = "1";

    dataSource.delete(idToDelete);

    const updatedDataStructure = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    const deletedDataItem = updatedDataStructure.data.find((item) => item.id === idToDelete);

    expect(deletedDataItem).toBeUndefined();
    expect(updatedDataStructure.data.length).toBe(1);
  });

  test("delete should throw an error if the data item id is not found", () => {
    const nonExistentId = "nonExistentId";

    expect(() => {
      dataSource.delete(nonExistentId);
    }).toThrow(`Data item with id ${nonExistentId} not found`);
  });

  test("delete should update the updateTime of the data structure", () => {
    const idToDelete = "1";

    const beforeDeleteDataStructure = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    const beforeUpdateTime = beforeDeleteDataStructure.updateTime;

    dataSource.delete(idToDelete);

    const afterDeleteDataStructure = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    const afterUpdateTime = afterDeleteDataStructure.updateTime;

    expect(afterUpdateTime).toBeGreaterThan(beforeUpdateTime);
  });

  test("getAll should return all data items sorted by timestamps", () => {
    const allDataItems = dataSource.getAll();

    expect(allDataItems).toEqual([
      {
        data: "data2",
        remark: "remark2",
        id: "2",
        createTime: 1234567891,
        updateTime: 1234567891,
        lastUsedTime: 1234567891,
        args: [],
      },
      {
        data: "data1",
        remark: "remark1",
        id: "1",
        createTime: 1234567890,
        updateTime: 1234567890,
        lastUsedTime: 1234567890,
        args: [],
      },
    ]);
  });

  test("getAll should return an empty array if no data items exist", () => {
    const emptyDataStructure = {
      data: [],
      createTime: 1234567890,
      updateTime: 1234567890,
    };

    fs.writeFileSync(filePath, JSON.stringify(emptyDataStructure, null, 2));

    const allDataItems = dataSource.getAll();

    expect(allDataItems).toEqual([]);
  });
});
