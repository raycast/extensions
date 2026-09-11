/**
 * Masking utilities for Streamer Mode
 * Provides partial masking to hide sensitive data while maintaining context
 */

/**
 * Masks an email address with partial visibility
 * Example: "john.doe@example.com" -> "j***@***.com"
 */
export function maskEmail(email: string): string {
  if (!email || !email.includes("@")) {
    return "***";
  }

  const [local, domain] = email.split("@");
  if (!local || !domain) {
    return "***";
  }

  // Keep first character of local part
  const maskedLocal = local.charAt(0) + "***";

  // Keep TLD, mask domain name
  const domainParts = domain.split(".");
  const tld = domainParts.pop() || "";
  const maskedDomain = "***." + tld;

  return `${maskedLocal}@${maskedDomain}`;
}

/**
 * Masks an IP address with partial visibility
 * Example: "192.168.1.100" -> "192.***.***.**"
 */
export function maskIP(ip: string): string {
  if (!ip) {
    return "***";
  }

  // Handle IPv4
  if (ip.includes(".")) {
    const parts = ip.split(".");
    if (parts.length === 4) {
      // Keep first octet, mask the rest with same length pattern
      return `${parts[0]}.${"*".repeat(parts[1].length)}.${"*".repeat(parts[2].length)}.${"*".repeat(parts[3].length)}`;
    }
  }

  // Handle CIDR notation (e.g., 10.0.0.0/24)
  if (ip.includes("/")) {
    const [address, cidr] = ip.split("/");
    return `${maskIP(address)}/${cidr}`;
  }

  // Handle IPv6 or unknown format
  return "***:***:***";
}

/**
 * Masks a secret value completely
 * Example: "my-secret-password" -> "****"
 */
export function maskSecret(value: string): string {
  if (!value) {
    return "****";
  }
  // Show length hint without revealing content
  const len = value.length;
  if (len <= 4) {
    return "****";
  } else if (len <= 10) {
    return "******";
  } else {
    return "********";
  }
}

/**
 * Conditional masking helpers - only mask if streamer mode is enabled
 */
export function maskEmailIfEnabled(email: string, isEnabled: boolean): string {
  return isEnabled ? maskEmail(email) : email;
}

export function maskIPIfEnabled(ip: string, isEnabled: boolean): string {
  return isEnabled ? maskIP(ip) : ip;
}

export function maskSecretIfEnabled(value: string, isEnabled: boolean): string {
  return isEnabled ? maskSecret(value) : value;
}
