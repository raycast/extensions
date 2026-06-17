import fs from "fs";
import os from "os";
import fetch from "cross-fetch";
import { getPreferenceValues, Icon } from "@raycast/api";
import crypto from "crypto";
import { Url } from "url";
import { knownPos } from "../constants";
import { DefItem, DefsBody, DictionaryPreferences, LanguageCode } from "../types";
import { EngineHookProps } from "./types";
interface WebItem {
  value: string[];
  key: string;
}
interface WordFormat {
  wf: {
    name: string;
    value: string;
  };
}
interface Basic {
  "us-phonetic": string;
  wfs: WordFormat[];
  explains: string[];
}
interface JsonR {
  query: string;
  errorCode: string;
  l: string;
  web?: WebItem[];
  translation: string[];
  basic?: Partial<Basic>;
  speakUrl: Url;
}
interface DefinitionItem {
  title: string;
  defItems: WebItem[] | string[];
}
const getOpts = (query: string, to: LanguageCode, apiKey?: string, from?: string): RequestInit => {
  const salt = new Date().getTime().toString();
  const { youdaoapiClientId, youdaoapiKey } = getPreferenceValues<DictionaryPreferences>();
  //TODO: query should be truncated
  const sign = generateSign(query, salt, youdaoapiClientId, youdaoapiKey);
  const transform = (code: LanguageCode): string => {
    //TODO: make return type as LanguageCode
    switch (code) {
      case "zh-CN":
        return "zh-CHS";
      case "zh-TW":
        return "zh-CHT";
      case "sr":
        return "sr-Cyrl";
      default:
        return code;
    }
  };
  const data = {
    from: from || "auto",
    to: transform(to),
    q: query,
    appKey: "2e8cc14f1cdbab25",
    salt,
    sign,
  };
  return {
    headers: {
      "Content-Type": "application/x-www-form-urlencoded;",
    },
    method: "POST",
    body: new URLSearchParams(data).toString(),
  };
};

const parseData = (data: JsonR): DefsBody<DefinitionItem> => {
  if (data.errorCode !== "0") throw Error(`Error code: ${data.errorCode}`);
  const { l, web = [], basic: { explains } = {} } = data;
  const [from, to] = l.split("2");
  const transform = (code: string): string => {
    //TODO: make return type as LanguageCode
    switch (code) {
      case "zh-CHS":
        return "zh-CN";
      case "zh-CHT":
        return "zh-TW";
      case "sr-Cyrl":
      case "sr-Latn":
        return "sr";
      default:
        return code;
    }
  };
  const definitions = [] as DefinitionItem[];
  explains?.length &&
    definitions.push({
      title: "Definitions",
      defItems: explains,
    });
  web.length &&
    definitions.push({
      title: "From Web",
      defItems: web,
    });
  const src = transform(from) as LanguageCode;
  return { definitions, src };
};

const getUrl = () => {
  return (query: string): RequestInfo => {
    return "https://openapi.youdao.com/api";
  };
};
const parsePos = (def: DefinitionItem): string => def.title;

const parseDef = (def: DefinitionItem): DefItem[] => {
  const { defItems } = def;
  return defItems.map((item, idx) => {
    if (typeof item === "string") {
      const [pos, res] = item.split(". ");
      const posAbbr = Object.keys(knownPos).find((abbr) => pos.startsWith(abbr));
      return {
        id: `dict-${pos || `other${idx}`}`,
        title: res || item,
        icon: (posAbbr && `${posAbbr}.png`) || `idx${idx + 1}.png`,
      };
    } else {
      const { key, value } = item;
      return {
        id: key,
        title: value.join(","),
        subtitle: key,
        metaData: {
          toClipboard: [value[0], key],
        },
      };
    }
  });
};
const parseHeader = (data: JsonR, transCode: LanguageCode = "en"): DefItem[] => {
  const { basic = {}, translation, query } = data;
  const { ["us-phonetic"]: phonetic } = basic;
  const trans = translation[0];
  const webUrl = "https://www.youdao.com/w/" + encodeURIComponent(query);
  return [
    {
      id: `header-${trans}`,
      title: `${trans}`,
      subtitle: `${query}${phonetic ? ` [${phonetic}]` : ""}`,
      accessories: [
        { tag: { value: `↵ : Copy` }, icon: Icon.CopyClipboard },
        { tag: { value: `⌘ + ↵ : View in browser` }, icon: Icon.Globe },
      ],
      metaData: {
        toClipboard: [trans, query],
        url: webUrl,
        supportTTS: [trans] as [string],
      },
    },
  ];
};

const generateSign = (content: string, salt: string, app_key: string, app_secret: string) => {
  const md5 = crypto.createHash("md5");
  md5.update(app_key + content + salt + app_secret);
  return md5.digest("hex").slice(0, 32).toUpperCase();
};

const parseTTS = async (_query: string, _transCode: LanguageCode, data: JsonR): Promise<[string]> => {
  const { speakUrl, query: respQuery } = data;
  const response = await fetch(`${speakUrl}`);
  const ttsSrc = await response.arrayBuffer();
  const srcPath = `${os.tmpdir()}/raycast-dictionary-trans.mp3`;
  await fs.promises.writeFile(srcPath, Buffer.from(ttsSrc));
  return [respQuery] as [string];
};

const YoudaoApiEngine: EngineHookProps<JsonR, DefinitionItem> = {
  key: "youdaoapi",
  baseUrl: "https://www.youdao.com",
  title: "Youdao API",
  getUrl: getUrl(),
  getOpts,
  parseData,
  parseDef,
  parsePos,
  parseTTS,
  parseExtras: parseHeader,
};
export default YoudaoApiEngine;
