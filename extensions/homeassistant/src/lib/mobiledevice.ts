import { environment } from "@raycast/api";
import * as os from "os";
import { getMacOSVersion } from "./utils";

interface HADeviceRegistrationData {
  push_notification_key: string;
  push_websocket_channel: boolean;
  push_token?: string;
}

export interface HADeviceRegistration {
  device_id: string;
  app_id: string;
  app_name: string;
  app_version: string;
  device_name: string;
  manufacturer: string;
  model: string;
  os_name: string;
  os_version: string;
  supports_encryption: boolean;
  app_data: HADeviceRegistrationData;
}

export interface HAMobileDeviceRegistrationResponse {
  cloudhook_url?: string | null;
  remote_ui_url?: string | null;
  secret?: string | null;
  webhook_id: string;
}

export async function generateMobileDeviceRegistration(): Promise<HADeviceRegistration> {
  const deviceID = `macos_raycast_${os.hostname()}`;
  return {
    device_id: deviceID, // unique id. Changing it will register a new device in Home Assistant
    app_id: "raycast",
    app_name: "Raycast",
    app_version: environment.raycastVersion,
    device_name: "MacOS",
    manufacturer: "Apple Inc.",
    model: "A model",
    os_name: "macOS",
    os_version: getMacOSVersion(),
    supports_encryption: false,
    app_data: {
      push_notification_key: deviceID,
      push_websocket_channel: true,
    },
  };
}
