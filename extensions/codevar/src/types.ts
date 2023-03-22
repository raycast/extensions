export {};

declare global {
  interface Keys {
    keyfrom: string;
    key: string;
  }

  interface WebResult {
    value: [];
    key: string;
  }

  interface SearchResult {
    title: string;
    subtitle: string;
  }
}
