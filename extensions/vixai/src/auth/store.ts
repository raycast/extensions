import { LocalStorage } from "@raycast/api";

const ACCESS_TOKEN_KEY = "access_token";
class AuthStore {
  static async removeAccessToken() {
    return LocalStorage.removeItem(ACCESS_TOKEN_KEY);
  }
  static async getAccessToken() {
    return LocalStorage.getItem<string>(ACCESS_TOKEN_KEY);
  }

  static async setAccessToken(accessToken: string) {
    return LocalStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  }
}

export default AuthStore;
