import API from "./base";

export type UserProfile = {
  id: string;
  username: string;
  name: string;
  email: string;
  avatar_url: string;
  privy_wallet: {
    address: string;
  };
};

export default class UserAPI {
  static async getProfile(): Promise<UserProfile> {
    return API.get<UserProfile>("/users/profile");
  }
}
