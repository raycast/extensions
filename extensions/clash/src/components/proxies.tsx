import { Action, ActionPanel, List } from "@raycast/api";
import { useEffect, useState } from "react";
import { ErrorHandler } from "../utils/error";
import { GetProviders, SelectProxy } from "./client/http";
import { ProxyT } from "./types";

type ProxyGroupProps = {
  name: string;
  proxies: Array<string>;
  current: string;
  refresh: () => void;
  selectable: boolean;
};

function ProxyGroup({ name, proxies, current, refresh, selectable }: ProxyGroupProps): JSX.Element {
  const [select, setSelect] = useState(current);
  const [loading, setLoading] = useState(false);
  return (
    <List isLoading={loading}>
      {proxies.map((proxy, index) =>
        selectable ? (
          <List.Item
            key={index}
            title={proxy}
            accessoryTitle={proxy == select ? "Current" : ""}
            actions={
              <ActionPanel>
                <Action
                  title={"Select"}
                  onAction={async () => {
                    try {
                      setLoading(true);
                      await SelectProxy(name, proxy);
                      refresh();
                      setSelect(proxy);
                    } catch (e) {
                      ErrorHandler(e);
                    } finally {
                      setLoading(false);
                    }
                  }}
                />
              </ActionPanel>
            }
          />
        ) : (
          <List.Item key={index} title={proxy} accessoryTitle={proxy == select ? "Current" : ""} />
        ),
      )}
    </List>
  );
}

// ref: https://github.com/yichengchen/clashX/blob/5c1049a3d214ac5577048282107d956f0d7a4249/ClashX/Models/ClashProxy.swift#L39
const proxyGroups = ["Selector", "URLTest", "Fallback", "LoadBalance", "Relay"];

export default function Proxies(): JSX.Element {
  const [loading, setLoading] = useState(true);
  const [proxies, setProxies] = useState([] as Array<ProxyT>);
  const [refresh, setRefresh] = useState(false);
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const data = await GetProviders();
        let globalAll: Array<string> = [];
        for (const [k, v] of Object.entries(proxies)) {
          if (k === "GLOBAL" && v.all) {
            globalAll = v.all;
          }
        }
        const proxyList: Array<ProxyT> = Object.values(data)
          .filter(({ type }) => proxyGroups.includes(type))
          .sort(({ name: a }, { name: b }) => globalAll.indexOf(a) - globalAll.indexOf(b));
        setProxies(proxyList);
      } catch (e) {
        ErrorHandler(e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [refresh]);

  return (
    <List isLoading={loading}>
      {proxies.map((proxy, index) => {
        return (
          <List.Item
            key={index}
            title={proxy.name}
            subtitle={proxy.type}
            accessoryTitle={proxy.now}
            actions={
              <ActionPanel>
                <Action.Push
                  title="Show Proxies"
                  target={
                    <ProxyGroup
                      name={proxy.name}
                      proxies={proxy.all}
                      current={proxy.now}
                      refresh={() => setRefresh(!refresh)}
                      selectable={proxy.type == "Selector"}
                    />
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
