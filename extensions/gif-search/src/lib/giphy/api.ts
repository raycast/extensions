/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable no-dupe-class-members */

// This is a duplicated version for Giphy, but it adds the AbortSignal to the request
// Original: https://github.com/Giphy/giphy-js/blob/master/packages/fetch-api/src/api.ts

import { getPingbackId } from "@giphy/js-util";
import { normalizeGif, normalizeGifs } from "./normalize";
import {
  CategoriesOptions,
  MediaType,
  PaginationOptions,
  RandomOptions,
  RelatedOptions,
  SearchOptions,
  SubcategoriesOptions,
  TrendingOptions,
  TypeOption,
} from "@giphy/js-fetch-api";
import request from "./request";
import { CategoriesResult, ChannelsResult, GifResult, GifsResult, NonPaginatedGifsResult } from "@giphy/js-fetch-api";

type GifID = string | number;

type WithSignal = { signal?: AbortSignal };
type SearchOptionsWithSignal = SearchOptions & WithSignal;
type TrendingOptionsWithSignal = TrendingOptions & WithSignal;
type RandomOptionsWithSignal = RandomOptions & WithSignal;
type RelatedOptionsWithSignal = RelatedOptions & WithSignal;
type CategoriesOptionsWithSignal = CategoriesOptions & WithSignal;

const getType = (options?: TypeOption): MediaType => (options && options.type ? options.type : "gifs");
/**
 * @class GiphyFetch
 * @param {string} apiKey
 * @param {object} qsParams
 */
export class GiphyFetch {
  constructor(apiKey: string, qsParams: Record<string, string> = {}) {
    this.apiKey = apiKey;
    this.qsParams = qsParams;
  }

  /**
   * @hidden
   */
  private apiKey: string;

  /**
   * @hidden
   */
  private qsParams: Record<string, string>;
  /**
   * @hidden
   */
  private getQS = (options: any = {}) => {
    // remove 'signal' from options
    delete options.signal;

    // remove undefined values
    Object.keys(options).forEach((key) => options[key] === undefined && delete options[key]);

    const searchParams = new URLSearchParams({
      ...options,
      api_key: this.apiKey,
      pingback_id: getPingbackId(),
      ...this.qsParams,
    });
    return searchParams.toString();
  };

  /**
   * A list of categories
   *
   * @param {CategoriesOptionsWithSignal} [options]
   * @returns {Promise<CategoriesResult>}
   */
  categories(options?: CategoriesOptionsWithSignal): Promise<CategoriesResult> {
    return request(`gifs/categories?${this.getQS(options)}`, { signal: options?.signal }) as Promise<CategoriesResult>;
  }

  /**
   * Get a single gif by a id
   * @param {string} id
   * @returns {Promise<GifsResult>}
   **/
  gif(id: string, options?: { internal?: boolean; signal?: AbortSignal }): Promise<GifResult> {
    // there is an internal endpoint that has more metadata available only specific api keys
    const prefix = options?.internal ? "internal/" : "";
    return request(`${prefix}gifs/${id}?${this.getQS()}`, {
      normalizer: normalizeGif,
      signal: options?.signal,
    }) as Promise<GifResult>;
  }

  /**
   *
   * @function
   * Get gifs by an array of ids
   * @param {string[]} ids
   *
   * @function
   * Get gifs by category and subcategory
   * @param {string} category
   * @param {string} subcategory
   * @returns {Promise<GifsResult>}
   **/
  gifs(ids: string[], opts?: WithSignal): Promise<GifsResult>;
  gifs(category: string, subcategory: string, opts?: WithSignal): Promise<GifsResult>;
  gifs(arg1: any, arg2?: string | WithSignal, args3?: WithSignal): Promise<GifsResult> {
    if (Array.isArray(arg1)) {
      const { signal } = arg2 as WithSignal;
      return request(`gifs?${this.getQS({ ids: arg1.join(",") })}`, {
        normalizer: normalizeGifs,
        signal,
      }) as Promise<GifsResult>;
    }
    const { signal } = args3 as WithSignal;
    return request(`gifs/categories/${arg1}/${arg2}?${this.getQS()}`, {
      normalizer: normalizeGifs,
      signal,
    }) as Promise<GifsResult>;
  }

  emoji(options?: PaginationOptions): Promise<GifsResult> {
    return request(`emoji?${this.getQS(options)}`, { normalizer: normalizeGifs }) as Promise<GifsResult>;
  }

  /**
   * Returns a list of all the default emoji variations
   *
   * @param {PaginationOptions} options
   * @returns {Promise<GifsResult>}
   **/
  emojiDefaultVariations(options?: PaginationOptions): Promise<GifsResult> {
    return request(`emoji?${this.getQS(options)}`, {
      apiVersion: 2,
      normalizer: normalizeGifs,
    }) as Promise<GifsResult>;
  }

  /**
   * Returns a list of gifs representing all the variations for the emoji
   *
   * @param {string} id
   * @returns {Promise<NonPaginatedGifsResult>}
   **/
  emojiVariations(id: GifID): Promise<NonPaginatedGifsResult> {
    return request(`emoji/${id}/variations?${this.getQS()}`, {
      apiVersion: 2,
      normalizer: normalizeGifs,
    }) as Promise<GifsResult>;
  }

  animate(text: string, options: PaginationOptions = {}): Promise<GifsResult> {
    const qsParams = this.getQS({ ...options, m: text });
    return request(`text/animate?${qsParams}`, { normalizer: normalizeGifs }) as Promise<GifsResult>;
  }

  /**
   * @param term: string The term you're searching for
   * @param options: SearchOptions
   * @returns {Promise<GifsResult>}
   **/
  search(term: string, options: SearchOptionsWithSignal = {}): Promise<GifsResult> {
    const q = options.channel ? `@${options.channel} ${term}` : term;
    let excludeDynamicResults;
    if (options.type === "text") {
      excludeDynamicResults = true;
    }
    const qsParams = this.getQS({ rating: "pg-13", ...options, q, excludeDynamicResults });
    return request(`gifs/search?${qsParams}`, {
      normalizer: normalizeGifs,
      signal: options.signal,
    }) as Promise<GifsResult>;
  }

  /**
   * Get a list of subcategories
   * @param {string} category
   * @param {SubcategoriesOptions} options
   * @returns {Promise<CategoriesResult>}
   */
  subcategories(category: string, options?: SubcategoriesOptions): Promise<CategoriesResult> {
    return request(`gifs/categories/${category}?${this.getQS(options)}`) as Promise<CategoriesResult>;
  }

  /**
   * Get trending gifs
   *
   * @param {TrendingOptions} options
   * @returns {Promise<GifsResult>}
   */
  trending(options: TrendingOptionsWithSignal = {}): Promise<GifsResult> {
    return request(`${getType(options)}/trending?${this.getQS({ rating: "pg-13", ...options })}`, {
      normalizer: normalizeGifs,
      signal: options.signal,
    }) as Promise<GifsResult>;
  }

  /**
   * Get a random gif
   * @param {RandomOptionsWithSignal} options
   * @returns {Promise<GifResult>}
   **/
  random(options?: RandomOptionsWithSignal): Promise<GifResult> {
    return request(`${getType(options)}/random?${this.getQS({ rating: "pg-13", ...options })}`, {
      noCache: true,
      normalizer: normalizeGif,
      signal: options?.signal,
    }) as Promise<GifResult>;
  }

  /**
   * Get related gifs by a id
   * @param {string} id
   * @param {RelatedOptionsWithSignal} options
   * @returns {Promise<GifsResult>}
   **/
  related(id: string, options: RelatedOptionsWithSignal = {}): Promise<GifsResult> {
    const { type = "gifs" } = options;
    return request(
      `${type}/related?${this.getQS({
        gif_id: id,
        rating: "pg-13",
        ...options,
      })}`,
      { normalizer: normalizeGifs, signal: options.signal },
    ) as Promise<GifsResult>;
  }

  /**
   * Search for channels based on a term
   * @param {string} term
   * @param {SearchOptionsWithSignal} options: SearchOptions
   * @returns {Promise<ChannelsResult>}
   **/
  channels(term: string, options: SearchOptionsWithSignal = {}): Promise<ChannelsResult> {
    return request(`channels/search?${this.getQS({ q: term, rating: "pg-13", ...options })}`, {
      signal: options.signal,
    }) as Promise<ChannelsResult>;
  }
}
export default GiphyFetch;
