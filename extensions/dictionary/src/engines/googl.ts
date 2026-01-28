import fs from "fs";
import os from "os";
import fetch from "cross-fetch";
import { knownPos } from "../constants";
import { DefItem, LanguageCode, DefsBody } from "../types";
import { Icon } from "@raycast/api";
import { EngineHookProps } from "./types";
const baseUrl = "https://translate.google.com";
interface Dict {
  pos: string;
  terms: string[];
}
interface DefinitionItem {
  pos: string;
  entry: {
    gloss: string;
    example: string;
    definition_id: string;
  }[];
}
interface AlterTrans {
  src_phrase: string;
  alternative: {
    word_postproc: string;
  }[];
}
type GooglResult = {
  sentences: [
    {
      trans: string;
      orig: string;
    },
    {
      translit?: string;
      src_translit: string;
    }
  ];
  src: LanguageCode;
  alternative_translations: AlterTrans[];
  definitions?: DefinitionItem[];
  dict?: Dict[];
};

const prepareRequestUrl = () => {
  const publicUrl = [
    `${baseUrl}/translate_a/single`,
    "?client=gtx",
    "&dt=rm", // transliteration of source and translated texts
    "&dj=1", // resp in json
    "&dt=t", // return sentences
    "&dt=md", // definitions of source text, if it's one word
    "&dt=bd", // dict
    "&dt=ex", // dict
    "&dt=at", // alternative_translations
  ].join("");
  return (_query: string): RequestInfo => publicUrl;
};

const getOpts = (query: string, to: LanguageCode, apiKey?: string, from?: string): RequestInit => {
  const data = {
    sl: from || "auto",
    tl: to,
    q: query,
  };
  return {
    headers: {
      "Content-Type": "application/x-www-form-urlencoded;charset=utf-8",
    },
    method: "POST",
    body: new URLSearchParams(data).toString(),
  };
};
/*
 * parser functions
 */

const parseData = (data: GooglResult): DefsBody<DefinitionItem> => {
  const { src, definitions = [] } = data;
  return { definitions, src };
};
const parseDef = (def: DefinitionItem): DefItem[] => {
  const parseEntry = (entry: { gloss: string; example: string; definition_id: string }) => {
    const markdown =
      entry.example &&
      `#### Definition
## ${entry.gloss}
#### Example
> ${entry.example}
`;
    return {
      key: entry.definition_id,
      id: `${markdown ? "detail-" : ""}${entry.definition_id}`,
      title: entry.gloss,
      subtitle: entry.example,
      markdown: markdown,
    };
  };
  return def.entry.map((entry) => parseEntry(entry));
};
const parsePos = (def: DefinitionItem): string => def.pos;
const _parseDict = (data: GooglResult): DefItem[] => {
  const { dict: dictList = [] } = data;
  return dictList?.map((dict, idx) => {
    const { pos, terms } = dict;
    const posAbbr = Object.keys(knownPos).find((abbr) => pos.startsWith(abbr));
    return {
      id: `dict-${pos || `other${idx}`}`,
      icon: (posAbbr && `${posAbbr}.png`) || `idx${idx + 1}.png`,
      title: terms.join(", "),
    };
  });
};
const parseHeader = (data: GooglResult, transCode: LanguageCode = "en"): DefItem[] => {
  const { sentences } = data;
  const [trans, translit] = sentences;
  const webUrl = `${baseUrl}/#auto/${transCode}/${trans.orig}`;
  return [
    {
      id: `header-${trans.trans}`,
      title: `${trans.trans}`,
      subtitle: translit?.translit && ` [${translit?.translit}]`,
      metaData: {
        toClipboard: [trans.trans, trans.orig],
        url: webUrl,
        supportTTS: [trans.trans, trans.orig],
      },
    },
    ..._parseDict(data),
  ];
};

const parseTTS = async (query: string, transCode: LanguageCode, data: GooglResult): Promise<[string, string]> => {
  const {
    sentences: [trans],
    src,
  } = data;
  const ttsParams = (tl: LanguageCode, q: string) => {
    const urlParams: Record<string, string> = {
      client: "gtx",
      idx: "0",
      total: "1",
      textlen: `${q.length}`,
      q,
      tl,
    };
    return new URLSearchParams(urlParams).toString();
  };
  let response = await fetch(`${baseUrl}/translate_tts?${ttsParams(src, trans.orig)}`);
  const ttsSrc = await response.arrayBuffer();
  const srcPath = `${os.tmpdir()}/raycast-dictionary-source.mp3`;
  await fs.promises.writeFile(srcPath, Buffer.from(ttsSrc));

  response = await fetch(`${baseUrl}/translate_tts?${ttsParams(transCode, trans.trans)}`);
  const ttsTrans = await response.arrayBuffer();
  const transPath = `${os.tmpdir()}/raycast-dictionary-trans.mp3`;
  await fs.promises.writeFile(transPath, Buffer.from(ttsTrans));
  return [trans.trans, trans.orig];
};
const GoogleEngine: EngineHookProps<GooglResult, DefinitionItem> = {
  key: "googl",
  baseUrl: baseUrl,
  title: "Google Translation",
  fallbackSearch: true,
  getUrl: prepareRequestUrl(),
  getOpts,
  parseData,
  parseDef,
  parsePos,
  parseExtras: parseHeader,
  parseTTS,
};
export default GoogleEngine;
