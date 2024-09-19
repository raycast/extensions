import { useMemo } from "react";
import { useCachedPromise } from "@raycast/utils";
import { EN_US } from "@/utils";
import V4_EN_US from "@/documentation/v4/en-US.json";
import V3_EN_US from "@/documentation/v3/en-US.json";
import V2_EN_US from "@/documentation/v2/en-US.json";
import V4_ZH_CN from "@/documentation/v4/zh-CN.json";
import V3_ZH_CN from "@/documentation/v3/zh-CN.json";
import V2_ZH_CN from "@/documentation/v2/zh-CN.json";

import type { Doc, DocItem, SearchData } from "@/type";

const EN_US_DOCUMENTATION: Doc[] = [...V4_EN_US, ...V3_EN_US, ...V2_EN_US];

const ZH_CN_DOCUMENTATION: Doc[] = [...V4_ZH_CN, ...V3_ZH_CN, ...V2_ZH_CN];

const filterContent = (language: string, query: string) => {
  const documentation = language === EN_US ? EN_US_DOCUMENTATION : ZH_CN_DOCUMENTATION;

  const results = documentation.reduce((acc: DocItem[], current: Doc) => {
    const res = current.items.filter((item) => item.title.toLocaleUpperCase().includes(query.toLocaleUpperCase()));
    return [...acc, ...res];
  }, []);

  return results;
};

export const useSearch = (language: string, query: string) => {
  const { data } = useCachedPromise(
    async (language: string, query: string) => {
      const result = {
        docs: [],
        isEmptyQuery: false,
      } as SearchData;

      if (!query.trim()) {
        result.docs = language === EN_US ? V4_EN_US : V4_ZH_CN;
        result.isEmptyQuery = true;
      } else {
        result.docs = filterContent(language, query);
        result.isEmptyQuery = false;
      }

      return result;
    },
    [language, query],
    {
      keepPreviousData: true,
    },
  );

  const isEmptyQuery = useMemo(() => {
    return data?.isEmptyQuery || false;
  }, [data?.isEmptyQuery]);

  const docs = useMemo(() => {
    return data?.docs || [];
  }, [data?.docs]);

  return {
    isEmptyQuery,
    docs,
  };
};
