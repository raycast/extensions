const baseUrl = "https://quicksnip.dev";

export interface Language {
  name: string;
  icon: string;
}

export interface Category {
  name: string;
  snippets: Snippet[];
}

export interface Snippet {
  title: string;
  description: string;
  author: string;
  tags: string[];
  code: string;
}

export const languagesUrl = `${baseUrl}/consolidated/_index.json`;

export const iconUrlForLanguage = (lang: string): string => {
  return `${baseUrl}/icons/${lang.toLowerCase()}.svg`;
};

export const snippetUrlForLanguage = (lang: string) => `${baseUrl}/consolidated/${lang.toLowerCase()}.json`;
