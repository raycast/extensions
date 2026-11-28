import axios, { AxiosInstance } from 'axios';
import { JsonRpcProvider } from 'ethers';

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

export interface NamingServiceRecord {
  type: string;
  value: string;
}

export default class Service {
  private fourByteClient: AxiosInstance;
  private topic0Client: AxiosInstance;
  private chainIdClient: AxiosInstance;
  private ethereumProvider: JsonRpcProvider;

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
    this.ethereumProvider = new JsonRpcProvider(
      'https://ethereum-rpc.publicnode.com',
    );
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
      const resolver = await this.ethereumProvider.getResolver(name);
      if (!resolver) return [];

      const readRecord = async (
        type: string,
        request: Promise<string | null>,
      ): Promise<readonly [string, string | null]> => {
        try {
          return [type, await request];
        } catch {
          return [type, null];
        }
      };
      const entries = await Promise.all([
        readRecord('address', resolver.getAddress()),
        readRecord('avatar', resolver.getAvatar()),
        readRecord('contentHash', resolver.getContentHash()),
        readRecord('url', resolver.getText('url')),
        readRecord('github', resolver.getText('com.github')),
        readRecord('twitter', resolver.getText('com.twitter')),
      ]);

      return entries.flatMap(([type, value]) =>
        value ? [{ type, value }] : [],
      );
    } catch (e) {
      return [];
    }
  }
}
