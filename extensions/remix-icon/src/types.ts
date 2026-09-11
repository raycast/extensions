export type Icon = {
  readonly name: string;
  readonly category: string;
};

export type IconCategory = {
  readonly name: string;
  readonly icons: readonly Icon[];
};

export interface Catalog {
  readonly categories: readonly IconCategory[];
}

// JSON format from catalogue.json before conversion
export interface CatalogJSON {
  readonly categories: ReadonlyArray<{
    readonly name: string;
    readonly icons: readonly string[];
  }>;
}
