import axios, { AxiosError, AxiosRequestConfig, AxiosResponse } from "axios";
import { getToken } from "./storage";
import {
  LoginResponse,
  ListReposResponse,
  TwoFactorLoginResponse,
  ErrorResponse,
  UserInfo,
  Tag,
  ListTagsResponse,
  SearchResponse,
  ExtensionsResponse,
  ExtensionMetadata,
  SearchParams,
  SourceType,
} from "./types";
import { formatDate, formatSize, generateRepoURL } from "./utils";
import { ListAccessTokensResponse, AccessToken } from "./types";

const baseURL = "https://hub.docker.com";
const loginURL = "/v2/users/login?refresh_token=true";
const twoFactorLoginURL = "/v2/users/2fa-login?refresh_token=true";
const reposURL = "/v2/repositories";
const userURL = "/v2/user/";
const extensionsURL = "/v2/extensions";
const accessTokensURL = "/v2/access-tokens";

const searchURL = "https://hub.docker.com/api/search/v3/catalog/search";
export const TwoFactorDetailMessage = "Require secondary authentication on MFA enabled account";

export class Hub {
  #username: string;
  #password: string;
  #token = "";

  #client = axios.create({
    baseURL: baseURL,
    timeout: 60000,
    headers: {
      "Content-Type": "application/json",
    },
  });

  constructor(username?: string, password?: string) {
    this.#username = username ?? "";
    this.#password = password ?? "";

    this.#client.interceptors.request.use(
      async (config: AxiosRequestConfig) => {
        if (this.#token === "") {
          this.#token = await getToken();
        }
        if (this.#token !== "") {
          config.headers = {
            Authorization: `Bearer ${this.#token}`,
            ...config.headers,
          };
        }
        return config;
      },
      (err) => {
        return Promise.reject(err);
      },
    );
    this.#client.interceptors.response.use(
      (resp: AxiosResponse) => {
        return resp;
      },
      async (err: AxiosError) => {
        if (err.response) {
          const res = err.response.data as ErrorResponse;
          if (res.detail === TwoFactorDetailMessage) {
            return Promise.resolve(err.response);
          }
          const errMsg = res.message || res.detail || `bad status code ${err.response?.status}: ${err.response?.data}`;
          return Promise.reject(new Error(errMsg));
        }
        return Promise.reject(err);
      },
    );
  }

  async login(signal?: AbortSignal): Promise<LoginResponse> {
    const data = {
      username: this.#username,
      password: this.#password,
    };
    const resp = await this.#client.post(loginURL, data, { signal, baseURL });
    return resp.data as LoginResponse;
  }

  async twoFactorLogin(token: string, code: string): Promise<TwoFactorLoginResponse> {
    const data = {
      login_2fa_token: token,
      code: code,
    };
    const resp = await this.#client.post(twoFactorLoginURL, data, { baseURL });
    return resp.data as TwoFactorLoginResponse;
  }

  async listRepos(props: { account: string; signal?: AbortSignal; searchName?: string }): Promise<ListReposResponse> {
    const url = `${reposURL}/${props.account}`;
    const params = {
      page_size: 100,
      page: 1,
      ordering: "last_updated",
      name: props.searchName ?? "",
    };
    const resp = await this.#client.get(url, { params, signal: props.signal });
    const data = resp.data as ListReposResponse;
    data.results = data.results.map((item) => {
      item.url = generateRepoURL(item.namespace, item.name);
      item.path = `${item.namespace}/${item.name}`;
      return item;
    });
    return resp.data as ListReposResponse;
  }

  async deleteRepo(repo: string) {
    const url = `${reposURL}/${repo}`;
    await this.#client.delete(url);
  }

  async getUserInfo(signal?: AbortSignal): Promise<UserInfo> {
    const resp = await this.#client.get(userURL, { signal });
    return resp.data as UserInfo;
  }

  async listTags(repo: string, searchName: string, signal?: AbortSignal): Promise<ListTagsResponse> {
    let layer: string;
    if (repo.includes("/")) {
      layer = repo;
    } else {
      layer = `${repo}/library/${repo}`;
      repo = `library/${repo}`;
    }
    const url = `${reposURL}/${repo}/tags/`;
    const params = {
      page_size: 100,
      page: 1,
      ordering: "last_updated",
      name: searchName,
    };
    const resp = await this.#client.get(url, { params, signal: signal });

    const result = resp.data as ListTagsResponse;
    result.results = result.results.map((tag: Tag) => {
      tag.last_updated = formatDate(tag.last_updated);
      tag.images = tag.images?.map((image) => {
        image.os_arch = `${image.os}/${image.architecture}`;
        if (image.digest) {
          const digest = image.digest.replace(":", "-");
          image.url = `https://hub.docker.com/layers/${layer}/${tag.name}/images/${digest}`;
        }
        image.sizeHuman = formatSize(image.size);
        return image;
      });
      return tag;
    });
    return result;
  }

  async search(params: SearchParams, signal?: AbortSignal): Promise<SearchResponse> {
    const resp = await this.#client.get(searchURL, {
      params,
      signal,
    });
    const res = resp.data as SearchResponse;
    if (!res.results) {
      return res;
    }
    res.results = res.results?.map((summary) => {
      if (summary.source === SourceType.STORE) {
        summary.url = `https://hub.docker.com/_/${summary.slug}`;
      } else {
        summary.url = `https://hub.docker.com/r/${summary.slug}`;
      }
      return summary;
    });
    return res;
  }

  async searchExtensions(query: string, signal?: AbortSignal): Promise<ExtensionMetadata[]> {
    const url = `${extensionsURL}/marketplace.json`;
    const resp = await this.#client.get(url, { signal });
    const res = resp.data as ExtensionsResponse;
    const extensions = res.extensions.filter((ext) => ext.toLowerCase().includes(query.toLowerCase()));
    const result: ExtensionMetadata[] = [];
    const extPros = extensions.map((ext) =>
      this.#client.get(`${extensionsURL}/${ext.replace("/", "_")}/metadata.json`).then((resp) => {
        const meta = resp.data as ExtensionMetadata;
        meta.path = ext;
        meta.url = `https://hub.docker.com/extensions/${ext}`;
        result.push(meta);
      }),
    );
    await Promise.all(extPros);
    return result;
  }

  async createAccessToken(data: { token_label: string; scopes: string[] }, signal?: AbortSignal): Promise<AccessToken> {
    const resp = await this.#client.post(accessTokensURL, data, { signal });
    return resp.data as AccessToken;
  }

  async listAccessTokens(
    params: { page: number; page_size: number } | any,
    signal?: AbortSignal,
  ): Promise<ListAccessTokensResponse> {
    const resp = await this.#client.get(accessTokensURL, { params, signal });
    const res = resp.data as ListAccessTokensResponse;
    res.results = res.results.map((token) => {
      if (token.last_used) {
        token.last_used = formatDate(token.last_used);
      }
      return token;
    });
    return res;
  }

  async deleteAccessToken(uuid: string) {
    const url = `${accessTokensURL}/${uuid}`;
    await this.#client.delete(url);
  }

  async updateAccessToken(uuid: string, data: { token_label: string; is_active: boolean }, signal?: AbortSignal) {
    const url = `${accessTokensURL}/${uuid}`;
    await this.#client.patch(url, data, { signal });
  }
}
