/* eslint-disable  @typescript-eslint/no-explicit-any */

export enum ContentType {
  Json = "application/json",
  FormData = "multipart/form-data",
  UrlEncoded = "application/x-www-form-urlencoded",
  Text = "text/plain",
}

export type QueryParamsType = Record<string | number, any>;

export type ResponseFormat = keyof Omit<Body, "body" | "bodyUsed">;

export interface FullRequestParams extends Omit<RequestInit, "body"> {
  /** set parameter to `true` for call `securityWorker` for this request */
  secure?: boolean;
  /** request path */
  path: string;
  /** content type of request body */
  type?: ContentType;
  /** query params */
  query?: QueryParamsType;
  /** format of response (i.e. response.json() -> format: "json") */
  format?: ResponseFormat;
  /** request body */
  body?: unknown;
  /** base url */
  baseUrl?: string;
}

export type RequestParams = Omit<FullRequestParams, "body" | "method" | "query" | "path">;

export interface ApiConfig {
  baseUrl?: string;
  baseApiParams?: Omit<RequestParams, "baseUrl" | "cancelToken" | "signal">;
  customFetch?: typeof fetch;
}

export interface HttpResponse<D, E = unknown> {
  response: Response;
  data: D;
  error: E;
}

export class HttpClient {
  public baseUrl: string = "{protocol}://{hostpath}";

  private baseApiParams: RequestParams = {
    credentials: "same-origin",
    headers: {},
    redirect: "follow",
    referrerPolicy: "no-referrer",
  };

  constructor(apiConfig: ApiConfig = {}) {
    Object.assign(this, apiConfig);
  }

  protected encodeQueryParam(key: string, value: any) {
    const encodedKey = encodeURIComponent(key);
    return `${encodedKey}=${encodeURIComponent(typeof value === "number" ? value : `${value}`)}`;
  }

  protected addQueryParam(query: QueryParamsType, key: string) {
    return this.encodeQueryParam(key, query[key]);
  }

  protected addArrayQueryParam(query: QueryParamsType, key: string) {
    const value = query[key];
    return value.map((v: any) => this.encodeQueryParam(key, v)).join("&");
  }

  protected toQueryString(rawQuery?: QueryParamsType): string {
    const query = rawQuery || {};
    const keys = Object.keys(query).filter((key) => "undefined" !== typeof query[key]);
    return keys
      .map((key) => (Array.isArray(query[key]) ? this.addArrayQueryParam(query, key) : this.addQueryParam(query, key)))
      .join("&");
  }

  protected addQueryParams(rawQuery?: QueryParamsType): string {
    const queryString = this.toQueryString(rawQuery);
    return queryString ? `?${queryString}` : "";
  }

  private contentFormatters: Record<ContentType, (input: any) => any> = {
    [ContentType.Json]: (input: any) =>
      input !== null && (typeof input === "object" || typeof input === "string") ? JSON.stringify(input) : input,
    [ContentType.Text]: (input: any) => (input !== null && typeof input !== "string" ? JSON.stringify(input) : input),
    [ContentType.FormData]: (input: any) =>
      Object.keys(input || {}).reduce((formData, key) => {
        const property = input[key];
        formData.append(
          key,
          property instanceof Blob
            ? property
            : typeof property === "object" && property !== null
              ? JSON.stringify(property)
              : `${property}`,
        );
        return formData;
      }, new FormData()),
    [ContentType.UrlEncoded]: (input: any) => this.toQueryString(input),
  };

  protected mergeRequestParams(params1: RequestParams, params2?: RequestParams): RequestParams {
    return {
      ...this.baseApiParams,
      ...params1,
      ...(params2 || {}),
      headers: {
        ...(this.baseApiParams.headers || {}),
        ...(params1.headers || {}),
        ...((params2 && params2.headers) || {}),
      },
    };
  }

  public request = <T = any, E = any>({ body, path, type, query, format, baseUrl, ...params }: FullRequestParams) => {
    const requestParams = this.mergeRequestParams(params, {});
    const queryString = query && this.toQueryString(query);
    const payloadFormatter = this.contentFormatters[type || ContentType.Json];
    const responseFormat = format || requestParams.format;

    const parseResponse = async (response: Response) => {
      const r: HttpResponse<T, E> = {
        data: null as unknown as T,
        error: null as unknown as E,
        response,
      };

      const data = !responseFormat
        ? r
        : await response[responseFormat]()
            .then((data) => {
              if (r.response.ok) {
                r.data = data;
              } else {
                r.error = data;
              }
              return r;
            })
            .catch((e) => {
              console.log("err");
              r.error = e;
              return r;
            });

      if (!response.ok) {
        throw data;
      }

      return data;
    };

    return [
      `${baseUrl || this.baseUrl || ""}${path}${queryString ? `?${queryString}` : ""}`,
      {
        ...requestParams,
        headers: {
          ...(requestParams.headers || {}),
          ...(type && type !== ContentType.FormData ? { "Content-Type": type } : {}),
        },
        body: typeof body === "undefined" || body === null ? null : payloadFormatter(body),
        parseResponse,
      },
    ] as const;
  };
}

export enum DownloadProtocol {
  Unknown = "unknown",
  Usenet = "usenet",
  Torrent = "torrent",
}

export interface IndexerCategory {
  /** @format int32 */
  id?: number;
  name?: string | null;
  description?: string | null;
  subCategories?: IndexerCategory[] | null;
}

export interface ReleaseResource {
  /** @format int32 */
  id?: number;
  guid?: string | null;
  /** @format int32 */
  age?: number;
  /** @format double */
  ageHours?: number;
  /** @format double */
  ageMinutes?: number;
  /** @format int64 */
  size?: number;
  /** @format int32 */
  files?: number | null;
  /** @format int32 */
  grabs?: number | null;
  /** @format int32 */
  indexerId?: number;
  indexer?: string | null;
  subGroup?: string | null;
  releaseHash?: string | null;
  title?: string | null;
  sortTitle?: string | null;
  /** @format int32 */
  imdbId?: number;
  /** @format int32 */
  tmdbId?: number;
  /** @format int32 */
  tvdbId?: number;
  /** @format int32 */
  tvMazeId?: number;
  /** @format date-time */
  publishDate?: string;
  commentUrl?: string | null;
  downloadUrl?: string | null;
  infoUrl?: string | null;
  posterUrl?: string | null;
  indexerFlags?: string[] | null;
  categories?: IndexerCategory[] | null;
  magnetUrl?: string | null;
  infoHash?: string | null;
  /** @format int32 */
  seeders?: number | null;
  /** @format int32 */
  leechers?: number | null;
  protocol?: DownloadProtocol;
  fileName?: string | null;
  /** @format int32 */
  downloadClientId?: number | null;
}

export class ProwlarrApi extends HttpClient {
  api = {
    /**
     * No description
     *
     * @tags Search
     * @name V1SearchCreate
     * @request POST:/api/v1/search
     * @secure
     */
    v1SearchCreate: (data: ReleaseResource, params: RequestParams = {}) =>
      this.request<ReleaseResource, any>({
        path: `/api/v1/search`,
        method: "POST",
        body: data,
        secure: true,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Search
     * @name V1SearchList
     * @request GET:/api/v1/search
     * @secure
     */
    v1SearchList: (
      query?: {
        query?: string;
        type?: "search" | "tvsearch" | "movie" | "music" | "book";
        indexerIds?: number[];
        categories?: number[];
        /** @format int32 */
        limit?: number;
        /** @format int32 */
        offset?: number;
      },
      params: RequestParams = {},
    ) =>
      this.request<ReleaseResource[], any>({
        path: `/api/v1/search`,
        method: "GET",
        query: query,
        secure: true,
        format: "json",
        ...params,
      }),
  };
}
