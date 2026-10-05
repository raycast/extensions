export const HISTORY_KEY = "history";

export type autoCompleteItem = [string, number];

export interface SearchResult {
  id: string;
  description?: string;
  query: string;
  url: string;
  isNavigation?: boolean;
  isHistory?: boolean;
}

export interface Preferences {
  rememberSearchHistory: boolean;
  useClipboardFallback: boolean;
}

export const SearchTypeDict: { [key: string]: { name: string; searchURL: string; baseURL: string; isDict: boolean } } =
  {
    KOKO: {
      name: "Naver Korean Dictionary",
      searchURL: `https://ac-dict.naver.com/koko/ac?q_enc='utf-8'&st=100&r_lt=100&q=`,
      baseURL: `https://ko.dict.naver.com/#/search?range=all&query=`,
      isDict: true,
    },
    KOEN: {
      name: "Naver Korean-English Dictionary",
      searchURL: `https://ac-dict.naver.com/enko/ac?q_enc='utf-8'&st=100&r_lt=100&q=`,
      baseURL: `https://en.dict.naver.com/#/search?range=all&query=`,
      isDict: true,
    },
    SIKO: {
      name: `Naver Sino Korean Dictionary`,
      searchURL: `https://ac-dict.naver.com/ccko/ac?q_enc='utf-8'&st=100&r_lt=100&q=`,
      baseURL: `https://hanja.dict.naver.com/#/search?range=all&query=`,
      isDict: true,
    },
    SHOPPING: {
      name: "Naver Shopping",
      searchURL: `https://ac.shopping.naver.com/ac?frm='shopping'&q_enc='UTF-8'&st=111111&r_lt=111111&q=`,
      baseURL: `https://search.shopping.naver.com/search/all?query=`,
      isDict: false,
    },
    GENERAL: {
      name: "Naver",
      searchURL: `https://ac.search.naver.com/nx/ac?con=1&frm=nv&ans=2&r_format=json&r_enc=UTF-8&r_unicode=0&t_koreng=1&run=2&rev=4&q_enc=UTF-8&st=100&q=`,
      baseURL: `https://search.naver.com/search.naver?query=`,
      isDict: false,
    },
  };
