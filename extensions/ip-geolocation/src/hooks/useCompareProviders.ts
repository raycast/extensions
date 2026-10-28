import { useCachedPromise } from "@raycast/utils";
import net from "net";
import { publicIpv4 } from "public-ip";
import { compareProviders, summarize } from "../utils/ip-providers";
import { CompareProvidersData } from "../types/ip-providers";

export class PublicIpError extends Error {
  constructor(reason: string) {
    super(`Could not find your public IP: ${reason}`);
    this.name = "PublicIpError";
  }
}

export function useCompareProviders(ipAddress: string) {
  return useCachedPromise(
    async (ip: string): Promise<CompareProvidersData | undefined> => {
      let target = ip ? ip.trim() : "";
      if (!target) {
        try {
          target = await publicIpv4({ onlyHttps: true });
        } catch (error) {
          throw new PublicIpError(error instanceof Error ? error.message : String(error));
        }
      }
      target = target.trim();
      if (!target || net.isIP(target) === 0) {
        return undefined;
      }
      const results = await compareProviders(target);
      const summary = summarize(results);
      return {
        ip: target,
        results,
        summary,
      };
    },
    [ipAddress],
  );
}
