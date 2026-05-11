export type QRContentType = "url" | "wifi" | "vcard" | "text";

export interface QRContent {
  type: QRContentType;
  raw: string;
  url?: string;
  wifi?: { ssid: string; password: string; encryption: string };
}

export function detectContent(data: string): QRContent {
  // URL
  if (/^https?:\/\//i.test(data) || /^[a-z][a-z0-9+\-.]*:\/\//i.test(data)) {
    return { type: "url", raw: data, url: data };
  }

  // WiFi: WIFI:T:WPA;S:ssid;P:password;;
  const wifiMatch = data.match(/^WIFI:(?:T:([^;]*);)?S:([^;]*);(?:P:([^;]*);)?/i);
  if (wifiMatch) {
    return {
      type: "wifi",
      raw: data,
      wifi: {
        encryption: wifiMatch[1] ?? "nopass",
        ssid: wifiMatch[2] ?? "",
        password: wifiMatch[3] ?? "",
      },
    };
  }

  // vCard
  if (/^BEGIN:VCARD/i.test(data)) {
    return { type: "vcard", raw: data };
  }

  return { type: "text", raw: data };
}
