import axios from "axios";

const jsdelivrClient = axios.create({
  baseURL: "https://cdn.jsdelivr.net/gh/iconify/icon-sets",
});

const iconifyClient = axios.create({
  baseURL: "https://api.iconify.design",
});

type SetCategory =
  | "General"
  | "Emoji"
  | "Brands / Social"
  | "Maps / Flags"
  | "Thematic"
  | "Archive / Unmaintained"
  | "";

interface SetResponse {
  name: string;
  total: number;
  author: {
    name: string;
    url: string;
  };
  license: {
    title: string;
    spdx: string;
    url: string;
  };
  samples: string[];
  category: SetCategory | undefined;
  palette: boolean;
  hidden: boolean | undefined;
}

interface Set {
  id: string;
  name: string;
  category: SetCategory;
}

interface IconResponse {
  prefix: string;
  icons: Record<
    string,
    {
      body: string;
    }
  >;
  width: number;
  height: number;
}

interface Icon {
  set: {
    id: string;
    title: string;
  };
  id: string;
  width: number;
  height: number;
  body: string;
}

interface QueryResponse {
  icons: string[];
  collections: Record<string, SetResponse>;
}

class Service {
  async listSets(): Promise<Set[]> {
    const response = await jsdelivrClient.get<Record<string, SetResponse>>("/collections.json");
    const ids = Object.keys(response.data);
    return ids
      .map((id) => {
        const { name, category } = response.data[id];
        return {
          id,
          name,
          category: category as SetCategory,
        };
      })
      .filter((icon) => {
        const { hidden } = response.data[icon.id];
        return !hidden;
      });
  }

  async listIcons(setId: string, setTitle: string): Promise<Icon[]> {
    const response = await jsdelivrClient.get<IconResponse>(`/json/${setId}.json`);
    const ids = Object.keys(response.data.icons);
    return ids.map((id) => {
      const icon = response.data.icons[id];
      return {
        set: {
          id: setId,
          title: setTitle,
        },
        id,
        width: response.data.width,
        height: response.data.height,
        body: icon.body,
      };
    });
  }

  async getIcons(setId: string, setTitle: string, ids: string[]): Promise<Icon[]> {
    const response = await iconifyClient.get<IconResponse>(`${setId}.json`, {
      params: {
        icons: ids.join(","),
      },
    });
    return ids
      .filter((id) => response.data.icons[id] !== undefined)
      .map((id) => {
        const icon = response.data.icons[id];
        return {
          set: {
            id: setId,
            title: setTitle,
          },
          id,
          width: response.data.width,
          height: response.data.height,
          body: icon.body,
        };
      });
  }

  async queryIcons(query: string): Promise<Icon[]> {
    if (!query) {
      return [];
    }
    // make a search query
    const response = await iconifyClient.get<QueryResponse>(`/search`, {
      params: {
        query,
        limit: 100,
      },
    });
    // group by set
    const setMap: Record<string, string[]> = {};
    for (const icon of response.data.icons) {
      const [setId, id] = icon.split(":");
      if (!setMap[setId]) {
        setMap[setId] = [];
      }
      setMap[setId].push(id);
    }
    // fetch icons of each set
    const icons: Icon[] = [];
    for (const setId in setMap) {
      const ids = setMap[setId];
      const set = response.data.collections[setId];
      const setIcons = await this.getIcons(setId, set.name, ids);
      for (const setIcon of setIcons) {
        icons.push(setIcon);
      }
    }
    return icons;
  }
}

export default Service;

export type { Set, Icon };
