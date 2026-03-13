import { template, templateSettings } from "lodash-es";
import { isValidTxHash } from "./isValidTxHash";

templateSettings.interpolate = /{([\s\S]+?)}/g;

export function createExplorer({ url, coin, typeMap }: Option) {
  return function explorer(query: string) {
    if (!coin) {
      return template(url)({ query });
    }
    let type = "address";
    if (isValidTxHash(coin, query)) {
      type = "transaction";
    }
    const newType = typeMap ? typeMap[type] || type : type;
    return template(url)({ query, type: newType });
  };
}

interface Option {
  url: string;
  coin?: string;
  typeMap?: Record<string, string>;
}
