import axios from 'axios';

const apiClient = axios.create({
  baseURL: 'https://api.iconify.design',
});

const githubClient = axios.create({
  baseURL: 'https://raw.githubusercontent.com/iconify/icon-sets/master',
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
  info: {
    name: string;
    total: number;
    category: string;
  };
  icons: Record<
    string,
    {
      body: string;
    }
  >;
  width: number;
  height: number;
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
    const response = await githubClient.get<Record<string, SetResponse>>(
      '/collections.json',
    );
    const ids = Object.keys(response.data);
    return ids
      .map((id) => {
        const { name, total, category } = response.data[id];
        return {
          id,
          name,
          count: total,
          category: category as SetCategory,
        };
      })
      .filter((icon) => {
        const { hidden } = response.data[icon.id];
        return !hidden;
      });
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

  async listIcons(set: string): Promise<Icon[]> {
    const response = await githubClient.get<IconInfoResponse>(
      `/json/${set}.json`,
    );
    const ids = Object.keys(response.data.icons);
    return ids.map((id) => {
      const icon = response.data.icons[id];
      return {
        setId: set,
        id,
        width: response.data.width,
        height: response.data.height,
        body: icon.body,
      };
    });
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
