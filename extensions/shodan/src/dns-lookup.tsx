import { useState, useMemo } from "react";
import {
  List,
  ActionPanel,
  Action,
  Icon,
  Form,
  showToast,
  Toast,
  getPreferenceValues,
  Color,
  Clipboard,
} from "@raycast/api";
import { useFetch } from "@raycast/utils";
import {
  DnsResolveResponse,
  DnsReverseResponse,
  ShodanDomainInfo,
} from "./api/types";

type LookupMode = "resolve" | "reverse" | "domain" | "subdomains";

export default function DnsLookupCommand() {
  const [mode, setMode] = useState<LookupMode>("domain");
  const [input, setInput] = useState("");
  const [submittedInput, setSubmittedInput] = useState("");
  const [filterQuery, setFilterQuery] = useState("");
  const { apiKey } = getPreferenceValues<Preferences>();

  // DNS Resolve (hostname to IP)
  const { data: resolveData, isLoading: resolveLoading } =
    useFetch<DnsResolveResponse>(
      `https://api.shodan.io/dns/resolve?hostnames=${encodeURIComponent(submittedInput)}&key=${apiKey}`,
      {
        execute: mode === "resolve" && submittedInput.length > 0,
        onError: (err) => {
          showToast({
            style: Toast.Style.Failure,
            title: "DNS Resolve Failed",
            message: err.message,
          });
        },
      },
    );

  // DNS Reverse (IP to hostname)
  const { data: reverseData, isLoading: reverseLoading } =
    useFetch<DnsReverseResponse>(
      `https://api.shodan.io/dns/reverse?ips=${encodeURIComponent(submittedInput)}&key=${apiKey}`,
      {
        execute: mode === "reverse" && submittedInput.length > 0,
        onError: (err) => {
          showToast({
            style: Toast.Style.Failure,
            title: "Reverse DNS Failed",
            message: err.message,
          });
        },
      },
    );

  // Domain info (includes subdomains)
  const { data: domainData, isLoading: domainLoading } =
    useFetch<ShodanDomainInfo>(
      `https://api.shodan.io/dns/domain/${encodeURIComponent(submittedInput)}?key=${apiKey}`,
      {
        execute:
          (mode === "domain" || mode === "subdomains") &&
          submittedInput.length > 0,
        onError: (err) => {
          showToast({
            style: Toast.Style.Failure,
            title: "Domain Lookup Failed",
            message: err.message,
          });
        },
      },
    );

  const isLoading = resolveLoading || reverseLoading || domainLoading;

  // Filter subdomains based on search query
  const filteredSubdomains = useMemo(() => {
    if (!domainData?.subdomains) return [];
    if (!filterQuery.trim()) return domainData.subdomains;
    const query = filterQuery.toLowerCase();
    return domainData.subdomains.filter((s) => s.toLowerCase().includes(query));
  }, [domainData?.subdomains, filterQuery]);

  // Filter DNS records based on search query
  const filteredRecords = useMemo(() => {
    if (!domainData?.data) return [];
    if (!filterQuery.trim()) return domainData.data;
    const query = filterQuery.toLowerCase();
    return domainData.data.filter(
      (r) =>
        r.subdomain.toLowerCase().includes(query) ||
        r.type.toLowerCase().includes(query) ||
        r.value.toLowerCase().includes(query),
    );
  }, [domainData?.data, filterQuery]);

  const handleSubmit = () => {
    const trimmed = input.trim();
    if (trimmed.length > 0) {
      setSubmittedInput(trimmed);
      setFilterQuery("");
    }
  };

  const handleNewLookup = () => {
    setSubmittedInput("");
    setInput("");
    setFilterQuery("");
  };

  // Show form if no input submitted
  if (!submittedInput) {
    return (
      <Form
        navigationTitle="DNS Lookup"
        actions={
          <ActionPanel>
            <Action.SubmitForm
              title="Look up"
              onSubmit={handleSubmit}
              icon={Icon.MagnifyingGlass}
            />
          </ActionPanel>
        }
      >
        <Form.Dropdown
          id="mode"
          title="Lookup Type"
          value={mode}
          onChange={(v) => setMode(v as LookupMode)}
        >
          <Form.Dropdown.Item
            value="domain"
            title="Domain Info & DNS Records"
            icon={Icon.Document}
          />
          <Form.Dropdown.Item
            value="subdomains"
            title="Subdomain Enumeration (Zone Crawl)"
            icon={Icon.List}
          />
          <Form.Dropdown.Item
            value="resolve"
            title="Resolve Hostname to IP"
            icon={Icon.Globe}
          />
          <Form.Dropdown.Item
            value="reverse"
            title="Reverse DNS (IP to Hostname)"
            icon={Icon.ArrowClockwise}
          />
        </Form.Dropdown>

        <Form.TextField
          id="input"
          title={mode === "reverse" ? "IP Address" : "Domain / Hostname"}
          placeholder={
            mode === "reverse"
              ? "Enter IP address (e.g., 8.8.8.8)"
              : mode === "subdomains"
                ? "Enter domain for subdomain enumeration (e.g., example.com)"
                : "Enter domain or hostname (e.g., example.com)"
          }
          value={input}
          onChange={setInput}
          autoFocus
        />

        <Form.Description
          text={
            mode === "resolve"
              ? "Resolve a hostname to its IP address."
              : mode === "reverse"
                ? "Look up hostnames for an IP address."
                : mode === "subdomains"
                  ? "Enumerate all known subdomains for a domain using Shodan's DNS database (zone crawl)."
                  : "Get detailed DNS information including subdomains and DNS records."
          }
        />
      </Form>
    );
  }

  // Render results based on mode
  return (
    <List
      isLoading={isLoading}
      navigationTitle={
        mode === "subdomains"
          ? `Subdomains: ${submittedInput}`
          : `DNS: ${submittedInput}`
      }
      searchBarPlaceholder={
        mode === "subdomains" ? "Filter subdomains..." : "Filter results..."
      }
      onSearchTextChange={setFilterQuery}
      filtering={false}
    >
      {/* Resolve Mode */}
      {mode === "resolve" && resolveData && (
        <List.Section title="DNS Resolution Results">
          {Object.entries(resolveData).map(([hostname, ip]) => (
            <List.Item
              key={hostname}
              title={hostname}
              subtitle={ip || "No resolution"}
              icon={{
                source: Icon.Globe,
                tintColor: ip ? Color.Green : Color.Red,
              }}
              accessories={
                ip
                  ? [{ tag: "Resolved" }]
                  : [{ tag: { value: "Failed", color: Color.Red } }]
              }
              actions={
                <ActionPanel>
                  {ip && (
                    <Action.CopyToClipboard title="Copy IP" content={ip} />
                  )}
                  <Action.CopyToClipboard
                    title="Copy Hostname"
                    content={hostname}
                  />
                  <Action
                    title="New Lookup"
                    icon={Icon.MagnifyingGlass}
                    onAction={handleNewLookup}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}

      {/* Reverse Mode */}
      {mode === "reverse" && reverseData && (
        <List.Section title="Reverse DNS Results">
          {Object.entries(reverseData).map(([ip, hostnames]) => (
            <List.Item
              key={ip}
              title={ip}
              subtitle={
                hostnames.length > 0
                  ? hostnames.join(", ")
                  : "No hostnames found"
              }
              icon={{
                source: Icon.ArrowClockwise,
                tintColor: hostnames.length > 0 ? Color.Green : Color.Orange,
              }}
              accessories={[
                {
                  text: `${hostnames.length} hostname${hostnames.length !== 1 ? "s" : ""}`,
                },
              ]}
              actions={
                <ActionPanel>
                  <Action.CopyToClipboard
                    title="Copy Hostnames"
                    content={hostnames.join(", ")}
                  />
                  <Action.CopyToClipboard title="Copy IP" content={ip} />
                  <Action
                    title="New Lookup"
                    icon={Icon.MagnifyingGlass}
                    onAction={handleNewLookup}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}

      {/* Subdomains Mode (Zone Crawl) */}
      {mode === "subdomains" && domainData && (
        <>
          <List.Section
            title={`Subdomains for ${domainData.domain}`}
            subtitle={
              filterQuery
                ? `${filteredSubdomains.length} of ${domainData.subdomains.length} subdomains`
                : `${domainData.subdomains.length} subdomains found`
            }
          >
            {filteredSubdomains.length === 0 && (
              <List.Item
                title="No subdomains found"
                subtitle={
                  filterQuery
                    ? "Try a different filter"
                    : "No subdomains in Shodan's database"
                }
                icon={Icon.XMarkCircle}
              />
            )}
            {filteredSubdomains.map((subdomain) => {
              const fullDomain = `${subdomain}.${domainData.domain}`;
              return (
                <List.Item
                  key={subdomain}
                  title={fullDomain}
                  subtitle={subdomain}
                  icon={{ source: Icon.Link, tintColor: Color.Blue }}
                  actions={
                    <ActionPanel>
                      <Action.CopyToClipboard
                        title="Copy Subdomain"
                        content={fullDomain}
                      />
                      <Action.OpenInBrowser
                        title="Open in Browser"
                        url={`https://${fullDomain}`}
                      />
                      <Action.OpenInBrowser
                        title="Search on Shodan"
                        url={`https://www.shodan.io/search?query=hostname:${fullDomain}`}
                        icon={Icon.MagnifyingGlass}
                      />
                      <Action
                        title="Copy All Subdomains"
                        icon={Icon.Clipboard}
                        onAction={async () => {
                          const all = domainData.subdomains
                            .map((s) => `${s}.${domainData.domain}`)
                            .join("\n");
                          await Clipboard.copy(all);
                          await showToast({
                            style: Toast.Style.Success,
                            title: "Copied All Subdomains",
                          });
                        }}
                      />
                      <Action
                        title="New Lookup"
                        icon={Icon.MagnifyingGlass}
                        onAction={handleNewLookup}
                      />
                    </ActionPanel>
                  }
                />
              );
            })}
          </List.Section>

          {domainData.tags.length > 0 && (
            <List.Section title="Domain Tags">
              <List.Item
                title="Tags"
                subtitle={domainData.tags.join(", ")}
                icon={Icon.Tag}
                accessories={domainData.tags.map((tag) => ({ tag }))}
              />
            </List.Section>
          )}
        </>
      )}

      {/* Domain Mode */}
      {mode === "domain" && domainData && (
        <>
          <List.Section title="Domain Info">
            <List.Item
              title={domainData.domain}
              subtitle={`${domainData.subdomains.length} subdomains · ${domainData.data.length} DNS records`}
              icon={{ source: Icon.Globe, tintColor: Color.Blue }}
              actions={
                <ActionPanel>
                  <Action.CopyToClipboard
                    title="Copy Domain"
                    content={domainData.domain}
                  />
                  <Action
                    title="New Lookup"
                    icon={Icon.MagnifyingGlass}
                    onAction={handleNewLookup}
                  />
                </ActionPanel>
              }
            />
            {domainData.tags.length > 0 && (
              <List.Item
                title="Tags"
                subtitle={domainData.tags.join(", ")}
                icon={Icon.Tag}
                accessories={domainData.tags.map((tag) => ({ tag }))}
              />
            )}
          </List.Section>

          {domainData.subdomains.length > 0 && (
            <List.Section
              title={`Subdomains (${filterQuery ? `${filteredSubdomains.length} of ` : ""}${domainData.subdomains.length})`}
            >
              {filteredSubdomains.slice(0, 30).map((subdomain) => (
                <List.Item
                  key={subdomain}
                  title={`${subdomain}.${domainData.domain}`}
                  icon={Icon.Link}
                  actions={
                    <ActionPanel>
                      <Action.CopyToClipboard
                        title="Copy Subdomain"
                        content={`${subdomain}.${domainData.domain}`}
                      />
                      <Action.OpenInBrowser
                        title="Open in Browser"
                        url={`https://${subdomain}.${domainData.domain}`}
                      />
                      <Action
                        title="New Lookup"
                        icon={Icon.MagnifyingGlass}
                        onAction={handleNewLookup}
                      />
                    </ActionPanel>
                  }
                />
              ))}
              {filteredSubdomains.length > 30 && (
                <List.Item
                  title={`+${filteredSubdomains.length - 30} more subdomains`}
                  icon={Icon.Ellipsis}
                  actions={
                    <ActionPanel>
                      <Action.CopyToClipboard
                        title="Copy All Subdomains"
                        content={domainData.subdomains
                          .map((s) => `${s}.${domainData.domain}`)
                          .join("\n")}
                      />
                    </ActionPanel>
                  }
                />
              )}
            </List.Section>
          )}

          {domainData.data.length > 0 && (
            <List.Section
              title={`DNS Records (${filterQuery ? `${filteredRecords.length} of ` : ""}${domainData.data.length})`}
            >
              {filteredRecords.slice(0, 30).map((record, idx) => (
                <List.Item
                  key={`${record.subdomain}-${record.type}-${idx}`}
                  title={record.subdomain || "@"}
                  subtitle={record.value}
                  icon={Icon.Document}
                  accessories={[
                    {
                      tag: {
                        value: record.type,
                        color: getRecordTypeColor(record.type),
                      },
                    },
                  ]}
                  actions={
                    <ActionPanel>
                      <Action.CopyToClipboard
                        title="Copy Value"
                        content={record.value}
                      />
                      <Action.CopyToClipboard
                        title="Copy Full Record"
                        content={`${record.subdomain || "@"}.${domainData.domain} ${record.type} ${record.value}`}
                      />
                      <Action
                        title="New Lookup"
                        icon={Icon.MagnifyingGlass}
                        onAction={handleNewLookup}
                      />
                    </ActionPanel>
                  }
                />
              ))}
            </List.Section>
          )}
        </>
      )}

      {/* Actions Section */}
      <List.Section title="Actions">
        <List.Item
          title="New Lookup"
          icon={Icon.MagnifyingGlass}
          actions={
            <ActionPanel>
              <Action title="New Lookup" onAction={handleNewLookup} />
            </ActionPanel>
          }
        />
      </List.Section>
    </List>
  );
}

function getRecordTypeColor(type: string): Color {
  const colors: Record<string, Color> = {
    A: Color.Green,
    AAAA: Color.Green,
    CNAME: Color.Blue,
    MX: Color.Orange,
    TXT: Color.Purple,
    NS: Color.Yellow,
    SOA: Color.Red,
    PTR: Color.Magenta,
  };
  return colors[type.toUpperCase()] || Color.SecondaryText;
}
