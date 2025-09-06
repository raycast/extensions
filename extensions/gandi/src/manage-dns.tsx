import {
  Action,
  ActionPanel,
  Alert,
  Color,
  confirmAlert,
  Form,
  Icon,
  List,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { showFailureToast, usePromise } from "@raycast/utils";
import { useState, useCallback } from "react";
import * as gandiAPI from "./api";
import { DNSRecord, GandiDomain } from "./types";

export default function ManageDNS() {
  const { push } = useNavigation();

  // Minimal humanizer for nameserver label
  const humanize = (s: string) => s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  const fetchDomains = useCallback(async () => {
    try {
      return await gandiAPI.getDomains();
    } catch (error) {
      await showFailureToast(error, { title: "Failed to fetch domains" });
      return [];
    }
  }, []);

  const { data: domains, isLoading } = usePromise(fetchDomains, []);

  const selectDomain = (domain: GandiDomain) => {
    push(<DNSRecordsList domain={domain.fqdn} />);
  };

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Select a domain to manage DNS records...">
      {domains?.map((domain) => {
        // Nameserver chip
        const ns = domain.nameserver.current?.toLowerCase();
        let nsLabel: string;
        let nsColor: Color;
        if (ns === "livedns") {
          nsLabel = "LiveDNS";
          nsColor = Color.Green;
        } else if (ns === "other") {
          nsLabel = "External NS";
          nsColor = Color.Orange;
        } else {
          nsLabel = humanize(ns || "Unknown");
          nsColor = Color.SecondaryText;
        }

        // Consistent lock derivation with ListDomains
        const transferLocked = domain.is_locked || domain.status?.some((s) => s.includes("TransferProhibited"));
        const editLocked = domain.status?.some((s) => s.includes("UpdateProhibited"));

        const accessories: List.Item.Accessory[] = [
          { tag: { value: nsLabel, color: nsColor }, tooltip: `Nameserver: ${nsLabel}` },
          transferLocked
            ? { tag: { value: "Transfer: Locked", color: Color.Purple }, tooltip: "Registrar transfer is locked" }
            : { tag: { value: "Transfer: Unlocked", color: Color.Blue }, tooltip: "Registrar transfer is allowed" },
          editLocked
            ? { tag: { value: "Edit: Locked", color: Color.Purple }, tooltip: "Domain updates are locked" }
            : { tag: { value: "Edit: Unlocked", color: Color.Blue }, tooltip: "Domain updates allowed" },
        ];

        return (
          <List.Item
            key={domain.fqdn}
            icon={Icon.Globe}
            title={domain.fqdn}
            accessories={accessories}
            actions={
              <ActionPanel>
                <Action title="Manage DNS Records" icon={Icon.Network} onAction={() => selectDomain(domain)} />
                <Action.OpenInBrowser
                  title="Open in Gandi Dashboard"
                  url={`https://admin.gandi.net/domain/${domain.fqdn}/dns`}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}

function DNSRecordsList({ domain }: { readonly domain: string }) {
  const { push, pop } = useNavigation();

  const fetchDNSRecords = useCallback(async (d: string) => {
    try {
      return await gandiAPI.getDNSRecords(d);
    } catch (error) {
      await showFailureToast(error, {
        title: "Failed to fetch DNS records",
      });
      return [];
    }
  }, []);

  const { data: records, isLoading, revalidate } = usePromise(fetchDNSRecords, [domain]);

  const deleteRecord = async (record: DNSRecord) => {
    const confirmed = await confirmAlert({
      title: "Delete DNS Record",
      message: `Are you sure you want to delete the ${record.rrset_type} record for ${record.rrset_name}?`,
      icon: Icon.Trash,
      primaryAction: {
        title: "Delete",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (confirmed) {
      try {
        await showToast({
          style: Toast.Style.Animated,
          title: "Deleting DNS record...",
        });

        await gandiAPI.deleteDNSRecord(domain, record.rrset_name, record.rrset_type);

        await showToast({
          style: Toast.Style.Success,
          title: "DNS record deleted",
        });

        revalidate();
      } catch (error) {
        await showFailureToast(error, { title: "Failed to delete DNS record" });
      }
    }
  };

  const getRecordIcon = (type: string): Icon => {
    switch (type) {
      case "A":
      case "AAAA":
        return Icon.Network;
      case "CNAME":
        return Icon.Link;
      case "MX":
        return Icon.Envelope;
      case "TXT":
        return Icon.Text;
      case "NS":
        return Icon.Globe;
      case "CAA":
        return Icon.Shield;
      case "SRV":
        return Icon.HardDrive;
      default:
        return Icon.Document;
    }
  };

  const getRecordColor = (type: string): Color => {
    switch (type) {
      case "A":
        return Color.Blue;
      case "AAAA":
        return Color.Purple;
      case "CNAME":
        return Color.Green;
      case "MX":
        return Color.Orange;
      case "TXT":
        return Color.Yellow;
      case "NS":
        return Color.Red;
      case "CAA":
        return Color.Magenta;
      case "SRV":
        return Color.PrimaryText;
      default:
        return Color.SecondaryText;
    }
  };

  return (
    <List
      isLoading={isLoading}
      navigationTitle={`DNS Records: ${domain}`}
      searchBarPlaceholder="Search DNS records..."
      actions={
        <ActionPanel>
          <Action
            title="Add DNS Record"
            icon={Icon.Plus}
            onAction={() =>
              push(
                <AddDNSRecord
                  domain={domain}
                  onAdd={() => {
                    revalidate();
                    pop();
                  }}
                />,
              )
            }
          />
          <Action
            title="Refresh"
            icon={Icon.ArrowClockwise}
            onAction={() => revalidate()}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
          />
        </ActionPanel>
      }
    >
      {records && records.length === 0 ? (
        <List.EmptyView
          icon={Icon.Network}
          title="No DNS Records"
          description="Add your first DNS record to get started"
          actions={
            <ActionPanel>
              <Action
                title="Add DNS Record"
                icon={Icon.Plus}
                onAction={() =>
                  push(
                    <AddDNSRecord
                      domain={domain}
                      onAdd={() => {
                        revalidate();
                        pop();
                      }}
                    />,
                  )
                }
              />
            </ActionPanel>
          }
        />
      ) : (
        records?.map((record, index) => (
          <List.Item
            key={`${record.rrset_name}-${record.rrset_type}-${index}`}
            icon={{
              source: getRecordIcon(record.rrset_type),
              tintColor: getRecordColor(record.rrset_type),
            }}
            title={record.rrset_name || "@"}
            subtitle={record.rrset_type}
            accessories={[
              {
                text: record.rrset_values.join(", "),
                tooltip: "Value(s)",
              },
              {
                text: `TTL: ${record.rrset_ttl}`,
                icon: Icon.Clock,
              },
            ]}
            actions={
              <ActionPanel>
                <Action
                  title="Edit Record"
                  icon={Icon.Pencil}
                  onAction={() =>
                    push(
                      <EditDNSRecord
                        domain={domain}
                        record={record}
                        onEdit={() => {
                          revalidate();
                          pop();
                        }}
                      />,
                    )
                  }
                />
                <Action
                  title="Delete Record"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  onAction={() => deleteRecord(record)}
                />
                <Action.CopyToClipboard
                  title="Copy Value"
                  content={record.rrset_values.join(", ")}
                  shortcut={{ modifiers: ["cmd"], key: "c" }}
                />
                <ActionPanel.Section>
                  <Action
                    title="Add DNS Record"
                    icon={Icon.Plus}
                    onAction={() =>
                      push(
                        <AddDNSRecord
                          domain={domain}
                          onAdd={() => {
                            revalidate();
                            pop();
                          }}
                        />,
                      )
                    }
                    shortcut={{ modifiers: ["cmd"], key: "n" }}
                  />
                  <Action
                    title="Refresh"
                    icon={Icon.ArrowClockwise}
                    onAction={() => revalidate()}
                    shortcut={{ modifiers: ["cmd"], key: "r" }}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}

function AddDNSRecord({ domain, onAdd }: { readonly domain: string; readonly onAdd: () => void }) {
  const [isLoading, setIsLoading] = useState(false);
  const [recordType, setRecordType] = useState<string>("A");
  const [recordName, setRecordName] = useState<string>("");
  const [recordValue, setRecordValue] = useState<string>("");
  const [recordTTL, setRecordTTL] = useState<string>("300");

  const handleSubmit = async () => {
    if (!recordValue.trim()) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Please enter a record value",
      });
      return;
    }

    // Validate TTL
    const ttl = Number.parseInt(recordTTL, 10);
    if (!Number.isFinite(ttl) || Number.isNaN(ttl) || ttl < 300) {
      await showFailureToast(new Error("Invalid TTL. Please enter a number ≥ 300."), {
        title: "Invalid TTL",
      });
      return;
    }

    setIsLoading(true);
    try {
      await gandiAPI.createDNSRecord(domain, {
        rrset_name: recordName || "@",
        rrset_type: recordType,
        rrset_values: [recordValue.trim()],
        rrset_ttl: ttl,
      });

      await showToast({
        style: Toast.Style.Success,
        title: "DNS record created",
      });

      onAdd();
    } catch (error) {
      await showFailureToast(error, { title: "Failed to create DNS record" });
    } finally {
      setIsLoading(false);
    }
  };

  const placeholderForType = () => {
    switch (recordType) {
      case "A":
        return "192.168.1.1";
      case "AAAA":
        return "2001:db8::1";
      case "CNAME":
        return "target.example.com";
      case "MX":
        return "10 mail.example.com";
      case "TXT":
        return "v=spf1 include:_spf.google.com ~all";
      case "NS":
        return "ns1.example.com";
      case "CAA":
        return '0 issue "letsencrypt.org"';
      case "SRV":
        return "10 5 5060 sipserver.example.com";
      default:
        return "Enter record value";
    }
  };

  return (
    <Form
      isLoading={isLoading}
      navigationTitle={`Add DNS Record: ${domain}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Record" icon={Icon.Plus} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Dropdown id="type" title="Record Type" value={recordType} onChange={setRecordType}>
        <Form.Dropdown.Item value="A" title="A - IPv4 Address" />
        <Form.Dropdown.Item value="AAAA" title="AAAA - IPv6 Address" />
        <Form.Dropdown.Item value="CNAME" title="CNAME - Canonical Name" />
        <Form.Dropdown.Item value="MX" title="MX - Mail Exchange" />
        <Form.Dropdown.Item value="TXT" title="TXT - Text" />
        <Form.Dropdown.Item value="NS" title="NS - Name Server" />
        <Form.Dropdown.Item value="CAA" title="CAA - Certificate Authority" />
        <Form.Dropdown.Item value="SRV" title="SRV - Service" />
      </Form.Dropdown>

      <Form.TextField
        id="name"
        title="Record Name"
        placeholder="@ for root or subdomain (e.g., www)"
        value={recordName}
        onChange={setRecordName}
        info="Leave empty or use @ for the root domain"
      />

      <Form.TextField
        id="value"
        title="Record Value"
        placeholder={placeholderForType()}
        value={recordValue}
        onChange={setRecordValue}
      />

      <Form.TextField
        id="ttl"
        title="TTL (seconds)"
        placeholder="300"
        value={recordTTL}
        onChange={setRecordTTL}
        info="Time To Live in seconds (minimum 300)"
      />
    </Form>
  );
}

function EditDNSRecord({
  domain,
  record,
  onEdit,
}: {
  readonly domain: string;
  readonly record: DNSRecord;
  readonly onEdit: () => void;
}) {
  const [isLoading, setIsLoading] = useState(false);
  const [recordValue, setRecordValue] = useState<string>(record.rrset_values.join(", "));
  const [recordTTL, setRecordTTL] = useState<string>(record.rrset_ttl.toString());

  const handleSubmit = async () => {
    if (!recordValue.trim()) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Please enter a record value",
      });
      return;
    }

    const ttl = Number.parseInt(recordTTL, 10);
    if (!Number.isFinite(ttl) || Number.isNaN(ttl) || ttl < 300) {
      await showFailureToast(new Error("Invalid TTL. Please enter a number ≥ 300."), {
        title: "Invalid TTL",
      });
      return;
    }

    setIsLoading(true);
    try {
      await gandiAPI.updateDNSRecord(domain, record.rrset_name, record.rrset_type, {
        rrset_values: recordValue.split(",").map((v) => v.trim()),
        rrset_ttl: ttl,
      });

      await showToast({
        style: Toast.Style.Success,
        title: "DNS record updated",
      });

      onEdit();
    } catch (error) {
      await showFailureToast(error, { title: "Failed to update DNS record" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Form
      isLoading={isLoading}
      navigationTitle={`Edit DNS Record: ${record.rrset_name} (${record.rrset_type})`}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Update Record" icon={Icon.Check} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text={`Editing ${record.rrset_type} record for ${record.rrset_name || "@"}`} />

      <Form.TextField
        id="value"
        title="Record Value"
        placeholder="Enter record value"
        value={recordValue}
        onChange={setRecordValue}
        info="Separate multiple values with commas"
      />

      <Form.TextField
        id="ttl"
        title="TTL (seconds)"
        placeholder="300"
        value={recordTTL}
        onChange={setRecordTTL}
        info="Time To Live in seconds (minimum 300)"
      />
    </Form>
  );
}
