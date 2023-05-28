import fetch from "node-fetch";
import {useCachedPromise} from "@raycast/utils";

const API_URL = 'https://cht.sh';

function getCheatsheetList(url: string) {
  const { isLoading, data } = useCachedPromise(
    async (url: string) => {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const result = await response.text();
      return result.split("\n");
    },
    [`${API_URL}${url}/:list`],
    { initialData: [] }
  )
  let tmp = data as string[]
  tmp = tmp
    .filter((name) => name && !name.includes(":") && !name.includes("/"))
  return { isLoading, data: tmp };
}

function searchCheatsheet(url: string, search: string, count: number) {
  search = search.replace(" ", "+")
  const { isLoading, data } = useCachedPromise(
    async (url: string) => {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.text();
    },
    [`${API_URL}${url}/${search}/${count}?T`],
    { initialData: "" }
  )
  const tmp = data as string
  return { isLoading, data: tmp };
}


export {
  getCheatsheetList,
  searchCheatsheet
}