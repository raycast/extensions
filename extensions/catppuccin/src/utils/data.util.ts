import axios from "axios";
import * as yaml from "js-yaml";
import Ajv from "ajv";

type DataType = "ports" | "styles";

const ajv = new Ajv();

const BASE_URLS = {
  ports: "https://raw.githubusercontent.com/catppuccin/catppuccin",
  styles: "https://raw.githubusercontent.com/catppuccin/userstyles",
};

const FILE_PATHS = {
  ports: {
    main: "/main/resources/ports.yml",
    fallback: "/a1ce9a7c29c6aa323f43caa88f21bf51faa91c3a/resources/ports.yml",
    schema: "/main/resources/ports.schema.json",
  },
  styles: {
    main: "/main/scripts/userstyles.yml",
    fallback: "/4ee2fffe0492ec2be6d744f770a1cdaa98226d44/scripts/userstyles.yml",
    schema: "/main/scripts/userstyles.schema.json",
  },
};

const getURL = (type: DataType, version: "main" | "fallback" | "schema"): string => {
  return `${BASE_URLS[type]}${FILE_PATHS[type][version]}`;
};

const dataCache: { [key in DataType]?: unknown } = {};

const fetchYAML = async (url: string): Promise<unknown> => {
  const res = await axios.get(url);
  return yaml.load(res.data);
};

const fetchSchema = async (url: string): Promise<unknown> => {
  const res = await axios.get(url);
  return res.data;
};

const validateSchema = <T>(data: unknown, schema: unknown): data is T => {
  const validate = ajv.compile<T>(schema);
  return validate(data);
};

const fetchData = async <T>(type: DataType): Promise<T> => {
  if (dataCache[type]) {
    return dataCache[type] as T;
  }

  try {
    const [dataJSON, schema] = await Promise.all([
      fetchYAML(getURL(type, "main")),
      fetchSchema(getURL(type, "schema")),
    ]);

    if (!validateSchema<T>(dataJSON, schema)) {
      const fallbackData = await fetchYAML(getURL(type, "fallback"));
      if (!validateSchema<T>(fallbackData, schema)) {
        throw new Error("Data validation failed for both main and fallback data.");
      }
      dataCache[type] = fallbackData;
      return fallbackData as T;
    }
    dataCache[type] = dataJSON;
    return dataJSON as T;
  } catch (error) {
    throw new Error(`Failed to fetch data: ${(error as Error).message}`);
  }
};

const isValidUrl = (url: string) => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

export { fetchData, isValidUrl };
