import { useCachedState } from "@raycast/utils";
import type { Host, HostsDictionary } from "../types";

export function useCachedHosts() {
  const [hosts, setHosts] = useCachedState<HostsDictionary>("hosts", {});

  const addHost = (host: string) =>
    setHosts((s) => ({
      ...s,
      [host]: {
        host,
        isLocal: host.includes("localhost"),
      },
    }));

  const deleteHost = (host: Host) =>
    setHosts((s) =>
      Object.keys(s).reduce<HostsDictionary>(
        (acc, key) =>
          key === host.host
            ? acc
            : {
                ...acc,
                [key]: s[key],
              },
        {},
      ),
    );

  return {
    hosts,
    addHost,
    deleteHost,
  };
}
