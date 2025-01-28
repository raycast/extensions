/* eslint-disable @typescript-eslint/no-explicit-any */
import { LocalStorage } from "@raycast/api";
import Http, { HttpFunctionResult } from "./http";
import { AFSPreferences } from "./modals";
// import { jwtDecode } from "jwt-decode";

export default class User {
  private http: Http;

  constructor(public afsPreferences: AFSPreferences) {
    this.http = new Http(afsPreferences);
  }

  public static async getAccessToken(): Promise<string> {
    return (await LocalStorage.getItem<string>("AFS_ACCESS_TOKEN")) ?? "";
  }

  public static async getRefreshToken(): Promise<string> {
    return (await LocalStorage.getItem<string>("AFS_REFRESH_TOKEN")) ?? "";
  }

  public static async isUserLoggedIn(): Promise<boolean> {
    return (await this.getAccessToken()) != "";
  }

  public async login(): Promise<boolean> {
    const result: HttpFunctionResult<any> = await this.http.POST<any, any>("auth/login", {
      username: this.afsPreferences.username,
      password: this.afsPreferences.password,
    });

    if (result.success) {
      await LocalStorage.setItem("AFS_ACCESS_TOKEN", result.data.access_token);
      await LocalStorage.setItem("AFS_REFRESH_TOKEN", result.data.refresh_token);
    }

    return result.success;
  }
}
