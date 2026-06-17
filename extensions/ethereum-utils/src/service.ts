import axios, { AxiosInstance } from 'axios';

export interface Chain {
  name: string;
  chain: string;
  network: string;
  icon?: string;
  rpc: string[];
  faucets: string[];
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  infoURL: string;
  shortName: string;
  chainId: number;
  networkId: number;
  slip44?: number;
  ens?: {
    registry: string;
  };
  explorers?: {
    name: string;
    url: string;
    standard: string;
  }[];
  parent?: {
    type: string;
    chain: string;
    bridges?: {
      url: string;
    }[];
  };
}

interface EnsDataResponse {
  address: string | null;
  avatar_url: string | null;
  contentHash: string | null;
  url: string | null;
  github: string | null;
  twitter: string | null;
}

export interface NamingServiceRecord {
  type: string;
  value: string;
}

export default class Service {
  private fourByteClient: AxiosInstance;
  private topic0Client: AxiosInstance;
  private chainIdClient: AxiosInstance;
  private ensDataClient: AxiosInstance;

  constructor() {
    this.fourByteClient = axios.create({
      baseURL: 'https://raw.githubusercontent.com/ethereum-lists/4bytes/master',
    });
    this.topic0Client = axios.create({
      baseURL: 'https://raw.githubusercontent.com/wmitsuda/topic0/main',
    });
    this.chainIdClient = axios.create({
      baseURL: 'https://chainid.network',
    });
    this.ensDataClient = axios.create({
      baseURL: 'https://ensdata.net',
    });
  }

  async getFunctionSignature(hash: string): Promise<string | undefined> {
    try {
      const signature = await this.fourByteClient.get<string>(
        `/signatures/${hash}`,
      );
      return signature.data;
    } catch (e) {
      return;
    }
  }

  async getEvent(hash: string): Promise<string | undefined> {
    try {
      const event = await this.topic0Client.get<string>(`/signatures/${hash}`);
      return event.data;
    } catch (e) {
      return;
    }
  }

  async getChains(): Promise<Chain[]> {
    const event = await this.chainIdClient.get<Chain[]>('/chains.json');
    return event.data;
  }

  async lookupEns(name: string): Promise<NamingServiceRecord[]> {
    try {
      const response = await this.ensDataClient.get<EnsDataResponse>(
        `/${name}`,
      );
      const records: NamingServiceRecord[] = [];
      const address = response.data.address;
      if (address) {
        records.push({
          type: 'address',
          value: address,
        });
      }
      const avatarUrl = response.data.avatar_url;
      if (avatarUrl) {
        records.push({
          type: 'avatar',
          value: avatarUrl,
        });
      }
      const contentHash = response.data.contentHash;
      if (contentHash) {
        records.push({
          type: 'contentHash',
          value: contentHash,
        });
      }
      const url = response.data.url;
      if (url) {
        records.push({
          type: 'url',
          value: url,
        });
      }
      const github = response.data.github;
      if (github) {
        records.push({
          type: 'github',
          value: github,
        });
      }
      const twitter = response.data.twitter;
      if (twitter) {
        records.push({
          type: 'twitter',
          value: twitter,
        });
      }
      return records;
    } catch (e) {
      return [];
    }
  }
}
