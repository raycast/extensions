// src/types/shodan.ts
export interface Host {
  ip_str: string;
  hostnames: string[];
  org: string;
  country_name: string;
  ports: number[];
}

export interface SearchResult {
  matches: Host[];
  total: number;
}

// Add more interfaces for other Shodan API response types
