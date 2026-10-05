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
  discoverComputers,
  discoverViaBonjour,
  discoverViaSubnetScan,
  mergeDiscoveredHosts,
  DiscoveredComputer,
  DiscoveredHost,
} from "../lib/network-discovery";

export type DiscoveredSmbShare = { host: string; vol: string };

export type NetworkDiscoveryResult = {
  smbShares: DiscoveredSmbShare[];
  // SMB hosts that wouldn't list without credentials, so they surface at
  // host level and are browsed on demand instead.
  smbHostsNeedingCredentials: string[];
  webdavHosts: DiscoveredHost[];
  // Machines announcing themselves with no file-sharing service advertised.
  computers: DiscoveredComputer[];
  // Ping-sweep hosts, unfiltered. Callers dedupe against the lists above.
  otherDevices: string[];
  isLoading: boolean;
  // False until a run has been started, so a view that discovers on demand
  // can tell "not asked yet" from "asked, found nothing".
  hasRun: boolean;
  // Runs every source from scratch, abandoning any run still in flight.
  refresh: () => void;
};

// Merges all four discovery sources into one result. Only SMB hosts expand
// into shares; nothing equivalent exists for WebDAV. Results stream in as
// they arrive, so a slow subnet scan doesn't block Bonjour's output.
//
// `auto` is for a view where discovery is the point. Manage Drives passes
// false: a ping sweep of a /24 is 254 process spawns, and paying that on
// open, competing with the mount the user actually came to do, is not worth
// it when Discover on Network is one keystroke away.
export function useNetworkDiscovery(options?: { auto?: boolean }): NetworkDiscoveryResult {
  const auto = options?.auto ?? true;
  const [smbShares, setSmbShares] = useState<DiscoveredSmbShare[]>([]);
  const [smbHostsNeedingCredentials, setSmbHostsNeedingCredentials] = useState<string[]>([]);
  const [webdavHosts, setWebdavHosts] = useState<DiscoveredHost[]>([]);
  const [computers, setComputers] = useState<DiscoveredComputer[]>([]);
  const [otherDevices, setOtherDevices] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(auto);
  const [hasRun, setHasRun] = useState(auto);
  const expandedHosts = useRef(new Set<string>());
  // Only the newest run applies its results; older ones are ignored.
  const runToken = useRef(0);

  function discover() {
    const token = ++runToken.current;
    const cancelled = () => token !== runToken.current;

    setHasRun(true);
    expandedHosts.current = new Set();
    setSmbShares([]);
    setSmbHostsNeedingCredentials([]);
    setWebdavHosts([]);
    setComputers([]);
    setOtherDevices([]);
    setIsLoading(true);

    // Tracked so isLoading waits for share expansion, not just discovery.
    const pendingExpansions: Promise<void>[] = [];

    // Only the host named in Preferences gets the saved password. A host that
    // merely turned up on the network hasn't been vouched for, and listing its
    // shares with stored credentials would send them to every machine on the
    // subnet with port 445 open. Everything else is listed only if the server
    // will authenticate this user without a password, so a host expands
    // silently when it already has a session and otherwise waits to be
    // browsed deliberately.
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
        tasks.push(
          discoverComputers().then((found) => {
            if (cancelled() || !found.length) return;
            setComputers(found);
          }),
        );
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
    if (auto) discover();
  }, []);

  return {
    smbShares,
    smbHostsNeedingCredentials,
    webdavHosts,
    computers,
    otherDevices,
    isLoading,
    hasRun,
    refresh: discover,
  };
}
