import { URL } from "url";
import { Docset } from "../types";
import pkg from "../../package.json";

export const getFilteredDocsets = (docsets: Docset[], searchText: string) =>
  docsets.filter(
    (docset) =>
      docset.docsetName.toLowerCase().includes(searchText.toLowerCase()) ||
      docset.docsetKeyword.toLowerCase().includes(searchText.toLowerCase()),
  );

export const getDocsetByKeyword = (docsets: Docset[], keyword: string) => {
  if (!keyword) return;
  return docsets.find((docset) => docset.docsetKeyword.toLowerCase() === keyword.toLowerCase());
};

export const createDeeplinkForDocset = (docset: string) => {
  let deeplink = `raycast://extensions/${pkg.author}/dash/docset`;
  const url = new URL(deeplink);
  url.searchParams.set(
    "arguments",
    JSON.stringify({
      docset,
    }),
  );
  deeplink = url.toString();
  return deeplink;
};
