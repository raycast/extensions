import { Cache } from "@raycast/api";
import axios from "axios";
import { CACHE_TTL, CACHE_KEY } from "../constants/config";
import { getAcronym } from "../utils/getAcronym";
import { Cache as CacheScheme } from "../types/cache";
import { EBirdTaxon } from "../types/ebird";

/**
 * @apiDoc https://documenter.getpostman.com/view/664302/S1ENwy59
 */
abstract class IEbirdClient {
  abstract listTaxons(): Promise<{ taxons: EBirdTaxon[] }>;
  abstract resetCache(): Promise<void>;
}

export class EbirdClient implements IEbirdClient {
  constructor(ebirdApiToken: string) {
    axios.defaults.headers["x-ebirdapitoken"] = ebirdApiToken;
    axios.defaults.baseURL = "https://api.ebird.org/v2";
  }

  async listTaxons() {
    const cache = new Cache();
    const cacheItem = cache.get(CACHE_KEY);
    const cached: CacheScheme = cacheItem ? JSON.parse(cacheItem) : null;

    if (cached && cached.timeout && cached.timeout > new Date().getTime()) {
      return { taxons: cached.taxons };
    }

    const params = new URLSearchParams();
    params.append("fmt", "json");
    const response = await axios.get<EBirdTaxon[]>("/ref/taxonomy/ebird", { params });

    const taxons = response.data.map((taxon) => ({
      ...taxon,
      acronym: getAcronym(taxon.comName),
    }));

    cache.set(CACHE_KEY, JSON.stringify({ taxons, timeout: new Date().getTime() + CACHE_TTL }));

    return { taxons };
  }

  async resetCache() {
    const cache = new Cache();
    cache.remove(CACHE_KEY);
  }
}
