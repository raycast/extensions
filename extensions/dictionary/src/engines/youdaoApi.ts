import fs from "fs";
import os from "os";
import { getPreferenceValues, Icon } from "@raycast/api";
import crypto from "crypto";
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
  speakUrl?: string;
  tSpeakUrl?: string;
}
interface DefinitionItem {
  title: string;
  defItems: WebItem[] | string[];
}
const getOpts = (query: string, to: LanguageCode, _apiKey?: string, from?: string): RequestInit => {
  const salt = crypto.randomUUID();
  const curtime = Math.floor(Date.now() / 1000).toString();
  const { youdaoapiClientId, youdaoapiKey } = getPreferenceValues<DictionaryPreferences>();
  if (!youdaoapiClientId || !youdaoapiKey) {
    throw new Error("Set your Youdao Application ID and Secret Key in the extension preferences.");
  }
  const sign = generateSign(query, salt, curtime, youdaoapiClientId, youdaoapiKey);
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
    appKey: youdaoapiClientId,
    salt,
    sign,
    signType: "v3",
    curtime,
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
  const [from] = l.split("2");
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
  if (explains?.length) {
    definitions.push({
      title: "Definitions",
      defItems: explains,
    });
  }
  if (web.length) {
    definitions.push({
      title: "From Web",
      defItems: web,
    });
  }
  const src = transform(from) as LanguageCode;
  return { definitions, src };
};

const getUrl = () => {
  return (): string => {
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
const parseHeader = (data: JsonR): DefItem[] => {
  const { basic = {}, translation, query, speakUrl, tSpeakUrl } = data;
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
        supportTTS: [tSpeakUrl ? trans : "", speakUrl ? query : ""],
      },
    },
  ];
};

const truncateForSignature = (content: string) => {
  return content.length <= 20 ? content : `${content.slice(0, 10)}${content.length}${content.slice(-10)}`;
};

const generateSign = (content: string, salt: string, curtime: string, appId: string, appSecret: string) => {
  return crypto
    .createHash("sha256")
    .update(appId + truncateForSignature(content) + salt + curtime + appSecret)
    .digest("hex");
};

const downloadSpeech = async (url: string, path: string) => {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to load Youdao speech (${response.status})`);
  await fs.promises.writeFile(path, Buffer.from(await response.arrayBuffer()));
};

const parseTTS = async (_query: string, _transCode: LanguageCode, data: JsonR): Promise<[string, string?]> => {
  const { speakUrl, tSpeakUrl, query, translation } = data;
  if (!speakUrl && !tSpeakUrl) throw new Error("Youdao did not return speech audio.");

  if (speakUrl) {
    await downloadSpeech(speakUrl, `${os.tmpdir()}/raycast-dictionary-source.mp3`);
  }
  if (tSpeakUrl) {
    await downloadSpeech(tSpeakUrl, `${os.tmpdir()}/raycast-dictionary-trans.mp3`);
  }

  return [tSpeakUrl ? translation[0] : "", speakUrl ? query : undefined];
};

const YoudaoApiEngine: EngineHookProps<JsonR, DefinitionItem> = {
  key: "youdaoapi",
  baseUrl: "https://www.youdao.com",
  title: "Youdao API",
  fallbackSearch: true,
  getUrl: getUrl(),
  getOpts,
  parseData,
  parseDef,
  parsePos,
  parseTTS,
  parseExtras: parseHeader,
};
export default YoudaoApiEngine;
