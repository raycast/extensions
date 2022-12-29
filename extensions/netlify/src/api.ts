/* eslint-disable @typescript-eslint/no-explicit-any */
import axios, { AxiosInstance } from 'axios';
import { Cache } from '@raycast/api';

import { Deploy, Domain, Member, Role, Site, Team, User } from './interfaces';
import { getToken } from './utils';

const cache = new Cache({ namespace: 'api.netlify.v1' });

function getCacheKey(path: string): string {
  const ttl = 1; // keep LRU cache for a ttl (1 minute default)
  const minute = Math.floor(new Date().getTime() / 1000 / 60 / ttl);
  return `${minute}:${path}`;
}

class Api {
  netlify: {
    _axios: AxiosInstance;
    get: (path: string) => Promise<any>;
    post: (path: string, body: any) => Promise<any>;
    put: (path: string, body: any) => Promise<any>;
  };

  constructor(token: string) {
    this.netlify = {
      _axios: axios.create({
        baseURL: 'https://api.netlify.com/api/v1',
        headers: {
          Authorization: `Bearer ${token}`,
          'User-Agent': 'netlify-raycast-extension',
        },
      }),
      async get(path: string) {
        const key = getCacheKey(path);
        if (cache.has(key)) {
          // console.log('cache hit!', key);
          return JSON.parse(cache.get(key) || '[]');
        }
        // console.log('cache miss', key);
        const { status, data } = await this._axios.get(path);
        if (status === 200) {
          // console.log('cache save', key);
          cache.set(key, JSON.stringify(data));
        }
        return data;
      },
      async post(path: string, body: unknown) {
        const { status, data } = await this._axios.post(path, body);
        if (status === 200) {
          const key = getCacheKey(path);
          // console.log('cache save', key);
          cache.set(key, JSON.stringify(data));
        }
        return data;
      },
      async put(path: string, body: unknown) {
        const { status, data } = await this._axios.put(path, body);
        if (status === 200) {
          const key = getCacheKey(path);
          // console.log('cache save', key);
          cache.set(key, JSON.stringify(data));
        }
        return data;
      },
    };
  }

  getDeploys(site: string): Promise<Deploy[]> {
    return this.netlify.get(`/sites/${site}/deploys`);
  }

  getDomains(): Promise<Domain[]> {
    return this.netlify.get('/dns_zones');
  }

  getMembers(team: string): Promise<Member[]> {
    return this.netlify.get(`/${team}/members`);
  }

  addMember(payload: {
    email: string;
    role: Role;
    site_access: 'all' | 'selected';
    site_ids: string[];
    team: string;
  }): Promise<Member[]> {
    const { team, ...rest } = payload;
    return this.netlify.post(`/${team}/members`, rest);
  }

  getSites(query: string, team?: string): Promise<Site[]> {
    const params = [
      `name=${query}`,
      `filter=all`,
      `sort_by=updated_at`,
      `page=1`,
      `per_page=30`,
      `include_favorites=true`,
    ];
    const path = [team && `/${team}`, `/sites?${params.join('&')}`]
      .filter(Boolean)
      .join('');
    return this.netlify.get(path);
  }

  getTeams(): Promise<Team[]> {
    return this.netlify.get(`/accounts`);
  }

  getUser(): Promise<User> {
    return this.netlify.get(`/user`);
  }

  saveFavorites(favorites: string[]): Promise<User> {
    return this.netlify.put(`/user`, {
      favorite_sites: favorites,
    });
  }
}

const api = new Api(getToken());

export default api;
