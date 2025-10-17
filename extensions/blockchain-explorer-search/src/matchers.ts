import { Explorer, Token, MatchType } from "./interfaces";
import { getExplorerConfig } from "./explorer-configs";

export abstract class Match {
  readonly search: string;
  readonly explorer: Explorer;
  matchType: MatchType;

  constructor(search: string, explorer: Explorer, matchType: MatchType) {
    this.search = search;
    this.explorer = explorer;
    this.matchType = matchType;
  }

  abstract get title(): string;
  abstract get path(): string;
  abstract get parsedSearch(): string;
  abstract match(): boolean;

  /**
   * Get the configured path for this match type
   */
  protected getPathPrefix(): string {
    const config = getExplorerConfig(this.explorer.baseUrl) || this.explorer.config;

    if (config?.paths?.[this.matchType]) {
      return config.paths[this.matchType]!;
    }

    // Default paths for EVM-compatible chains
    const defaultPaths: Record<MatchType, string> = {
      transaction: "/tx/",
      address: "/address/",
      block: "/block/",
      token: "/token/",
      ens: "/enslookup-search?search=",
      signature: "/tx/",
    };

    return defaultPaths[this.matchType] || "/";
  }

  /**
   * Get the pattern configuration for this match type
   */
  protected getPattern(): { regex: string; normalize?: (input: string) => string } | undefined {
    const config = getExplorerConfig(this.explorer.baseUrl) || this.explorer.config;

    if (config?.patterns?.[this.matchType]) {
      return config.patterns[this.matchType];
    }

    return undefined;
  }

  /**
   * Test if search matches the configured pattern
   */
  protected matchesPattern(pattern: { regex: string; normalize?: (input: string) => string }): boolean {
    const regex = new RegExp(pattern.regex);
    return regex.test(this.search);
  }
}

// A transaction hash is either 64 (without 0x prefix) or 66 characters for EVM chains
export class TransactionMatch extends Match {
  constructor(search: string, explorer: Explorer) {
    super(search, explorer, "transaction");
  }

  get title() {
    return `Transaction ${this.search}`;
  }

  get path() {
    const pathPrefix = this.getPathPrefix();
    return `https://${this.explorer.baseUrl}${pathPrefix}${this.parsedSearch}`;
  }

  get parsedSearch() {
    const customPattern = this.getPattern();
    if (customPattern?.normalize) {
      return customPattern.normalize(this.search);
    }

    // Default EVM normalization: add 0x prefix if needed
    if (this.search.length === 64 && !this.search.startsWith("0x")) {
      return "0x" + this.search;
    }
    return this.search;
  }

  match() {
    const customPattern = this.getPattern();

    // Use custom pattern if available
    if (customPattern) {
      return this.matchesPattern(customPattern);
    }

    // Default EVM transaction hash matching
    // Must be hexadecimal
    if (!/^0?x?[0-9A-Fa-f]+$/.test(this.search)) return false;
    if (this.search.length === 64 && !this.search.startsWith("0x")) return true;
    if (this.search.length === 66 && this.search.startsWith("0x")) return true;

    return false;
  }
}

// A signature match (primarily for Solana and similar chains)
export class SignatureMatch extends Match {
  constructor(search: string, explorer: Explorer) {
    super(search, explorer, "signature");
  }

  get title() {
    return `Signature ${this.search}`;
  }

  get path() {
    const pathPrefix = this.getPathPrefix();
    return `https://${this.explorer.baseUrl}${pathPrefix}${this.parsedSearch}`;
  }

  get parsedSearch() {
    const customPattern = this.getPattern();
    if (customPattern?.normalize) {
      return customPattern.normalize(this.search);
    }
    return this.search;
  }

  match() {
    const customPattern = this.getPattern();

    // Use custom pattern if available
    if (customPattern) {
      return this.matchesPattern(customPattern);
    }

    // Default: no signature matching unless custom pattern is defined
    return false;
  }
}

// An address is either 40 (without 0x prefix) or 42 characters for EVM chains
export class AddressMatch extends Match {
  constructor(search: string, explorer: Explorer) {
    super(search, explorer, "address");
  }

  get title() {
    return `Address ${this.search}`;
  }

  get path() {
    const pathPrefix = this.getPathPrefix();
    return `https://${this.explorer.baseUrl}${pathPrefix}${this.parsedSearch}`;
  }

  get parsedSearch() {
    const customPattern = this.getPattern();
    if (customPattern?.normalize) {
      return customPattern.normalize(this.search);
    }

    // Default EVM normalization: add 0x prefix if needed
    if (this.search.length === 40 && !this.search.startsWith("0x")) {
      return "0x" + this.search;
    }
    return this.search;
  }

  match() {
    const customPattern = this.getPattern();

    // Use custom pattern if available
    if (customPattern) {
      return this.matchesPattern(customPattern);
    }

    // Default EVM address matching
    // Must be hexadecimal
    if (!/^0?x?[0-9A-Fa-f]+$/.test(this.search)) return false;
    // If there isn't a 0x prefix, add it in the parsedSearch
    if (this.search.length === 40 && !this.search.startsWith("0x")) return true;
    if (this.search.length === 42 && this.search.startsWith("0x")) return true;

    return false;
  }
}

// A Token is an address that matches the token list
export class TokenMatch extends AddressMatch {
  private token?: Token;
  readonly tokenList?: Token[];

  constructor(search: string, explorer: Explorer, tokenLists?: { [key: number]: Token[] }) {
    super(search, explorer);
    this.matchType = "token";
    if (tokenLists) {
      this.tokenList = tokenLists[explorer.chainId];
    }
  }

  get title() {
    if (this.token) {
      const { name, symbol, decimals } = this.token;
      return `${name} token (${symbol}) - ${decimals} decimals ${this.parsedSearch}.`;
    }
    return `Token ${this.parsedSearch}`;
  }

  get path() {
    const pathPrefix = this.getPathPrefix();
    return `https://${this.explorer.baseUrl}${pathPrefix}${this.parsedSearch}`;
  }

  match() {
    if (!super.match()) return false;
    if (this.tokenList) {
      const foundToken = this.tokenList.find(({ address }) => address.toLowerCase() === this.search.toLowerCase());
      if (foundToken) {
        this.token = foundToken;
        return true;
      }
    }
    return false;
  }
}

// .eth at the end
export class ENSMatch extends Match {
  constructor(search: string, explorer: Explorer) {
    super(search, explorer, "ens");
  }

  get title() {
    return `ENS name ${this.parsedSearch}`;
  }

  get path() {
    const pathPrefix = this.getPathPrefix();
    return `https://${this.explorer.baseUrl}${pathPrefix}${this.parsedSearch}`;
  }

  get parsedSearch() {
    return this.search;
  }

  match() {
    const customPattern = this.getPattern();

    // Use custom pattern if available
    if (customPattern) {
      return this.matchesPattern(customPattern);
    }

    // Default ENS matching: only on Ethereum mainnet
    if (this.explorer.chainId !== 1) return false;
    if (this.search.endsWith(".eth")) return true;
    return false;
  }
}

// A block is numeric
export class BlockMatch extends Match {
  constructor(search: string, explorer: Explorer) {
    super(search, explorer, "block");
  }

  get title() {
    return `Block height ${this.parsedSearch}`;
  }

  get path() {
    const pathPrefix = this.getPathPrefix();
    return `https://${this.explorer.baseUrl}${pathPrefix}${this.parsedSearch}`;
  }

  get parsedSearch() {
    const customPattern = this.getPattern();
    if (customPattern?.normalize) {
      return customPattern.normalize(this.search);
    }
    return this.search;
  }

  match() {
    const customPattern = this.getPattern();

    // Use custom pattern if available
    if (customPattern) {
      return this.matchesPattern(customPattern);
    }

    // Default block matching: numeric only
    if (/^\d+$/g.test(this.search)) return true;
    return false;
  }
}
