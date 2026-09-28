import { useEffect, useRef, useState } from "react";
import {
  allDevicesEnabled,
  bonjourEnabled,
  subnetScanEnabled,
  discoveryHost,
  discoveryPassword,
  discoveryUsername,
} from "../lib/preferences";
import { listShares } from "../lib/smb-shares";
import {
  discoverAllDevices,
  discoverViaBonjour,
  discoverViaSubnetScan,
  mergeDiscoveredHosts,
  DiscoveredHost,
} from "../lib/network-discovery";

export type DiscoveredSmbShare = { host: string; vol: string };

export type NetworkDiscoveryResult = {
  smbShares: DiscoveredSmbShare[];
  // SMB hosts that wouldn't list without credentials, so they surface at
  // host level and are browsed on demand instead.
  smbHostsNeedingCredentials: string[];
  webdavHosts: DiscoveredHost[];
  // Ping-sweep hosts, unfiltered. Callers dedupe against the lists above.
  otherDevices: string[];
  isLoading: boolean;
  // Re-runs every source from scratch, abandoning any run still in flight.
  refresh: () => void;
};

// Merges all four discovery sources into one result. Only SMB hosts expand
// into shares; nothing equivalent exists for WebDAV. Results stream in as
// they arrive, so a slow subnet scan doesn't block Bonjour's output.
export function useNetworkDiscovery(): NetworkDiscoveryResult {
  const [smbShares, setSmbShares] = useState<DiscoveredSmbShare[]>([]);
  const [smbHostsNeedingCredentials, setSmbHostsNeedingCredentials] = useState<string[]>([]);
  const [webdavHosts, setWebdavHosts] = useState<DiscoveredHost[]>([]);
  const [otherDevices, setOtherDevices] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const expandedHosts = useRef(new Set<string>());
  // Only the newest run applies its results; older ones are ignored.
  const runToken = useRef(0);

  function discover() {
    const token = ++runToken.current;
    const cancelled = () => token !== runToken.current;

    expandedHosts.current = new Set();
    setSmbShares([]);
    setSmbHostsNeedingCredentials([]);
    setWebdavHosts([]);
    setOtherDevices([]);
    setIsLoading(true);

    // Tracked so isLoading waits for share expansion, not just discovery.
    const pendingExpansions: Promise<void>[] = [];

    // Only the host named in Preferences gets the saved password. A host that
    // merely turned up on the network hasn't been vouched for, and listing its
    // shares with stored credentials would send them to every machine on the
    // subnet with port 445 open. Everything else is Keychain-only, so a host
    // expands silently once it has been connected to, and otherwise waits to
    // be browsed deliberately.
    function expandSmbHost(host: string, vouchedFor: boolean) {
      const key = host.toLowerCase();
      if (expandedHosts.current.has(key)) return;
      expandedHosts.current.add(key);

      const expansion = listShares(host, discoveryUsername(), vouchedFor ? discoveryPassword() : undefined)
        .then((shares) => {
          if (cancelled()) return;
          setSmbShares((prev) => [...prev, ...shares.map((vol) => ({ host, vol }))]);
        })
        .catch(() => {
          if (cancelled()) return;
          // Unreachable, or macOS holds no credential for it.
          setSmbHostsNeedingCredentials((prev) => (prev.includes(host) ? prev : [...prev, host]));
        });
      pendingExpansions.push(expansion);
    }

    function handleHosts(hosts: DiscoveredHost[]) {
      if (cancelled() || !hosts.length) return;
      const smb = hosts.filter((h) => h.protocol === "smb");
      const webdav = hosts.filter((h) => h.protocol !== "smb");
      smb.forEach((h) => expandSmbHost(h.host, false));
      if (webdav.length) {
        setWebdavHosts((prev) => mergeDiscoveredHosts(prev, webdav));
      }
    }

    async function run() {
      const prefHost = discoveryHost().trim();
      if (prefHost) expandSmbHost(prefHost, true);

      const tasks: Promise<void>[] = [];

      if (bonjourEnabled()) {
        tasks.push(discoverViaBonjour().then(handleHosts));
      }
      if (subnetScanEnabled()) {
        tasks.push(discoverViaSubnetScan(handleHosts).then(() => undefined));
      }
      if (allDevicesEnabled()) {
        tasks.push(
          discoverAllDevices((found) => {
            if (cancelled() || !found.length) return;
            setOtherDevices((prev) => [...new Set([...prev, ...found])]);
          }).then(() => undefined),
        );
      }

      // Sources resolve first, then any expansions they queued.
      await Promise.all(tasks);
      await Promise.all(pendingExpansions);
      if (!cancelled()) setIsLoading(false);
    }

    run();
  }

  useEffect(() => {
    discover();
  }, []);

  return { smbShares, smbHostsNeedingCredentials, webdavHosts, otherDevices, isLoading, refresh: discover };
}
