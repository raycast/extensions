import { DefsBody, LanguageCode } from "../types";
import { EngineHookProps } from "./types";
const baseUrl = "https://www.urbandictionary.com/define.php";
type Endpoint = "define" | "autocomplete-extra";
interface AutoCompleteItem {
  term: string;
  preview: string;
}
type AutoCompleteResults = {
  results: AutoCompleteItem[];
};

interface DefineItem {
  definition: string;
  example: string;
  permalink: string;
  thumbs_up: number;
  thumbs_down: number;
  word: string;
  defid: number;
}

type DefineList = {
  list: DefineItem[];
};

const prepareRequestUrl = (endpoint: Endpoint): ((query: string) => RequestInfo) => {
  return (query: string): RequestInfo => {
    const term = query.replace(/ /g, "+");
    return `https://api.urbandictionary.com/v0/${endpoint}?term=${term}`;
  };
};

const parseListDef = (def: AutoCompleteItem) => {
  const { term, preview } = def;
  const getTerm = encodeURIComponent(term);
  const webUrl = `${baseUrl}?term=${getTerm}`;
  return {
    key: getTerm,
    id: getTerm,
    title: term,
    subtitle: preview,
    metaData: {
      url: webUrl,
      nestedView: {
        type: "listDetail" as const,
        depEngine: "urbandefne",
      },
    },
  };
};
const parseDetailDef = (def: DefineItem) => {
  const { definition, example, permalink, word, defid } = def;
  const regex = /\[([^\]]+)\]/g;
  const linkUrl = (term: string) => `${baseUrl}?term=${encodeURIComponent(term)}`;
  const encode = (str: string) => str.replace(regex, (_, term) => `[${term}](${linkUrl(term)})`);
  const markdown = `#### Definition
## ${encode(definition)}
#### Example
> ${encode(example)}

#### 👍   ${def.thumbs_up}   |   👎   ${def.thumbs_down}

`;
  return {
    key: defid,
    id: defid.toString(),
    title: word,
    markdown,
    metaData: {
      url: permalink,
    },
  };
};

export const UrbanDefineEngine: EngineHookProps<DefineList, DefineItem> = {
  key: "urbandefine",
  baseUrl: baseUrl,
  title: "Urban Dictionary Result",
  getUrl: prepareRequestUrl("define"),
  parseData: (data: DefineList): DefsBody<DefineItem> => ({ definitions: data.list }),
  parseDef: parseDetailDef,
};
const getEmptyViewProps = (_lang: LanguageCode, query: string) => {
  const title: string = query
    ? `Sorry, There are no results for: ${query} on Urban Dictionary.`
    : `Look up any word on Urban Dictionary.`;
  const description: string = query
    ? `Try looking up other dictionaries by using the dropdown menu or typing command: '-set engine ...'.`
    : "";
  return { title, description };
};

const UrbanListEngine: EngineHookProps<AutoCompleteResults, AutoCompleteItem> = {
  key: "urban",
  baseUrl: baseUrl,
  title: "Urban Dictionary",
  getUrl: prepareRequestUrl("autocomplete-extra"),
  parseData: (data: AutoCompleteResults): DefsBody<AutoCompleteItem> => ({ definitions: data.results }),
  parseDef: parseListDef,
  getEmptyViewProps,
};
export default UrbanListEngine;
