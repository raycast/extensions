import { WiFiNetwork } from "node-wifi";

export interface WifiPasswordCache {
  ssid: string;
  password: string;
}
export interface WifiNetworkWithPassword extends WiFiNetwork {
  password: string;
}
