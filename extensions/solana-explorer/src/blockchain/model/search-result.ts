export abstract class SearchResult {}

export class BlockSearchResult extends SearchResult {
  readonly index: number;
  readonly endpoint: string;

  constructor(index: number, endpoint: string) {
    super();
    this.endpoint = endpoint;
    this.index = index;
  }

  get actionUrl(): string {
    return `${this.endpoint}/block/${this.index}`;
  }
}

export class EpochSearchResult extends SearchResult {
  readonly index: number;
  readonly endpoint: string;

  constructor(index: number, endpoint: string) {
    super();
    this.endpoint = endpoint;
    this.index = index;
  }

  get actionUrl(): string {
    return `${this.endpoint}/epoch/${this.index}`;
  }
}

export class AccountSearchResult extends SearchResult {
  readonly pubKey: string;
  readonly endpoint: string;

  constructor(pubKey: string, endpoint: string) {
    super();
    this.endpoint = endpoint;
    this.pubKey = pubKey;
  }

  get actionUrl(): string {
    return `${this.endpoint}/address/${this.pubKey}`;
  }
}

export class TokenSearchResult extends SearchResult {
  readonly pubKey: string;
  readonly name: string;
  readonly icon?: string;
  private readonly endpoint: string;

  constructor(pubKey: string, name: string, icon: string | undefined, endpoint: string) {
    super();
    this.pubKey = pubKey;
    this.name = name;
    this.icon = icon;
    this.endpoint = endpoint;
  }

  get actionUrl(): string {
    return `${this.endpoint}/address/${this.pubKey}`;
  }
}
