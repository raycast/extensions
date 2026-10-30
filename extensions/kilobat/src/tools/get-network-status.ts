import { Conditions, kilobat, WiFi } from "../kilobat";

/** The Mac's current network: Wi-Fi, internet latency and loss, VPN, metered network, keep-awake and power. */
export default async function tool() {
  const [wifi, conditions] = await Promise.all([
    kilobat<WiFi>(["wifi", "--json"]).catch(() => undefined),
    kilobat<Conditions>(["conditions", "--json"]),
  ]);
  return { wifi, conditions };
}
