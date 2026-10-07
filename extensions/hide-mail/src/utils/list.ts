import { getApiKey } from "./key";
import { getApiUrl, getHeaders } from "../config";
import { InvalidApiKeyError } from "./invalid-key";

export interface Alias {
  email: string;
  isActive: boolean;
  note: string;
  totalBlocked: number;
  totalForwarded: number;
  createdAt: Date;
  updatedAt: Date;
}

interface AliasResponse {
  email: string;
  is_active: boolean;
  note: string | null;
  total_blocked: number;
  total_forwarded: number;
  created_at: string;
  updated_at: string;
}

interface ListResponse {
  data: AliasResponse[];
  total: number;
}

const PAGE_SIZE = 100;

/** The API returns UTC timestamps as "Y-m-d H:i:s" */
const parseApiDate = (value: string) => new Date(`${value.replace(" ", "T")}Z`);

const toAlias = (alias: AliasResponse): Alias => ({
  email: alias.email,
  isActive: alias.is_active,
  note: alias.note ?? "",
  totalBlocked: alias.total_blocked,
  totalForwarded: alias.total_forwarded,
  createdAt: parseApiDate(alias.created_at),
  updatedAt: parseApiDate(alias.updated_at),
});

export const listAllAliases = async (): Promise<Alias[]> => {
  const headers = getHeaders(getApiKey());

  let pageNum = 1;
  let totalPages = 1;
  let all: Alias[] = [];

  do {
    const res = await fetch(`${getApiUrl()}/aliases?page[number]=${pageNum}&page[size]=${PAGE_SIZE}`, {
      headers,
    });

    if (res.status === 401) {
      throw new InvalidApiKeyError();
    }

    if (!res.ok) {
      throw new Error(`HideMail API responded with ${res.status}`);
    }

    const data = (await res.json()) as ListResponse;
    totalPages = Math.ceil(data.total / PAGE_SIZE);
    all = all.concat(data.data.map(toAlias));
    pageNum++;
  } while (pageNum <= totalPages);

  return all;
};
