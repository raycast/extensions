import { useState } from "react";
import {
  List,
  ActionPanel,
  Action,
  Icon,
  Form,
  useNavigation,
  LaunchProps,
  Color,
  showToast,
  Toast,
} from "@raycast/api";
import { useInternetDB } from "./hooks/useInternetDB";
import { useShodanHost } from "./hooks/useShodanHost";
import { HostDetailView } from "./components/HostDetailView";
import { getPortColor, getServiceNameForPort } from "./utils/formatters";

interface HostLookupArguments {
  ip?: string;
}

export default function HostLookupCommand(
  props: LaunchProps<{ arguments: HostLookupArguments }>,
) {
  const initialIp = props.arguments?.ip || "";
  const [ipInput, setIpInput] = useState(initialIp);
  const [submittedIp, setSubmittedIp] = useState(initialIp);
  const [loadShodan, setLoadShodan] = useState(false);
  const { push } = useNavigation();

  // First, try InternetDB (free, no credits)
  const {
    data: internetDBData,
    isLoading: internetDBLoading,
    error: internetDBError,
  } = useInternetDB({
    ip: submittedIp,
    enabled: submittedIp.length > 0,
  });

  // Only load Shodan data when explicitly requested
  const { host: shodanHost, isLoading: shodanLoading } = useShodanHost({
    ip: submittedIp,
    enabled: loadShodan && submittedIp.length > 0,
  });

  const handleSubmit = () => {
    const trimmed = ipInput.trim();
    if (trimmed.length > 0) {
      setSubmittedIp(trimmed);
      setLoadShodan(false); // Reset Shodan loading state for new IP
    }
  };

  const handleLoadShodan = () => {
    setLoadShodan(true);
    showToast({
      style: Toast.Style.Animated,
      title: "Loading from Shodan…",
      message: "This will use 1 query credit",
    });
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
        <Form.Description text="Quick lookup starts with InternetDB (free), then you can load full details from Shodan." />
      </Form>
    );
  }

  // Loading InternetDB
  if (internetDBLoading) {
    return (
      <List isLoading={true} navigationTitle={`Looking up ${submittedIp}`}>
        <List.EmptyView
          title="Loading…"
          description={`Fetching free data from InternetDB for ${submittedIp}`}
        />
      </List>
    );
  }

  // If Shodan data is loaded, show that instead
  if (loadShodan && shodanHost && !shodanLoading) {
    const vulnCount = shodanHost.vulns ? shodanHost.vulns.length : 0;

    return (
      <List navigationTitle={`Host: ${shodanHost.ip_str}`}>
        <List.Section
          title="Shodan Data"
          subtitle="Full details from Shodan API"
        >
          <List.Item
            title="View Full Details"
            subtitle="Open detailed view with banners and services"
            icon={Icon.Eye}
            accessories={[
              {
                tag: { value: "SHODAN", color: Color.Red },
                tooltip: "Premium data",
              },
            ]}
            actions={
              <ActionPanel>
                <Action
                  title="View Full Details"
                  icon={Icon.Eye}
                  onAction={() =>
                    push(<HostDetailView ip={shodanHost.ip_str} />)
                  }
                />
              </ActionPanel>
            }
          />
        </List.Section>

        <List.Section title="Basic Information">
          <List.Item
            title="IP Address"
            subtitle={shodanHost.ip_str}
            icon={Icon.Globe}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard
                  title="Copy IP"
                  content={shodanHost.ip_str}
                />
              </ActionPanel>
            }
          />
          <List.Item
            title="Organization"
            subtitle={shodanHost.org}
            icon={Icon.Building}
          />
          <List.Item
            title="ASN"
            subtitle={shodanHost.asn}
            icon={Icon.Network}
          />
          <List.Item title="ISP" subtitle={shodanHost.isp} icon={Icon.Wifi} />
          {shodanHost.os && (
            <List.Item
              title="Operating System"
              subtitle={shodanHost.os}
              icon={Icon.Desktop}
            />
          )}
        </List.Section>

        {shodanHost.location && (
          <List.Section title="Location">
            <List.Item
              title="Country"
              subtitle={`${shodanHost.location.country_name || "Unknown"} (${shodanHost.location.country_code || "??"})`}
              icon={Icon.Pin}
            />
            {shodanHost.location.city && (
              <List.Item
                title="City"
                subtitle={shodanHost.location.city}
                icon={Icon.Map}
              />
            )}
            {shodanHost.location.latitude && shodanHost.location.longitude && (
              <List.Item
                title="Coordinates"
                subtitle={`${shodanHost.location.latitude}, ${shodanHost.location.longitude}`}
                icon={Icon.Compass}
                actions={
                  <ActionPanel>
                    <Action.OpenInBrowser
                      title="Open in Google Maps"
                      url={`https://www.google.com/maps?q=${shodanHost.location.latitude},${shodanHost.location.longitude}`}
                    />
                  </ActionPanel>
                }
              />
            )}
          </List.Section>
        )}

        <List.Section title={`Open Ports (${shodanHost.ports.length})`}>
          {shodanHost.ports.slice(0, 15).map((port) => (
            <List.Item
              key={port}
              title={String(port)}
              subtitle={getServiceNameForPort(port)}
              icon={{ source: Icon.Plug, tintColor: getPortColor(port) }}
            />
          ))}
          {shodanHost.ports.length > 15 && (
            <List.Item
              title={`+${shodanHost.ports.length - 15} more ports`}
              icon={Icon.Ellipsis}
              actions={
                <ActionPanel>
                  <Action.CopyToClipboard
                    title="Copy All Ports"
                    content={shodanHost.ports.join(", ")}
                  />
                </ActionPanel>
              }
            />
          )}
        </List.Section>

        {vulnCount > 0 && (
          <List.Section title={`Vulnerabilities (${vulnCount})`}>
            {shodanHost.vulns!.slice(0, 10).map((vuln) => (
              <List.Item
                key={vuln}
                title={vuln}
                icon={{ source: Icon.Bug, tintColor: Color.Red }}
                actions={
                  <ActionPanel>
                    <Action.OpenInBrowser
                      title="View CVE Details"
                      url={`https://nvd.nist.gov/vuln/detail/${vuln}`}
                    />
                  </ActionPanel>
                }
              />
            ))}
          </List.Section>
        )}

        {shodanHost.hostnames.length > 0 && (
          <List.Section title={`Hostnames (${shodanHost.hostnames.length})`}>
            {shodanHost.hostnames.slice(0, 10).map((hostname) => (
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
                  </ActionPanel>
                }
              />
            ))}
          </List.Section>
        )}

        <List.Section title="Actions">
          <List.Item
            title="Look Up Another IP"
            icon={Icon.MagnifyingGlass}
            actions={
              <ActionPanel>
                <Action
                  title="New Lookup"
                  icon={Icon.MagnifyingGlass}
                  onAction={() => {
                    setSubmittedIp("");
                    setIpInput("");
                    setLoadShodan(false);
                  }}
                />
              </ActionPanel>
            }
          />
        </List.Section>
      </List>
    );
  }

  // Show InternetDB data (free) with option to load Shodan
  const hasInternetDBData = internetDBData && !internetDBError;
  const vulnCount = hasInternetDBData ? internetDBData.vulns?.length || 0 : 0;

  // No data from either source
  if (!hasInternetDBData && !loadShodan) {
    return (
      <List navigationTitle="Host Lookup">
        <List.EmptyView
          title="No Free Data Available"
          description={`InternetDB has no information for ${submittedIp}. Try loading from Shodan (uses credits).`}
          icon={Icon.XMarkCircle}
          actions={
            <ActionPanel>
              <Action
                title="Load from Shodan"
                icon={{ source: Icon.Download, tintColor: Color.Red }}
                onAction={handleLoadShodan}
              />
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

  // Loading Shodan after user requested it
  if (loadShodan && shodanLoading) {
    return (
      <List
        isLoading={true}
        navigationTitle={`Loading Shodan data for ${submittedIp}`}
      >
        <List.EmptyView
          title="Loading from Shodan…"
          description="Fetching full host details (uses 1 query credit)"
        />
      </List>
    );
  }

  // Show InternetDB data
  if (hasInternetDBData) {
    return (
      <List navigationTitle={`Host: ${internetDBData.ip}`}>
        <List.Section
          title="InternetDB Data"
          subtitle="Free lookup - no credits used"
        >
          <List.Item
            title="Load Full Details from Shodan"
            subtitle="Get organization, location, banners, and more"
            icon={{ source: Icon.Download, tintColor: Color.Red }}
            accessories={[
              {
                tag: { value: "1 CREDIT", color: Color.Orange },
                tooltip: "Uses Shodan API credits",
              },
            ]}
            actions={
              <ActionPanel>
                <Action
                  title="Load from Shodan"
                  icon={Icon.Download}
                  onAction={handleLoadShodan}
                />
              </ActionPanel>
            }
          />
        </List.Section>

        <List.Section title="Basic Information">
          <List.Item
            title="IP Address"
            subtitle={internetDBData.ip}
            icon={Icon.Globe}
            accessories={[
              {
                tag: { value: "FREE", color: Color.Green },
                tooltip: "InternetDB data",
              },
            ]}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard
                  title="Copy IP"
                  content={internetDBData.ip}
                />
                <Action
                  title="Load from Shodan"
                  icon={Icon.Download}
                  onAction={handleLoadShodan}
                />
              </ActionPanel>
            }
          />
        </List.Section>

        {internetDBData.ports.length > 0 && (
          <List.Section title={`Open Ports (${internetDBData.ports.length})`}>
            {internetDBData.ports.slice(0, 20).map((port) => (
              <List.Item
                key={port}
                title={String(port)}
                subtitle={getServiceNameForPort(port)}
                icon={{ source: Icon.Plug, tintColor: getPortColor(port) }}
                actions={
                  <ActionPanel>
                    <Action.CopyToClipboard
                      title="Copy Port"
                      content={String(port)}
                    />
                    <Action.CopyToClipboard
                      title="Copy All Ports"
                      content={internetDBData.ports.join(", ")}
                    />
                  </ActionPanel>
                }
              />
            ))}
            {internetDBData.ports.length > 20 && (
              <List.Item
                title={`+${internetDBData.ports.length - 20} more ports`}
                icon={Icon.Ellipsis}
                actions={
                  <ActionPanel>
                    <Action.CopyToClipboard
                      title="Copy All Ports"
                      content={internetDBData.ports.join(", ")}
                    />
                  </ActionPanel>
                }
              />
            )}
          </List.Section>
        )}

        {vulnCount > 0 && (
          <List.Section title={`Vulnerabilities (${vulnCount})`}>
            {internetDBData.vulns.slice(0, 10).map((vuln) => (
              <List.Item
                key={vuln}
                title={vuln}
                icon={{ source: Icon.Bug, tintColor: Color.Red }}
                actions={
                  <ActionPanel>
                    <Action.OpenInBrowser
                      title="View CVE Details"
                      url={`https://nvd.nist.gov/vuln/detail/${vuln}`}
                    />
                    <Action.CopyToClipboard title="Copy CVE" content={vuln} />
                  </ActionPanel>
                }
              />
            ))}
            {vulnCount > 10 && (
              <List.Item
                title={`+${vulnCount - 10} more vulnerabilities`}
                icon={Icon.Ellipsis}
              />
            )}
          </List.Section>
        )}

        {internetDBData.hostnames.length > 0 && (
          <List.Section
            title={`Hostnames (${internetDBData.hostnames.length})`}
          >
            {internetDBData.hostnames.slice(0, 10).map((hostname) => (
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

        {internetDBData.tags.length > 0 && (
          <List.Section title={`Tags (${internetDBData.tags.length})`}>
            {internetDBData.tags.map((tag) => (
              <List.Item
                key={tag}
                title={tag}
                icon={{ source: Icon.Tag, tintColor: Color.Purple }}
              />
            ))}
          </List.Section>
        )}

        {internetDBData.cpes.length > 0 && (
          <List.Section title={`CPEs (${internetDBData.cpes.length})`}>
            {internetDBData.cpes.slice(0, 10).map((cpe) => (
              <List.Item
                key={cpe}
                title={cpe}
                icon={Icon.Code}
                actions={
                  <ActionPanel>
                    <Action.CopyToClipboard title="Copy CPE" content={cpe} />
                  </ActionPanel>
                }
              />
            ))}
          </List.Section>
        )}

        <List.Section title="Actions">
          <List.Item
            title="Look Up Another IP"
            icon={Icon.MagnifyingGlass}
            actions={
              <ActionPanel>
                <Action
                  title="New Lookup"
                  icon={Icon.MagnifyingGlass}
                  onAction={() => {
                    setSubmittedIp("");
                    setIpInput("");
                    setLoadShodan(false);
                  }}
                />
              </ActionPanel>
            }
          />
          <List.Item
            title="View on Shodan Website"
            icon={Icon.Globe}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser
                  title="Open in Shodan"
                  url={`https://www.shodan.io/host/${internetDBData.ip}`}
                />
              </ActionPanel>
            }
          />
        </List.Section>
      </List>
    );
  }

  // Fallback
  return (
    <List navigationTitle="Host Lookup">
      <List.EmptyView
        title="Something went wrong"
        description="Please try again."
        actions={
          <ActionPanel>
            <Action
              title="Try Again"
              icon={Icon.ArrowClockwise}
              onAction={() => {
                setSubmittedIp("");
                setIpInput("");
                setLoadShodan(false);
              }}
            />
          </ActionPanel>
        }
      />
    </List>
  );
}
