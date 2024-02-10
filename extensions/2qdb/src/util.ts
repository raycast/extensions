/* eslint-disable @typescript-eslint/no-explicit-any */
import { LocalStorage } from "@raycast/api";
import { IConfigDB, ILocalStorage, IQueryHistory } from "./interface";
import { DATABASE_TYPE, LOCAL_STORAGE_TYPE } from "@src/constants";

// Get all configuration items from localStorage
export const getAllConfig = async (
  type: LOCAL_STORAGE_TYPE = LOCAL_STORAGE_TYPE.CONFIG_DATA
): Promise<ILocalStorage[]> => {
  const storedConfig = await LocalStorage.getItem(type);
  return storedConfig
    ? (JSON.parse(storedConfig as string) as ILocalStorage[])
    : [];
};

export const createConfig = async (
  newValue: ILocalStorage,
  type: LOCAL_STORAGE_TYPE
): Promise<boolean> => {
  try {
    const configArray = await getAllConfig(type);
    configArray.push(newValue);
    LocalStorage.setItem("configData", JSON.stringify(configArray));

    return true;
  } catch (error) {
    return false;
  }
};

// Get a single configuration item by index
export const getConfig = async (
  index: number,
  type: LOCAL_STORAGE_TYPE
): Promise<IConfigDB | IQueryHistory | any> => {
  const configArray = await getAllConfig(type);
  return index >= 0 && index < configArray.length ? configArray[index] : null;
};

// Get a single configuration item by id
export const getConfigWithID = async (
  id: string,
): Promise<IConfigDB | undefined> => {
  const configArray = await getAllConfig(LOCAL_STORAGE_TYPE.CONFIG_DATA);
  const foundConfig = configArray.find(item=>item.id == id) as IConfigDB
  return foundConfig;
};

// Get a single configuration item by index
export const getDefaultConfig = async (
  type: LOCAL_STORAGE_TYPE
): Promise<IConfigDB | null> => {
  const configArray = (await getAllConfig(type)) as IConfigDB[];
  const foundDefaultConfig = configArray.find(item => item.isDefault);
  return foundDefaultConfig || null;
};

// Update a configuration item by index
export const updateConfig = async (
  id: string,
  updatedConfig: IConfigDB,
  type: LOCAL_STORAGE_TYPE
): Promise<boolean> => {
  const configArray = await getAllConfig(type);
  const index = configArray.findIndex(item => item.id == id);
  if (index >= 0 && index < configArray.length) {
    configArray[index] = updatedConfig;
    LocalStorage.setItem(type, JSON.stringify(configArray));
    return true;
  }
  return false;
};

// Delete a configuration item by index
export const deleteConfig = async (
  index: number,
  type: LOCAL_STORAGE_TYPE
): Promise<boolean> => {
  const configArray = await getAllConfig(type);
  if (index >= 0 && index < configArray.length) {
    configArray.splice(index, 1);
    LocalStorage.setItem("configData", JSON.stringify(configArray));
    return true;
  }
  return false;
};

// Delete all configuration contnection
export const deleteAllConfig = async () => {
  await LocalStorage.removeItem("configData");
  return;
};

// Search configuration items by a specific property value
export const searchConfig = async (
  property: keyof IConfigDB,
  value: string,
  type: LOCAL_STORAGE_TYPE
): Promise<IConfigDB[] | any> => {
  const configArray = await getAllConfig(type);
  return configArray.filter((item:any) =>
    item[property].toString().toLowerCase().includes(value.toLowerCase())
  );
};

export const truncate = (str: string, n: number) => {
  if (!str) {
    return "";
  }
  return str.length > n ? `${str.substr(0, n - 1)}...` : str;
};

export const generateUUID = () => {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

export const checkDatabaseExists = async (
  config: IConfigDB,
  type: LOCAL_STORAGE_TYPE
): Promise<boolean> => {
  const configArray = (await getAllConfig(type)) as IConfigDB[];
  return configArray.some(
    item =>
      item.database === config.database &&
      item.user === config.user &&
      item.host === config.host &&
      item.password == config.password &&
      item.databaseType == config.databaseType
  );
};

export const buildDatabaseIcon = (databaseType: string) => {
  const database = DATABASE_TYPE.find(item => item.value == databaseType);
  return database?.icon || "mysql.png";
};

function isValidJSON(value: any) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
// Function to create a row with formatted columns
function createRow(columns:any, widths:any) {
  return `| ${columns
    .map((col:any, index:number) => {
      const isJsonValue = isValidJSON(col);

      const colValue = isJsonValue
        ? JSON.stringify(col)
        : col.toString().padEnd(widths[index]);

      return colValue;
    })
    .join(" | ")} |`;
}

// Function to create a separator row
function createSeparator(widths:any[]) {
  return `|${widths.map(width => "-".repeat(width)).join("|")}|`;
}

const convertNullToString = (obj:any) => {
  for (const prop in obj) {
    if (obj[prop] === null) {
      obj[prop] = "null";
    }
  }
};

export const convertArrayToTableString = (data: any[]) => {
  if (data?.length==0) {
    return '0 record';
  }

  data.forEach(item => convertNullToString(item));
  const headers = Object.keys(data[0]);

  // Calculate column widths
  const columnWidths = headers.map(header =>
    Math.max(
      ...data.map(item => (item[header] || "").toString().length),
      header.length
    )
  );

  // Create header row
  const headerRow = createRow(headers, columnWidths);

  // Create separator row
  const separatorRow = createSeparator(columnWidths);

  // Create data rows
  const dataRows = data.map(item =>
    createRow(
      headers.map(header => item[header]),
      columnWidths
    )
  );

  // Construct the Markdown table
  const markdownTable = `${headerRow}\n${separatorRow}\n${dataRows.join("\n")}`;

  return markdownTable;
};
