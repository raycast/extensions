import { Action, Color, Icon, LaunchProps, List } from "@raycast/api";
import { useState } from "react";
import { AuditActions } from "./components/audit-actions";
import { ChangeHistory, ExtensionDetail, rank } from "./components/extension-detail";
import { useAudit } from "./components/use-audit";
import { unreviewed } from "./lib/model";
import { AuditStatus } from "./components/audit-status";
import { browserName } from "./lib/browsers/registry";
import { risk } from "./lib/rules/evaluate";
import { riskColors } from "./components/risk";

const filters = ["All", "Has Findings", "Changed", "Sideloaded", "Disabled"];
export default function Command(props: LaunchProps<{ launchContext?: { extensionKey?: string } }>) {
  const audit = useAudit();
  const [selection, setSelection] = useState("all|All");
  const [selectedItem, setSelectedItem] = useState<string | null>(props.launchContext?.extensionKey ?? null);
  const split = selection.lastIndexOf("|");
  const profileKey = selection.slice(0, split),
    filter = selection.slice(split + 1);
  const profiles = Object.values(audit.state.latest);
  const scopes = [
    { key: "all", name: "All Browsers" },
    ...[...new Set(profiles.map((profile) => profile.browser))].flatMap((browser) => [
      { key: `browser:${browser}`, name: browserName(browser) },
      ...profiles
        .filter((profile) => profile.browser === browser)
        .map((profile) => ({ key: profile.key, name: `${browserName(browser)} · ${profile.name}` })),
    ]),
  ];
  const pending = unreviewed(audit.state.events);
  const extensions = profiles
    .filter(
      (p) =>
        profileKey === "all" ||
        (profileKey.startsWith("browser:") ? p.browser === profileKey.slice(8) : p.key === profileKey),
    )
    .flatMap((p) => p.extensions)
    .filter((e) => {
      if (filter === "Has Findings") return e.findings.length > 0;
      if (filter === "Changed") return pending.some((event) => event.extensionKey === e.key);
      if (filter === "Sideloaded") return ["External / sideloaded", "Developer / unpacked"].includes(e.provenance);
      if (filter === "Disabled") return e.enabled === "Disabled";
      return true;
    })
    .sort((a, b) => rank(a, audit) - rank(b, audit) || a.name.localeCompare(b.name));
  const status = audit.error
    ? "Audit Needs Attention"
    : audit.state.diagnostics.length
      ? "Scan Coverage Incomplete"
      : profiles.length
        ? `${pending.length} Unreviewed Changes`
        : "Set Up Extension Monitoring";
  return (
    <List
      isLoading={audit.loading}
      searchBarPlaceholder="Search extensions, permissions, or profiles…"
      selectedItemId={selectedItem ?? undefined}
      onSelectionChange={setSelectedItem}
      searchBarAccessory={
        <List.Dropdown tooltip="Filter Browsers, Profiles, and Findings" value={selection} onChange={setSelection}>
          {scopes.map((p) => (
            <List.Dropdown.Section key={p.key} title={p.name}>
              {filters.map((f) => (
                <List.Dropdown.Item
                  key={`${p.key}|${f}`}
                  value={`${p.key}|${f}`}
                  title={p.key === "all" ? f : `${p.name} · ${f}`}
                />
              ))}
            </List.Dropdown.Section>
          ))}
        </List.Dropdown>
      }
    >
      <List.Section title="Monitoring">
        <List.Item
          id="status"
          title={status}
          subtitle={
            audit.loading
              ? "Scanning local browser profiles…"
              : profiles.length
                ? "Baseline created · View coverage and monitoring status"
                : "View setup and diagnostics"
          }
          icon={audit.error || audit.state.diagnostics.length ? Icon.Warning : Icon.Shield}
          actions={
            <AuditActions audit={audit}>
              <Action.Push title="Show Audit Status" target={<AuditStatus />} />
              <Action.Push title="Show Change History" icon={Icon.Clock} target={<ChangeHistory />} />
            </AuditActions>
          }
        />
        <List.Item
          id="history"
          title="Change History"
          subtitle={`${audit.state.events.length} recorded events, including removed extensions`}
          icon={Icon.Clock}
          actions={
            <AuditActions audit={audit}>
              <Action.Push title="Show Change History" target={<ChangeHistory />} />
            </AuditActions>
          }
        />
      </List.Section>
      <List.Section title="Browser Extensions" subtitle={`${extensions.length} extensions`}>
        {extensions.map((extension) => {
          const events = pending.filter((e) => e.extensionKey === extension.key);
          const { overall } = risk(extension);
          return (
            <List.Item
              id={extension.key}
              key={extension.key}
              title={extension.name}
              subtitle={`${extension.version} · ${browserName(extension.browser)} · ${extension.profileName}`}
              icon={extension.icon ?? Icon.Box}
              keywords={[
                extension.id,
                browserName(extension.browser),
                extension.profileName,
                ...extension.access.requested.api,
                ...extension.access.requested.hosts,
              ]}
              accessories={[
                ...(events.length
                  ? [
                      {
                        tag: {
                          value: `${events.length} changes`,
                          color: events.some((e) => e.attention === "Review now") ? Color.Orange : Color.Blue,
                        },
                      },
                    ]
                  : []),
                ...(overall === "High" || overall === "Medium"
                  ? [{ tag: { value: `${overall} risk`, color: riskColors[overall] } }]
                  : []),
                ...(extension.enabled !== "Enabled" ? [{ text: extension.enabled }] : []),
                {
                  text:
                    events[0]?.title ??
                    extension.findings[0]?.title ??
                    (extension.access.complete ? "" : "Access uncertain"),
                  tooltip: events[0]?.title ?? extension.findings[0]?.explanation ?? "",
                },
              ]}
              actions={
                <AuditActions audit={audit} extension={extension}>
                  <Action.Push
                    title="Inspect Extension"
                    icon={Icon.Eye}
                    target={<ExtensionDetail extensionKey={extension.key} />}
                  />
                  <Action.Push title="Show Change History" target={<ChangeHistory />} />
                </AuditActions>
              }
            />
          );
        })}
        {!audit.loading && !extensions.length && (
          <List.Item
            title={profiles.length ? "No Extensions Match This View" : "No Extension Inventory Yet"}
            subtitle="Open audit status for coverage and diagnostics"
            icon={Icon.Box}
            actions={<AuditActions audit={audit} />}
          />
        )}
      </List.Section>
    </List>
  );
}
