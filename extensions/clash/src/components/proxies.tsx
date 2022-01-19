import { ActionPanel, List, PushAction } from "@raycast/api";
import { useEffect, useState } from "react";
import { ErrorHandler } from "../utils/error";
import { GetProviders } from "./client/http";
import { ProxiesT, ProxyT } from "./types";

// ref: https://github.com/yichengchen/clashX/blob/5c1049a3d214ac5577048282107d956f0d7a4249/ClashX/Models/ClashProxy.swift#L39
const proxyGroups = ["Selector", "URLTest", "Fallback", "LoadBalance", "Relay"];

export default function Proxies(): JSX.Element {
  const [loading, setLoading] = useState(true);
  const [proxies, setProxies] = useState({} as ProxiesT);
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const data = await GetProviders();
        setProxies(data);
      } catch (e) {
        ErrorHandler(e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  let globalAll: Array<string> = [];
  for (const [k, v] of Object.entries(proxies)) {
    if (k === "GLOBAL" && v.all) {
      globalAll = v.all;
    }
  }

  const proxyList: Array<ProxyT> = Object.values(proxies)
    .filter(({ type }) => proxyGroups.includes(type))
    .sort(({ name: a }, { name: b }) => globalAll.indexOf(a) - globalAll.indexOf(b));

  return (
    <List isLoading={loading}>
      {proxyList.map((proxy, index) => {
        return (
          <List.Item
            key={index}
            title={proxy.name}
            subtitle={proxy.type}
            accessoryTitle={proxy.now}
            actions={
              <ActionPanel>
                <PushAction
                  title="Show Proxies"
                  target={
                    <List>
                      {proxy.all.map((p, subIndex) => (
                        <List.Item key={subIndex} title={p} accessoryTitle={p == proxy.now ? "Current" : ""} />
                      ))}
                    </List>
                  }
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
