import got, { HTTPError } from "got";

const BASE_URL = "https://api.modrinth.com/v2/";

export type PaginatedResponse<T> = {
  hits: T[];
  offset: number;
  limit: number;
  total_hits: number;
};

export async function get<T>(
  path: string,
  queryParams?: Record<string, string | number | boolean | null | undefined>,
): Promise<T> {
  try {
    return await got(BASE_URL + path, {
      searchParams: queryParams,
      responseType: "json",
    }).json();
  } catch (error: unknown) {
    if (error instanceof HTTPError) {
      throw new Error(`Failed to fetch ${error.response.statusCode}`);
    }

    throw new Error("An unknown error occurred");
  }
}
