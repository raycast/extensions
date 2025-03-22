import { Explorer, Token } from "./interfaces";

export abstract class Match {
  readonly search: string;
  readonly explorer: Explorer;
  constructor(search: string, explorer: Explorer) {
    this.search = search;
    this.explorer = explorer;
  }
  abstract get title(): string;
  abstract get path(): string;
  abstract get parsedSearch(): string;
  abstract match(): boolean;
}

// A transaction hash is either 64 (without 0x prefix) or 66 characters
export class TransactionMatch extends Match {
  constructor(search: string, explorer: Explorer) {
    super(search, explorer);
  }
  get title() {
    return `Transaction ${this.search}`;
  }
  get path() {
    return `https://${this.explorer.baseUrl}/tx/${this.parsedSearch}`;
  }
  get parsedSearch() {
    if (this.search.length === 64 && !this.search.startsWith("0x")) {
      return "0x" + this.search;
    }
    return this.search;
  }
  match() {
    // Must be hexadecimal
    if (!/^0?x?[0-9A-Fa-f]+$/.test(this.search)) return false;
    if (this.search.length === 64 && !this.search.startsWith("0x")) return true;
    if (this.search.length === 66 && this.search.startsWith("0x")) return true;

    return false;
  }
}

// An address is either 40 (without 0x prefix) or 42 characters
export class AddressMatch extends Match {
  constructor(search: string, explorer: Explorer) {
    super(search, explorer);
  }
  get title() {
    return `Address ${this.search}`;
  }
  get path() {
    return `https://${this.explorer.baseUrl}/address/${this.parsedSearch}`;
  }
  get parsedSearch() {
    if (this.search.length === 64 && !this.search.startsWith("0x")) {
      return "0x" + this.search;
    }
    return this.search;
  }
  match() {
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
    return `https://${this.explorer.baseUrl}/token/${this.parsedSearch}`;
  }
  get parsedSearch() {
    if (this.search.length === 64 && !this.search.startsWith("0x")) {
      return "0x" + this.search;
    }
    return this.search;
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
    super(search, explorer);
  }
  get title() {
    return `ENS name ${this.parsedSearch}`;
  }
  get path() {
    return `https://${this.explorer.baseUrl}/enslookup-search?search=${this.parsedSearch}`;
  }
  get parsedSearch() {
    return this.search;
  }
  match() {
    if (this.explorer.chainId !== 1) return false;
    if (this.search.endsWith(".eth")) return true;
    return false;
  }
}

// A block is numeric
export class BlockMatch extends Match {
  constructor(search: string, explorer: Explorer) {
    super(search, explorer);
  }
  get title() {
    return `Block height ${this.parsedSearch}`;
  }
  get path() {
    return `https://${this.explorer.baseUrl}/block/${this.parsedSearch}`;
  }
  get parsedSearch() {
    return this.search;
  }
  match() {
    if (/^\d+$/g.test(this.search)) return true;
    return false;
  }
}
