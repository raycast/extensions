import { Action, Icon, openExtensionPreferences } from "@raycast/api";
import AddSiteCommand from "../add";
import { Site } from "../interface";
import UptimeCommand from "../views/uptime";
import BrokenLinksCommand from "../views/broken-links";
import DowntimeCommand from "../views/downtime";
import CertificateHealthCommand from "../views/certificate-health";
import MixedContentCommand from "../views/mixed-content";
import PerformanceRecordsCommand from "../views/performance-records";
import DNSRecordsCommand from "../views/dns-records";

export function ActionOpenPreferences() {
  return (
    <Action
      icon={Icon.Gear}
      title={"Open Extension Preferences"}
      shortcut={{ modifiers: ["cmd"], key: "," }}
      onAction={openExtensionPreferences}
    />
  );
}

export function ActionAddSite() {
  return (
    <Action.Push
      title="Add New Site"
      shortcut={{ modifiers: ["cmd"], key: "n" }}
      icon={Icon.Plus}
      target={<AddSiteCommand />}
    />
  );
}

export function ActionUptime({ item }: { item: Site }) {
  return (
    <Action.Push
      title="Uptime Log"
      icon={Icon.Clock}
      shortcut={{ modifiers: ["cmd"], key: "u" }}
      target={<UptimeCommand item={item} />}
    />
  );
}

export function ActionDowntime({ item }: { item: Site }) {
  return (
    <Action.Push
      title="Downtime Log"
      icon={Icon.Clock}
      shortcut={{ modifiers: ["cmd"], key: "d" }}
      target={<DowntimeCommand item={item} />}
    />
  );
}

export function ActionBrokenLinks({ item }: { item: Site }) {
  return (
    <Action.Push
      title="Broken Links"
      icon={Icon.MagnifyingGlass}
      shortcut={{ modifiers: ["cmd"], key: "b" }}
      target={<BrokenLinksCommand item={item} />}
    />
  );
}

export function ActionCertificateHealth({ item }: { item: Site }) {
  return (
    <Action.Push
      title="Certificate Health"
      icon={Icon.Binoculars}
      shortcut={{ modifiers: ["cmd"], key: "h" }}
      target={<CertificateHealthCommand item={item} />}
    />
  );
}

export function ActionMixedContent({ item }: { item: Site }) {
  return (
    <Action.Push
      title="Mixed Content"
      icon={Icon.BlankDocument}
      shortcut={{ modifiers: ["cmd"], key: "m" }}
      target={<MixedContentCommand item={item} />}
    />
  );
}

export function ActionPerformanceRecords({ item }: { item: Site }) {
  return (
    <Action.Push
      title="Performance"
      icon={Icon.Star}
      shortcut={{ modifiers: ["cmd"], key: "o" }}
      target={<PerformanceRecordsCommand item={item} />}
    />
  );
}

export function ActionDNSRecords({ item }: { item: Site }) {
  return (
    <Action.Push
      title="DNS Records"
      icon={Icon.BlankDocument}
      shortcut={{ modifiers: ["cmd"], key: "s" }}
      target={<DNSRecordsCommand item={item} />}
    />
  );
}
