import axios from "axios";
import { LogItem } from "../types/log.types";
import { groupBy } from "../utils";

async function fetchUrls(urls: string[]) {
  try {
    const responses = await Promise.all(
      urls.map(async (url) => {
        const response = await axios.get<string>(url, {
          method: "get",
          maxBodyLength: Infinity,
          responseType: "text",
        });
        return response.data
          .trimEnd()
          .split("\n")
          .filter((item: unknown) => item !== "");
      }),
    );
    return responses;
  } catch (error) {
    console.error("Error fetching URLs:", error);
    throw error;
  }
}

type LogAsArray = [string, LogItem[]];
export type LogGroups = LogAsArray[];

export async function fetchLogs(urls: string[]): Promise<LogGroups> {
  const result = await fetchUrls(urls);
  const logs = result.flat().map((item) => JSON.parse(item)) as LogItem[];
  const grouped = groupBy(logs, "phase");
  const asArray = Object.keys(grouped).map((key) => [key, grouped[key]]);
  return asArray as LogGroups;
}
