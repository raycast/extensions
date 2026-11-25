import { isIP } from "node:net";
import { useMemo, useRef, useState } from "react";
import {
  Action,
  ActionPanel,
  Alert,
  Color,
  Form,
  Icon,
  Keyboard,
  List,
  Toast,
  confirmAlert,
  getPreferenceValues,
  showToast,
  useNavigation,
} from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { RouterActionSection } from "./components/CommonActions";
import { StaticLeaseForm } from "./components/StaticLeaseForm";
import { useCachedOpenWrtData } from "./lib/cache";
import { buildSafeCodeBlock, escapeMarkdownText, formatCacheBadge, inlineCode, modShortcut } from "./lib/format";
import {
  addLocalDnsRecord,
  deleteLocalDnsRecord,
  deleteStaticDhcpLease,
  fetchDhcpDnsConfig,
} from "./lib/openwrt-extras";
import type { ExtensionPreferences, LocalDnsRecord, StaticDhcpLease } from "./lib/types";
import { OpenWrtError, getErrorDescription } from "./lib/ubus";

type DhcpDnsFilter = "all" | "leases" | "dns";

const DOMAIN_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,127}$/;

function buildStaticLeaseMarkdown(lease: StaticDhcpLease): string {
  const title = lease.name || lease.ip || lease.macs[0] || lease.section;
  const lines = [
    `### ${escapeMarkdownText(title)}`,
    "",
    `Static DHCPv4 reservation in UCI ${inlineCode("dhcp")} (${inlineCode("host")}), served by ${inlineCode("dnsmasq")}.`,
  ];
  if (lease.macs.length > 1) {
    lines.push("", "#### Assigned MAC Addresses", "", buildSafeCodeBlock(lease.macs.join("\n")));
  }
  return lines.join("\n");
}

function buildLocalDnsMarkdown(record: LocalDnsRecord): string {
  const title = record.name || record.section;
  return [
    `### ${escapeMarkdownText(title)}`,
    "",
    `Local DNS override in UCI ${inlineCode("dhcp")} (${inlineCode("domain")}), served by ${inlineCode("dnsmasq")}.`,
  ].join("\n");
}

function LocalDnsForm({ onSuccess }: { onSuccess?: () => void }) {
  const { pop } = useNavigation();
  const submittingRef = useRef(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [nameError, setNameError] = useState<string | undefined>();
  const [ipError, setIpError] = useState<string | undefined>();

  async function handleSubmit(values: { name: string; ip: string }) {
    if (submittingRef.current) {
      return;
    }

    const trimmedName = values.name.trim();
    const trimmedIp = values.ip.trim();
    let hasError = false;

    if (!trimmedName || !DOMAIN_PATTERN.test(trimmedName)) {
      setNameError("Enter a valid domain name (for example nas.lan).");
      hasError = true;
    } else {
      setNameError(undefined);
    }

    if (isIP(trimmedIp) === 0) {
      setIpError("Enter a valid IPv4 or IPv6 address.");
      hasError = true;
    } else {
      setIpError(undefined);
    }

    if (hasError) {
      return;
    }

    submittingRef.current = true;
    setIsSubmitting(true);
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `Saving DNS record for ${trimmedName}...`,
    });

    try {
      await addLocalDnsRecord({ name: trimmedName, ip: trimmedIp }, getPreferenceValues<ExtensionPreferences>());
      toast.style = Toast.Style.Success;
      toast.title = "Local DNS Record Added";
      toast.message = `${trimmedName} -> ${trimmedIp}`;
      onSuccess?.();
      pop();
    } catch (err) {
      await toast.hide();
      const { title, message } = getErrorDescription(err);
      await showFailureToast(message, { title });
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  }

  return (
    <Form
      isLoading={isSubmitting}
      navigationTitle="Add Local DNS Record"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save DNS Record" icon={Icon.Check} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Domain Name"
        placeholder="nas.lan"
        error={nameError}
        onChange={() => {
          if (nameError) {
            setNameError(undefined);
          }
        }}
      />
      <Form.TextField
        id="ip"
        title="IP Address"
        placeholder="192.168.1.50"
        error={ipError}
        onChange={() => {
          if (ipError) {
            setIpError(undefined);
          }
        }}
      />
    </Form>
  );
}

export default function DhcpDnsCommand() {
  const [filter, setFilter] = useState<DhcpDnsFilter>("all");

  const { data, error, isLoading, isCached, isStale, updatedAt, revalidate } = useCachedOpenWrtData(
    "dhcp-dns",
    (signal) => fetchDhcpDnsConfig(getPreferenceValues<ExtensionPreferences>(), signal),
  );

  const staticLeases = useMemo(() => data?.staticLeases ?? [], [data]);
  const dnsRecords = useMemo(() => data?.dnsRecords ?? [], [data]);
  const totalEntries = staticLeases.length + dnsRecords.length;

  const visibleLeases = useMemo(() => (filter === "dns" ? [] : staticLeases), [filter, staticLeases]);
  const visibleDns = useMemo(() => (filter === "leases" ? [] : dnsRecords), [filter, dnsRecords]);
  const visibleCount = visibleLeases.length + visibleDns.length;

  async function handleDeleteStaticLease(lease: StaticDhcpLease) {
    const label = lease.name || lease.ip || lease.macs[0] || lease.section;
    const confirmed = await confirmAlert({
      title: `Delete Static Lease ${label}?`,
      message: `Remove the UCI static DHCP reservation for ${label}${lease.ip ? ` (${lease.ip})` : ""} and reload dnsmasq.`,
      primaryAction: {
        title: "Delete Static Lease",
        style: Alert.ActionStyle.Destructive,
      },
    });
    if (!confirmed) {
      return;
    }

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `Deleting static lease ${label}...`,
    });
    try {
      await deleteStaticDhcpLease(lease.section, getPreferenceValues<ExtensionPreferences>(), undefined, {
        ip: lease.ip,
        name: lease.name,
      });
      toast.style = Toast.Style.Success;
      toast.title = "Static Lease Deleted";
      toast.message = label;
      void revalidate();
    } catch (err) {
      await toast.hide();
      const { title, message } = getErrorDescription(err);
      await showFailureToast(message, { title });
    }
  }

  async function handleDeleteDnsRecord(record: LocalDnsRecord) {
    const label = record.name || record.section;
    const confirmed = await confirmAlert({
      title: `Delete DNS Record ${label}?`,
      message: `Remove the local DNS override for ${label}${record.ip ? ` (${record.ip})` : ""} and reload dnsmasq.`,
      primaryAction: {
        title: "Delete DNS Record",
        style: Alert.ActionStyle.Destructive,
      },
    });
    if (!confirmed) {
      return;
    }

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `Deleting DNS record ${label}...`,
    });
    try {
      await deleteLocalDnsRecord(record.section, getPreferenceValues<ExtensionPreferences>(), undefined, {
        name: record.name,
        ip: record.ip,
      });
      toast.style = Toast.Style.Success;
      toast.title = "DNS Record Deleted";
      toast.message = label;
      void revalidate();
    } catch (err) {
      await toast.hide();
      const { title, message } = getErrorDescription(err);
      await showFailureToast(message, { title });
    }
  }

  const cacheBadge = formatCacheBadge({ isCached, isLoading, error, updatedAt });
  const countsText =
    totalEntries > 0
      ? `${staticLeases.length} lease${staticLeases.length === 1 ? "" : "s"} · ${dnsRecords.length} DNS`
      : "";
  const firstSectionSubtitle = [cacheBadge, countsText].filter(Boolean).join(" · ") || undefined;

  const navigationTitle =
    isLoading && isStale
      ? "DHCP & Local DNS · Updating..."
      : isStale
        ? error
          ? "DHCP & Local DNS · Offline (Cached)"
          : "DHCP & Local DNS · Cached"
        : "DHCP & Local DNS";

  const isConfigError =
    error instanceof OpenWrtError &&
    (error.code === "AUTH_FAILED" || error.code === "INVALID_URL" || error.code === "TLS_ERROR");
  const errorInfo = error && totalEntries === 0 ? getErrorDescription(error) : null;

  const renderCreateActions = (isPrimarySection = false) => (
    <ActionPanel.Section title="Create">
      <Action.Push
        title="Add Static DHCP Lease"
        icon={Icon.Plus}
        shortcut={isPrimarySection ? undefined : Keyboard.Shortcut.Common.New}
        target={<StaticLeaseForm onSuccess={revalidate} />}
      />
      <Action.Push
        title="Add Local DNS Record"
        icon={Icon.Globe}
        shortcut={modShortcut(["shift"], "n")}
        target={<LocalDnsForm onSuccess={revalidate} />}
      />
    </ActionPanel.Section>
  );

  const renderManageActions = (hasPrimaryCopy: boolean, deleteTitle: string, onDelete: () => void) => (
    <ActionPanel.Section title="Manage">
      <Action.Push
        title="Add Static DHCP Lease"
        icon={Icon.Plus}
        shortcut={hasPrimaryCopy ? Keyboard.Shortcut.Common.New : undefined}
        target={<StaticLeaseForm onSuccess={revalidate} />}
      />
      <Action.Push
        title="Add Local DNS Record"
        icon={Icon.Globe}
        shortcut={modShortcut(["shift"], "n")}
        target={<LocalDnsForm onSuccess={revalidate} />}
      />
      <Action
        title={deleteTitle}
        icon={Icon.Trash}
        style={Action.Style.Destructive}
        shortcut={Keyboard.Shortcut.Common.Remove}
        onAction={onDelete}
      />
    </ActionPanel.Section>
  );

  const leasesFirst = visibleLeases.length > 0;

  return (
    <List
      isLoading={isLoading}
      navigationTitle={navigationTitle}
      isShowingDetail={visibleCount > 0}
      searchBarPlaceholder="Search static leases or local DNS records..."
      searchBarAccessory={
        <List.Dropdown tooltip="Filter Entries" value={filter} onChange={(value) => setFilter(value as DhcpDnsFilter)}>
          <List.Dropdown.Item title="All Entries" value="all" />
          <List.Dropdown.Item title="Static DHCP Leases" value="leases" />
          <List.Dropdown.Item title="Local DNS Records" value="dns" />
        </List.Dropdown>
      }
    >
      {errorInfo ? (
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title={errorInfo.title}
          description={errorInfo.message}
          actions={
            <ActionPanel>
              <RouterActionSection
                onRefresh={revalidate}
                promotePreferences={isConfigError}
                primaryRefresh={!isConfigError}
              />
            </ActionPanel>
          }
        />
      ) : visibleCount === 0 && !isLoading ? (
        <List.EmptyView
          icon={Icon.Network}
          title="No Static Leases or DNS Records"
          description="No static DHCP leases or local DNS records matched the current view."
          actions={
            <ActionPanel>
              {renderCreateActions(true)}
              <RouterActionSection onRefresh={revalidate} />
            </ActionPanel>
          }
        />
      ) : (
        <>
          {visibleLeases.length > 0 && (
            <List.Section title="Static DHCP Leases" subtitle={firstSectionSubtitle}>
              {visibleLeases.map((lease) => {
                const title = lease.name || lease.ip || lease.macs[0] || lease.section;
                const primaryMac = lease.macs[0] ?? "";
                const macCopyValue = lease.macs.length > 1 ? lease.macs.join(", ") : primaryMac;
                const subtitle = lease.ip || primaryMac || undefined;
                const hasCopyIp = Boolean(lease.ip);
                const hasPrimaryCopy = Boolean(lease.ip || macCopyValue || lease.name);
                const keywords = [
                  lease.section,
                  lease.name,
                  lease.ip,
                  ...lease.macs,
                  ...lease.macs.map((m) => m.replace(/:/g, "")),
                  "dhcp",
                  "static",
                ].filter(Boolean);

                return (
                  <List.Item
                    key={`lease:${lease.section}`}
                    id={`lease:${lease.section}`}
                    icon={{ source: Icon.Pin, tintColor: Color.Green }}
                    title={title}
                    subtitle={subtitle}
                    keywords={keywords}
                    accessories={lease.leasetime ? [{ tag: { value: lease.leasetime, color: Color.Blue } }] : undefined}
                    detail={
                      <List.Item.Detail
                        markdown={buildStaticLeaseMarkdown(lease)}
                        metadata={
                          <List.Item.Detail.Metadata>
                            <List.Item.Detail.Metadata.Label title="Hostname" text={lease.name || "Unnamed"} />
                            <List.Item.Detail.Metadata.Label title="IPv4 Address" text={lease.ip || "None"} />
                            <List.Item.Detail.Metadata.Label
                              title="MAC Address"
                              text={lease.macs.join(", ") || "None"}
                            />
                            <List.Item.Detail.Metadata.Separator />
                            <List.Item.Detail.Metadata.Label
                              title="Lease Time"
                              text={lease.leasetime || "Router Default"}
                            />
                            {lease.hostid && (
                              <List.Item.Detail.Metadata.Label title="IPv6 Host ID" text={lease.hostid} />
                            )}
                            <List.Item.Detail.Metadata.Label title="UCI Section" text={lease.section} />
                          </List.Item.Detail.Metadata>
                        }
                      />
                    }
                    actions={
                      <ActionPanel>
                        <ActionPanel.Section title="Copy">
                          {lease.ip && <Action.CopyToClipboard title="Copy IP Address" content={lease.ip} />}
                          {macCopyValue && (
                            <Action.CopyToClipboard
                              title="Copy MAC Address"
                              content={macCopyValue}
                              shortcut={hasCopyIp ? modShortcut(["shift"], "c") : undefined}
                            />
                          )}
                          {lease.name && (
                            <Action.CopyToClipboard
                              title="Copy Hostname"
                              content={lease.name}
                              shortcut={hasCopyIp || macCopyValue ? Keyboard.Shortcut.Common.CopyName : undefined}
                            />
                          )}
                        </ActionPanel.Section>
                        {renderManageActions(hasPrimaryCopy, "Delete Static Lease", () =>
                          handleDeleteStaticLease(lease),
                        )}
                        <RouterActionSection onRefresh={revalidate} />
                      </ActionPanel>
                    }
                  />
                );
              })}
            </List.Section>
          )}
          {visibleDns.length > 0 && (
            <List.Section title="Local DNS Records" subtitle={leasesFirst ? undefined : firstSectionSubtitle}>
              {visibleDns.map((record) => {
                const title = record.name || record.section;
                const hasCopyIp = Boolean(record.ip);
                const hasPrimaryCopy = Boolean(record.ip || record.name);
                const keywords = [record.section, record.name, record.ip, "dns", "domain"].filter(Boolean);

                return (
                  <List.Item
                    key={`dns:${record.section}`}
                    id={`dns:${record.section}`}
                    icon={{ source: Icon.Globe, tintColor: Color.Blue }}
                    title={title}
                    subtitle={record.ip || undefined}
                    keywords={keywords}
                    accessories={[{ tag: { value: "DNS", color: Color.SecondaryText } }]}
                    detail={
                      <List.Item.Detail
                        markdown={buildLocalDnsMarkdown(record)}
                        metadata={
                          <List.Item.Detail.Metadata>
                            <List.Item.Detail.Metadata.Label title="Domain Name" text={record.name || "Unnamed"} />
                            <List.Item.Detail.Metadata.Label title="IP Address" text={record.ip || "None"} />
                            <List.Item.Detail.Metadata.Separator />
                            <List.Item.Detail.Metadata.Label title="UCI Section" text={record.section} />
                          </List.Item.Detail.Metadata>
                        }
                      />
                    }
                    actions={
                      <ActionPanel>
                        <ActionPanel.Section title="Copy">
                          {record.ip && <Action.CopyToClipboard title="Copy IP Address" content={record.ip} />}
                          {record.name && (
                            <Action.CopyToClipboard
                              title="Copy Domain Name"
                              content={record.name}
                              shortcut={hasCopyIp ? Keyboard.Shortcut.Common.CopyName : undefined}
                            />
                          )}
                        </ActionPanel.Section>
                        {renderManageActions(hasPrimaryCopy, "Delete DNS Record", () => handleDeleteDnsRecord(record))}
                        <RouterActionSection onRefresh={revalidate} />
                      </ActionPanel>
                    }
                  />
                );
              })}
            </List.Section>
          )}
        </>
      )}
    </List>
  );
}
