import {
  Action,
  ActionPanel,
  Alert,
  Color,
  confirmAlert,
  getPreferenceValues,
  Icon,
  List,
  showToast,
  Toast,
  Keyboard,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useMemo, useState } from "react";
import { AuditSeverity, LocalProject, SecurityVulnerability } from "../types";
import { PACKAGE_MANAGER_META, SEVERITY_META } from "../lib/constants";
import { formatDuration } from "../lib/format";
import { notifyOperationResult } from "../lib/notifications";
import { buildAuditFixCommand, executeAuditFix, executeUpdate, runProjectSecurityAudit } from "../lib/package-manager";
import { PackageDetailView } from "./PackageDetailView";

interface ProjectAuditListProps {
  project: LocalProject;
  searchBarAccessory?: List.Props["searchBarAccessory"];
  isNested?: boolean;
}

function getRemediationText(vuln: SecurityVulnerability, pm: LocalProject["packageManager"]): string {
  if (typeof vuln.fixAvailable === "object") {
    const breakNote = vuln.fixAvailable.isSemVerMajor ? " (breaking major upgrade)" : "";
    return `Upgrade \`${vuln.fixAvailable.name}\` to \`${vuln.fixAvailable.version}\`${breakNote}`;
  }
  if (vuln.fixAvailable) {
    const cmd = buildAuditFixCommand(pm, false);
    return cmd
      ? `Run \`${cmd.display}\` or update \`${vuln.packageName}\``
      : `Upgrade \`${vuln.packageName}\` to latest patched version`;
  }
  return vuln.patchedVersions
    ? `Patched in \`${vuln.patchedVersions}\` — review dependency tree`
    : "No automated patch reported yet. Check advisory for workarounds.";
}

export function ProjectAuditList({ project, searchBarAccessory, isNested = false }: ProjectAuditListProps) {
  const prefs = getPreferenceValues<Preferences>();
  const [severityFilter, setSeverityFilter] = useState<"all" | AuditSeverity>("all");
  const [showDetails, setShowDetails] = useState(true);

  const {
    data: report,
    isLoading,
    error,
    revalidate,
  } = usePromise(
    async (proj: LocalProject) =>
      runProjectSecurityAudit(proj, {
        registryUrl: prefs.registryUrl,
        additionalPath: prefs.additionalPath,
      }),
    [project],
  );

  const filtered = useMemo(() => {
    const list = report?.vulnerabilities ?? [];
    if (severityFilter === "all") return list;
    return list.filter((v) => v.severity === severityFilter);
  }, [report, severityFilter]);

  async function handleAuditFix(force: boolean) {
    if (force) {
      const ok = await confirmAlert({
        title: `Run forced audit fix on ${project.name}?`,
        message: "Force fixing may install semver-major breaking changes to resolve vulnerabilities.",
        primaryAction: { title: "Run Audit Fix --force", style: Alert.ActionStyle.Destructive },
      });
      if (!ok) return;
    }

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: force ? "Running forced audit fix..." : "Running audit fix...",
      message: project.name,
    });

    const outcome = await executeAuditFix({
      project,
      force,
      additionalPath: prefs.additionalPath,
    });

    await toast.hide();
    await notifyOperationResult({
      title: outcome.success ? "Security fixes applied" : "Audit fix failed",
      message: outcome.success ? `${outcome.command} · ${formatDuration(outcome.durationMs)}` : outcome.errorMessage,
      success: outcome.success,
      durationMs: outcome.durationMs,
    });

    if (outcome.success) {
      await revalidate();
    }
  }

  async function handleUpdateVulnerable(vuln: SecurityVulnerability) {
    const targetPkg =
      typeof vuln.fixAvailable === "object"
        ? `${vuln.fixAvailable.name}@${vuln.fixAvailable.version}`
        : `${vuln.packageName}@latest`;

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `Updating ${targetPkg}...`,
    });

    const outcome = await executeUpdate({
      pm: project.packageManager,
      packages: [targetPkg],
      projectPath: project.path,
      projectName: project.name,
      latest: true,
      additionalPath: prefs.additionalPath,
    });

    await toast.hide();
    await notifyOperationResult({
      title: outcome.success ? `Updated ${vuln.packageName}` : `Failed to update ${vuln.packageName}`,
      message: outcome.success ? `${outcome.command} · ${formatDuration(outcome.durationMs)}` : outcome.errorMessage,
      success: outcome.success,
      durationMs: outcome.durationMs,
    });

    if (outcome.success) {
      await revalidate();
    }
  }

  const canAutoFix = Boolean(buildAuditFixCommand(project.packageManager, false));
  const counts = report?.counts ?? { critical: 0, high: 0, moderate: 0, low: 0, info: 0 };

  const defaultDropdown = (
    <List.Dropdown
      tooltip="Filter by Severity"
      value={severityFilter}
      onChange={(v) => setSeverityFilter(v as "all" | AuditSeverity)}
    >
      <List.Dropdown.Item title={`All Severities (${report?.total ?? 0})`} value="all" />
      <List.Dropdown.Item title={`Critical (${counts.critical})`} value="critical" />
      <List.Dropdown.Item title={`High (${counts.high})`} value="high" />
      <List.Dropdown.Item title={`Moderate (${counts.moderate})`} value="moderate" />
      <List.Dropdown.Item title={`Low (${counts.low})`} value="low" />
    </List.Dropdown>
  );

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={showDetails && filtered.length > 0}
      navigationTitle={isNested ? `Security Audit — ${project.name}` : undefined}
      searchBarPlaceholder={`Filter vulnerabilities in ${project.name}...`}
      searchBarAccessory={searchBarAccessory ?? defaultDropdown}
    >
      {!isLoading && (error || report?.rawError) ? (
        <List.EmptyView
          icon={{ source: Icon.Warning, tintColor: Color.Orange }}
          title="Could Not Complete Security Audit"
          description={report?.rawError ?? error?.message ?? "Unknown audit failure"}
          actions={
            <ActionPanel>
              <Action title="Retry Audit" icon={Icon.ArrowClockwise} onAction={revalidate} />
            </ActionPanel>
          }
        />
      ) : !isLoading && filtered.length === 0 ? (
        <List.EmptyView
          icon={{
            source: report?.isPartial ? Icon.Warning : Icon.Shield,
            tintColor: report?.isPartial ? Color.Yellow : Color.Green,
          }}
          title={
            report?.isPartial
              ? "Partial Audit — No Vulnerabilities in Scanned Packages"
              : "No Known Vulnerabilities Found"
          }
          description={
            report?.isPartial
              ? `${report.partialReason ?? `Only direct package.json dependencies in ${project.name} were checked.`} Run "${project.packageManager} install" for a complete dependency tree audit.`
              : report?.source === "registry-advisory"
                ? `Checked ${report.scannedPackageCount ?? 0} installed packages (direct and nested) in ${project.name} against the npm advisory database.`
                : `${project.name} (${PACKAGE_MANAGER_META[project.packageManager].label}) passed security audit (local lockfile audit).`
          }
          actions={
            <ActionPanel>
              <Action title="Re-Run Security Audit" icon={Icon.ArrowClockwise} onAction={revalidate} />
            </ActionPanel>
          }
        />
      ) : (
        <List.Section
          title={`${project.name} · ${report?.total ?? 0} Vulnerabilities${report?.isPartial ? " (Partial Scan)" : ""}`}
          subtitle={`${counts.critical} critical · ${counts.high} high · ${counts.moderate} moderate · ${counts.low} low`}
        >
          {filtered.map((vuln, index) => {
            const sevMeta = SEVERITY_META[vuln.severity];
            const remediation = getRemediationText(vuln, project.packageManager);

            return (
              <List.Item
                key={`${vuln.packageName}-${vuln.id}-${index}`}
                icon={{ source: sevMeta.icon, tintColor: sevMeta.color }}
                title={vuln.packageName}
                subtitle={showDetails ? undefined : vuln.title}
                accessories={[{ tag: { value: sevMeta.label, color: sevMeta.color } }]}
                detail={
                  <List.Item.Detail
                    markdown={[
                      `## ${vuln.title}`,
                      "",
                      `**Remediation:** ${remediation}`,
                      vuln.via.length > 0
                        ? `\n**Dependency Path:** ${vuln.via.map((v) => `\`${v}\``).join(" → ")}`
                        : "",
                    ].join("\n")}
                    metadata={
                      <List.Item.Detail.Metadata>
                        <List.Item.Detail.Metadata.Label title="Package" text={vuln.packageName} />
                        <List.Item.Detail.Metadata.TagList title="Severity">
                          <List.Item.Detail.Metadata.TagList.Item text={sevMeta.label} color={sevMeta.color} />
                        </List.Item.Detail.Metadata.TagList>
                        <List.Item.Detail.Metadata.Label title="Vulnerable Range" text={vuln.vulnerableRange} />
                        {vuln.patchedVersions && (
                          <List.Item.Detail.Metadata.Label title="Patched Versions" text={vuln.patchedVersions} />
                        )}
                        <List.Item.Detail.Metadata.Label
                          title="Dependency"
                          text={vuln.isDirect ? "Direct" : "Transitive"}
                        />
                        <List.Item.Detail.Metadata.Label
                          title="Auto-Fixable"
                          text={
                            typeof vuln.fixAvailable === "object"
                              ? vuln.fixAvailable.isSemVerMajor
                                ? "Yes (Breaking Major)"
                                : "Yes"
                              : vuln.fixAvailable
                                ? "Yes"
                                : "Manual"
                          }
                        />
                        {vuln.cves.length > 0 && (
                          <List.Item.Detail.Metadata.Label title="Identifiers" text={vuln.cves.join(", ")} />
                        )}
                        {vuln.url && (
                          <List.Item.Detail.Metadata.Link title="Advisory" target={vuln.url} text="Open Advisory" />
                        )}
                      </List.Item.Detail.Metadata>
                    }
                  />
                }
                actions={
                  <ActionPanel>
                    <ActionPanel.Section title="Remediate">
                      {canAutoFix && (
                        <Action
                          title="Run Audit Fix"
                          icon={Icon.WrenchScrewdriver}
                          onAction={() => handleAuditFix(false)}
                        />
                      )}
                      <Action
                        title={`Update ${vuln.packageName} to Patched/Latest`}
                        icon={Icon.ArrowUpCircle}
                        shortcut={{ modifiers: ["cmd"], key: "u" }}
                        onAction={() => handleUpdateVulnerable(vuln)}
                      />
                      {project.packageManager === "npm" && (
                        <Action
                          title="Run Audit Fix --Force (Breaking)"
                          icon={Icon.ExclamationMark}
                          style={Action.Style.Destructive}
                          onAction={() => handleAuditFix(true)}
                        />
                      )}
                    </ActionPanel.Section>

                    <ActionPanel.Section title="Inspect">
                      {vuln.url && <Action.OpenInBrowser title="Open Security Advisory" url={vuln.url} />}
                      <Action.Push
                        title="View Package Details"
                        icon={Icon.Document}
                        shortcut={{ modifiers: ["cmd"], key: "d" }}
                        target={<PackageDetailView packageName={vuln.packageName} activeProject={project} />}
                      />
                      <Action
                        title={showDetails ? "Hide Detail Pane" : "Show Detail Pane"}
                        icon={Icon.Sidebar}
                        shortcut={{ modifiers: ["cmd"], key: "t" }}
                        onAction={() => setShowDetails((s) => !s)}
                      />
                      <Action
                        title="Re-Run Security Audit"
                        icon={Icon.ArrowClockwise}
                        shortcut={Keyboard.Shortcut.Common.Refresh}
                        onAction={revalidate}
                      />
                    </ActionPanel.Section>
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      )}
    </List>
  );
}
