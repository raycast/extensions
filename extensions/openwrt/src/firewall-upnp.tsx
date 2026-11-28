import { isIPv4 } from "node:net";
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
import { FormValidation, showFailureToast, useForm } from "@raycast/utils";
import { RouterActionSection } from "./components/CommonActions";
import { useCachedOpenWrtData } from "./lib/cache";
import { escapeMarkdownText, formatCacheBadge, formatDuration, inlineCode, modShortcut } from "./lib/format";
import {
  addFirewallRedirect,
  deleteFirewallRedirect,
  deleteUpnpRule,
  fetchFirewallAndUpnp,
  toggleFirewallRedirect,
} from "./lib/openwrt-extras";
import type { ExtensionPreferences, FirewallRedirect, UpnpRule } from "./lib/types";
import { OpenWrtError, getErrorDescription } from "./lib/ubus";

type FirewallFilter = "all" | "redirects" | "enabled" | "disabled" | "upnp";

function formatRedirectTarget(redirect: FirewallRedirect): string {
  if (!redirect.destIp) {
    return "";
  }
  return redirect.destPort ? `${redirect.destIp}:${redirect.destPort}` : redirect.destIp;
}

function formatProtoLabel(proto: string): string {
  return proto ? proto.toUpperCase() : "TCP/UDP";
}

function formatUpnpExpiry(expires: number): string {
  return expires > 0 ? formatDuration(expires) : "No expiry";
}

function isValidPortSpec(value: string): boolean {
  const trimmed = value.trim();
  const match = /^(\d{1,5})(?:-(\d{1,5}))?$/.exec(trimmed);
  if (!match) {
    return false;
  }
  const start = Number(match[1]);
  if (!Number.isInteger(start) || start < 1 || start > 65535) {
    return false;
  }
  if (match[2] !== undefined) {
    const end = Number(match[2]);
    if (!Number.isInteger(end) || end < 1 || end > 65535 || end < start) {
      return false;
    }
  }
  return true;
}

function buildRedirectMarkdown(redirect: FirewallRedirect): string {
  const title = redirect.name || redirect.section;
  const internalTarget = formatRedirectTarget(redirect);
  const protoLabel = formatProtoLabel(redirect.proto);
  const srcZone = redirect.src || "wan";
  const destZone = redirect.dest || "lan";

  return [
    `### ${escapeMarkdownText(title)}`,
    "",
    `${redirect.enabled ? "**Enabled**" : "_Disabled_"} · ${inlineCode(protoLabel)} ${inlineCode(redirect.srcDport || "*")} → ${internalTarget ? inlineCode(internalTarget) : "Unset"}`,
    "",
    `Managed via UCI ${inlineCode(`firewall.${redirect.section}`)} (${escapeMarkdownText(srcZone)} → ${escapeMarkdownText(destZone)}).`,
  ].join("\n");
}

function buildUpnpMarkdown(rule: UpnpRule): string {
  const title = rule.descr || rule.hostHint || rule.intaddr;
  const internalTarget = `${rule.intaddr}:${rule.intport}`;
  const lines = [
    `### ${escapeMarkdownText(title)}`,
    "",
    `Dynamic **UPnP / NAT-PMP** lease forwarding ${inlineCode(`${formatProtoLabel(rule.proto)} ${rule.extport}`)} → ${inlineCode(internalTarget)}.`,
  ];

  if (!rule.num) {
    lines.push("", "Rule index was not provided by miniupnpd, so this lease cannot be removed individually.");
  }

  return lines.join("\n");
}

interface AddPortForwardFormProps {
  onSuccess?: () => void;
}

interface PortForwardFormValues {
  name: string;
  proto: string;
  srcDport: string;
  destIp: string;
  destPort: string;
}

function AddPortForwardForm({ onSuccess }: AddPortForwardFormProps) {
  const { pop } = useNavigation();
  const submittingRef = useRef(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { handleSubmit, itemProps } = useForm<PortForwardFormValues>({
    initialValues: {
      name: "",
      proto: "tcp",
      srcDport: "",
      destIp: "",
      destPort: "",
    },
    validation: {
      name: (value) => {
        const trimmed = (value ?? "").trim();
        if (!trimmed) {
          return "Rule name is required";
        }
        if (trimmed.length > 128) {
          return "Rule name must be at most 128 characters";
        }
      },
      proto: FormValidation.Required,
      srcDport: (value) => {
        if (!isValidPortSpec(value ?? "")) {
          return "Enter a valid port (1–65535) or range (e.g. 8000-8010)";
        }
      },
      destIp: (value) => {
        if (!isIPv4((value ?? "").trim())) {
          return "Enter a valid internal IPv4 address (e.g. 192.168.1.50)";
        }
      },
      destPort: (value) => {
        const trimmed = (value ?? "").trim();
        if (trimmed && !isValidPortSpec(trimmed)) {
          return "Enter a valid port (1–65535) or range, or leave empty";
        }
      },
    },
    async onSubmit(values) {
      if (submittingRef.current) {
        return;
      }

      const name = values.name.trim();
      const srcDport = values.srcDport.trim();
      const destIp = values.destIp.trim();
      const destPort = values.destPort.trim() || srcDport;

      submittingRef.current = true;
      setIsSubmitting(true);
      const toast = await showToast({
        style: Toast.Style.Animated,
        title: "Adding Port Forward...",
      });

      try {
        await addFirewallRedirect(
          {
            name,
            proto: values.proto,
            srcDport,
            destIp,
            destPort,
          },
          getPreferenceValues<ExtensionPreferences>(),
        );
        toast.style = Toast.Style.Success;
        toast.title = "Port Forward Added";
        toast.message = `${srcDport} → ${destIp}:${destPort}`;
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
    },
  });

  return (
    <Form
      navigationTitle="Add Port Forward"
      isLoading={isSubmitting}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Port Forward" icon={Icon.Plus} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField title="Rule Name" placeholder="e.g. Web Server or WireGuard" {...itemProps.name} />
      <Form.Dropdown title="Protocol" {...itemProps.proto}>
        <Form.Dropdown.Item title="TCP" value="tcp" />
        <Form.Dropdown.Item title="UDP" value="udp" />
        <Form.Dropdown.Item title="TCP + UDP" value="tcp udp" />
      </Form.Dropdown>
      <Form.TextField title="External Port" placeholder="e.g. 8080 or 8000-8010" {...itemProps.srcDport} />
      <Form.TextField title="Internal IP" placeholder="e.g. 192.168.1.50" {...itemProps.destIp} />
      <Form.TextField
        title="Internal Port"
        placeholder="Optional (defaults to External Port)"
        {...itemProps.destPort}
      />
    </Form>
  );
}

export default function FirewallUpnpCommand() {
  const [filter, setFilter] = useState<FirewallFilter>("all");

  const { data, error, isLoading, isCached, updatedAt, revalidate } = useCachedOpenWrtData("firewall-upnp", (signal) =>
    fetchFirewallAndUpnp(getPreferenceValues<ExtensionPreferences>(), signal),
  );

  const redirects = useMemo(() => data?.redirects ?? [], [data]);
  const upnpRules = useMemo(() => data?.upnpRules ?? [], [data]);

  const visibleRedirects = useMemo(() => {
    switch (filter) {
      case "upnp":
        return [];
      case "enabled":
        return redirects.filter((rule) => rule.enabled);
      case "disabled":
        return redirects.filter((rule) => !rule.enabled);
      default:
        return redirects;
    }
  }, [filter, redirects]);

  const visibleUpnpRules = useMemo(() => {
    if (filter === "redirects" || filter === "enabled" || filter === "disabled") {
      return [];
    }
    return upnpRules;
  }, [filter, upnpRules]);

  async function handleToggleRedirect(redirect: FirewallRedirect) {
    const nextEnabled = !redirect.enabled;
    const label = redirect.name || redirect.section;
    const confirmed = await confirmAlert({
      title: `${nextEnabled ? "Enable" : "Disable"} ${label}?`,
      message: `${nextEnabled ? "Enable" : "Disable"} UCI port forward ${redirect.srcDport || "*"} → ${formatRedirectTarget(redirect) || "target"} and reload firewall.`,
      primaryAction: {
        title: nextEnabled ? "Enable Port Forward" : "Disable Port Forward",
        style: nextEnabled ? Alert.ActionStyle.Default : Alert.ActionStyle.Destructive,
      },
    });
    if (!confirmed) {
      return;
    }

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `${nextEnabled ? "Enabling" : "Disabling"} ${label}...`,
    });
    try {
      await toggleFirewallRedirect(
        redirect.section,
        nextEnabled,
        getPreferenceValues<ExtensionPreferences>(),
        undefined,
        { name: redirect.name },
      );
      toast.style = Toast.Style.Success;
      toast.title = nextEnabled ? "Port Forward Enabled" : "Port Forward Disabled";
      toast.message = label;
      void revalidate();
    } catch (err) {
      await toast.hide();
      const { title, message } = getErrorDescription(err);
      await showFailureToast(message, { title });
    }
  }

  async function handleDeleteRedirect(redirect: FirewallRedirect) {
    const label = redirect.name || redirect.section;
    const confirmed = await confirmAlert({
      title: `Delete ${label}?`,
      message: `Remove UCI port forward ${redirect.srcDport || "*"} → ${formatRedirectTarget(redirect) || "target"} and reload firewall.`,
      primaryAction: {
        title: "Delete Port Forward",
        style: Alert.ActionStyle.Destructive,
      },
    });
    if (!confirmed) {
      return;
    }

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `Deleting ${label}...`,
    });
    try {
      await deleteFirewallRedirect(redirect.section, getPreferenceValues<ExtensionPreferences>(), undefined, {
        name: redirect.name,
      });
      toast.style = Toast.Style.Success;
      toast.title = "Port Forward Deleted";
      toast.message = label;
      void revalidate();
    } catch (err) {
      await toast.hide();
      const { title, message } = getErrorDescription(err);
      await showFailureToast(message, { title });
    }
  }

  async function handleDeleteUpnpRule(rule: UpnpRule) {
    if (!rule.num) {
      return;
    }
    const label = rule.descr || `${rule.proto.toUpperCase()} ${rule.extport}`;
    const confirmed = await confirmAlert({
      title: `Remove UPnP Lease ${label}?`,
      message: `Remove active UPnP / NAT-PMP mapping ${rule.proto.toUpperCase()} ${rule.extport} → ${rule.intaddr}:${rule.intport}.`,
      primaryAction: {
        title: "Remove UPnP Lease",
        style: Alert.ActionStyle.Destructive,
      },
    });
    if (!confirmed) {
      return;
    }

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `Removing UPnP Lease...`,
    });
    try {
      await deleteUpnpRule(rule.num, getPreferenceValues<ExtensionPreferences>());
      toast.style = Toast.Style.Success;
      toast.title = "UPnP Lease Removed";
      toast.message = `${rule.proto.toUpperCase()} ${rule.extport}`;
      void revalidate();
    } catch (err) {
      await toast.hide();
      const { title, message } = getErrorDescription(err);
      await showFailureToast(message, { title });
    }
  }

  const totalEntries = redirects.length + upnpRules.length;
  const cacheBadge = formatCacheBadge({ isCached, isLoading, error, updatedAt });

  const isConfigError =
    error instanceof OpenWrtError &&
    (error.code === "AUTH_FAILED" || error.code === "INVALID_URL" || error.code === "TLS_ERROR");
  const errorInfo = error && totalEntries === 0 ? getErrorDescription(error) : null;
  const upnpErrorMessage = data?.upnpError?.trim() || null;
  const showUpnpErrorSection =
    (filter === "all" || filter === "upnp") && visibleUpnpRules.length === 0 && Boolean(upnpErrorMessage);
  const hasVisibleItems = visibleRedirects.length > 0 || visibleUpnpRules.length > 0 || showUpnpErrorSection;

  const redirectsSubtitle =
    visibleRedirects.length > 0 ? [String(visibleRedirects.length), cacheBadge].filter(Boolean).join(" · ") : undefined;
  const upnpSubtitle =
    visibleRedirects.length === 0 && cacheBadge
      ? [String(visibleUpnpRules.length), cacheBadge].filter(Boolean).join(" · ")
      : String(visibleUpnpRules.length);

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={hasVisibleItems}
      searchBarPlaceholder="Search port forwards, ports, IPs, or UPnP leases..."
      searchBarAccessory={
        <List.Dropdown
          tooltip="Filter Firewall & UPnP"
          value={filter}
          onChange={(value) => setFilter(value as FirewallFilter)}
        >
          <List.Dropdown.Item title="All Rules & UPnP" value="all" />
          <List.Dropdown.Item title="Port Forwards (UCI)" value="redirects" />
          <List.Dropdown.Item title="Enabled Forwards" value="enabled" />
          <List.Dropdown.Item title="Disabled Forwards" value="disabled" />
          <List.Dropdown.Item title="Active UPnP / NAT-PMP" value="upnp" />
        </List.Dropdown>
      }
    >
      {errorInfo ? (
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title={errorInfo.title}
          description={upnpErrorMessage ? `${errorInfo.message}\n\nUPnP: ${upnpErrorMessage}` : errorInfo.message}
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
      ) : !hasVisibleItems && !isLoading ? (
        <List.EmptyView
          icon={filter === "upnp" && upnpErrorMessage ? Icon.ExclamationMark : Icon.Shield}
          title={
            filter === "upnp" && upnpErrorMessage
              ? "UPnP Status Lookup Failed"
              : filter === "upnp" && data && !data.upnpAvailable
                ? "UPnP Service Unavailable"
                : "No Port Forwards or UPnP Leases"
          }
          description={
            filter === "upnp" && upnpErrorMessage
              ? upnpErrorMessage
              : filter === "upnp" && data && !data.upnpAvailable
                ? "No active luci.upnp service was detected on the router (miniupnpd may not be installed)."
                : upnpErrorMessage
                  ? `No firewall redirects or UPnP leases matched the current filter. UPnP error: ${upnpErrorMessage}`
                  : "No firewall redirects or UPnP leases matched the current filter."
          }
          actions={
            <ActionPanel>
              <ActionPanel.Section title="Manage">
                <Action.Push
                  title="Add Port Forward"
                  icon={Icon.Plus}
                  target={<AddPortForwardForm onSuccess={revalidate} />}
                />
              </ActionPanel.Section>
              <RouterActionSection onRefresh={revalidate} />
            </ActionPanel>
          }
        />
      ) : (
        <>
          {visibleRedirects.length > 0 && (
            <List.Section title="Port Forwards (UCI)" subtitle={redirectsSubtitle}>
              {visibleRedirects.map((redirect) => {
                const title = redirect.name || redirect.section;
                const internalTarget = formatRedirectTarget(redirect);
                const statusColor = redirect.enabled ? Color.Green : Color.SecondaryText;

                return (
                  <List.Item
                    key={`redirect:${redirect.section}`}
                    id={`redirect:${redirect.section}`}
                    icon={{
                      source: redirect.enabled ? Icon.CheckCircle : Icon.Circle,
                      tintColor: statusColor,
                    }}
                    title={title}
                    subtitle={`${redirect.srcDport || "*"} → ${internalTarget || "?"}`}
                    keywords={[
                      redirect.section,
                      redirect.name,
                      redirect.proto,
                      redirect.src,
                      redirect.dest,
                      redirect.srcDport,
                      redirect.destIp,
                      redirect.destPort,
                      redirect.target,
                      redirect.enabled ? "enabled" : "disabled",
                      "uci",
                      "forward",
                    ].filter(Boolean)}
                    accessories={[
                      { tag: { value: formatProtoLabel(redirect.proto), color: Color.Blue } },
                      {
                        tag: {
                          value: redirect.enabled ? "Enabled" : "Disabled",
                          color: statusColor,
                        },
                      },
                    ]}
                    detail={
                      <List.Item.Detail
                        markdown={buildRedirectMarkdown(redirect)}
                        metadata={
                          <List.Item.Detail.Metadata>
                            <List.Item.Detail.Metadata.TagList title="Status">
                              <List.Item.Detail.Metadata.TagList.Item
                                text={redirect.enabled ? "Enabled" : "Disabled"}
                                color={statusColor}
                              />
                              <List.Item.Detail.Metadata.TagList.Item
                                text={formatProtoLabel(redirect.proto)}
                                color={Color.Blue}
                              />
                            </List.Item.Detail.Metadata.TagList>
                            <List.Item.Detail.Metadata.Label title="External Port" text={redirect.srcDport || "Any"} />
                            <List.Item.Detail.Metadata.Label title="Internal Target" text={internalTarget || "Unset"} />
                            <List.Item.Detail.Metadata.Label
                              title="Zones"
                              text={`${redirect.src || "wan"} → ${redirect.dest || "lan"}`}
                            />
                            <List.Item.Detail.Metadata.Label title="Target" text={redirect.target || "DNAT"} />
                            <List.Item.Detail.Metadata.Separator />
                            <List.Item.Detail.Metadata.Label title="UCI Section" text={redirect.section} />
                          </List.Item.Detail.Metadata>
                        }
                      />
                    }
                    actions={
                      <ActionPanel>
                        <ActionPanel.Section title="Port Forward">
                          {internalTarget ? (
                            <Action.CopyToClipboard title="Copy Target" content={internalTarget} />
                          ) : redirect.srcDport ? (
                            <Action.CopyToClipboard title="Copy External Port" content={redirect.srcDport} />
                          ) : (
                            <Action.CopyToClipboard title="Copy Rule Name" content={title} />
                          )}
                          {internalTarget && redirect.srcDport && (
                            <Action.CopyToClipboard
                              title="Copy External Port"
                              content={redirect.srcDport}
                              shortcut={modShortcut(["shift"], "c")}
                            />
                          )}
                          {redirect.name && (internalTarget || redirect.srcDport) && (
                            <Action.CopyToClipboard
                              title="Copy Rule Name"
                              content={redirect.name}
                              shortcut={Keyboard.Shortcut.Common.CopyName}
                            />
                          )}
                          <Action
                            title={redirect.enabled ? "Disable Port Forward" : "Enable Port Forward"}
                            icon={redirect.enabled ? Icon.Pause : Icon.Play}
                            style={redirect.enabled ? Action.Style.Destructive : Action.Style.Regular}
                            onAction={() => handleToggleRedirect(redirect)}
                          />
                          <Action.Push
                            title="Add Port Forward"
                            icon={Icon.Plus}
                            shortcut={Keyboard.Shortcut.Common.New}
                            target={<AddPortForwardForm onSuccess={revalidate} />}
                          />
                          <Action
                            title="Delete Port Forward"
                            icon={Icon.Trash}
                            style={Action.Style.Destructive}
                            shortcut={Keyboard.Shortcut.Common.Remove}
                            onAction={() => handleDeleteRedirect(redirect)}
                          />
                        </ActionPanel.Section>
                        <RouterActionSection onRefresh={revalidate} />
                      </ActionPanel>
                    }
                  />
                );
              })}
            </List.Section>
          )}
          {visibleUpnpRules.length > 0 && (
            <List.Section title="Active UPnP / NAT-PMP Leases" subtitle={upnpSubtitle}>
              {visibleUpnpRules.map((rule, idx) => {
                const title = rule.descr || rule.hostHint || rule.intaddr;
                const internalTarget = `${rule.intaddr}:${rule.intport}`;
                const expiryText = formatUpnpExpiry(rule.expires);

                return (
                  <List.Item
                    key={`upnp:${rule.num || idx}:${rule.proto}:${rule.extport}`}
                    id={`upnp:${rule.num || idx}:${rule.proto}:${rule.extport}`}
                    icon={{ source: Icon.Globe, tintColor: Color.Blue }}
                    title={title}
                    subtitle={`${rule.extport} → ${internalTarget}`}
                    keywords={[
                      rule.num,
                      rule.descr,
                      rule.proto,
                      String(rule.extport),
                      rule.intaddr,
                      String(rule.intport),
                      rule.hostHint ?? "",
                      "upnp",
                      "nat-pmp",
                    ].filter(Boolean)}
                    accessories={[
                      { tag: { value: formatProtoLabel(rule.proto), color: Color.Blue } },
                      { text: expiryText },
                    ]}
                    detail={
                      <List.Item.Detail
                        markdown={buildUpnpMarkdown(rule)}
                        metadata={
                          <List.Item.Detail.Metadata>
                            <List.Item.Detail.Metadata.TagList title="Protocol">
                              <List.Item.Detail.Metadata.TagList.Item
                                text={formatProtoLabel(rule.proto)}
                                color={Color.Blue}
                              />
                              <List.Item.Detail.Metadata.TagList.Item
                                text="UPnP / NAT-PMP"
                                color={Color.SecondaryText}
                              />
                            </List.Item.Detail.Metadata.TagList>
                            <List.Item.Detail.Metadata.Label title="External Port" text={String(rule.extport)} />
                            <List.Item.Detail.Metadata.Label title="Internal Target" text={internalTarget} />
                            <List.Item.Detail.Metadata.Label title="Client Host" text={rule.hostHint || "Unknown"} />
                            <List.Item.Detail.Metadata.Label title="Lease Expires" text={expiryText} />
                            <List.Item.Detail.Metadata.Label title="Rule Index" text={rule.num || "Unavailable"} />
                          </List.Item.Detail.Metadata>
                        }
                      />
                    }
                    actions={
                      <ActionPanel>
                        <ActionPanel.Section title="UPnP Lease">
                          <Action.CopyToClipboard title="Copy Internal Target" content={internalTarget} />
                          <Action.CopyToClipboard
                            title="Copy External Port"
                            content={String(rule.extport)}
                            shortcut={modShortcut(["shift"], "c")}
                          />
                          <Action.Push
                            title="Add Port Forward"
                            icon={Icon.Plus}
                            shortcut={Keyboard.Shortcut.Common.New}
                            target={<AddPortForwardForm onSuccess={revalidate} />}
                          />
                          {Boolean(rule.num) && (
                            <Action
                              title="Remove UPnP Lease"
                              icon={Icon.Trash}
                              style={Action.Style.Destructive}
                              shortcut={Keyboard.Shortcut.Common.Remove}
                              onAction={() => handleDeleteUpnpRule(rule)}
                            />
                          )}
                        </ActionPanel.Section>
                        <RouterActionSection onRefresh={revalidate} />
                      </ActionPanel>
                    }
                  />
                );
              })}
            </List.Section>
          )}
          {showUpnpErrorSection && upnpErrorMessage && (
            <List.Section
              title="Active UPnP / NAT-PMP Leases"
              subtitle={visibleRedirects.length === 0 && cacheBadge ? cacheBadge : "Status check failed"}
            >
              <List.Item
                key="upnp:error"
                id="upnp:error"
                icon={{ source: Icon.ExclamationMark, tintColor: Color.Orange }}
                title="UPnP Status Lookup Failed"
                subtitle={upnpErrorMessage}
                keywords={["upnp", "nat-pmp", "error", upnpErrorMessage].filter(Boolean)}
                detail={
                  <List.Item.Detail
                    markdown={["### UPnP Status Lookup Failed", "", escapeMarkdownText(upnpErrorMessage)].join("\n")}
                    metadata={
                      <List.Item.Detail.Metadata>
                        <List.Item.Detail.Metadata.TagList title="Status">
                          <List.Item.Detail.Metadata.TagList.Item text="Error" color={Color.Orange} />
                        </List.Item.Detail.Metadata.TagList>
                        <List.Item.Detail.Metadata.Label
                          title="Service"
                          text={data?.upnpAvailable ? "luci.upnp" : "Unavailable"}
                        />
                      </List.Item.Detail.Metadata>
                    }
                  />
                }
                actions={
                  <ActionPanel>
                    <ActionPanel.Section title="UPnP Status">
                      <Action.CopyToClipboard title="Copy Error Message" content={upnpErrorMessage} />
                      <Action.Push
                        title="Add Port Forward"
                        icon={Icon.Plus}
                        shortcut={Keyboard.Shortcut.Common.New}
                        target={<AddPortForwardForm onSuccess={revalidate} />}
                      />
                    </ActionPanel.Section>
                    <RouterActionSection onRefresh={revalidate} />
                  </ActionPanel>
                }
              />
            </List.Section>
          )}
        </>
      )}
    </List>
  );
}
