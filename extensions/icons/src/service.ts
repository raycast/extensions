import axios from 'axios';

const client = axios.create({
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

interface Icon {
  setId: string;
  id: string;
  width: number;
  height: number;
  body: string;
}

class Service {
  async listSets(): Promise<Set[]> {
    const response = await client.get<Record<string, SetResponse>>(
      '/collections.json',
    );
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

  async listIcons(set: string): Promise<Icon[]> {
    const response = await client.get<IconResponse>(
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
}

export default Service;

export type { Set, Icon };
