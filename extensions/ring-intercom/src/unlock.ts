import { LocalStorage, Toast, closeMainWindow, showToast } from "@raycast/api";
import fetch from "cross-fetch";
import { checkInternetConnection } from "./utils";

// Authentication - used first in the flow
interface TokenResponse {
  access_token: string;
  refresh_token: string;
}

// Base device interface - defines common properties
interface BaseRingDevice {
  id: string;
  kind: string;
  description: string;
  [key: string]: unknown;
}

// API response containing devices - used in getLocations()
interface RingDevicesResponse {
  other: BaseRingDevice[];
}

// Specific intercom interface - used for filtering devices
interface RingIntercomDevice extends BaseRingDevice {
  kind: "intercom_handset_audio";
}

class RingIntercom {
  constructor(
    private readonly device: RingIntercomDevice,
    private readonly access_token: string,
  ) {}

  get description(): string | undefined {
    return this.device.description;
  }

  async unlock(): Promise<void> {
    console.debug("Sending unlock_door command");
    const response = await fetch(`https://api.ring.com/commands/v1/devices/${this.device.id}/device_rpc`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${this.access_token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
        "User-Agent": "android:com.ringapp",
        Connection: "close",
      },
      body: JSON.stringify({
        command_name: "device_rpc",
        request: {
          jsonrpc: "2.0",
          method: "unlock_door",
          params: {
            door_id: 0,
            issue_time: Date.now(),
            origin: "user",
            user_id: "0",
          },
        },
      }),
    });

    console.debug("RPC response status:", response.status);
    const data = await response.json().catch(() => ({}));
    console.debug("RPC response data:", data);

    if (!response.ok) {
      throw new Error(`RPC request failed: ${response.status}`);
    }

    if (data.error) {
      throw new Error(`RPC error: ${data.error.message} - ${data.error.data || ""}`);
    }
  }
}

class RingApi {
  constructor(private readonly config: { refreshToken: string }) {}

  private async getAccessToken(): Promise<string> {
    console.debug("Requesting access token");
    const tokenResponse = await fetch("https://oauth.ring.com/oauth/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
        "User-Agent": "android:com.ringapp",
        "2fa-support": "true",
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: this.config.refreshToken,
        client_id: "ring_official_android",
        scope: "client",
      }).toString(),
    });

    if (!tokenResponse.ok) {
      throw new Error(`Failed to get access token: ${tokenResponse.status}`);
    }

    const { access_token, refresh_token } = (await tokenResponse.json()) as TokenResponse;

    await LocalStorage.setItem("RING_REFRESH_TOKEN", refresh_token);

    console.debug("Access token obtained");
    return access_token;
  }

  public async getLocations(): Promise<{ intercoms: RingIntercom[] }> {
    const access_token = await this.getAccessToken();

    console.debug("Fetching device locations");
    const response = await fetch("https://api.ring.com/clients_api/ring_devices", {
      headers: {
        Authorization: `Bearer ${access_token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
        "User-Agent": "android:com.ringapp",
        Connection: "close",
      },
    });

    if (!response.ok) {
      throw new Error(`Request failed: ${response.status}`);
    }

    const devices = (await response.json()) as RingDevicesResponse;
    console.debug("Found", devices.other.length, "devices");
    const intercoms = devices.other
      .filter((device): device is RingIntercomDevice => device.kind === "intercom_handset_audio")
      .map((device) => new RingIntercom(device, access_token));

    return { intercoms };
  }

  async getFirstIntercom(): Promise<RingIntercom | null> {
    console.debug("Getting first intercom");
    const locations = await this.getLocations();
    const intercom = locations.intercoms[0] ?? null;
    console.debug(intercom ? "Intercom found" : "No intercom found");
    return intercom;
  }

  async unlockDoorSequence(intercom: RingIntercom) {
    await intercom.unlock();
    console.debug("Door unlocked successfully");
  }
}

export default async function Command() {
  if (!(await checkInternetConnection())) {
    await showToast({
      style: Toast.Style.Failure,
      title: "No Internet",
      message: "Please check your internet connection",
    });
    return;
  }

  console.debug("Starting unlock command");
  showToast({
    style: Toast.Style.Animated,
    title: "Unlocking",
  });

  try {
    const refreshToken = await LocalStorage.getItem<string>("RING_REFRESH_TOKEN");
    if (!refreshToken) {
      console.debug("No refresh token found");
      throw new Error("Not authenticated - Please run the 'Authenticate' command.");
    }

    console.debug("Initializing Ring API");
    const ringApi = new RingApi({ refreshToken });
    const intercom = await ringApi.getFirstIntercom();

    if (!intercom) {
      throw new Error("No Ring Intercom found");
    }

    await ringApi.unlockDoorSequence(intercom);

    console.debug("Unlock successful");
    await Promise.all([
      closeMainWindow(),
      showToast({
        style: Toast.Style.Success,
        title: `🔓 ${intercom.description ?? ""} Unlocked`.trim(),
      }),
    ]);
  } catch (error) {
    console.error("Error during unlock process:", error);
    const errorMessage = String(error);

    if (errorMessage.includes("Refresh token is not valid")) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Authentication Expired",
        message: "Please re-authenticate",
      });
      return;
    }

    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to Unlock",
      message: errorMessage,
    });
  }
}
