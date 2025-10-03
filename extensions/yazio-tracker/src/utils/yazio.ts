import { getPreferenceValues } from "@raycast/api";
import { Yazio } from "yazio";

interface Preferences {
  username?: string;
  password?: string;
}

// Define a minimal Token type to satisfy the linter
interface AuthToken {
  access_token: string;
  // Add other token properties if needed by other parts of the logic
}

// Cache for the authentication promise, now with a specific type
let authPromise: Promise<AuthToken> | null = null;

class YazioClient {
  private static instance: Yazio;

  private constructor() {
    // Private constructor
  }

  public static getInstance(): Yazio {
    if (!YazioClient.instance) {
      const preferences = getPreferenceValues<Preferences>();

      if (!preferences.username || !preferences.password) {
        throw new Error("Username or password not set in preferences.");
      }

      const yazioInstance = new Yazio({
        credentials: {
          username: preferences.username,
          password: preferences.password,
        },
      });

      // Wrap the original authenticate method
      const originalAuthenticate = yazioInstance["auth"].authenticate.bind(yazioInstance["auth"]);

      yazioInstance["auth"].authenticate = () => {
        if (!authPromise) {
          authPromise = originalAuthenticate().catch((error: Error) => {
            // Clear the promise on failure to allow retries
            authPromise = null;
            throw error;
          });
        }
        return authPromise;
      };

      YazioClient.instance = yazioInstance;
    }

    return YazioClient.instance;
  }
}

export const yazio = YazioClient.getInstance();
