import { LocalStorage } from "@raycast/api";
import { baseHeaders } from "./constants";
import axios from "axios";

export async function getAuthHeaders() {
  const sessionSecret = await LocalStorage.getItem<string>("sessionSecret");
  return {
    ...baseHeaders,
    "expo-session": sessionSecret || "",
    cookie: `io.expo.auth.sessionSecret=${encodeURIComponent(sessionSecret || "")};`,
  };
}

export function isObjectEmpty(obj: object): boolean {
  return Object.keys(obj).length === 0;
}

export function changeCase(
  inputString: string,
  targetCasing: "lower" | "upper" | "title" | "sentence" | "camel" | "kebab" | "snake",
): string {
  try {
    switch (targetCasing) {
      case "lower":
        return inputString.toLowerCase();
      case "upper":
        return inputString.toUpperCase();
      case "title":
        return inputString.replace(/\b\w/g, (char) => char.toUpperCase());
      case "sentence":
        return inputString.charAt(0).toUpperCase() + inputString.slice(1).toLowerCase();
      case "camel":
        return inputString.replace(/[-_\s]+(.)?/g, (_match, char) => (char ? char.toUpperCase() : ""));
      case "kebab":
        return inputString.replace(/\s+/g, "-").toLowerCase();
      case "snake":
        return inputString.replace(/\s+/g, "_").toLowerCase();
      default:
        return inputString;
    }
  } catch (e) {
    return inputString;
  }
}

export function humanDateTime(date: Date): string {
  const options: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  };

  return date.toLocaleDateString("en-US", options);
}

export async function fetchUrls(urls: string[]): Promise<string> {
  try {
    const responses = await Promise.all(
      urls.map(async (url) => {
        const response = await axios.get(url, {
          method: "get",
          maxBodyLength: Infinity,
          responseType: "text",
        });
        return response.data;
      }),
    );
    return responses.join("");
  } catch (error) {
    console.error("Error fetching URLs:", error);
    throw error;
  }
}

export function groupBy<T>(array: T[], key: keyof T): Record<string, T[]> {
  return array.reduce(
    (result, item) => {
      const groupKey = String(item[key]);
      if (!result[groupKey]) {
        result[groupKey] = [];
      }
      result[groupKey].push(item);
      return result;
    },
    {} as Record<string, T[]>,
  );
}

export function stripHTMLTags(str: string) {
  if (str === null || str === "") {
    return false;
  } else {
    str = str.toString();
    return str.replace(/<[^>]*>/g, "");
  }
}
