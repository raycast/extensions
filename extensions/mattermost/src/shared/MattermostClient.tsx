import { LocalStorage, getPreferenceValues } from "@raycast/api";
import axios, { AxiosRequestConfig } from "axios";
import {
  UserProfile,
  Team,
  TeamsWithCount,
  Channel,
  OrderedChannelCategories,
  UserProfileStatus,
  CustomProfileStatus,
  durationToExpireDate,
  UserProfileStatusKind,
} from "./MattermostTypes";

export interface Preference {
  baseUrl: string;
  authorizationType: AuthorizationType;
  credentials: string;
}

type AuthorizationType = "logpass" | "token";

axios.interceptors.request.use((config) => {
  console.log(config.url, config.params ?? config.data ?? "");
  return config;
});

export class MattermostClient {
  static baseUrl(): string {
    return getPreferenceValues<Preference>().baseUrl + "/api/v4";
  }

  static token = "";

  static config(): AxiosRequestConfig {
    return {
      baseURL: getPreferenceValues<Preference>().baseUrl + "/api/v4",
      headers: {
        Authorization: `Bearer ${this.token}`,
      },
    };
  }

  static async wakeUpSession(): Promise<boolean> {
    return LocalStorage.getItem<string>("mattermost-token").then((token) => {
      if (token !== undefined) {
        this.token = token;
        console.log("successfull wakeup session");
        return true;
      }
      return false;
    });
  }

  static async login(): Promise<void> {
    console.log("try login");
    const preference = getPreferenceValues<Preference>();

    switch (preference.authorizationType) {
      case "token":
        this.token = preference.credentials;
        return Promise.resolve();
      case "logpass": {
        function signIn(): Promise<void> {
          const [username, password] = preference.credentials.split(":");
          return axios
            .post<UserProfile>(
              "/users/login",
              JSON.stringify({
                login_id: username,
                password: password,
              }),
              MattermostClient.config()
            )
            .then((response) => {
              const token = response.headers["token"];
              console.log(response.statusText);
              MattermostClient.token = token;
              console.log("successfull login");
              return LocalStorage.setItem("mattermost-token", token);
            });
        }

        if (this.token.length == 0) {
          return signIn();
        }

        console.log("already logged with token: " + this.token);
        return this.getMe()
          .catch((error) => {
            if (error.message.includes("401")) {
              console.warn("token expired, relogin");
              return signIn();
            }
          })
          .then();
      }
    }
  }

  static async getMe(): Promise<UserProfile> {
    return axios.get<UserProfile>("/users/me", this.config()).then((response) => response.data);
  }

  static async getTeams(): Promise<Team[]> {
    return axios
      .get<TeamsWithCount | Team[]>("/teams", this.config())
      .then((response) => response.data)
      .then((data) => (data instanceof Array ? data : data.teams));
  }

  static async getMyChannels(teamId: string): Promise<Channel[]> {
    return axios
      .get<Channel[]>("/users/me/teams/" + teamId + "/channels", this.config())
      .then((response) => response.data);
  }

  static async getChannelCategories(teamId: string): Promise<OrderedChannelCategories> {
    return axios
      .get<OrderedChannelCategories>("/users/me/teams/" + teamId + "/channels/categories", this.config())
      .then((response) => response.data);
  }

  static async getProfilesByIds(ids: string[]): Promise<UserProfile[]> {
    return axios
      .post<UserProfile[]>("/users/ids", JSON.stringify(ids), this.config())
      .then((response) => response.data);
  }

  static async getProfileStatus(): Promise<UserProfileStatus> {
    return axios.get<UserProfileStatus>("/users/me/status", this.config()).then((response) => response.data);
  }

  static async setProfileStatus(user_id: string, status: UserProfileStatusKind): Promise<void> {
    return axios
      .put<void>(
        "/users/me/status",
        JSON.stringify({
          user_id: user_id,
          status: status,
        }),
        this.config()
      )
      .then((response) => response.data);
  }

  static async getProfilesStatus(ids: string[]): Promise<UserProfileStatus[]> {
    return axios
      .post<UserProfileStatus[]>("/users/status/ids", JSON.stringify(ids), this.config())
      .then((response) => response.data);
  }

  static getProfilePictureUrl(userId: string): string {
    return this.baseUrl() + "/users/" + userId + "/image";
  }

  static async setCustomStatus(status: CustomProfileStatus): Promise<void> {
    return axios
      .put<void>(
        "/users/me/status/custom",
        JSON.stringify({
          emoji: status.emojiCode,
          text: status.text,
          duration: status.duration,
          expires_at: status.expires_at ?? (status.duration && durationToExpireDate(status.duration)),
        }),
        this.config()
      )
      .then((response) => response.data);
  }

  static async clearCustomStatus(): Promise<void> {
    return axios.delete<void>("/users/me/status/custom", this.config()).then((response) => response.data);
  }
}
