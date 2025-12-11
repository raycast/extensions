import fetch from "node-fetch";
import { LocalSendDevice } from "../types";

export const testDeviceConnection = async (
  device: LocalSendDevice,
): Promise<{ reachable: boolean; error?: string }> => {
  try {
    const url = `${device.protocol}://${device.ip}:${device.port}/api/localsend/v2/info`;
    console.log(`Testing connection to: ${url}`);

    const response = await fetch(url, {
      method: "GET",
      timeout: 3000,
    });

    if (response.ok) {
      const info = await response.json();
      console.log("Device info:", info);
      return { reachable: true };
    } else {
      return { reachable: false, error: `HTTP ${response.status}` };
    }
  } catch (error) {
    console.error("Connection test failed:", error);
    return {
      reachable: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
};
