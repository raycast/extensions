import fetch, { Response } from "node-fetch";
import { Md5 } from "ts-md5";
function paramString(params: { [key: string]: string }): string {
  const p: string[] = [];
  for (const k in params) {
    const v = encodeURI(params[k]);
    p.push(`${k}=${v}`);
  }
  let prefix = "";
  if (p.length > 0) {
    prefix = "?";
  }
  return prefix + p.join("&");
}

async function toJsonOrError(response: Response): Promise<any> {
  const s = response.status;
  const getJson = async (): Promise<any> => {
    try {
      return await response.json();
    } catch (e: any) {
      throw Error(`Server-side issue at wttr.in (${s} - invalid json). Please try again later`);
    }
  };
  if (s >= 200 && s < 300) {
    const json = await getJson();
    return json;
  } else if (s == 401) {
    throw Error("Unauthorized");
  } else if (s == 403) {
    const json = await getJson();
    let msg = "Forbidden";
    if (json.error && json.error == "insufficient_scope") {
      msg = "Insufficient API token scope";
    }
    console.log(msg);
    throw Error(msg);
  } else if (s == 404) {
    throw Error("Not found");
  } else if (s >= 400 && s < 500) {
    const json = await getJson();
    console.log(json);
    const msg = json.message;
    throw Error(msg);
  } else if (s >= 500 && s < 600) {
    throw Error(`Server-side issue at wttr.in (${s}). Please try again later`);
  } else {
    console.log("unknown error");
    throw Error(`http status ${s}`);
  }
}

export class FlypyCoding {
  private url = "http://www.xhup.club/Xhup/Search/searchCode";

  public async fetch(word: string): Promise<any> {
    try {
      const fullUrl = this.url;
      if (!word) word = "";

      const response = await fetch(fullUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Origin: "http://react.xhup.club",
          Referer: "http://react.xhup.club/search",
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/81.0.4044.122 Safari/537.36",
          Host: "www.xhup.club",
          "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
          Accept: "application/json, text/plain, */*",
        },
        body: "search_word=" + word + "&sign=" + Md5.hashStr("fjc_xhup" + word),
      });
      const json = await toJsonOrError(response);

      return json;
    } catch (error: any) {
      throw Error(error);
    }
  }

  public async getCoding(words: string): Promise<any> {
    const json = await this.fetch(words);

    const codings = json.list_dz;

    for (let index = 0; index < codings.length; index++) {
      codings[index][7] = index;
    }
    return codings;
  }
}

export const flypyCoding = new FlypyCoding();
