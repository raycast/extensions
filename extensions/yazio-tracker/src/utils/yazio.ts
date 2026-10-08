import { getPreferenceValues } from "@raycast/api";
import { Yazio, YazioAuth } from "yazio";

interface Preferences {
  username?: string;
  password?: string;
}

interface AuthToken {
  access_token: string;
}

let authPromise: Promise<AuthToken> | null = null;

class YazioClient {
  private static instance: Yazio;

  private constructor() {
    // Private constructor
  }

  // This method remains the same, creating the instance only once.
  public static getInstance(): Yazio {
    if (!YazioClient.instance) {
      const preferences = getPreferenceValues<Preferences>();

      if (!preferences.username || !preferences.password) {
        throw new Error("Username or password not set in preferences.");
      }

      const authHandler = new YazioAuth({
        credentials: {
          username: preferences.username,
          password: preferences.password,
        },
      });

      const originalAuthenticate = authHandler.authenticate.bind(authHandler);
      authHandler.authenticate = () => {
        if (!authPromise) {
          authPromise = originalAuthenticate().catch((error) => {
            authPromise = null;
            throw error;
          });
        }
        return authPromise as Promise<AuthToken>;
      };

      YazioClient.instance = new Yazio(authHandler);
    }

    return YazioClient.instance;
  }
}

export const yazio = {
  get user() {
    return YazioClient.getInstance().user;
  },
  get products() {
    return YazioClient.getInstance().products;
  },
};
