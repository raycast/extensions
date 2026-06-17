const baseUrl = "https://api.quicksnip.dev";

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

export const languagesUrl = `${baseUrl}/languages`;

export const iconUrlForLanguage = (lang: string): string => {
  return `${baseUrl}/icons/${lang.toLowerCase()}.svg`;
};

export const snippetsUrlForLanguage = (lang: string) => `${baseUrl}/snippets/${lang.toLowerCase()}/all`;
