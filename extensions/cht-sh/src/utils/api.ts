import fetch from "node-fetch";
import { useCachedPromise } from "@raycast/utils";

const API_URL = "https://cht.sh";

async function getCheatsheetList(url: string) {
  const data = await fetch(`${API_URL}${url}/:list`).then((res) => res.text());
  const tmp = data.split("\n");
  return tmp.filter((name) => name && !name.includes(":") && !name.includes("/"));
}

function searchCheatsheet(url: string, search: string, count: number) {
  search = search.replace(" ", "+");
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
  );
  const tmp = data as string;
  return { isLoading, data: tmp };
}

export { getCheatsheetList, searchCheatsheet };
