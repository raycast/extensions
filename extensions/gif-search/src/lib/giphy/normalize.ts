/* eslint-disable @typescript-eslint/no-explicit-any */

// This is a duplicated version for Giphy, but it adds the AbortSignal to the request
// Original: https://github.com/Giphy/giphy-js/blob/master/packages/fetch-api/src/normalize/gif.ts

import { IGif } from "@giphy/js-types";
import { GifResult, GifsResult } from "@giphy/js-fetch-api";

/**
 * @hidden
 */
export const BOOL_PROPS = [
  "is_anonymous",
  "is_community",
  "is_featured",
  "is_hidden",
  "is_indexable",
  "is_preserve_size",
  "is_realtime",
  "is_removed",
  "is_sticker",
  "is_dynamic", // not finalized, and not adding to Gif type until type RFC is finished
];

/**
 * @hidden
 */
export const USER_BOOL_PROPS = ["suppress_chrome", "is_public", "is_verified"];

const makeBool = (obj: any) => (prop: string) => (obj[prop] = !!obj[prop]);

type Tag = { text: string };

// tags sometimes are objects that have a text prop, sometimes they're strings
const getTag = (tag: Tag | string) => (typeof tag === "string" ? (tag as string) : (tag as Tag).text);

const normalize = (gif: any) => {
  const newGif: IGif = { ...gif };
  newGif.id = String(newGif.id);
  newGif.tags = (newGif.tags || []).map(getTag);
  BOOL_PROPS.forEach(makeBool(newGif));
  Object.keys(newGif.images || {}).forEach((name: string) => {
    const img = newGif.images[name as "fixed_height" | "fixed_width" | "fixed_height_still" | "fixed_width_still"];
    img.width = parseInt(img.width as unknown as string);
    img.height = parseInt(img.height as unknown as string);
  });

  const { user } = newGif;
  if (user) {
    const newUser = { ...user };
    USER_BOOL_PROPS.forEach(makeBool(newUser));
    newGif.user = newUser;
  }
  return newGif;
};

/**
 * @hidden
 */
export const normalizeGif = (result: GifResult) => {
  result.data = normalize(result.data);
  return result;
};

/**
 * @hidden
 */
export const normalizeGifs = (result: GifsResult) => {
  result.data = result.data.map((gif) => normalize(gif));
  return result;
};
