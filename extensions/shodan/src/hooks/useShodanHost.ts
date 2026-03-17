import { showToast, Toast } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { shodanClient } from "../api/client";

interface UseShodanHostOptions {
  ip: string;
  enabled?: boolean;
}

// Simple IP validation
function isValidIP(ip: string): boolean {
  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
  const ipv6Regex = /^([0-9a-fA-F]{0,4}:){2,7}[0-9a-fA-F]{0,4}$/;

  if (ipv4Regex.test(ip)) {
    const parts = ip.split(".");
    return parts.every((part) => {
      const num = parseInt(part, 10);
      return num >= 0 && num <= 255;
    });
  }

  return ipv6Regex.test(ip);
}

export function useShodanHost({ ip, enabled = true }: UseShodanHostOptions) {
  const { data, isLoading, error, revalidate } = usePromise(
    async (ipAddress: string) => {
      // Validate IP before making request
      if (!isValidIP(ipAddress)) {
        throw new Error(
          "Invalid IP address format. Please enter a valid IPv4 or IPv6 address.",
        );
      }
      return await shodanClient.hostLookup(ipAddress);
    },
    [ip],
    {
      execute: enabled && ip.length > 0,
      onError: (err) => {
        let message = err.message;

        // Handle specific error types
        if (err.name === "AuthenticationError") {
          message = "Invalid API key. Please check your extension preferences.";
        } else if (err.name === "RateLimitError") {
          message = err.message; // Already includes wait time if available
        } else if (err.message.includes("Invalid IP address format")) {
          message = err.message;
        } else if (
          err.message.includes("404") ||
          err.message.includes("No information")
        ) {
          message = "No information available for this IP address.";
        }

        showToast({
          style: Toast.Style.Failure,
          title: "Host Lookup Failed",
          message,
        });
      },
    },
  );

  return {
    host: data,
    isLoading,
    error,
    revalidate,
  };
}
