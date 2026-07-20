// utils/plausible.ts - Plausible Analytics for Raycast Extension

interface PlausibleEventProps {
  userId?: string;
  raycast?: boolean;
  [key: string]: string | boolean | number | undefined;
}

interface PlausibleRevenue {
  amount: number;
  currency: string;
}

interface PlausibleTrackOptions {
  props?: PlausibleEventProps;
  interactive?: boolean;
  revenue?: PlausibleRevenue;
  url?: string;
  callback?: (result: { status?: number } | { error?: unknown } | null) => void;
}

interface PlausibleInitOptions {
  domain: string;
  endpoint?: string;
  autoCapturePageviews?: boolean;
  bindToWindow?: boolean;
  customProperties?:
    | Record<string, string | number | boolean>
    | ((eventName: string) => Record<string, string | number | boolean>);
}

class PlausibleAnalytics {
  private domain: string;
  private apiEndpoint: string;
  private initPromise: Promise<void> | null;
  private userId: string | null;
  private isBrowser: boolean;
  private trackerTrack: ((name: string, options?: PlausibleTrackOptions) => Promise<void>) | null;

  constructor() {
    this.domain = "webbites.io";
    this.apiEndpoint = "https://stats.webbites.io/api/event";
    this.initPromise = null;
    this.userId = null;
    this.isBrowser = typeof window !== "undefined" && typeof document !== "undefined";
    this.trackerTrack = null;
  }

  /**
   * Initialize Plausible analytics
   */
  private async init(): Promise<void> {
    try {
      if (!this.isBrowser) {
        try {
          const { LocalStorage } = await import("@raycast/api");
          const userDataString = await LocalStorage.getItem<string>("webbites_user_data");
          if (userDataString) {
            const userData = JSON.parse(userDataString);
            this.userId = userData.objectId || null;
          }
        } catch (error) {
          console.error("Plausible initialization error 0:", error);
        }
      }

      if (this.isBrowser) {
        try {
          const plausibleModule = await import("@plausible-analytics/tracker");
          const plausibleInit = plausibleModule.init as (opts: PlausibleInitOptions) => void;
          this.trackerTrack = plausibleModule.track as (name: string, options?: PlausibleTrackOptions) => Promise<void>;
          plausibleInit({
            domain: this.domain,
            endpoint: this.apiEndpoint,
            autoCapturePageviews: false,
            bindToWindow: false,
            customProperties: { raycast: true },
          });
        } catch (error) {
          console.error("Plausible initialization error 1:", error);
          this.trackerTrack = null;
        }
      }
    } catch (error) {
      console.error("Plausible initialization error 2:", error);
    }
  }

  /**
   * Ensure initialization is complete
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.initPromise) {
      this.initPromise = this.init();
    }
    await this.initPromise;
  }

  /**
   * Send an event to Plausible
   */
  private async sendEvent(eventName: string, props: PlausibleEventProps = {}) {
    console.log("[plausible tracked] Event:", this.userId);
    if (this.userId?.startsWith("Sunja")) return;

    await this.ensureInitialized();

    const mergedProps = {
      ...props,
      raycast: true,
    };

    try {
      if (this.trackerTrack) {
        await this.trackerTrack(eventName, { props: mergedProps });
        return;
      }

      const eventData = {
        name: eventName,
        url: `app://raycast/${eventName}`,
        domain: this.domain,
        props: mergedProps,
      };

      await fetch(this.apiEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(eventData),
      });
    } catch (error) {
      console.error("Plausible event tracking error:", error);
    }
  }

  /**
   * Track when user opens the Raycast extension
   */
  async trackExtensionOpen(userId?: string) {
    if (userId?.startsWith("Sunja")) return;
    await this.sendEvent("extension_open", {
      extension: "raycast",
    });
  }

  /**
   * Track when user saves a website with the Raycast extension
   */
  async trackWebsiteSave(userId?: string) {
    if (userId?.startsWith("Sunja")) return;
    await this.sendEvent("website_save", {
      source: "raycast",
    });
  }

  /**
   * Track when user opens a website from within the Raycast extension
   */
  async trackWebsiteOpen(userId?: string) {
    if (userId?.startsWith("Sunja")) return;
    await this.sendEvent("website_open", {
      source: "raycast",
    });
  }
}

// Export a singleton instance
export const plausible = new PlausibleAnalytics();
