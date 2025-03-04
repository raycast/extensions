import axios from "axios";
import * as yaml from "js-yaml";
import Ajv from "ajv";

export type DataType = "ports" | "userstyles";

const ajv = new Ajv();

const DATA_LOCATIONS = {
  ports: {
    repository: "catppuccin/catppuccin",
    yaml_path: "resources/ports.yml",
    schema_path: "resources/ports.schema.json",
    fallback_hash: "a1ce9a7c29c6aa323f43caa88f21bf51faa91c3a",
  },
  userstyles: {
    repository: "catppuccin/userstyles",
    yaml_path: "scripts/userstyles.yml",
    schema_path: "scripts/userstyles.schema.json",
    fallback_hash: "4ee2fffe0492ec2be6d744f770a1cdaa98226d44",
  },
};

const getURL = (type: DataType, version: "main" | "fallback", schema: boolean = false): string => {
  const locations = DATA_LOCATIONS[type];
  return `https://raw.githubusercontent.com/${locations.repository}/${version == "fallback" ? locations.fallback_hash : version}/${schema ? locations.schema_path : locations.yaml_path}`;
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
      fetchSchema(getURL(type, "main", true)),
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

export { fetchData };
