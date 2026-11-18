import { usePromise } from "@raycast/utils";
import { shodanClient } from "../api/client";
import { InternetDBResponse } from "../api/types";

interface UseInternetDBOptions {
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

export function useInternetDB({ ip, enabled = true }: UseInternetDBOptions) {
  const { data, isLoading, error, revalidate } = usePromise(
    async (ipAddress: string): Promise<InternetDBResponse | null> => {
      if (!isValidIP(ipAddress)) {
        throw new Error("Invalid IP address format.");
      }
      return await shodanClient.getInternetDB(ipAddress);
    },
    [ip],
    {
      execute: enabled && ip.length > 0,
    },
  );

  return {
    data,
    isLoading,
    error,
    revalidate,
  };
}
