import { stat, readFile, writeFile } from "fs/promises";
import Fuse from "fuse.js";
import fetch from "node-fetch";
import * as utils from "./utils";

export interface MLData {
  [key: string]: MLDataEntry;
}

interface MLDataEntry {
  url: string;
  desc?: string;
}

interface GenericData {
  [key: string]: string;
}

export type QueryResultItem = {
  id: string;
  title: string;
  url: string;
  accessoryTitle: string;
  icon: string;
};

const parseResponse = (item: any): QueryResultItem => {
  const lib: GenericData = {
    torch: "PyTorch",
    pandas: "Pandas",
    numpy: "Numpy",
    plotly: "Matplotbib",
    matplotlib: "Matplotbib",
    mpl_toolkits: "Matplotlib",
    sklearn: "Sci-Kit Learn",
    statsmodels: "Stats Models",
    seaborn: "Seaborn",
    tf: "Tensorflow",
    tfio: "Tensorflow IO",
    tfds: "Tensorflow Dataset",
    tfa: "Tensorflow Additional",
  };
  return {
    id: `${item.item.name}`,
    title: `${item.item.name}`,
    url: `${item.item.value.url}`,
    accessoryTitle: `${item.item.name.split(".")[0] in lib ? lib[item.item.name.split(".")[0]] : item.item.name}`,
    icon: `${item.item.name.split(".")[0] in lib ? item.item.name.split(".")[0] : "command-icon"}.png`,
  };
};

const dataCachePath = utils.cachePath("ml.json");

export const searchResources = async (q: string, filters: string[]): Promise<QueryResultItem[]> => {
  async function getData(): Promise<string> {
    const query = `https://raw.githubusercontent.com/sadanand-singh/mldocs-data/main/data/ml.json`;

    const response = await fetch(query);
    if (response.status !== 200) {
      throw new Error("Not OK");
    }
    const data = await response.text();
    return data;
  }

  async function updateCache(): Promise<MLData> {
    const data = await getData();
    try {
      await writeFile(dataCachePath, data);
    } catch (err) {
      console.error("Failed to write cache:", err);
    }
    return JSON.parse(data);
  }

  async function mtime(path: string): Promise<Date> {
    return (await stat(path)).mtime;
  }

  async function readCache(): Promise<MLData> {
    const cacheTime = await mtime(dataCachePath);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - cacheTime.getTime());

    if (diffTime < 432000000) {
      const cacheBuffer = await readFile(dataCachePath);
      return JSON.parse(cacheBuffer.toString());
    } else {
      throw "Invalid cache";
    }
  }

  let ret: MLData;
  try {
    ret = await readCache();
  } catch {
    ret = await updateCache();
  }

  const d = Object.keys(ret)
    .filter((key) => key.includes("."))
    .filter((key) => filters.some((val) => key.startsWith(val)))
    .map((key) => {
      return { name: key, value: ret[key] };
    });

  const options = {
    includeScore: false,
    ignoreLocation: true,
    threshold: 0.8,
    minMatchCharLength: 3,
    keys: [
      {
        name: "name",
        weight: 0.999,
      },
      {
        name: "value.url",
        weight: 0.001,
      },
    ],
  };
  const fuse = new Fuse(d, options);
  const query = q
    .replace("sns.", "seaborn.")
    .replace("pt.", "matplotlib.")
    .replace("pd.", "pandas.")
    .replace("np.", "numpy.")
    .replace("sm.", "statsmodels.");
  const result = fuse.search(query);
  return result.slice(0, 50).map(parseResponse);
};
