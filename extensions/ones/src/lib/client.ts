import axios, { AxiosInstance, AxiosRequestConfig, AxiosRequestHeaders } from "axios";
import { getPreferenceValues, LocalStorage } from "@raycast/api";
import { login } from "./api";
import { Preferences } from "./type";

export enum Product {
  PROJECT = "project",
  WIKI = "wiki",
}

enum StorageKey {
  Token = "ones-token",
  UserUUID = "ones-user-uuid",
  TeamUUID = "ones-team-uuid",
  Email = "ones-email",
  Password = "ones-password",
}

export class Client {
  public readonly url: string;
  public projectBaseURL?: string;
  public wikiBaseURL?: string;
  private readonly baseAPI: string;
  private httpClient?: AxiosInstance;
  private email?: string;
  private password?: string;
  private token?: string;
  private userUUID?: string;
  private teamUUID?: string;

  public constructor(url: string) {
    this.url = url;
    this.baseAPI = `${url}/project/api`;
  }

  public async get(product: Product, url: string, params?: any, signal?: AbortSignal): Promise<any> {
    try {
      if (!this.httpClient) {
        await this.initHttpClient(signal);
        if (!this.httpClient) {
          return Promise.reject(new Error("http client not initialized"));
        }
      }
      url = `${this.baseAPI}/${product}/team/${this.teamUUID}/${url}`;
      return this.httpClient?.get(url, { params, signal });
    } catch (err) {
      return Promise.reject(err);
    }
  }

  public async post(product: Product, url: string, data?: { [key: string]: any }, signal?: AbortSignal): Promise<any> {
    try {
      if (!this.httpClient) {
        await this.initHttpClient(signal);
        if (!this.httpClient) {
          return Promise.reject(new Error("http client not initialized"));
        }
      }
      url = `${this.baseAPI}/${product}/team/${this.teamUUID}/${url}`;
      return this.httpClient.post(url, data, { signal });
    } catch (err) {
      return Promise.reject(err);
    }
  }

  public async setEmail(email: string): Promise<void> {
    this.email = email;
    await LocalStorage.setItem(StorageKey.Email, email);
  }

  public async getEmail(): Promise<string> {
    const email = await LocalStorage.getItem(StorageKey.Email);
    return Promise.resolve(email as string);
  }

  public async setPassword(password: string): Promise<void> {
    this.password = password;
    await LocalStorage.setItem(StorageKey.Password, password);
  }

  public async getPassword(): Promise<string> {
    const password = await LocalStorage.getItem(StorageKey.Password);
    return Promise.resolve(password as string);
  }

  public async setToken(token: string): Promise<void> {
    this.token = token;
    await LocalStorage.setItem(StorageKey.Token, token);
  }

  public async getToken(): Promise<string> {
    const token = await LocalStorage.getItem(StorageKey.Token);
    return Promise.resolve(token as string);
  }

  public async setUserUUID(userUUID: string): Promise<void> {
    this.userUUID = userUUID;
    await LocalStorage.setItem(StorageKey.UserUUID, userUUID);
  }

  public async getUserUUID(): Promise<string> {
    const userUUID = await LocalStorage.getItem(StorageKey.UserUUID);
    return Promise.resolve(userUUID as string);
  }

  public async setTeamUUID(teamUUID: string): Promise<void> {
    this.teamUUID = teamUUID;
    await LocalStorage.setItem(StorageKey.TeamUUID, teamUUID);
  }

  public async getTeamUUID(): Promise<string> {
    const teamUUID = await LocalStorage.getItem(StorageKey.TeamUUID);
    return Promise.resolve(teamUUID as string);
  }

  public async initHttpClient(signal?: AbortSignal): Promise<any> {
    try {
      this.email = await this.getEmail();
      this.password = await this.getPassword();
      this.teamUUID = await this.getTeamUUID();
      const pref = getPreferenceValues<Preferences>();
      if (!this.teamUUID) {
        this.teamUUID = pref.teamUUID;
      }
      this.userUUID = await this.getUserUUID();
      this.token = await this.getToken();
      if (
        !this.teamUUID ||
        !this.userUUID ||
        !this.token ||
        this.email !== pref.email ||
        this.password !== pref.password
      ) {
        await this.setEmail(pref.email);
        await this.setPassword(pref.password);
        const result = await login({ email: this.email, password: this.password }, signal);
        await this.setToken(result.user.token);
        await this.setUserUUID(result.user.uuid);
        this.userUUID = result.user.uuid;
        if (result.teams.length === 1) {
          await this.setTeamUUID(result.teams[0].uuid);
          pref.teamUUID = result.teams[0].uuid;
        }
      }

      this.projectBaseURL = `${this.url}/project/#/team/${this.teamUUID}`;
      this.wikiBaseURL = `${this.url}/wiki/#/team/${this.teamUUID}`;
    } catch (err) {
      return Promise.reject(err);
    }

    this.httpClient = axios.create({
      baseURL: this.baseAPI,
      timeout: 30000,
    });
    this.httpClient.interceptors.request.use(
      (config: AxiosRequestConfig) => {
        if (config.headers === undefined) {
          config.headers = {} as AxiosRequestHeaders;
        }
        config.headers["Ones-User-ID"] = this.userUUID ? this.userUUID : "";
        config.headers["Ones-Auth-Token"] = this.token ? this.token : "";
        return config;
      },
      function (err) {
        return Promise.reject(err);
      },
    );
    this.httpClient.interceptors.response.use(
      (response) => {
        if (response.status === 200) {
          return response.data;
        }
        return Promise.reject(new Error(response.data));
      },
      (err) => {
        return Promise.reject(err);
      },
    );
  }
}

export default new Client(getPreferenceValues<Preferences>().url);
