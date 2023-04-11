import { LookupAddress } from "dns";
import { LocalStorage } from "@raycast/api";
import { BRIDGE_ID_KEY, BRIDGE_IP_ADDRESS_KEY } from "./constants";
import dns from "dns";

// A shim to override the DNS lookup for the Hue bridge ID to the IP address
// This is needed to silence the following warning:
// [DEP0123] DeprecationWarning: Setting the TLS ServerName to an IP address is not permitted by RFC 6066.

const dnsLookup = dns.lookup;

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
dns.lookup = async (
  hostname: string,
  family: number,
  callback: (err: NodeJS.ErrnoException | null, address: string | LookupAddress[], family: number) => void
) => {
  const [bridgeIpAddress, bridgeId] = await Promise.all([
    LocalStorage.getItem<string>(BRIDGE_IP_ADDRESS_KEY),
    LocalStorage.getItem<string>(BRIDGE_ID_KEY),
  ]);

  if (hostname.toLowerCase() === bridgeId?.toLowerCase() && bridgeIpAddress !== undefined) {
    callback(null, bridgeIpAddress, 4);
  } else {
    dnsLookup(hostname, family, callback);
  }
};
