import axios, { AxiosInstance, AxiosRequestHeaders } from "axios";
import { preferences, showToast, ToastStyle } from "@raycast/api";

export enum Product {
  PROJECT = "project",
  WIKI = "wiki"
}

class Client {
  public readonly baseURL: string;
  private readonly baseAPI: string;
  private readonly teamUUID: string;
  private readonly userUUID: string;
  private readonly token: string;
  private readonly http: AxiosInstance;

  public constructor(baseAPI: string, teamUUID: string, userUUID: string, token: string) {
    this.baseAPI = baseAPI;
    this.baseURL = `https://ones.ai/project/#/team/${teamUUID}`;
    this.token = token;
    this.userUUID = userUUID;
    this.teamUUID = teamUUID;
    this.http = this.createHttpClient();
  }

  public get(product: Product, url: string, params?: { [key: string]: any }): Promise<any> {
    if (!this.http) {
      return Promise.reject("http not initialized");
    }
    url = `${this.baseAPI}/${product}/team/${this.teamUUID}/${url}`;
    return this.http.get(url, { params });
  }

  public post(product: Product, url: string, data?: { [key: string]: any }): Promise<any> {
    if (!this.http) {
      return Promise.reject("http not initialized");
    }
    url = `${this.baseAPI}/${product}/team/${this.teamUUID}/${url}`;
    return this.http.post(url, data);
  }

  private createHttpClient() {
    const httpClient = axios.create({
      baseURL: this.baseAPI,
      timeout: 30000
    });
    httpClient.interceptors.request.use((config) => {
      if (config.headers === undefined) {
        config.headers = {} as AxiosRequestHeaders;
      }
      config.headers["Ones-User-ID"] = this.userUUID ? this.userUUID : "";
      config.headers["Ones-Auth-Token"] = this.token ? this.token : "";
      return config;
    }, function(err) {
      showToast(ToastStyle.Failure, "request failed", (err as Error).message);
      return Promise.reject(err);
    });
    httpClient.interceptors.response.use((response) => {
      if (response.status === 200) {
        return response.data;
      }
      showToast(ToastStyle.Failure, "request failed", response.statusText);
      return Promise.reject(response);
    }, function(err) {
      showToast(ToastStyle.Failure, "request failed", (err as Error).message);
      return Promise.reject(err);
    });
    return httpClient;
  }
}

export default new Client(
  preferences.baseAPI.value as string,
  preferences.teamUUID.value as string,
  preferences.userUUID.value as string,
  preferences.token.value as string
);