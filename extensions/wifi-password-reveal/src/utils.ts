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
  keyContent: string;
};

type ResponseNetwork = {
  error?: {
    code: string;
    message?: string;
  };
  essentials?: NetworkInfo;
};

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
  };

  const lines = output.split("\n");

  for (const line of lines) {
    const trimmedLine = line.trim();

    // Extract SSID name
    if (trimmedLine.startsWith("SSID name")) {
      const parts = trimmedLine.split(":");
      if (parts.length > 1) {
        let ssid = parts[1].trim();
        // Remove quotes if present
        if (ssid.startsWith('"') && ssid.endsWith('"')) {
          ssid = ssid.substring(1, ssid.length - 1);
        }
        essentials.ssidName = ssid;
      }
    }

    // Extract authentication type
    else if (trimmedLine.startsWith("Authentication")) {
      const parts = trimmedLine.split(":");
      if (parts.length > 1) {
        essentials.authentication = parts[1].trim();
      }
    }

    // Extract key content (password)
    else if (trimmedLine.startsWith("Key Content")) {
      const colonIndex = trimmedLine.indexOf(":");
      if (colonIndex !== -1) {
        essentials.keyContent = trimmedLine.slice(colonIndex + 1).trim();
      }
    }

    if (essentials.ssidName !== "" && essentials.authentication !== "" && essentials.keyContent !== "") {
      break;
    }
  }

  response.essentials = essentials;
  return response;
}
