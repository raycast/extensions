/**
 * Show Vulnerabilities command — installed formulae with open OSV advisories, from
 * `brew vulns` (Homebrew 7). Formulae only: brew's scanner never looks at
 * casks.
 *
 * The Upgrade action is offered only where the formula is ALSO outdated, and
 * the view never claims it resolves anything: brew reports the upstream commit
 * that fixed an advisory, not the Homebrew release that carries it, so a newer
 * bottle is an opportunity, never a guaranteed fix. What it CAN say is printed
 * verbatim — "Fixed upstream in: …" beside each advisory.
 */

import React, { useMemo } from "react";
import { Action, ActionPanel, Detail, Icon, Keyboard, List } from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { HomebrewGate } from "./components/requiresHomebrew";
import { RefreshAction, ToggleSidebarAction } from "./components/actionPanels";
import * as Actions from "./components/actions";
import { DetailMetadata, ListMetadata, MetadataRow } from "./components/packageMetadata";
import { useBrewOutdated } from "./hooks/useBrewOutdated";
import { useBrewVulns } from "./hooks/useBrewVulns";
import {
  ERROR_ICON,
  IN_PROGRESS_ICON,
  SEVERITY_COLOR,
  UPDATE_AVAILABLE_ICON,
  UP_TO_DATE_ICON,
  vulnerableIcon,
} from "./components/palette";
import {
  formatCount,
  getErrorMessage,
  escapeMarkdown,
  isBrewLockError,
  osvLink,
  osvUrl,
  HOMEBREW_7,
  type OutdatedFormula,
  type VulnFinding,
} from "./utils";

export default function Main() {
  return (
    <ErrorBoundary>
      <HomebrewGate major={HOMEBREW_7} feature="Show Vulnerabilities" loading={<List isLoading />}>
        <VulnerabilitiesContent />
      </HomebrewGate>
    </ErrorBoundary>
  );
}

function VulnerabilitiesContent() {
  const { data, isLoading, error, revalidate } = useBrewVulns();
  // No `brew update` phase: this only decides whether a row gets an Upgrade
  // action, and it must not make the scan wait on a network round trip.
  const outdated = useBrewOutdated({ backgroundRefresh: false });
  const [showDetail, setShowDetail] = useCachedState("show-detail-security", true);

  const outdatedByName = useMemo(
    () => new Map((outdated.data?.formulae ?? []).map((f) => [f.name, f])),
    [outdated.data],
  );

  const findings = data?.findings ?? [];
  const skipped = data?.skipped.length ?? 0;

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={findings.length > 0 && showDetail}
      searchBarPlaceholder="Search vulnerable formulae…"
    >
      {/* Failed scan, with nothing cached to show instead */}
      {error && !isLoading && findings.length === 0 && (
        <List.EmptyView
          icon={ERROR_ICON}
          title={isBrewLockError(error) ? "Brew Is Busy" : "Failed to Check for Vulnerabilities"}
          description={
            isBrewLockError(error)
              ? "Another brew process is running. Please wait and try again."
              : getErrorMessage(error)
          }
          actions={
            <ActionPanel>
              <Action title="Retry" icon={Icon.ArrowClockwise} onAction={revalidate} />
            </ActionPanel>
          }
        />
      )}

      {/* First scan — brew vulns takes several seconds, so say so immediately */}
      {isLoading && !data && (
        <List.EmptyView
          icon={IN_PROGRESS_ICON}
          title="Scanning for vulnerabilities…"
          description="Running brew vulns"
        />
      )}

      {!isLoading && !error && data && findings.length === 0 && (
        <List.EmptyView
          icon={UP_TO_DATE_ICON}
          title="No known vulnerabilities"
          description={skipped > 0 ? `${formatCount(skipped, "formula", "formulae")} skipped` : undefined}
          actions={
            <ActionPanel>
              <RefreshAction onRefresh={revalidate} />
            </ActionPanel>
          }
        />
      )}

      {findings.length > 0 && (
        <List.Section
          title="Vulnerable Formulae"
          subtitle={skipped > 0 ? `${findings.length} · ${skipped} skipped` : String(findings.length)}
        >
          {findings.map((finding) => (
            <VulnItem
              key={`${finding.formula}@${finding.version}`}
              finding={finding}
              outdated={outdatedByName.get(finding.formula)}
              onRefresh={() => {
                revalidate();
                outdated.revalidate();
              }}
              onToggleSidebar={() => setShowDetail((show) => !show)}
              showDetail={showDetail}
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}

function VulnItem(props: {
  finding: VulnFinding;
  outdated: OutdatedFormula | undefined;
  onRefresh: () => void;
  onToggleSidebar: () => void;
  /** The sidebar is open, so there is no room for accessories. */
  showDetail: boolean;
}) {
  const { finding, outdated, showDetail } = props;
  const advisories = formatCount(finding.open.length, "advisory", "advisories");
  // With the sidebar open the accessories truncate mid-word ("8 a…"), so they
  // are dropped and the severity-tinted shield carries the whole row summary.
  const summary = [finding.severity, advisories, ...(outdated ? ["upgrade available"] : [])].join(" \u00b7 ");

  return (
    <List.Item
      id={`${finding.formula}@${finding.version}`}
      title={finding.formula}
      subtitle={finding.version}
      icon={{ value: vulnerableIcon(finding.severity), tooltip: summary }}
      // Typing a CVE or GHSA id should find the formula carrying it.
      keywords={finding.open.flatMap((v) => [v.id, ...v.aliases])}
      accessories={
        showDetail
          ? undefined
          : [
              { tag: { value: finding.severity, color: SEVERITY_COLOR[finding.severity] } },
              { text: advisories },
              ...(outdated ? [{ icon: UPDATE_AVAILABLE_ICON, tooltip: "Upgrade available" }] : []),
            ]
      }
      detail={<List.Item.Detail markdown={findingMarkdown(finding)} metadata={<ListMetadata rows={rows(finding)} />} />}
      actions={
        <VulnActions
          finding={finding}
          outdated={outdated}
          onRefresh={props.onRefresh}
          showDetails={
            <Action.Push
              title="Show Details"
              icon={Icon.Document}
              target={<VulnDetail finding={finding} outdated={outdated} onRefresh={props.onRefresh} />}
            />
          }
          extra={
            <ActionPanel.Section>
              <RefreshAction onRefresh={props.onRefresh} />
              <ToggleSidebarAction onToggleSidebar={props.onToggleSidebar} />
            </ActionPanel.Section>
          }
        />
      }
    />
  );
}

/**
 * The sidebar has room for a summary, not for three advisories. This is the
 * same markdown and the same metadata rows with the whole window to use.
 */
function VulnDetail(props: { finding: VulnFinding; outdated: OutdatedFormula | undefined; onRefresh: () => void }) {
  const { finding } = props;
  return (
    <Detail
      navigationTitle={`${finding.formula} ${finding.version}`}
      markdown={findingMarkdown(finding)}
      metadata={<DetailMetadata rows={rows(finding)} />}
      actions={<VulnActions finding={finding} outdated={props.outdated} onRefresh={props.onRefresh} />}
    />
  );
}

/**
 * One action list for the row and for the pushed detail view, so the two can
 * never drift. `showDetails` is the slot the row fills and the detail view
 * leaves empty — pushing the same view onto itself is not an action.
 */
function VulnActions(props: {
  finding: VulnFinding;
  outdated: OutdatedFormula | undefined;
  onRefresh: () => void;
  // Typed off the components they render into: @raycast/api bundles its own
  // @types/react copy, and a bare React.ReactNode is not assignable across the two.
  showDetails?: React.ComponentProps<typeof ActionPanel.Section>["children"];
  extra?: React.ComponentProps<typeof ActionPanel>["children"];
}) {
  const { finding, outdated } = props;
  const worst = finding.open[0];

  return (
    <ActionPanel>
      <ActionPanel.Section>
        {/* The canonical single-package upgrade: it re-reads brew's own pin
            directory rather than trusting this snapshot, shows download
            progress, and reports brew's "did not upgrade" reasons. On a pinned
            formula it names the unpin in its own title and does both, because
            brew refuses an explicitly named pin (`cmd/upgrade.rb:471-476`).
            Refreshing on failure as well as success matters here: the unpin
            has landed by then, so the row would otherwise keep claiming a pin
            that is gone. */}
        {outdated && <Actions.FormulaUpgradeAction formula={outdated} onAction={() => props.onRefresh()} />}
        {props.showDetails}
        {worst && (
          <Action.OpenInBrowser title="Open in OSV" url={osvUrl(worst.id)} shortcut={Keyboard.Shortcut.Common.Open} />
        )}
      </ActionPanel.Section>
      <ActionPanel.Section>
        {finding.repoUrl && (
          <Action.OpenInBrowser
            title="Open Repository"
            url={finding.repoUrl}
            shortcut={Keyboard.Shortcut.Common.OpenWith}
          />
        )}
        <Action.CopyToClipboard
          title="Copy Advisory IDs"
          content={finding.open.map((v) => v.id).join("\n")}
          shortcut={Keyboard.Shortcut.Common.Copy}
        />
      </ActionPanel.Section>
      {props.extra}
    </ActionPanel>
  );
}

function findingMarkdown(finding: VulnFinding): string {
  const blocks = [
    `## ${escapeMarkdown(finding.formula)} ${escapeMarkdown(finding.version)}`,
    ...finding.open.map((vuln) =>
      [
        `### ${osvLink(vuln.id)} · ${vuln.severity}`,
        vuln.summary ? escapeMarkdown(vuln.summary) : undefined,
        vuln.aliases.length > 0 ? `Aliases: ${vuln.aliases.map(escapeMarkdown).join(", ")}` : undefined,
        vuln.fixedVersions.length > 0
          ? `Fixed upstream in: ${vuln.fixedVersions.map(escapeMarkdown).join(", ")}`
          : undefined,
      ]
        .filter(Boolean)
        .join("\n\n"),
    ),
  ];

  if (finding.patched.length > 0) {
    blocks.push(`### Resolved by Homebrew patches\n\n${finding.patched.map((v) => `- ${osvLink(v.id)}`).join("\n")}`);
  }

  return blocks.join("\n\n");
}

function rows(finding: VulnFinding): MetadataRow[] {
  const severities = [...new Set(finding.open.map((v) => v.severity))];
  return [
    {
      kind: "label",
      key: "severity",
      title: "Highest Severity",
      text: finding.severity,
      color: SEVERITY_COLOR[finding.severity],
    },
    { kind: "label", key: "open", title: "Open Advisories", text: String(finding.open.length) },
    ...(finding.patched.length > 0
      ? ([{ kind: "label", key: "patched", title: "Resolved by Patch", text: String(finding.patched.length) }] as const)
      : []),
    ...(finding.repoUrl
      ? ([{ kind: "link", key: "repo", title: "Repository", text: finding.repoUrl, target: finding.repoUrl }] as const)
      : []),
    {
      kind: "tags",
      key: "severities",
      title: "Severities",
      tags: severities.map((s) => ({ text: s, color: SEVERITY_COLOR[s] })),
    },
  ];
}
