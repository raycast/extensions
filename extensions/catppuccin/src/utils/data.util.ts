/* eslint-disable @typescript-eslint/no-explicit-any */
import axios from "axios";

export type DataType = "ports" | "categories" | "collaborators" | "showcases" | "userstyles";

const API_BASE_URL = "https://catppuccin.dvh.sh";
const dataCache: { [key in DataType]?: any } = {};

export const fetchData = async <T>(type: DataType): Promise<Record<string, T>> => {
  if (dataCache[type]) {
    return dataCache[type];
  }

  try {
    let allData: T[] = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      const response = await axios.get(`${API_BASE_URL}/${type}?page=${page}&per_page=100`);

      if (response.data && Array.isArray(response.data)) {
        allData = [...allData, ...response.data];
        hasMore = false;
      } else if (response.data && response.data[type]) {
        if (Array.isArray(response.data[type])) {
          allData = [...allData, ...response.data[type]];
        } else {
          const items = Object.entries(response.data[type]).map(([key, value]: [string, any]) => ({
            ...value,
            identifier: key,
          }));
          allData = [...allData, ...items];
        }

        if (response.data.pagination) {
          hasMore = page < response.data.pagination.total_pages;
        } else {
          hasMore = false;
        }
      } else {
        hasMore = false;
      }

      page++;
    }

    const dataObject: Record<string, T> = {};
    allData.forEach((item: any) => {
      const key = item.identifier || item.key || item.username || item.title || item.name || item.id;
      if (key) {
        dataObject[key] = item;
      }
    });

    dataCache[type] = dataObject;
    return dataObject;
  } catch (error) {
    throw new Error(`Failed to fetch ${type}: ${(error as Error).message}`);
  }
};

export const getApiHealth = async (): Promise<boolean> => {
  try {
    const { data } = await axios.get(`${API_BASE_URL}/health`);
    return data.status === "healthy" || data.status === "ok";
  } catch {
    return false;
  }
};

export const clearCache = () => {
  Object.keys(dataCache).forEach((key) => {
    delete dataCache[key as DataType];
  });
};
