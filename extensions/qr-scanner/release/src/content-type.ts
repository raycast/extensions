import { Icon } from "@raycast/api";

export type ContentType =
  | "url"
  | "email"
  | "phone"
  | "sms"
  | "wifi"
  | "vcard"
  | "geo"
  | "text";

export interface ContentInfo {
  /** Detected content type. */
  type: ContentType;
  /** Human-readable label for the type (e.g. "URL", "WiFi Network"). */
  label: string;
  /** Raycast icon appropriate for this type. */
  icon: Icon;
  /** If the content is a URL or can be opened as one. */
  url?: string;
  /** Extracted WiFi SSID, if applicable. */
  wifiSsid?: string;
  /** Extracted WiFi password, if applicable. */
  wifiPassword?: string;
}

const URL_PATTERN = /^https?:\/\//i;
const FTP_PATTERN = /^ftp:\/\//i;
const MAILTO_PATTERN = /^mailto:/i;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TEL_PATTERN = /^tel:/i;
const SMS_PATTERN = /^sms(?:to)?:/i;
const WIFI_PATTERN = /^WIFI:/i;
const VCARD_PATTERN = /^BEGIN:VCARD/i;
const GEO_PATTERN = /^geo:/i;

/**
 * Detect the content type of a decoded QR code string.
 */
export function detectContentType(raw: string): ContentInfo {
  const trimmed = raw.trim();

  if (URL_PATTERN.test(trimmed) || FTP_PATTERN.test(trimmed)) {
    return { type: "url", label: "URL", icon: Icon.Link, url: trimmed };
  }

  if (MAILTO_PATTERN.test(trimmed)) {
    return {
      type: "email",
      label: "Email",
      icon: Icon.Envelope,
      url: trimmed,
    };
  }

  if (EMAIL_PATTERN.test(trimmed)) {
    return {
      type: "email",
      label: "Email",
      icon: Icon.Envelope,
      url: `mailto:${trimmed}`,
    };
  }

  if (TEL_PATTERN.test(trimmed)) {
    return { type: "phone", label: "Phone", icon: Icon.Phone, url: trimmed };
  }

  if (SMS_PATTERN.test(trimmed)) {
    return {
      type: "sms",
      label: "SMS",
      icon: Icon.Message,
      url: normalizeSmsUrl(trimmed),
    };
  }

  if (WIFI_PATTERN.test(trimmed)) {
    const ssid = extractWifiField(trimmed, "S");
    const password = extractWifiField(trimmed, "P");
    return {
      type: "wifi",
      label: ssid ? `WiFi — ${ssid}` : "WiFi Network",
      icon: Icon.Wifi,
      wifiSsid: ssid,
      wifiPassword: password,
    };
  }

  if (VCARD_PATTERN.test(trimmed)) {
    return {
      type: "vcard",
      label: "Contact Card",
      icon: Icon.PersonCircle,
    };
  }

  if (GEO_PATTERN.test(trimmed)) {
    return { type: "geo", label: "Location", icon: Icon.Map, url: trimmed };
  }

  return { type: "text", label: "Text", icon: Icon.Text };
}

/**
 * Extract a field value from a WIFI: QR string.
 * Format: WIFI:T:WPA;S:MyNetwork;P:MyPassword;;
 */
function extractWifiField(raw: string, field: string): string | undefined {
  // Parse fields respecting backslash escapes — an unescaped ; is a delimiter,
  // an unescaped : separates the field key from its value.
  const body = raw.replace(/^WIFI:/i, "");
  const segments: string[] = [];
  let current = "";

  for (let i = 0; i < body.length; i++) {
    if (body[i] === "\\" && i + 1 < body.length) {
      current += body[++i];
    } else if (body[i] === ";") {
      segments.push(current);
      current = "";
    } else {
      current += body[i];
    }
  }
  if (current) segments.push(current);

  for (const seg of segments) {
    const colon = seg.indexOf(":");
    if (
      colon !== -1 &&
      seg.slice(0, colon).toUpperCase() === field.toUpperCase()
    ) {
      return seg.slice(colon + 1) || undefined;
    }
  }
  return undefined;
}

function normalizeSmsUrl(raw: string) {
  const smstoMatch = raw.match(/^smsto:([^:]*):?(.*)$/i);

  if (!smstoMatch) {
    return raw.replace(/^SMS:/i, "sms:");
  }

  const [, recipient, message] = smstoMatch;
  const encodedMessage = message ? `?body=${encodeURIComponent(message)}` : "";

  return `sms:${recipient}${encodedMessage}`;
}
