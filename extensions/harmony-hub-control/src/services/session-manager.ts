import { LocalStorage } from "@raycast/api";
import { ToastManager } from "../ui/toast-manager";

/**
 * Interface representing a user session.
 */
interface Session {
  /**
   * The session token.
   */
  token: string;
  /**
   * The timestamp when the session expires.
   */
  expiresAt: number;
  /**
   * The timestamp of the last activity.
   */
  lastActivity: number;
}

/**
 * SessionManager class handles user session state and persistence.
 * It provides methods for storing and retrieving session data securely.
 */
export class SessionManager {
  /**
   * The key used to store the session in local storage.
   */
  private static readonly SESSION_KEY = "harmony_session";
  /**
   * The key used to store the cache in local storage.
   */
  private static readonly CACHE_KEY = "harmony_cache";
  /**
   * The key used to store the hub cache in local storage.
   */
  private static readonly HUB_CACHE_KEY = "harmony_hub_cache";
  /**
   * The duration of a session in milliseconds (24 hours).
   */
  private static readonly SESSION_DURATION = 24 * 60 * 60 * 1000;
  /**
   * The threshold for session inactivity in milliseconds (30 minutes).
   */
  private static readonly ACTIVITY_THRESHOLD = 30 * 60 * 1000;

  /**
   * Creates a new session with the given token.
   * @param token The session token.
   * @returns Promise<void>
   */
  static async createSession(token: string): Promise<void> {
    const session: Session = {
      token,
      expiresAt: Date.now() + this.SESSION_DURATION,
      lastActivity: Date.now(),
    };

    await LocalStorage.setItem(this.SESSION_KEY, JSON.stringify(session));
  }

  /**
   * Retrieves the current session.
   * @returns Promise<Session | null> The current session or null if not found.
   */
  static async getSession(): Promise<Session | null> {
    try {
      const stored = await LocalStorage.getItem(this.SESSION_KEY);
      if (!stored || typeof stored !== "string") {
        return null;
      }

      const session = JSON.parse(stored) as Session;
      const now = Date.now();

      // Check if session has expired
      if (now > session.expiresAt) {
        await this.clearSession();
        return null;
      }

      // Check if session is inactive
      if (now - session.lastActivity > this.ACTIVITY_THRESHOLD) {
        await this.clearSession();
        return null;
      }

      // Update last activity
      session.lastActivity = now;
      await LocalStorage.setItem(this.SESSION_KEY, JSON.stringify(session));

      return session;
    } catch (error) {
      console.error("Error getting session:", error);
      return null;
    }
  }

  /**
   * Clears the current session.
   * @returns Promise<void>
   */
  static async clearSession(): Promise<void> {
    await LocalStorage.removeItem(this.SESSION_KEY);
  }

  /**
   * Clears the cache.
   * @returns Promise<void>
   */
  static async clearCache(): Promise<void> {
    await Promise.all([LocalStorage.removeItem(this.CACHE_KEY), LocalStorage.removeItem(this.HUB_CACHE_KEY)]);
    ToastManager.success("Cache cleared successfully");
  }

  /**
   * Validates the current session.
   * @returns Promise<boolean> True if the session is valid, false otherwise.
   */
  static async validateSession(): Promise<boolean> {
    const session = await this.getSession();
    if (!session) {
      await ToastManager.error("Session Expired", "Please reconnect to your Hub");
      return false;
    }
    return true;
  }
}
