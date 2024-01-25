import { LocalStorage, Toast, showToast } from "@raycast/api";
import React from "react";

export function useStorage() {
  const [hosts, setHosts] = React.useState<string[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    let ignore = false;
    LocalStorage.getItem<string>("hosts").then((hosts) => {
      if (ignore) return;
      const fromLocal = !hosts ? [] : (JSON.parse(hosts) as string[]);
      setIsLoading(false);
      setHosts(fromLocal);
    });
    return () => {
      ignore = true;
    };
  }, []);

  const addHost = React.useCallback(
    (host: string) => {
      const hostClean = host.toLowerCase().trim();
      if (!/^[a-z0-9-]+(\.[a-z0-9-]+)*(\.[a-z]{2,})$/.test(hostClean)) {
        showToast({ title: "This is not a valid host", style: Toast.Style.Failure });
        return false;
      }
      const hostsSet = new Set(hosts.slice().reverse());
      hostsSet.add(hostClean);
      const hostsArr = Array.from(hostsSet).reverse();
      LocalStorage.setItem("hosts", JSON.stringify(hostsArr));
      setHosts(hostsArr);
      return true;
    },
    [hosts],
  );

  const removeHost = React.useCallback(
    (host: string) => {
      const hostClean = host.toLowerCase().trim();
      if (!/^[a-z0-9-]+(\.[a-z0-9-]+)*(\.[a-z]{2,})$/.test(hostClean)) {
        showToast({ title: "This is not a valid host", style: Toast.Style.Failure });
        return false;
      }
      const hostsSet = new Set(hosts);
      hostsSet.delete(hostClean);
      const hostsArr = Array.from(hostsSet);
      LocalStorage.setItem("hosts", JSON.stringify(hostsArr));
      setHosts(hostsArr);
      return true;
    },
    [hosts],
  );

  return { hosts, isLoading, addHost, removeHost };
}
