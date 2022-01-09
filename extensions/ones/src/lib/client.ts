import axios, { AxiosInstance, AxiosRequestConfig, AxiosRequestHeaders } from "axios";
import { getLocalStorageItem, preferences, setLocalStorageItem } from "@raycast/api";
import { login } from "./api";

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

  public async get(product: Product, url: string, params?: any): Promise<any> {
    try {
      if (!this.httpClient) {
        await this.initHttpClient();
        if (!this.httpClient) {
          return Promise.reject(new Error("http client not initialized"));
        }
      }
      url = `${this.baseAPI}/${product}/team/${this.teamUUID}/${url}`;
      return this.httpClient?.get(url, { params });
    } catch (err) {
      return Promise.reject(err);
    }
  }

  public async post(product: Product, url: string, data?: { [key: string]: any }): Promise<any> {
    try {
      if (!this.httpClient) {
        await this.initHttpClient();
        if (!this.httpClient) {
          return Promise.reject(new Error("http client not initialized"));
        }
      }
      url = `${this.baseAPI}/${product}/team/${this.teamUUID}/${url}`;
      return this.httpClient.post(url, data);
    } catch (err) {
      return Promise.reject(err);
    }
  }

  public async setEmail(email: string): Promise<void> {
    this.email = email;
    await setLocalStorageItem(StorageKey.Email, email);
  }

  public async getEmail(): Promise<string> {
    const email = await getLocalStorageItem(StorageKey.Email);
    return Promise.resolve(email as string);
  }

  public async setPassword(password: string): Promise<void> {
    this.password = password;
    await setLocalStorageItem(StorageKey.Password, password);
  }

  public async getPassword(): Promise<string> {
    const password = await getLocalStorageItem(StorageKey.Password);
    return Promise.resolve(password as string);
  }

  public async setToken(token: string): Promise<void> {
    this.token = token;
    await setLocalStorageItem(StorageKey.Token, token);
  }

  public async getToken(): Promise<string> {
    const token = await getLocalStorageItem(StorageKey.Token);
    return Promise.resolve(token as string);
  }

  public async setUserUUID(userUUID: string): Promise<void> {
    this.userUUID = userUUID;
    await setLocalStorageItem(StorageKey.UserUUID, userUUID);
  }

  public async getUserUUID(): Promise<string> {
    const userUUID = await getLocalStorageItem(StorageKey.UserUUID);
    return Promise.resolve(userUUID as string);
  }

  public async setTeamUUID(teamUUID: string): Promise<void> {
    this.teamUUID = teamUUID;
    await setLocalStorageItem(StorageKey.TeamUUID, teamUUID);
  }

  public async getTeamUUID(): Promise<string> {
    const teamUUID = await getLocalStorageItem(StorageKey.TeamUUID);
    return Promise.resolve(teamUUID as string);
  }

  public async initHttpClient(): Promise<any> {
    try {
      this.email = await this.getEmail();
      this.password = await this.getPassword();
      this.teamUUID = await this.getTeamUUID();
      if (preferences.teamUUID.value) {
        this.teamUUID = preferences.teamUUID.value as string;
      }
      this.userUUID = await this.getUserUUID();
      this.token = await this.getToken();
      if (
        !this.teamUUID ||
        !this.userUUID ||
        !this.token ||
        this.email !== preferences.email.value ||
        this.password !== preferences.password.value
      ) {
        await this.setEmail(preferences.email.value as string);
        await this.setPassword(preferences.password.value as string);
        const result = await login({ email: this.email, password: this.password });
        await this.setToken(result.user.token);
        await this.setUserUUID(result.user.uuid);
        this.userUUID = result.user.uuid;
        if (result.teams.length === 1) {
          await this.setTeamUUID(result.teams[0].uuid);
          preferences.teamUUID.value = result.teams[0].uuid;
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
      }
    );
    this.httpClient.interceptors.response.use(
      (response) => {
        if (response.status === 200) {
          return response.data;
        }
        return Promise.reject(new Error(response.data));
      },
      function (err) {
        return Promise.reject(err);
      }
    );
  }
}

export default new Client(preferences.url.value as string);
