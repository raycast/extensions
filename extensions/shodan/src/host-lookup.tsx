import { useState } from "react";
import {
  List,
  ActionPanel,
  Action,
  Icon,
  Form,
  useNavigation,
  LaunchProps,
} from "@raycast/api";
import { useShodanHost } from "./hooks/useShodanHost";
import { HostDetailView } from "./components/HostDetailView";
import { copyHostAsJSON } from "./utils/export";
import { getPortColor, getServiceNameForPort } from "./utils/formatters";
import { Color } from "@raycast/api";

interface HostLookupArguments {
  ip?: string;
}

export default function HostLookupCommand(
  props: LaunchProps<{ arguments: HostLookupArguments }>,
) {
  const initialIp = props.arguments?.ip || "";
  const [ipInput, setIpInput] = useState(initialIp);
  const [submittedIp, setSubmittedIp] = useState(initialIp);
  const { push } = useNavigation();

  const { host, isLoading, error } = useShodanHost({
    ip: submittedIp,
    enabled: submittedIp.length > 0,
  });

  const handleSubmit = () => {
    const trimmed = ipInput.trim();
    if (trimmed.length > 0) {
      setSubmittedIp(trimmed);
    }
  };

  // Show form if no IP submitted yet
  if (!submittedIp) {
    return (
      <Form
        navigationTitle="Host Lookup"
        actions={
          <ActionPanel>
            <Action.SubmitForm
              title="Look up Host"
              onSubmit={() => handleSubmit()}
              icon={Icon.MagnifyingGlass}
            />
          </ActionPanel>
        }
      >
        <Form.TextField
          id="ip"
          title="IP Address"
          placeholder="Enter an IP address (e.g., 8.8.8.8)"
          value={ipInput}
          onChange={setIpInput}
          autoFocus
        />
        <Form.Description text="Enter an IP address to look up detailed information from Shodan." />
      </Form>
    );
  }

  // Show loading or results
  if (isLoading) {
    return (
      <List isLoading={true} navigationTitle={`Looking up ${submittedIp}`}>
        <List.EmptyView
          title="Loading..."
          description={`Fetching information for ${submittedIp}`}
        />
      </List>
    );
  }

  // Show error state
  if (error || !host) {
    return (
      <List navigationTitle="Host Lookup">
        <List.EmptyView
          title="No Information Found"
          description={`No Shodan data available for ${submittedIp}. The host may not be indexed.`}
          icon={Icon.XMarkCircle}
          actions={
            <ActionPanel>
              <Action
                title="Try Another IP"
                icon={Icon.MagnifyingGlass}
                onAction={() => {
                  setSubmittedIp("");
                  setIpInput("");
                }}
              />
              <Action.OpenInBrowser
                title="Search on Shodan Website"
                url={`https://www.shodan.io/host/${submittedIp}`}
              />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  // Show host details in list format with option to view full details
  const vulnCount = host.vulns ? host.vulns.length : 0;

  return (
    <List navigationTitle={`Host: ${host.ip_str}`}>
      <List.Section title="Overview">
        <List.Item
          title="View Full Details"
          subtitle="Open detailed view with map and all information"
          icon={Icon.Eye}
          actions={
            <ActionPanel>
              <Action
                title="View Full Details"
                icon={Icon.Eye}
                onAction={() => push(<HostDetailView ip={host.ip_str} />)}
              />
            </ActionPanel>
          }
        />
      </List.Section>

      <List.Section title="Basic Information">
        <List.Item
          title="IP Address"
          subtitle={host.ip_str}
          icon={Icon.Globe}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard title="Copy IP" content={host.ip_str} />
            </ActionPanel>
          }
        />
        <List.Item
          title="Organization"
          subtitle={host.org}
          icon={Icon.Building}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard
                title="Copy Organization"
                content={host.org}
              />
            </ActionPanel>
          }
        />
        <List.Item
          title="ASN"
          subtitle={host.asn}
          icon={Icon.Network}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard title="Copy Asn" content={host.asn} />
            </ActionPanel>
          }
        />
        <List.Item title="ISP" subtitle={host.isp} icon={Icon.Wifi} />
        {host.os && (
          <List.Item
            title="Operating System"
            subtitle={host.os}
            icon={Icon.Desktop}
          />
        )}
      </List.Section>

      <List.Section title="Location">
        <List.Item
          title="Country"
          subtitle={`${host.location.country_name} (${host.location.country_code})`}
          icon={Icon.Pin}
        />
        {host.location.city && (
          <List.Item
            title="City"
            subtitle={host.location.city}
            icon={Icon.Map}
          />
        )}
        <List.Item
          title="Coordinates"
          subtitle={`${host.location.latitude}, ${host.location.longitude}`}
          icon={Icon.Compass}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser
                title="Open in Google Maps"
                url={`https://www.google.com/maps?q=${host.location.latitude},${host.location.longitude}`}
              />
              <Action.CopyToClipboard
                title="Copy Coordinates"
                content={`${host.location.latitude}, ${host.location.longitude}`}
              />
            </ActionPanel>
          }
        />
      </List.Section>

      <List.Section title={`Open Ports (${host.ports.length})`}>
        {host.ports.slice(0, 15).map((port) => (
          <List.Item
            key={port}
            title={String(port)}
            subtitle={getServiceNameForPort(port)}
            icon={{ source: Icon.Plug, tintColor: getPortColor(port) }}
          />
        ))}
        {host.ports.length > 15 && (
          <List.Item
            title={`+${host.ports.length - 15} more ports`}
            icon={Icon.Ellipsis}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard
                  title="Copy All Ports"
                  content={host.ports.join(", ")}
                />
              </ActionPanel>
            }
          />
        )}
      </List.Section>

      {vulnCount > 0 && (
        <List.Section title={`Vulnerabilities (${vulnCount})`}>
          {host.vulns!.slice(0, 10).map((vuln) => (
            <List.Item
              key={vuln}
              title={vuln}
              icon={{ source: Icon.Bug, tintColor: Color.Red }}
              actions={
                <ActionPanel>
                  <Action.OpenInBrowser
                    title="View Cve Details"
                    url={`https://nvd.nist.gov/vuln/detail/${vuln}`}
                  />
                  <Action.CopyToClipboard title="Copy Cve" content={vuln} />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}

      {host.hostnames.length > 0 && (
        <List.Section title={`Hostnames (${host.hostnames.length})`}>
          {host.hostnames.slice(0, 10).map((hostname) => (
            <List.Item
              key={hostname}
              title={hostname}
              icon={Icon.Link}
              actions={
                <ActionPanel>
                  <Action.CopyToClipboard
                    title="Copy Hostname"
                    content={hostname}
                  />
                  <Action.OpenInBrowser
                    title="Open in Browser"
                    url={`http://${hostname}`}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}

      <List.Section title="Actions">
        <List.Item
          title="Export as JSON"
          subtitle="Copy full host data to clipboard"
          icon={Icon.Download}
          actions={
            <ActionPanel>
              <Action
                title="Copy as JSON"
                icon={Icon.Clipboard}
                onAction={() => copyHostAsJSON(host)}
              />
            </ActionPanel>
          }
        />
        <List.Item
          title="View on Shodan"
          subtitle="Open in browser"
          icon={Icon.Globe}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser
                title="Open in Shodan"
                url={`https://www.shodan.io/host/${host.ip_str}`}
              />
            </ActionPanel>
          }
        />
        <List.Item
          title="Look Up Another IP"
          subtitle="Search for a different host"
          icon={Icon.MagnifyingGlass}
          actions={
            <ActionPanel>
              <Action
                title="New Lookup"
                icon={Icon.MagnifyingGlass}
                onAction={() => {
                  setSubmittedIp("");
                  setIpInput("");
                }}
              />
            </ActionPanel>
          }
        />
      </List.Section>
    </List>
  );
}
