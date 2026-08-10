export interface SearchResult {
  id: string;
  name: string;
  symbol: string;
  image: string;
  slug: string;
  price: string;
  marketCap: string;
  rank: string;
  change: string;
  twitter: string;
  website: string;
}

export interface CoinData {
  currencyId: string;
  name: string;
  symbol: string;
  image: string;
  slug: string;
  price: { USD: string };
  marketCap: { USD: string };
  rank: number;
  change: { "1D": { USD: string } };
  links: { type: string; link: string }[];
}

export interface ApiResponse {
  markets: {
    content: CoinData[];
  };
}
