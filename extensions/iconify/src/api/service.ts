import { IconResponse, DataIcon, SetResponse, DataSet, SetCategory } from "../types";

export const JSDELIVR_BASE_URL = "https://cdn.jsdelivr.net";
export const ICONIFY_BASE_URL = "https://api.iconify.design";

export function createURL(baseURL: string, path: string, params?: Record<string, string>): string {
  const url = new URL(path, baseURL).toString();

  if (params) {
    const queryString = new URLSearchParams(params).toString();
    return url + `?${queryString}`;
  }

  return url;
}

type FetchJSONOpts = {
  params?: Record<string, string>;
  signal?: AbortSignal;
};

async function fetchJSON<T>(baseURL: string, path: string, { params, signal }: FetchJSONOpts = {}): Promise<T> {
  const url = createURL(baseURL, path, params);

  const response = await fetch(url, {
    signal,
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return response.json() as T;
}

export const listIcons = async (setId: string, setTitle: string, signal?: AbortSignal): Promise<DataIcon[]> => {
  const data = await fetchJSON<IconResponse>(JSDELIVR_BASE_URL, `/gh/iconify/icon-sets/json/${setId}.json`, { signal });
  const ids = Object.keys(data.icons);
  return ids.map((id) => {
    const icon = data.icons[id];
    return {
      set: {
        id: setId,
        title: setTitle,
      },
      id,
      width: data.width,
      height: data.height,
      body: icon.body,
    };
  });
};

export const listSets = async (signal?: AbortSignal): Promise<DataSet[]> => {
  const data = await fetchJSON<Record<string, SetResponse>>(
    JSDELIVR_BASE_URL,
    "/gh/iconify/icon-sets/collections.json",
    { signal },
  );
  const ids = Object.keys(data);
  return ids
    .map((id) => {
      const { name, category } = data[id];
      return {
        id,
        name,
        category: category as SetCategory,
      };
    })
    .filter((icon) => {
      const { hidden } = data[icon.id];
      return !hidden;
    });
};

export const getIcons = async (
  setId: string,
  setTitle: string,
  ids: string[],
  signal?: AbortSignal,
): Promise<DataIcon[]> => {
  const data = await fetchJSON<IconResponse>(ICONIFY_BASE_URL, `/${setId}.json`, {
    params: {
      icons: ids.join(","),
    },
    signal,
  });
  return ids
    .filter((id) => data.icons[id] !== undefined)
    .map((id) => {
      const icon = data.icons[id];
      return {
        set: {
          id: setId,
          title: setTitle,
        },
        id,
        width: data.width,
        height: data.height,
        body: icon.body,
      };
    });
};
