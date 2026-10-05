interface AllProducts {
  name: string;
  aliases: string[];
  label: string;
  category: string;
  tags: string[];
  uri: string;
}

interface AllProductsResponse {
  schema_version: string;
  generated_at: string;
  total: number;
  result: AllProducts[];
}

interface ProductRelease {
  name: string;
  codename: string | null;
  label: string;
  releaseDate: string;
  isLts: boolean;
  ltsFrom: string | null;
  isEoas: boolean;
  eoasFrom: string | null;
  isEol: boolean;
  eolFrom: string | null;
  isDiscontinued: boolean;
  discontinuedFrom: string | null;
  isEoes: boolean | null;
  eoesFrom: string | null;
  isMaintained: boolean;
  latest: {
    name: string;
    date: string | null;
    link: string | null;
  } | null;
  custom: {
    [key: string]: string | null;
  } | null;
}

interface Product {
  name: string;
  aliases: string[];
  label: string;
  category: string;
  tags: string[];
  versionCommand: string | null;
  identifiers: string[];
  labels: {
    eoas: string | null;
    discontinued: string | null;
    eol: string | null;
    eoes: string | null;
  };
  links: {
    icon: string | null;
    html: string;
    releasePolicy: string | null;
  };
  releases: ProductRelease[];
}

interface ProductResponse {
  schema_version: string;
  generated_at: string;
  last_modified: string;
  result: Product;
}

export type { AllProducts, AllProductsResponse, ProductRelease, Product, ProductResponse };
