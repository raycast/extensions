import { toLower } from "lodash";
export function shortHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash = hash & hash;
  }
  return hash.toString(32);
}
export const createTranslationKey = (fromTo, text) => shortHash(`${fromTo}-${toLower(text)}`);
