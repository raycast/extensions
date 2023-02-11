import { showToast, Toast } from "@raycast/api";
import axios, { AxiosResponse } from "axios";
import { LangCode, UsageExample } from "./domain";
import { buildTText, reversoQuery } from "./utils";

export async function getUsageExamples(text: string, sLang: LangCode, tLang: LangCode): Promise<UsageExample[]> {
  let resp: AxiosResponse<{ list: { s_text: string; t_text: string; ref: string; url: string }[] }>;
  try {
    resp = await axios.post(
      reversoQuery,
      {
        source_lang: sLang.toString(),
        target_lang: tLang.toString(),
        mode: 0,
        npage: 1,
        source_text: text,
        target_text: "",
      },
      {
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.14; rv:77.0) Gecko/20100101 Firefox/77.0",
        },
      }
    );

    if (resp.status !== 200) {
      throw new Error(`Request failed with status code (${resp.status})`);
    }
  } catch (err: any) {
    console.error(err);
    showToast(Toast.Style.Failure, "Can't find examples: ", err.message);
    return [];
  }

  return resp.data.list.map((e) => ({
    sExample: e.s_text,
    tExample: e.t_text,
    sLang: sLang,
    tLang: tLang,
    sText: text,
    tText: buildTText(e.t_text),
    source: e.ref,
    sourceUrl: e.url,
  }));
}
