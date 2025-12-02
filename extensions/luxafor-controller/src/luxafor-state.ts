// Global state manager for Luxafor device status
// This ensures both the main UI and menubar share the same state

import { LocalStorage, getPreferenceValues } from "@raycast/api";

export interface DeviceStatus {
  isOnline: boolean;
  currentColor: string;
  lastSeen: Date | null;
  lastAction: string;
}

interface StoredStatus {
  isOnline: boolean;
  currentColor: string;
  lastSeen: Date | null;
  lastAction: string;
  selectedColor: string | null;
  lastUpdated: number;
}

const STORAGE_KEY = "luxafor-global-status";
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const HEALTH_CHECK_INTERVAL = 30 * 1000; // 30 seconds

class LuxaforStateManager {
  private static instance: LuxaforStateManager;
  private instanceId: string;
  private status: DeviceStatus = {
    isOnline: false,
    currentColor: "unknown",
    lastSeen: null,
    lastAction: "",
  };
  private selectedColor: string | null = null;
  private listeners: Set<(status: DeviceStatus) => void> = new Set();
  private initialized = false;
  private healthCheckInterval: NodeJS.Timeout | null = null;

  private constructor() {
    this.instanceId = Math.random().toString(36).substring(7);
    this.loadFromStorage();
    this.startHealthCheck();
  }

  static getInstance(): LuxaforStateManager {
    if (!LuxaforStateManager.instance) {
      LuxaforStateManager.instance = new LuxaforStateManager();
    }
    return LuxaforStateManager.instance;
  }

  private async startHealthCheck() {
    // Check connection health every 30 seconds
    this.healthCheckInterval = setInterval(async () => {
      await this.checkConnectionHealth();
    }, HEALTH_CHECK_INTERVAL);

    // Also check immediately on startup
    await this.checkConnectionHealth();
  }

  private async checkConnectionHealth() {
    try {
      // Get the userId from preferences
      const preferences = getPreferenceValues<Preferences>();
      if (!preferences.userId) {
        // No userId configured, can't check device connectivity
        if (this.status.isOnline) {
          await this.setOnline(false);
        }
        return;
      }

      // Use a lightweight health check - ping the actual device endpoint
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

      const apiDomain = preferences.apiEndpoint === "co.uk" ? "co.uk" : "com";
      await fetch(`https://api.luxafor.${apiDomain}/webhook/${preferences.userId}/status`, {
        method: "GET",
        mode: "no-cors",
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // If we get here, the device endpoint is reachable
      // Since the device is working (we can see successful color changes in logs),
      // we should mark it as online
      if (!this.status.isOnline) {
        await this.setOnline(true);
      }
    } catch {
      // Network error, but don't mark as offline if we have recent successful actions
      // Check if we've had successful actions recently
      const now = Date.now();
      const lastSeenTime = this.status.lastSeen ? this.status.lastSeen.getTime() : 0;
      const timeSinceLastAction = now - lastSeenTime;

      // If we've had a successful action in the last 5 minutes, assume we're still online
      if (timeSinceLastAction < 5 * 60 * 1000 && this.status.lastAction) {
        if (!this.status.isOnline) {
          await this.setOnline(true);
        }
      } else if (this.status.isOnline) {
        await this.setOnline(false);
      }
    }
  }

  public async forceHealthCheck(): Promise<boolean> {
    try {
      // Get the userId from preferences
      const preferences = getPreferenceValues<Preferences>();
      if (!preferences.userId) {
        await this.setOnline(false);
        return false;
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const apiDomain = preferences.apiEndpoint === "co.uk" ? "co.uk" : "com";
      await fetch(`https://api.luxafor.${apiDomain}/webhook/${preferences.userId}/status`, {
        method: "GET",
        mode: "no-cors",
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // If we can reach the device endpoint and have recent actions, we're online
      const now = Date.now();
      const lastSeenTime = this.status.lastSeen ? this.status.lastSeen.getTime() : 0;
      const timeSinceLastAction = now - lastSeenTime;

      const isOnline: boolean = timeSinceLastAction < 5 * 60 * 1000 && !!this.status.lastAction;
      await this.setOnline(isOnline);
      return isOnline;
    } catch {
      await this.setOnline(false);
      return false;
    }
  }

  public stopHealthCheck() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
  }

  private async loadFromStorage() {
    try {
      const cached = await LocalStorage.getItem<string>(STORAGE_KEY);
      if (cached) {
        const parsed: StoredStatus = JSON.parse(cached);

        // Always load the last known color regardless of cache duration
        // This prevents flickering when the menubar is clicked
        if (
          parsed.currentColor &&
          (parsed.currentColor === "red" ||
            parsed.currentColor === "green" ||
            parsed.currentColor === "blue" ||
            parsed.currentColor === "yellow" ||
            parsed.currentColor === "cyan" ||
            parsed.currentColor === "magenta" ||
            parsed.currentColor === "white" ||
            parsed.currentColor === "off" ||
            parsed.currentColor === "000000")
        ) {
          this.status.currentColor = parsed.currentColor;
        }

        // Check if other status info is still valid
        const now = Date.now();
        if (now - parsed.lastUpdated < CACHE_DURATION) {
          this.status = {
            ...this.status,
            isOnline: parsed.isOnline,
            lastSeen: parsed.lastSeen ? new Date(parsed.lastSeen) : null,
            lastAction: parsed.lastAction,
          };
          this.selectedColor = parsed.selectedColor;
        }
      }
    } catch {
      // Silent error handling for storage loading
    }
    this.initialized = true;
    this.notifyListeners();
  }

  private async saveToStorage() {
    try {
      const toStore: StoredStatus = {
        isOnline: this.status.isOnline,
        currentColor: this.status.currentColor,
        lastSeen: this.status.lastSeen,
        lastAction: this.status.lastAction,
        selectedColor: this.selectedColor,
        lastUpdated: Date.now(),
      };
      await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(toStore));
    } catch {
      // Silent error handling for storage saving
    }
  }

  async waitForInitialization(): Promise<void> {
    if (this.initialized) return;

    return new Promise((resolve) => {
      const checkInit = () => {
        if (this.initialized) {
          resolve();
        } else {
          setTimeout(checkInit, 10);
        }
      };
      checkInit();
    });
  }

  getStatus(): DeviceStatus {
    return { ...this.status };
  }

  getSelectedColor(): string | null {
    return this.selectedColor;
  }

  async updateStatus(newStatus: Partial<DeviceStatus>) {
    this.status = { ...this.status, ...newStatus };
    await this.saveToStorage();
    this.notifyListeners();
  }

  async setColor(color: string, action: string) {
    // Handle 000000 specially - treat it as off
    if (color === "000000") {
      this.status.currentColor = "off";
    } else {
      this.status.currentColor = color;
    }

    this.status.lastAction = action;
    this.status.lastSeen = new Date();
    this.status.isOnline = true;
    this.selectedColor = color;

    // Save to storage first
    await this.saveToStorage();

    // Force immediate notification to all listeners
    this.notifyListeners();

    // Also trigger a special "color change" event for immediate menubar updates
    this.triggerColorChangeNotification();
  }

  private triggerColorChangeNotification() {
    // This is a special method to ensure menubar gets immediate color updates
    setTimeout(() => {
      this.notifyListeners();
    }, 50);
  }

  async setSelectedColor(color: string | null) {
    this.selectedColor = color;
    await this.saveToStorage();
  }

  async setOnline(online: boolean) {
    this.status.isOnline = online;
    this.status.lastSeen = new Date();
    await this.saveToStorage();
    this.notifyListeners();
  }

  async clearStorage() {
    try {
      await LocalStorage.removeItem(STORAGE_KEY);
      this.selectedColor = null;
    } catch {
      // Silent error handling for storage clearing
    }
  }

  subscribe(listener: (status: DeviceStatus) => void): () => void {
    this.listeners.add(listener);
    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners() {
    this.listeners.forEach((listener) => {
      try {
        listener(this.getStatus());
      } catch {
        // Silent error handling for listener notifications
      }
    });
  }
}

export const luxaforState = LuxaforStateManager.getInstance();
