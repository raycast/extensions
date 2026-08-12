export interface Provider {
  name: string;
  preferenceKey: string;
  phoneUrl: (query: string) => string;
  nameUrl: (query: string) => string;
}

export const providers: Provider[] = [
  {
    name: "Gule Sider",
    preferenceKey: "useGuleSider",
    phoneUrl: (q) => `https://www.gulesider.no/${encodeURIComponent(q)}/hvem+har+ringt`,
    nameUrl: (q) => `https://www.gulesider.no/${encodeURIComponent(q)}/personer`,
  },
  {
    name: "1881",
    preferenceKey: "use1881",
    phoneUrl: (q) => `https://www.1881.no/?query=${encodeURIComponent(q)}&type=person`,
    nameUrl: (q) => `https://www.1881.no/?query=${encodeURIComponent(q)}&type=person`,
  },
  {
    name: "180",
    preferenceKey: "use180",
    phoneUrl: (q) => `https://www.180.no/varsel/nummer/${encodeURIComponent(q)}`,
    nameUrl: (q) => `https://www.180.no/search/all?w=${encodeURIComponent(q)}`,
  },
];
