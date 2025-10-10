// utils/plausible.ts - Plausible Analytics for Raycast Extension

interface PlausibleEventProps {
  userId?: string;
  raycast?: boolean;
  [key: string]: string | boolean | number | undefined;
}

class PlausibleAnalytics {
  private domain: string;
  private apiEndpoint: string;
  private isInitialized: boolean;
  private userId: string | null;

  constructor() {
    this.domain = "webbites.io";
    this.apiEndpoint = "https://plausible.macosicons.com/api/event";
    this.isInitialized = false;
    this.userId = null;
    this.init();
  }

  /**
   * Initialize Plausible analytics
   */
  private async init() {
    try {
      // Get user ID from local storage if available
      const { LocalStorage } = await import("@raycast/api");
      const userDataString =
        await LocalStorage.getItem<string>("webbites_user_data");

      if (userDataString) {
        try {
          const userData = JSON.parse(userDataString);
          this.userId = userData.objectId || null;
        } catch (error) {
          console.error("Error parsing user data for Plausible:", error);
        }
      }

      this.isInitialized = true;
    } catch (error) {
      console.error("Error initializing Plausible:", error);
      this.isInitialized = true; // Still mark as initialized even on error
    }
  }

  /**
   * Send an event to Plausible
   */
  private async sendEvent(eventName: string, props: PlausibleEventProps = {}) {
    if (!this.isInitialized) {
      await this.init();
    }

    try {
      const eventData = {
        name: eventName,
        url: `app://raycast/${eventName}`,
        domain: this.domain,
        props: {
          ...props,
          userId: this.userId || props.userId,
          raycast: true,
        },
      };

      await fetch(this.apiEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(eventData),
      });

      console.log(`Plausible event sent: ${eventName}`, eventData.props);
    } catch (error) {
      console.error("Error sending Plausible event:", error);
      // Fail silently - we don't want analytics to break the app
    }
  }

  /**
   * Track when user opens the Raycast extension
   */
  async trackExtensionOpen(userId?: string) {
    await this.sendEvent("extension_open", {
      userId: userId || this.userId || undefined,
    });
  }

  /**
   * Track when user saves a website with the Raycast extension
   */
  async trackWebsiteSave(userId?: string) {
    await this.sendEvent("website_save", {
      userId: userId || this.userId || undefined,
    });
  }

  /**
   * Track when user opens a website from within the Raycast extension
   */
  async trackWebsiteOpen(userId?: string) {
    await this.sendEvent("website_open", {
      userId: userId || this.userId || undefined,
    });
  }
}

// Export a singleton instance
export const plausible = new PlausibleAnalytics();
