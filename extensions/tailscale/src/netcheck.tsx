import { List, Icon, ActionPanel, Action, Color } from "@raycast/api";
import { useEffect, useState } from "react";
import { getErrorDetails, ErrorDetails, getNetcheck, getDerpMap, NetcheckResponse, Derp } from "./shared";

const getDerps = (netcheck: NetcheckResponse, setPreferredDERP: (derp: Derp) => void) => {
  // the netcheck json response contains a map of region IDs to latencies, so we need to map them to the actual region data
  // the pretty printed command does that behind the scenes
  const _derpMap = getDerpMap();
  return Object.keys(netcheck.RegionLatency)
    .map((key) => {
      const _key = parseInt(key);
      const derp = {
        id: key,
        code: _derpMap[_key].RegionCode,
        name: _derpMap[_key].RegionName,
        latency: netcheck.RegionLatency[key] ? (netcheck.RegionLatency[key] / 1000000).toFixed(1) : undefined,
        latencies: {
          v4: netcheck.RegionV4Latency[key] ? (netcheck.RegionV4Latency[key] / 1000000).toFixed(1) : undefined,
          v6: netcheck.RegionV6Latency[key] ? (netcheck.RegionV6Latency[key] / 1000000).toFixed(1) : undefined,
        },
        nodes: _derpMap[_key].Nodes,
      };
      netcheck.PreferredDERP === _key && setPreferredDERP(derp);
      return derp;
    })
    .sort((a, b) => {
      if (a.latency && b.latency) return parseFloat(a.latency) - parseFloat(b.latency);
      if (a.latency) return 1;
      if (b.latency) return -1;
      return 0;
    });
};

export default function MyDeviceList() {
  const [netcheck, setNetcheck] = useState<NetcheckResponse>();
  const [portMappings, setPortMappings] = useState<string[]>([]);
  const [derps, setDerps] = useState<Derp[]>([]);
  const [preferredDERP, setPreferredDERP] = useState<Derp>();
  const [error, setError] = useState<ErrorDetails>();

  useEffect(() => {
    async function fetch() {
      try {
        const _netcheck = getNetcheck();
        setDerps(getDerps(_netcheck, setPreferredDERP));
        setNetcheck(_netcheck);
        setPortMappings(
          ["UPnP", "PMP", "PCP"].reduce((acc, mapping) => {
            _netcheck[mapping] && acc.push(mapping);
            return acc;
          }, [] as string[]),
        );
      } catch (error) {
        setError(getErrorDetails(error, "Couldn’t load netcheck."));
      }
    }
    fetch();
  }, []);

  return (
    <List isLoading={!netcheck && !portMappings && !error}>
      {error ? (
        <List.EmptyView icon={Icon.Warning} title={error.title} description={error.description} />
      ) : (
        <>
          <List.Item title="UDP" subtitle={String(netcheck?.UDP)} />
          <List.Item
            title="IPv4"
            subtitle={`${netcheck?.IPv4 ? `yes, ${netcheck?.GlobalV4}` : "no"}`}
            actions={
              <ActionPanel>
                {netcheck?.IPv4 && <Action.CopyToClipboard title="Copy IPv4" content={netcheck?.GlobalV4} />}
                {netcheck?.IPv4 && <Action.Paste title="Paste IPv4" content={netcheck?.GlobalV4} />}
              </ActionPanel>
            }
          />
          <List.Item
            title="IPv6"
            subtitle={`${netcheck?.IPv6 ? `yes, ${netcheck?.GlobalV6}` : "no"}`}
            actions={
              <ActionPanel>
                {netcheck?.IPv6 && <Action.CopyToClipboard title="Copy IPv6" content={netcheck?.GlobalV6} />}
                {netcheck?.IPv6 && <Action.Paste title="Paste IPv6" content={netcheck?.GlobalV6} />}
              </ActionPanel>
            }
          />
          <List.Item title="Mapping Varies by Destination IP" subtitle={String(netcheck?.MappingVariesByDestIP)} />
          <List.Item title="Port Mapping" subtitle={portMappings.join(", ")} />
          <List.Item title="Nearest DERP" subtitle={preferredDERP?.name} />
          <List.Section title="DERP Regions">
            {derps.map((derp) => (
              <List.Item
                title={derp.code}
                subtitle={`${derp.name} · ${derp.nodes?.length} node${derp.nodes?.length === 1 ? "" : "s"}`}
                accessories={[
                  ...(derp.id === String(netcheck?.PreferredDERP)
                    ? [{ icon: { source: Icon.Star, tintColor: Color.Yellow } }]
                    : []),
                  {
                    text: `${derp.latency} ms`,
                  },
                ]}
                keywords={[derp.id, derp.name]}
                key={derp.id}
                actions={
                  <ActionPanel>
                    <Action.Push title="Open Details" target={derpDetails(derp)} />
                    <Action.CopyToClipboard title="Copy Name" content={derp.name} />
                    <Action.CopyToClipboard title="Copy Code" content={derp.code} />
                    {derp.latency && <Action.CopyToClipboard title="Copy Latency" content={derp.latency} />}
                  </ActionPanel>
                }
              />
            ))}
          </List.Section>
        </>
      )}
    </List>
  );
}

export function derpDetails(derp: Derp) {
  return (
    <List navigationTitle={`${derp.code} (${derp.name})`}>
      <List.Item title="Code" subtitle={derp.code} />
      <List.Item title="Name" subtitle={derp.name} />
      <List.Item title="ID" subtitle={derp.id} />
      <List.Section title="Latencies">
        {derp.latencies.v4 && <List.Item title="IPv4" subtitle={`${derp.latencies.v4} ms`} />}
        {derp.latencies.v6 && <List.Item title="IPv6" subtitle={`${derp.latencies.v6} ms`} />}
      </List.Section>
      <List.Section title="Servers">
        {derp.nodes?.map((node) => (
          <List.Item
            title={node.Name}
            subtitle={node.HostName}
            keywords={[node.HostName, node.IPv4, node.IPv6]}
            key={node.Name}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard title="Copy Hostname" content={node.HostName} />
                {node.IPv4 && <Action.CopyToClipboard title="Copy IPv4" content={node.IPv4} />}
                {node.IPv6 && <Action.CopyToClipboard title="Copy IPv6" content={node.IPv6} />}
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
