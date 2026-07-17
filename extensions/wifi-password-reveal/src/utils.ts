export function parseNetshWlanProfiles(output: string): string[] {
  const userProfiles: string[] = [];
  const lines = output.split("\n");
  let inUserProfilesSection = false;

  for (const line of lines) {
    const trimmedLine = line.trim();

    if (trimmedLine === "User profiles") {
      inUserProfilesSection = true;
      continue;
    }

    if (
      inUserProfilesSection &&
      (trimmedLine.startsWith("Profiles on interface") || trimmedLine.startsWith("Group policy profiles"))
    ) {
      inUserProfilesSection = false;
      break;
    }

    if (inUserProfilesSection && trimmedLine.startsWith("All User Profile")) {
      const colonIdx = trimmedLine.indexOf(": ");
      if (colonIdx !== -1) {
        userProfiles.push(trimmedLine.substring(colonIdx + 2).trim());
      }
    }
  }
  return userProfiles;
}

type NetworkInfo = {
  ssidName: string;
  authentication: string;
  /** Empty string for open networks (no password). */
  keyContent: string;
  isOpenNetwork: boolean;
};

type ResponseNetwork = {
  error?: {
    code: "ProfileNotFound" | "PermissionDenied" | "EnterpriseNetwork" | "Unknown";
    message?: string;
  };
  essentials?: NetworkInfo;
};

const OPEN_AUTH_TYPES = new Set(["open", "none"]);

export function parseNetshWlanProfileEssentials(output: string): ResponseNetwork {
  const response: ResponseNetwork = {};

  if (output.includes('Profile "') && output.includes('" is not found on the system.')) {
    response.error = {
      code: "ProfileNotFound",
      message: output.trim(),
    };
    return response;
  }

  const essentials: NetworkInfo = {
    ssidName: "",
    authentication: "",
    keyContent: "",
    isOpenNetwork: false,
  };

  // null = "Security Key" line not seen yet
  let securityKeyValue: "present" | "absent" | null = null;
  let keyContentFound = false;

  const lines = output.split("\n");

  for (const line of lines) {
    const trimmedLine = line.trim();

    if (trimmedLine.startsWith("SSID name")) {
      const colonIndex = trimmedLine.indexOf(":");
      if (colonIndex !== -1) {
        let ssid = trimmedLine.slice(colonIndex + 1).trim();
        if (ssid.startsWith('"') && ssid.endsWith('"')) {
          ssid = ssid.slice(1, -1);
        }
        essentials.ssidName = ssid;
      }
    } else if (trimmedLine.startsWith("Authentication")) {
      const colonIndex = trimmedLine.indexOf(":");
      if (colonIndex !== -1) {
        essentials.authentication = trimmedLine.slice(colonIndex + 1).trim();
        essentials.isOpenNetwork = OPEN_AUTH_TYPES.has(essentials.authentication.toLowerCase());
      }
    } else if (trimmedLine.startsWith("Security Key")) {
      const colonIndex = trimmedLine.indexOf(":");
      if (colonIndex !== -1) {
        securityKeyValue =
          trimmedLine
            .slice(colonIndex + 1)
            .trim()
            .toLowerCase() === "present"
            ? "present"
            : "absent";
      }
    } else if (trimmedLine.startsWith("Key Content")) {
      const colonIndex = trimmedLine.indexOf(":");
      if (colonIndex !== -1) {
        essentials.keyContent = trimmedLine.slice(colonIndex + 1).trim();
        keyContentFound = true;
      }
    }
  }

  if (essentials.isOpenNetwork) {
    // Open auth type → no key expected; return early so callers can display accordingly.
    response.essentials = essentials;
    return response;
  }

  if (securityKeyValue === "absent") {
    // WPA-Enterprise / 802.1x / certificate-based — no pre-shared key is stored.
    response.error = {
      code: "EnterpriseNetwork",
      message:
        `"${essentials.ssidName || "This network"}" uses enterprise/certificate-based authentication ` +
        "(WPA-Enterprise / 802.1x). There is no shared password stored on this device.",
    };
    return response;
  }

  if (securityKeyValue === "present" && !keyContentFound) {
    // Key exists but netsh withheld it — insufficient permissions.
    response.error = {
      code: "PermissionDenied",
      message:
        "Windows did not reveal the key content. " +
        "Try running Raycast as Administrator (right-click → Run as administrator).",
    };
    return response;
  }

  if (securityKeyValue === null && !keyContentFound) {
    response.error = {
      code: "Unknown",
      message:
        "Could not parse the network security details from netsh output. " +
        "This can happen on non-English Windows installations where field names are localized.",
    };
    return response;
  }

  response.essentials = essentials;
  return response;
}

/**
 * Parse the output of `networksetup -listallhardwareports` to find the
 * device name (e.g. "en0") for the Wi-Fi / AirPort interface.
 * Falls back to "en0" when no Wi-Fi port is found.
 */
export function parseWifiInterface(output: string): string {
  const lines = output.split("\n");
  let inWifiSection = false;

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed === "Hardware Port: Wi-Fi" || trimmed === "Hardware Port: AirPort") {
      inWifiSection = true;
      continue;
    }

    if (inWifiSection && trimmed.startsWith("Device:")) {
      return trimmed.slice("Device:".length).trim();
    }

    // A new "Hardware Port:" line means we've left the Wi-Fi section.
    if (inWifiSection && trimmed.startsWith("Hardware Port:")) {
      break;
    }
  }

  return "en0";
}
