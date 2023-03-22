import { useFetch } from "@raycast/utils";
import { useMemo, useState } from "react";
import { FIXED_KEY } from "../configs";
import { sample } from "../utils/core";

export function useSearch() {
  const [searchText, setSearchText] = useState<string>("");
  // const [data, setData] = useState<SearchResult[]>([])
  // const [isLoading, setIsLoading] = useState<boolean>(false)

  const apiUrl = useMemo(() => {
    const selected = sample(FIXED_KEY);
    const params = new URLSearchParams({
      keyfrom: selected.keyfrom,
      key: selected.key,
      type: "data",
      doctype: "json",
      version: "1.1",
      q: searchText.length === 0 ? "你好" : searchText,
    });

    return `http://fanyi.youdao.com/openapi.do?${params.toString()}`;
  }, [searchText]);

  const { data, isLoading } = useFetch(apiUrl, {
    parseResponse: parseFetchResponse,
    initialData: [],
    keepPreviousData: true,
  });

  // useEffect(() => {
  //   const fetchApi = async () => {
  //     setIsLoading(true)
  //     try {
  //       const { data, isLoading } = useFetch(apiUrl, {
  //         parseResponse: parseFetchResponse,
  //         keepPreviousData: true,
  //       })

  //       data && setData(data)
  //       setIsLoading(isLoading)
  //     } catch (err) {
  //       console.error(err)
  //       showToast(Toast.Style.Failure, "failed")
  //       setIsLoading(false)
  //     }
  //   }

  //   fetchApi()
  // }, [])

  return { data, isLoading, setSearchText };
}

async function parseFetchResponse(response: Response) {
  const json = (await response.json()) as { translation: []; web: WebResult[]; query: string; errorCode: 0 };

  if ("errorCode" in json && json.errorCode !== 0) {
    throw new Error("api error");
  }

  //结果
  const result_value: SearchResult[] = [];
  const res: string[] = [];
  // 过滤中文
  const reg = /^[a-zA-Z ]/;
  // 标准翻译结果 : translation
  const result_translation = json.translation;
  for (let i = 0, len = result_translation.length; i < len; i++) {
    if (reg.test(result_translation[i])) {
      const title = result_translation[i] as string;
      if (!res.includes(title.toLocaleLowerCase())) {
        res.push(title.toLocaleLowerCase());
        result_value.push({
          title,
          subtitle: `标准翻译 => ${result_translation[i]}`,
        });
      }
    }
  }

  // 网络翻译 : web
  if (json.web) {
    const result_web = json.web;
    for (let i = 0, len = result_web.length; i < len; i++) {
      for (let j = 0, ilen = result_web[i]?.value.length; j < ilen; j++) {
        if (reg.test(result_web[i].value[j])) {
          const title = result_web[i].value[j] as string;
          if (!res.includes(title.toLocaleLowerCase())) {
            res.push(title.toLocaleLowerCase());
            result_value.push({
              title,
              subtitle: `网络翻译 => ${result_web[i].value[j]}`,
            });
          }
        }
      }
    }
  }

  return result_value;
}
