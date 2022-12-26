/* eslint-disable @typescript-eslint/no-explicit-any */
import axios, { AxiosInstance } from 'axios';
import { Cache } from '@raycast/api';

import {
  AlgoliaHit,
  Deploy,
  Domain,
  Member,
  Site,
  Team,
  User,
} from './interfaces';
import { getToken } from './utils';

const ALGOLIA_APP_ID = '4RTNPM1QF9';
const ALGOLIA_PUBLIC_API_KEY = '260466eb2466a36278b2fdbcc56ad7ba';
const ALGOLIA_INDEX_NAME = 'docs-manual';
const cache = new Cache({ namespace: 'api.netlify.v1' });

function getCacheKey(path: string): string {
  const ttl = 1; // keep LRU cache for a ttl (1 minute default)
  const minute = Math.floor(new Date().getTime() / 1000 / 60 / ttl);
  return `${minute}:${path}`;
}

class Api {
  algolia: AxiosInstance;
  netlify: {
    _axios: AxiosInstance;
    get: (path: string) => Promise<any>;
    put: (path: string, body: any) => Promise<any>;
  };

  constructor(token: string) {
    this.algolia = axios.create({
      baseURL: `https://${ALGOLIA_APP_ID.toLowerCase()}-dsn.algolia.net/1`,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'netlify-raycast-extension',
      },
    });
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

  async searchDocs(query: string): Promise<AlgoliaHit[]> {
    const params = [
      `x-algolia-application-id=${ALGOLIA_APP_ID}`,
      `x-algolia-api-key=${ALGOLIA_PUBLIC_API_KEY}`,
    ].join('&');
    const body = JSON.stringify({
      requests: [
        {
          indexName: ALGOLIA_INDEX_NAME,
          params: `query=in+the+docs+${query}&hitsPerPage=20`,
        },
      ],
    });
    const { data } = await this.algolia.post(
      `/indexes/*/queries?${params}`,
      body,
    );
    return data.results[0].hits;
  }
}

const api = new Api(getToken());

export default api;
