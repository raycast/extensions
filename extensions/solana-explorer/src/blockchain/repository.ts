import * as splTokensRegister from "@solana/spl-token-registry";
import {
  AccountSearchResult,
  BlockSearchResult,
  EpochSearchResult,
  SearchResult,
  TokenSearchResult,
} from "./model/search-result";
import { BlockchainConfig } from "./config";
import { isNumeric } from "./utils";

export class Repository {
  config: BlockchainConfig;
  // connection!: web3.Connection;
  tokenRegister!: splTokensRegister.TokenListContainer;

  constructor(config: BlockchainConfig) {
    this.config = config;
  }

  async connect() {
    // this.connection = new web3.Connection(web3.clusterApiUrl("mainnet-beta"), "confirmed");
    this.tokenRegister = await new splTokensRegister.TokenListProvider().resolve(splTokensRegister.Strategy.CDN);
  }

  async search(query: string): Promise<SearchResult[]> {
    const result: SearchResult[] = [];
    if (query == "") return result;

    // AccountSearchResult
    if (query.length == 44) {
      result.push(new AccountSearchResult(query, this.config.solanaExplorerUrl));
    }

    // Token
    const tokens = this.tokenRegister.filterByClusterSlug(this.config.network).getList();
    const filteredTokens = tokens.filter((token) => token.name.indexOf(query) > -1).slice(0, 10);
    result.push(
      ...filteredTokens.map(
        (token) => new TokenSearchResult(token.address, token.name, token.logoURI, this.config.solanaExplorerUrl),
      ),
    );

    if (isNumeric(query)) {
      result.push(new BlockSearchResult(parseInt(query), this.config.solanaExplorerUrl));
      result.push(new EpochSearchResult(parseInt(query), this.config.solanaExplorerUrl));
    }

    return result;
  }
}
