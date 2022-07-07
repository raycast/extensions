import { WiFiNetwork } from "node-wifi";

export interface WifiPassword {
  ssid: string;
  password: string;
}
export interface WifiNetworkWithPassword extends WiFiNetwork {
  password: string;
}
