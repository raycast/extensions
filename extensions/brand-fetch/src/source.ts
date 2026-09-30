import axios from "axios";
import { RetrieveBrandResponse, SearchBrandKeyword } from "./source.types";

export async function retrieveBrand(key: string, domain: string): Promise<RetrieveBrandResponse> {
  const { data, status } = await axios.get<RetrieveBrandResponse>(`https://api.brandfetch.io/v2/brands/${domain}`, {
    headers: {
      Authorization: `Bearer ${key}`,
    },
    timeout: 30 * 1000,
    validateStatus() {
      return true;
    },
  });

  if (status != 200) {
    throw new Error(data.message);
  }

  return data;
}

export async function searchBrandKeyword(key: string): Promise<SearchBrandKeyword[]> {
  const { data } = await axios.get<SearchBrandKeyword[]>(`https://api.brandfetch.io/v2/search/${key}`);

  if (data.length == 0) {
    throw new Error(`no results found`);
  }

  return data;
}
