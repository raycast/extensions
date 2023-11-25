import fetch from "node-fetch";
import { getPreferenceValues } from "@raycast/api";
import { hasStringProp, hasObjectProp, assertArrayProp } from "./typeUtils";

interface Preferences {
  cookie: string;
  spaceID: string;
}

export type QueryResultItem = {
  id: string;
  title: string;
  subtitle: string;
  fileId: string;
  accessoryTitle: string;
  icon: string;
};

const parseRepositoryItem = (data: any) => {
  const results = data.results;
  function parseItems(other_data: any) {
    return function (item: any) {
      const page_icon = !hasObjectProp(other_data[`${item.id}`]["value"], "format")
        ? ""
        : hasStringProp(other_data[`${item.id}`]["value"]["format"], "page_icon")
        ? `${other_data[`${item.id}`]["value"]["format"]["page_icon"]}`
        : "";
      const acc_title = hasStringProp(item.highlight, "pathText")
        ? `${item.highlight.pathText}`
            .replace(/<\/gzkNfoUU>/g, "")
            .replace(/<gzkNfoUU>/g, "")
            .substring(0, 40)
        : "";
      const reg_title = hasObjectProp(other_data[`${item.id}`]["value"], "properties")
        ? other_data[`${item.id}`]["value"]["properties"]["title"]["0"]["0"]
        : hasStringProp(item.highlight, "text")
        ? `${item.highlight.text}`.replace(/<gzkNfoUU>/g, "").replace(/<\/gzkNfoUU>/g, "")
        : acc_title;
      return {
        id: `${item.id}`,
        title: `${reg_title}`,
        subtitle: "",
        fileId: `${item.id}`.replace(/-/g, ""),
        accessoryTitle: acc_title,
        icon: page_icon,
      };
    };
  }

  const r = results.map(parseItems(data.recordMap.block));
  // console.log(r);
  return r;
};

export const searchResources = async (query: string): Promise<QueryResultItem[]> => {
  const preferences: Preferences = getPreferenceValues();
  const requestOptions = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "notion-client-version": "23.9.0.33",
      cookie: `${preferences.cookie}`,
    },
    body: JSON.stringify({
      type: "BlocksInSpace",
      query,
      spaceId: `${preferences.spaceID}`,
      limit: 20,
      filters: {
        isDeletedOnly: false,
        excludeTemplates: false,
        isNavigableOnly: true,
        requireEditPermissions: false,
        ancestors: [],
        createdBy: [],
        editedBy: [],
        lastEditedTime: {},
        createdTime: {},
      },
      sort: { field: "relevance" },
      source: "quick_find",
    }),
  };
  const response = await fetch(`https://www.notion.so/api/v3/search`, requestOptions);
  if (response.status !== 200) {
    const data = (await response.json()) as { message?: unknown } | undefined;
    throw new Error(`${data?.message || "Not OK"}`);
  }
  const data = await response.json();
  // console.log(data);
  assertArrayProp(data, "results");
  return parseRepositoryItem(data);
};
