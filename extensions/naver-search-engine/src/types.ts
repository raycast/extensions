export const SearchType: { [key: string]: { name: string; searchURL: string; baseURL: string } } = {
  KOKO: {
    name: "koko",
    searchURL: `https://ac-dict.naver.com/koko/ac?q_enc='utf-8'&st=100&r_lt=100&q=`,
    baseURL: `https://ko.dict.naver.com/#/search?range=all&query=`,
  },
  ENKO: {
    name: "enko",
    searchURL: `https://ac.dict.naver.com/enendict/ac?q_enc='utf-8'&st=100&r_lt=100&q=`,
    baseURL: `https://en.dict.naver.com/#/search?range=all&query=`,
  },
  CCKO: {
    name: `ccko`,
    searchURL: `https://ac-dict.naver.com/ccko/ac?q_enc='utf-8'&st=100&r_lt=100&q=`,
    baseURL: `https://hanja.dict.naver.com/#/search?range=all&query=`,
  },
  SHOPPING: {
    name: "shopping",
    searchURL: `https://ac.shopping.naver.com/ac?frm='shopping'&q_enc='UTF-8'&st=111111&r_lt=111111&q=`,
    baseURL: `https://search.shopping.naver.com/search/all?query=`,
  },
  GENERAL: {
    name: "general",
    searchURL: `https://ac.search.naver.com/nx/ac?q_enc='utf-8'&st=100&r_lt=100&q=`,
    baseURL: `https://search.naver.com/search.naver?ie=utf8&amp;sm=stp_hty&amp;where=se&amp&query=`,
  },
};
