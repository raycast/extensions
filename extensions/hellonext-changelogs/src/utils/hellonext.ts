import { getPreferenceValues, showToast, Toast } from "@raycast/api";
import axios from "axios";

export const hellonextApiKey = getPreferenceValues().hellonext_api_key;

// Do an api call with api_key in headers and get changelogs with axios
export async function getChangelogs(): Promise<[]> {
  axios.defaults.headers.common["api_key"] = hellonextApiKey;
  return await axios
    .get("https://gateway.hellonext.co/api/v3/changelogs?status=published")
    .then((response) => response.data.changelogs)
    .catch(() => {
      showToast(Toast.Style.Failure, "Check your API key!");
      return [];
    });
}

export interface User {
  email: string;
  name: string;
}

export interface Label {
  id: number;
  name: string;
  color: string;
}

export interface Changelog {
  id: number;
  title: string;
  description: string;
  description_markdown: string;
  preview: string;
  url: string;
  published: boolean;
  published_on: string;
  author: User;
  labels: Label[];
}
