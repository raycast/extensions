import { Action, ActionPanel, Detail, Icon, showToast, Toast, confirmAlert, Alert, Color } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { GandiDomain, WebsiteMetadata } from "../types";
import * as gandiAPI from "../api";
import { useEffect, useState } from "react";

interface Props {
  domain: GandiDomain;
}

export default function DomainDetail({ domain }: Readonly<Props>) {
  const [meta, setMeta] = useState<WebsiteMetadata | null>(null);

  useEffect(() => {
    let cancelled = false;
    const target = domain.fqdn;
    gandiAPI
      .fetchWebsiteMetadata(target)
      .then((m) => {
        if (!cancelled) setMeta(m || null);
      })
      .catch(() => {
        if (!cancelled) setMeta(null);
      });
    return () => {
      cancelled = true;
    };
  }, [domain.fqdn]);
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const getDaysUntilExpiry = () => {
    const days = Math.ceil((new Date(domain.dates.registry_ends_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return days;
  };
  

  const toggleTransferLock = async () => {
    const action = domain.is_locked ? "unlock" : "lock";
    const confirmed = await confirmAlert({
      title: `${action.charAt(0).toUpperCase() + action.slice(1)} Domain`,
      message: `Are you sure you want to ${action} ${domain.fqdn}?`,
      icon: domain.is_locked ? Icon.LockUnlocked : Icon.Lock,
      primaryAction: {
        title: action.charAt(0).toUpperCase() + action.slice(1),
        style: domain.is_locked ? Alert.ActionStyle.Default : Alert.ActionStyle.Destructive,
      },
    });

    if (confirmed) {
      try {
        await showToast({
          style: Toast.Style.Animated,
          title: `${action.charAt(0).toUpperCase() + action.slice(1)}ing domain...`,
        });

        await gandiAPI.updateTransferLock(domain.fqdn, !domain.is_locked);

        await showToast({
          style: Toast.Style.Success,
          title: `Domain ${action}ed successfully`,
        });
      } catch (error) {
        await showFailureToast(error, {
          title: `Failed to ${action} domain`,
        });
      }
    }
  };

  const markdownParts: string[] = [`# [${domain.fqdn}](https://admin.gandi.net/domain/${domain.fqdn})`];
  if (meta?.title || meta?.description || meta?.image) {
    markdownParts.push("");
    if (meta.image) {
      markdownParts.push(`![preview](${meta.image})`);
    }
    if (meta.title) markdownParts.push(`**${meta.title}**`);
    if (meta.description) markdownParts.push(meta.description);
  }
  const markdown = markdownParts.join("\n");

  const getSecondLevelName = () => {
    if (domain.domain && domain.domain.trim().length > 0) return domain.domain;
    const fqdn = domain.fqdn || "";
    const tld = domain.tld || "";
    if (tld && fqdn.toLowerCase().endsWith(`.${tld.toLowerCase()}`)) {
      return fqdn.slice(0, -(tld.length + 1));
    }
    const parts = fqdn.split(".");
    return parts.length > 1 ? parts.slice(0, -1).join(".") : fqdn;
  };

  // Precompute expiry badge values for metadata
  const expiryDays = getDaysUntilExpiry();
  let expiryBadgeColor: Color = Color.Green;
  if (expiryDays < 0) expiryBadgeColor = Color.Red;
  else if (expiryDays < 30) expiryBadgeColor = Color.Red;
  else if (expiryDays < 90) expiryBadgeColor = Color.Orange;

  return (
    <Detail
      markdown={markdown}
      navigationTitle={domain.fqdn}
      metadata={
        <Detail.Metadata>
          
          <Detail.Metadata.TagList title="Expiry">
            <Detail.Metadata.TagList.Item
              text={expiryDays < 0 ? "Expired" : `In ${expiryDays} days`}
              color={expiryBadgeColor}
            />
          </Detail.Metadata.TagList>
          <Detail.Metadata.Label
            title="Expiration Date"
            text={formatDate(domain.dates.registry_ends_at)}
            icon={Icon.Calendar}
          />
          <Detail.Metadata.Separator />

          
          <Detail.Metadata.Label title="Domain" text={getSecondLevelName()} />
          <Detail.Metadata.Label title="TLD" text={domain.tld} />
          <Detail.Metadata.Label title="Owner" text={domain.owner} />
          {domain.sharing_id && <Detail.Metadata.Label title="Sharing ID" text={domain.sharing_id} />}
          <Detail.Metadata.Separator />

          
          <Detail.Metadata.TagList title="Transfer">
            <Detail.Metadata.TagList.Item
              text={
                domain.is_locked || (domain.status || []).some((s) => s.includes("TransferProhibited"))
                  ? "Locked"
                  : "Unlocked"
              }
              color={
                domain.is_locked || (domain.status || []).some((s) => s.includes("TransferProhibited"))
                  ? Color.Purple
                  : Color.Blue
              }
            />
          </Detail.Metadata.TagList>
          <Detail.Metadata.TagList title="Edit">
            <Detail.Metadata.TagList.Item
              text={(domain.status || []).some((s) => s.includes("UpdateProhibited")) ? "Locked" : "Unlocked"}
              color={(domain.status || []).some((s) => s.includes("UpdateProhibited")) ? Color.Purple : Color.Blue}
            />
          </Detail.Metadata.TagList>
          <Detail.Metadata.TagList title="Auto-Renewal">
            <Detail.Metadata.TagList.Item
              text={domain.autorenew ? "Enabled" : "Disabled"}
              color={domain.autorenew ? Color.Green : Color.SecondaryText}
            />
          </Detail.Metadata.TagList>
          
          <Detail.Metadata.TagList title="Registrar Lock (Gandi Toggle)">
            <Detail.Metadata.TagList.Item
              text={domain.is_locked ? "On" : "Off"}
              color={domain.is_locked ? Color.Purple : Color.SecondaryText}
            />
          </Detail.Metadata.TagList>
          <Detail.Metadata.TagList title="TLD Lock Available">
            <Detail.Metadata.TagList.Item
              text={domain.can_tld_lock ? "Yes" : "No"}
              color={domain.can_tld_lock ? Color.Green : Color.SecondaryText}
            />
          </Detail.Metadata.TagList>
          <Detail.Metadata.Separator />

          
          <Detail.Metadata.Label title="Registry Created" text={formatDate(domain.dates.registry_created_at)} />
          {domain.dates.created_at && (
            <Detail.Metadata.Label title="Created (Account)" text={formatDate(domain.dates.created_at)} />
          )}
          <Detail.Metadata.Label title="Last Updated" text={formatDate(domain.dates.updated_at)} />
          {domain.dates.hold_begins_at && (
            <Detail.Metadata.Label title="Hold Begins" text={formatDate(domain.dates.hold_begins_at)} />
          )}
          {domain.dates.hold_ends_at && (
            <Detail.Metadata.Label title="Hold Ends" text={formatDate(domain.dates.hold_ends_at)} />
          )}
          <Detail.Metadata.Separator />

          
          <Detail.Metadata.Label title="Nameserver" text={domain.nameserver.current} icon={Icon.Network} />
          {domain.nameserver.hosts && domain.nameserver.hosts.length > 0 && (
            <Detail.Metadata.TagList title="NS Hosts">
              {domain.nameserver.hosts.map((h) => (
                <Detail.Metadata.TagList.Item key={h} text={h} />
              ))}
            </Detail.Metadata.TagList>
          )}
          <Detail.Metadata.Separator />

          
          {domain.services && domain.services.length > 0 && (
            <Detail.Metadata.TagList title="Active Services">
              {domain.services.map((s) => (
                <Detail.Metadata.TagList.Item key={s} text={s} />
              ))}
            </Detail.Metadata.TagList>
          )}
          {domain.tags && domain.tags.length > 0 && (
            <Detail.Metadata.TagList title="Tags">
              {domain.tags.map((t) => (
                <Detail.Metadata.TagList.Item key={t} text={t} color={Color.SecondaryText} />
              ))}
            </Detail.Metadata.TagList>
          )}
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Quick Actions">
            <Action.OpenInBrowser title="Open Website" url={`https://${domain.fqdn}`} icon={Icon.Globe} />
            <Action.OpenInBrowser
              title="Open in Gandi Dashboard"
              url={`https://admin.gandi.net/domain/${domain.fqdn}`}
              icon={Icon.Globe}
            />
            <Action.OpenInBrowser
              title="Manage Dns Records"
              url={`https://admin.gandi.net/domain/${domain.fqdn}/dns`}
              icon={Icon.Network}
            />
            <Action
              title={domain.is_locked ? "Unlock Domain" : "Lock Domain"}
              icon={domain.is_locked ? Icon.LockUnlocked : Icon.Lock}
              onAction={toggleTransferLock}
            />
          </ActionPanel.Section>

          <ActionPanel.Section title="Copy Information">
            <Action.CopyToClipboard
              title="Copy Domain Name"
              content={domain.fqdn}
              shortcut={{ modifiers: ["cmd"], key: "c" }}
            />
            <Action.CopyToClipboard
              title="Copy Nameservers"
              content={domain.nameserver.hosts?.join("\n") || domain.nameserver.current}
              shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
            />
          </ActionPanel.Section>

          <ActionPanel.Section title="Advanced">
            <Action.OpenInBrowser
              title="Domain Transfer Settings"
              url={`https://admin.gandi.net/domain/${domain.fqdn}/transfer`}
              icon={Icon.ArrowRight}
            />
            <Action.OpenInBrowser
              title="Domain Contacts"
              url={`https://admin.gandi.net/domain/${domain.fqdn}/contacts`}
              icon={Icon.Person}
            />
            <Action.OpenInBrowser
              title="Nameserver Management"
              url={`https://admin.gandi.net/domain/${domain.fqdn}/nameservers`}
              icon={Icon.Network}
            />
            <Action.OpenInBrowser
              title="Domain Tags"
              url={`https://admin.gandi.net/domain/${domain.fqdn}/tags`}
              icon={Icon.Tag}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
