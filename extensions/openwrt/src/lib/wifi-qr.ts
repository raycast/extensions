import { toDataURL } from "qrcode";

const CONTROL_CHAR_PATTERN = /[\r\n\0]/;
const ENTERPRISE_ENCRYPTION_PATTERN = /(?:^|[-+_\s])(?:enterprise|eap|802\.?1x)(?:$|[-+_\s])/;
const UCI_ENTERPRISE_BASE_PATTERN = /^wpa(?:[23])?(?:-mixed|-192)?$/;

function escapeWifiQrField(value: string): string {
  return value.replace(/[\\;,:"]/g, "\\$&");
}

function isEnterpriseEncryption(normalizedEncryption: string): boolean {
  if (!normalizedEncryption) {
    return false;
  }
  if (
    ENTERPRISE_ENCRYPTION_PATTERN.test(normalizedEncryption) ||
    normalizedEncryption.includes("enterprise") ||
    normalizedEncryption.includes("eap") ||
    normalizedEncryption.includes("8021x") ||
    normalizedEncryption.includes("802.1x")
  ) {
    return true;
  }
  const primary = normalizedEncryption.split("+")[0]?.trim() ?? "";
  return UCI_ENTERPRISE_BASE_PATTERN.test(primary);
}

/** Builds an escaped ZXing-compatible `WIFI:` QR payload string. */
export function buildWifiQrPayload(opts: {
  ssid: string;
  password: string;
  encryption: string;
  hidden?: boolean;
}): string {
  const ssid = opts.ssid ?? "";
  const password = opts.password ?? "";
  if (CONTROL_CHAR_PATTERN.test(ssid)) {
    throw new Error("Wi-Fi SSID cannot contain newline or null control characters.");
  }
  if (CONTROL_CHAR_PATTERN.test(password)) {
    throw new Error("Wi-Fi password cannot contain newline or null control characters.");
  }

  const enc = (opts.encryption ?? "").trim().toLowerCase();
  if (isEnterpriseEncryption(enc)) {
    throw new Error(
      `Wi-Fi QR codes are not supported for WPA-Enterprise / 802.1X encryption ("${opts.encryption.trim()}").`,
    );
  }

  let authType: "nopass" | "WEP" | "WPA";
  if (!enc || enc === "none" || enc === "owe" || enc.startsWith("owe+")) {
    authType = "nopass";
  } else if (enc === "wep" || enc.startsWith("wep")) {
    authType = "WEP";
  } else {
    authType = "WPA";
  }

  const fields = [`T:${authType}`, `S:${escapeWifiQrField(ssid)}`];
  if (authType !== "nopass") {
    fields.push(`P:${escapeWifiQrField(password)}`);
  }
  if (opts.hidden === true) {
    fields.push("H:true");
  }
  return `WIFI:${fields.join(";")};;`;
}

/** Generates a PNG data URL for a `WIFI:` QR payload string. */
export async function generateWifiQrDataUrl(wifiPayload: string): Promise<string> {
  return toDataURL(wifiPayload, {
    width: 340,
    margin: 2,
    errorCorrectionLevel: "M",
  });
}
