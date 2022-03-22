import axios from 'axios';

const iconSetClient = axios.create({
  baseURL: 'https://icon-sets.iconify.design',
});

const apiClient = axios.create({
  baseURL: 'https://api.iconify.design',
});

type SetCategory =
  | 'General'
  | 'Emoji'
  | 'Brands / Social'
  | 'Maps / Flags'
  | 'Thematic'
  | 'Archive / Unmaintained'
  | '';

interface SetResponse {
  prefix: string;
  name: string;
  total: number;
  version: string;
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
  category: string;
  palette: boolean;
  height: number;
  displayHeight: number;
  hidden: boolean;
}

interface SetListResponse {
  visible: Record<SetCategory, Record<string, SetResponse>>;
  hidden: Record<string, SetResponse>;
}

interface Set {
  id: string;
  name: string;
  count: number;
  category: SetCategory;
}

interface IconQueryResponse {
  icons: string[];
  total: number;
  limit: number;
  start: number;
  collections: Record<string, SetResponse>;
}

interface IconInfoResponse {
  prefix: string;
  total: number;
  title: string;
  uncategorized: string[];
  categories: Record<string, string[]>;
}

interface IconInfo {
  setId: string;
  total: number;
  category: string;
  id: string;
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
  setId: string;
  id: string;
  width: number;
  height: number;
  body: string;
}

class Service {
  async listSets(): Promise<Set[]> {
    const response = await iconSetClient.get<string>('/assets/collections.js');
    const stringIndex = response.data.indexOf('{');
    const string = response.data.substring(
      stringIndex,
      response.data.length - 2,
    );
    const list = JSON.parse(string) as SetListResponse;
    const sets: Set[] = [];
    for (const categoryId in list.visible) {
      const category = categoryId as SetCategory;
      const categorySets = list.visible[category];
      for (const id in categorySets) {
        const set = categorySets[id];
        const { prefix, name, total } = set;
        sets.push({
          id: prefix,
          name,
          count: total,
          category,
        });
      }
    }
    return sets;
  }

  async queryIcons(set: string, query: string): Promise<string[]> {
    const response = await apiClient.get<IconQueryResponse>('/search', {
      params: {
        query,
        collection: set,
        limit: 100,
      },
    });
    return response.data.icons.map((icon) => icon.split(':')[1]);
  }

  async listIcons(set: string): Promise<IconInfo[]> {
    const response = await apiClient.get<IconInfoResponse>('/collection', {
      params: {
        prefix: set,
        info: true,
        chars: true,
        aliases: true,
      },
    });
    const list: IconInfo[] = [];
    const { total, uncategorized, categories } = response.data;
    for (const id of uncategorized) {
      list.push({
        setId: set,
        total,
        category: '',
        id,
      });
    }
    for (const category in categories) {
      const categoryIcons = categories[category];
      for (const id of categoryIcons) {
        list.push({
          setId: set,
          total,
          category,
          id,
        });
      }
    }
    return list;
  }

  async getIcons(set: string, ids: string[]) {
    const response = await apiClient.get<IconResponse>(`/${set}.json`, {
      params: {
        icons: ids.join(','),
      },
    });
    const { width, height } = response.data;
    const icons = ids.map((id) => {
      const { body } = response.data.icons[id];
      return {
        setId: set,
        id,
        width,
        height,
        body,
      };
    });
    return icons;
  }
}

export default Service;

export type { Set, IconInfo, Icon };
