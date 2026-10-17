import { Action, ActionPanel, Color, Detail, Icon, Keyboard, List, showToast, Toast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useState } from "react";
import { GEO_PERIODS, GEO_STATUS_COLORS, GEO_VIEWS } from "../constants/geo";
import { createGeoScan } from "../lib/notra";
import type {
  GeoAgentReadinessResponse,
  GeoDashboardData,
  GeoDashboardActionsProps,
  GeoDashboardItemsProps,
  GeoDashboardProps,
  GeoDashboardView,
  GeoContentBriefDetailProps,
  GeoOverviewItemsProps,
  GeoOverviewEngine,
  GeoPromptResult,
  GeoTrafficJourneyDetailProps,
  GeoTrafficSource,
} from "../types/geo";
import {
  aggregateVisibility,
  barChartMarkdown,
  chartColor,
  competitorSeries,
  lineChartMarkdown,
  trafficSeries,
} from "../utils/geo-charts";
import { summarizeVisibility } from "../utils/geo-metrics";
import {
  escapeMarkdown,
  escapeMarkdownUrl,
  formatGeoDate,
  formatInteger,
  formatModelName,
  formatPercent,
  formatPosition,
} from "../utils/geo-format";
import { notraUrl } from "../utils";
import { useGeoContentBrief, useGeoDashboard, useGeoTrafficJourney } from "../hooks/use-geo";

function DashboardActions({
  canRunScan,
  days,
  onDaysChange,
  onRefresh,
  organizationSlug,
  projectId,
}: GeoDashboardActionsProps) {
  const runScan = async () => {
    const toast = await showToast({ style: Toast.Style.Animated, title: "Starting GEO scan" });
    try {
      await createGeoScan(projectId);
      toast.style = Toast.Style.Success;
      toast.title = "GEO scan started";
      toast.message = "Refresh in a few minutes to see the new results.";
      onRefresh();
    } catch (error) {
      toast.hide();
      await showFailureToast(error, { title: "Could not start GEO scan" });
    }
  };

  return (
    <ActionPanel>
      <Action
        title="Refresh GEO Data"
        icon={Icon.ArrowClockwise}
        onAction={onRefresh}
        shortcut={Keyboard.Shortcut.Common.Refresh}
      />
      <ActionPanel.Submenu icon={Icon.Calendar} title={`Time Range: ${days} Days`}>
        {GEO_PERIODS.map((period) => (
          <Action
            key={period}
            icon={period === days ? Icon.Checkmark : Icon.Circle}
            title={`${period} Days`}
            onAction={() => onDaysChange(period)}
          />
        ))}
      </ActionPanel.Submenu>
      {canRunScan ? <Action title="Run GEO Scan" icon={Icon.Stars} onAction={runScan} /> : null}
      <Action.OpenInBrowser
        icon={Icon.Globe}
        title="Open GEO Dashboard"
        url={notraUrl(`/${organizationSlug}/geo?project=${encodeURIComponent(projectId)}`)}
        shortcut={Keyboard.Shortcut.Common.OpenWith}
      />
    </ActionPanel>
  );
}

function engineDetail(engine: GeoOverviewEngine, data: GeoDashboardData): React.ReactNode {
  const modelName = formatModelName(engine.engine);
  const chart = lineChartMarkdown(`${modelName} mention trend`, [
    { label: "Mentions", color: chartColor(0), points: aggregateVisibility(data.timeseries.points, engine.engine) },
  ]);
  return (
    <List.Item.Detail
      markdown={`## ${escapeMarkdown(modelName)}\n\n${chart}`}
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label title="Mention rate" text={formatPercent(engine.mentionRate)} />
          <List.Item.Detail.Metadata.Label title="Mentions" text={formatInteger(engine.mentions)} />
          <List.Item.Detail.Metadata.Label title="Checks" text={formatInteger(engine.checks)} />
          <List.Item.Detail.Metadata.Label title="Average position" text={formatPosition(engine.avgPosition)} />
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label title="Last checked" text={formatGeoDate(engine.lastCheckedAt)} />
        </List.Item.Detail.Metadata>
      }
    />
  );
}

function promptDetail(result: GeoPromptResult): React.ReactNode {
  const sources = result.sources.length
    ? `\n\n### Sources\n${result.sources.map((source) => `- [${escapeMarkdown(source.title || source.domain)}](${escapeMarkdownUrl(source.url)})`).join("\n")}`
    : "";
  const searchQueries = result.searchQueries.length
    ? `\n\n### Search Queries\n${result.searchQueries.map((query) => `- ${escapeMarkdown(query)}`).join("\n")}`
    : "";
  return (
    <List.Item.Detail
      markdown={`## ${escapeMarkdown(result.prompt)}\n\n${result.answer || result.excerpt || "No answer was captured."}${sources}${searchQueries}`}
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label title="Engine" text={formatModelName(result.engine)} />
          <List.Item.Detail.Metadata.Label
            title="Mentioned"
            text={{
              value: result.mentioned ? "Yes" : "No",
              color: result.mentioned ? Color.Green : Color.SecondaryText,
            }}
          />
          <List.Item.Detail.Metadata.Label title="Position" text={result.position?.toString() ?? "-"} />
          {result.sentiment ? <List.Item.Detail.Metadata.Label title="Sentiment" text={result.sentiment} /> : null}
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label title="Last checked" text={formatGeoDate(result.lastCheckedAt)} />
        </List.Item.Detail.Metadata>
      }
    />
  );
}

function readinessReportDetail(readiness: GeoAgentReadinessResponse): React.ReactNode {
  const { report } = readiness;
  if (!report) {
    return null;
  }

  const failedIssues = report.issues.filter((issue) => issue.result === "failed");
  const partialIssues = report.issues.filter((issue) => issue.result === "partial");
  const priorityIssues = [...report.issues]
    .sort((left, right) => {
      const resultPriority = { failed: 0, partial: 1 } as const;
      const tierPriority = { essential: 0, recommended: 1, bonus: 2 } as const;
      return (
        resultPriority[left.result] - resultPriority[right.result] || tierPriority[left.tier] - tierPriority[right.tier]
      );
    })
    .slice(0, 4);
  const issueSummary = priorityIssues.length
    ? priorityIssues
        .map((issue, index) => {
          const guidance = issue.recommendation ?? issue.details;
          return `${index + 1}. **${escapeMarkdown(issue.name)}**${guidance ? `\n   ${escapeMarkdown(guidance)}` : ""}`;
        })
        .join("\n\n")
    : report.status === "failed"
      ? `The readiness scan failed.${report.errorMessage ? ` ${escapeMarkdown(report.errorMessage)}` : ""}`
      : report.status === "running"
        ? "The readiness scan is still in progress."
        : "No issues found. Your site passes every eligible readiness check.";
  const scoreBreakdown = report.scoreBreakdown
    ? `\n\n### Score Breakdown\n\n- **Essential:** ${report.scoreBreakdown.essential.passing} of ${report.scoreBreakdown.essential.total} passing | ${report.scoreBreakdown.essential.earned}/${report.scoreBreakdown.essential.available} points\n- **Recommended:** ${report.scoreBreakdown.recommended.passing} of ${report.scoreBreakdown.recommended.total} passing | ${report.scoreBreakdown.recommended.earned}/${report.scoreBreakdown.recommended.available} points\n- **Bonus:** ${report.scoreBreakdown.bonus.positiveSignals} positive signals | +${report.scoreBreakdown.bonus.points} points`
    : "";
  const issueCount = [
    failedIssues.length ? `**${formatInteger(failedIssues.length)} failed**` : null,
    partialIssues.length ? `**${formatInteger(partialIssues.length)} partial**` : null,
  ]
    .filter(Boolean)
    .join(" | ");
  const remainingIssues = report.issues.length - priorityIssues.length;
  const remainingHint =
    remainingIssues > 0 ? `\n\n*${formatInteger(remainingIssues)} more issues are available in Agent Readiness.*` : "";
  const score = report.score === null ? "Score unavailable" : `${report.score} / 100`;

  return (
    <List.Item.Detail
      markdown={`# ${score}\n\n## ${escapeMarkdown(report.scoreLabel ?? "Agent Readiness")}\n\n[${escapeMarkdown(report.targetUrl)}](${escapeMarkdownUrl(report.targetUrl)}) | Scanned ${escapeMarkdown(formatGeoDate(report.scannedAt))}${issueCount ? `\n\n${issueCount}` : ""}\n\n### Fix First\n\n${issueSummary}${remainingHint}${scoreBreakdown}`}
    />
  );
}

function trafficDetail(source: GeoTrafficSource, data: GeoDashboardData): React.ReactNode {
  const points = data.traffic.points
    .filter((point) => point.source === source.source && point.visitorType === source.visitorType)
    .sort((left, right) => left.day.localeCompare(right.day))
    .map((point) => ({ label: point.day, value: point.visits }));
  const chart = lineChartMarkdown(`${source.source} traffic trend`, [
    { label: source.source, color: chartColor(0), points },
  ]);
  return (
    <List.Item.Detail
      markdown={`## ${escapeMarkdown(source.source)}\n\n${chart}`}
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label title="Visits" text={formatInteger(source.visits)} />
          <List.Item.Detail.Metadata.Label title="Pages" text={formatInteger(source.paths)} />
          <List.Item.Detail.Metadata.Label title="Markdown visits" text={formatInteger(source.markdownVisits)} />
          <List.Item.Detail.Metadata.Label title="Purpose" text={source.category} />
          <List.Item.Detail.Metadata.Label title="Agent" text={source.agent} />
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label title="Last seen" text={formatGeoDate(source.lastSeenAt)} />
        </List.Item.Detail.Metadata>
      }
    />
  );
}

function visibilityByModelMarkdown(data: GeoDashboardData): string {
  return barChartMarkdown(
    "Visibility by model",
    [...data.overview.engines]
      .sort((left, right) => right.mentionRate - left.mentionRate)
      .map((engine, index) => ({
        label: formatModelName(engine.engine),
        value: engine.mentionRate * 100,
        color: chartColor(index),
      })),
    "%",
  );
}

function projectOverviewDetail(projectName: string, data: GeoDashboardData, days: number): React.ReactNode {
  const settings = data.settings.settings;
  const visibility = summarizeVisibility(data.overview.engines);
  const modelVisibility = visibilityByModelMarkdown(data);

  return (
    <List.Item.Detail
      markdown={`# ${escapeMarkdown(settings?.companyName ?? projectName)}\n\n## ${formatPercent(visibility.rate)} visibility\n\n${formatInteger(visibility.mentions)} mentions from ${formatInteger(visibility.checks)} checks over the last ${formatInteger(days)} days. Average position: **${formatPosition(visibility.avgPosition)}**.\n\n### By Model\n\n${modelVisibility}`}
    />
  );
}

function OverviewItems({ actions, data, onViewChange }: GeoOverviewItemsProps) {
  const visibility = summarizeVisibility(data.overview.engines);
  const modelVisibility = visibilityByModelMarkdown(data);
  const promptGapCount = data.gaps.promptGaps.length;
  const searchGapCount = data.gaps.searchGaps.length;
  const gapCount = promptGapCount + searchGapCount;
  const topPromptGaps = [...data.gaps.promptGaps]
    .sort((left, right) => right.opportunity - left.opportunity)
    .slice(0, 3);
  const topSearchGaps = [...data.gaps.searchGaps]
    .sort((left, right) => (right.impressions ?? -1) - (left.impressions ?? -1))
    .slice(0, 3);
  const promptGapDetails = topPromptGaps.length
    ? `\n\n## Priority Prompt Gaps\n\n${topPromptGaps
        .map(
          (gap, index) =>
            `${index + 1}. **${escapeMarkdown(gap.title ?? gap.prompt)}**\n   ${formatPercent(gap.ownMentionRate)} own mention rate · ${formatInteger(gap.competitors.length)} competitors · ${formatInteger(gap.engines.length)} engines`,
        )
        .join("\n\n")}`
    : "";
  const searchGapDetails = topSearchGaps.length
    ? `\n\n## Search Gaps\n\n${topSearchGaps
        .map(
          (gap) =>
            `- **${escapeMarkdown(gap.title ?? gap.prompt)}**${gap.impressions === null ? "" : ` · ${formatInteger(gap.impressions)} impressions`}`,
        )
        .join("\n")}`
    : "";
  const contentGapDetail = gapCount
    ? `# ${formatInteger(gapCount)} Content ${gapCount === 1 ? "Gap" : "Gaps"}\n\nThese are topics where competitors appear but your brand has room to improve.${promptGapDetails}${searchGapDetails}\n\n*Open Content Gaps to review all opportunities.*`
    : "# No Content Gaps\n\nThe latest scan did not find any prompt or search gaps.";
  const shareChart = barChartMarkdown(
    "Share of voice",
    [...data.competitorShare.points]
      .sort((left, right) => right.mentions - left.mentions)
      .map((point, index) => ({ label: point.brand, value: point.mentions, color: chartColor(index) })),
  );

  return (
    <>
      <List.Section title="Visibility">
        <List.Item
          icon={Icon.LineChart}
          title="AI Visibility"
          subtitle={`${formatInteger(visibility.mentions)} mentions across ${formatInteger(visibility.checks)} checks, avg. position ${formatPosition(visibility.avgPosition)}`}
          accessories={[{ tag: { value: formatPercent(visibility.rate), color: Color.Purple } }]}
          detail={
            <List.Item.Detail
              markdown={`## ${formatPercent(visibility.rate)} AI Visibility\n\n${formatInteger(visibility.mentions)} mentions from ${formatInteger(visibility.checks)} checks. Average position: **${formatPosition(visibility.avgPosition)}**.\n\n${modelVisibility}`}
            />
          }
          actions={actions}
        />
        <List.Item
          icon={Icon.PieChart}
          title="Share of Voice"
          subtitle={`${data.competitorShare.points.length} tracked brands`}
          detail={<List.Item.Detail markdown={`## Share of Voice\n\n${shareChart}`} />}
          actions={actions}
        />
      </List.Section>
      {data.traffic.configured ? (
        <List.Section title="AI Traffic">
          <List.Item
            icon={Icon.BarChart}
            title="Traffic Trend"
            subtitle={`${formatInteger(data.traffic.totals.crawler)} crawler visits, ${formatInteger(data.traffic.totals.aiReferral)} AI referrals`}
            detail={
              <List.Item.Detail
                markdown={`## AI Traffic\n\n${lineChartMarkdown("AI traffic trend", [
                  trafficSeries(data.traffic.points, "crawler"),
                  trafficSeries(data.traffic.points, "ai_referral"),
                ])}`}
              />
            }
            actions={actions}
          />
        </List.Section>
      ) : null}
      <List.Section title="Improve">
        <List.Item
          icon={
            gapCount
              ? { source: Icon.LightBulb, tintColor: Color.Orange }
              : { source: Icon.CheckCircle, tintColor: Color.Green }
          }
          title="Content Gaps"
          subtitle={
            gapCount
              ? `${formatInteger(promptGapCount)} prompt ${promptGapCount === 1 ? "gap" : "gaps"}, ${formatInteger(searchGapCount)} search ${searchGapCount === 1 ? "gap" : "gaps"}`
              : "No gaps found in the latest scan"
          }
          accessories={
            gapCount ? [{ tag: { value: `${formatInteger(gapCount)} open`, color: Color.Orange } }] : undefined
          }
          detail={<List.Item.Detail markdown={contentGapDetail} />}
          actions={
            <ActionPanel>
              <Action icon={Icon.List} title="Review Content Gaps" onAction={() => onViewChange("gaps")} />
            </ActionPanel>
          }
        />
        {data.briefs.briefs.length ? (
          <List.Item
            icon={Icon.Document}
            title="Content Briefs"
            subtitle={`${formatInteger(data.briefs.briefs.length)} ${data.briefs.briefs.length === 1 ? "brief" : "briefs"} ready to review`}
            detail={
              <List.Item.Detail
                markdown={`# Content Briefs\n\nTurn validated content gaps into focused articles.\n\n## Recently Created\n\n${data.briefs.briefs
                  .slice(0, 3)
                  .map((brief) => `- **${escapeMarkdown(brief.workingTitle)}** · ${escapeMarkdown(brief.status)}`)
                  .join("\n")}`}
              />
            }
            actions={
              <ActionPanel>
                <Action icon={Icon.Document} title="Review Content Briefs" onAction={() => onViewChange("briefs")} />
              </ActionPanel>
            }
          />
        ) : null}
        {data.readiness?.report ? (
          <List.Item
            icon={{
              source:
                data.readiness.report.score !== null && data.readiness.report.score >= 80
                  ? Icon.CheckCircle
                  : Icon.ExclamationMark,
              tintColor:
                data.readiness.report.score !== null && data.readiness.report.score >= 80
                  ? Color.Green
                  : data.readiness.report.score !== null && data.readiness.report.score >= 50
                    ? Color.Orange
                    : Color.Red,
            }}
            title="Agent Readiness"
            subtitle={`${formatInteger(data.readiness.report.issues.filter((issue) => issue.result === "failed").length)} failed, ${formatInteger(data.readiness.report.issues.filter((issue) => issue.result === "partial").length)} partial`}
            accessories={
              data.readiness.report.score === null
                ? undefined
                : [
                    {
                      tag: {
                        value: `${data.readiness.report.score}/100`,
                        color:
                          data.readiness.report.score >= 80
                            ? Color.Green
                            : data.readiness.report.score >= 50
                              ? Color.Orange
                              : Color.Red,
                      },
                    },
                  ]
            }
            detail={readinessReportDetail(data.readiness)}
            actions={
              <ActionPanel>
                <Action icon={Icon.List} title="View All Readiness Issues" onAction={() => onViewChange("readiness")} />
                {data.readiness.report.reportUrl ? (
                  <Action.OpenInBrowser
                    icon={Icon.Globe}
                    title="Open Full Report"
                    url={data.readiness.report.reportUrl}
                  />
                ) : null}
              </ActionPanel>
            }
          />
        ) : null}
      </List.Section>
      <List.Section title="Tracking">
        <List.Item
          icon={Icon.Message}
          title="Prompts & Sequences"
          subtitle={`${formatInteger(data.prompts.prompts.length)} prompts across ${formatInteger(data.sequences.sequences.length)} sequences`}
          detail={
            <List.Item.Detail
              markdown={`## Prompts & Sequences\n\n- **Tracked prompts:** ${formatInteger(data.prompts.prompts.length)}\n- **Prompt sequences:** ${formatInteger(data.sequences.sequences.length)}\n- **Latest results:** ${formatInteger(data.promptResults.results.length)}\n\nPress **Enter** to browse prompts, sequences, and their latest results.`}
            />
          }
          actions={
            <ActionPanel>
              <Action icon={Icon.Message} title="View Prompts & Sequences" onAction={() => onViewChange("prompts")} />
            </ActionPanel>
          }
        />
      </List.Section>
    </>
  );
}

function GeoContentBriefDetail({ briefId, projectId }: GeoContentBriefDetailProps) {
  const { data, error, isLoading, revalidate } = useGeoContentBrief(projectId, briefId);
  const brief = data?.brief;
  const document = brief?.brief;
  const markdown = document
    ? `# ${escapeMarkdown(document.workingTitle)}\n\n**Target prompt:** ${escapeMarkdown(document.targetPrompt)}\n\n**Intent:** ${escapeMarkdown(document.intent)}\n\n**Audience:** ${escapeMarkdown(document.audience)}\n\n**Job to be done:** ${escapeMarkdown(document.jobToBeDone)}\n\n## Outline\n\n${document.sections.map((section) => `### ${escapeMarkdown(section.heading)}\n\n${escapeMarkdown(section.goal)}${section.claims.length ? `\n\n**Claims**\n${section.claims.map((claim) => `- ${escapeMarkdown(claim)}`).join("\n")}` : ""}`).join("\n\n")}\n\n## Questions to Answer\n\n${document.questionsToAnswer.map((question) => `- ${escapeMarkdown(question)}`).join("\n") || "None"}\n\n## Internal Links\n\n${document.internalLinks.map((link) => `- [${escapeMarkdown(link.anchor)}](${escapeMarkdownUrl(link.url)}): ${escapeMarkdown(link.why)}`).join("\n") || "None"}\n\n## Acceptance Checklist\n\n${document.acceptanceChecklist.map((item) => `- [ ] ${escapeMarkdown(item)}`).join("\n") || "None"}`
    : error
      ? `# Could Not Load Brief\n\n${escapeMarkdown(error.message)}`
      : "";

  return (
    <Detail
      isLoading={isLoading}
      navigationTitle={brief?.brief.workingTitle ?? "Content Brief"}
      markdown={markdown}
      metadata={
        brief ? (
          <Detail.Metadata>
            <Detail.Metadata.Label title="Status" text={brief.status} />
            <Detail.Metadata.Label title="Content type" text={brief.brief.contentSubtype} />
            <Detail.Metadata.Label title="Auto-approved" text={brief.autoApproved ? "Yes" : "No"} />
            <Detail.Metadata.Label title="Humanized" text={brief.humanized ? "Yes" : "No"} />
            <Detail.Metadata.Label title="Created" text={formatGeoDate(brief.createdAt)} />
            <Detail.Metadata.Label title="Updated" text={formatGeoDate(brief.updatedAt)} />
            {brief.completedAt ? (
              <Detail.Metadata.Label title="Completed" text={formatGeoDate(brief.completedAt)} />
            ) : null}
            {brief.error ? <Detail.Metadata.Label title="Error" text={brief.error} /> : null}
          </Detail.Metadata>
        ) : undefined
      }
      actions={
        <ActionPanel>
          {markdown ? <Action.CopyToClipboard title="Copy Content Brief" content={markdown} /> : null}
          <Action title="Refresh Brief" icon={Icon.ArrowClockwise} onAction={revalidate} />
        </ActionPanel>
      }
    />
  );
}

function GeoTrafficJourneyDetail({ days, journeyId, projectId }: GeoTrafficJourneyDetailProps) {
  const { data, error, isLoading, revalidate } = useGeoTrafficJourney(projectId, journeyId, days);
  const markdown = data
    ? `# AI Traffic Journey\n\n${data.events
        .map(
          (event) =>
            `## ${escapeMarkdown(event.method)} ${escapeMarkdown(event.path)}\n\n- **Captured:** ${escapeMarkdown(formatGeoDate(event.capturedAt))}\n- **Host:** ${escapeMarkdown(event.host)}\n- **Agent:** ${escapeMarkdown(event.agent)}\n- **Category:** ${escapeMarkdown(event.category)}\n- **Country:** ${escapeMarkdown(event.country)}${event.referer ? `\n- **Referrer:** ${escapeMarkdown(event.referer)}` : ""}`,
        )
        .join("\n\n")}`
    : error
      ? `# Could Not Load Journey\n\n${escapeMarkdown(error.message)}`
      : "";

  return (
    <Detail
      isLoading={isLoading}
      navigationTitle="AI Traffic Journey"
      markdown={markdown}
      actions={
        <ActionPanel>
          {markdown ? <Action.CopyToClipboard title="Copy Journey" content={markdown} /> : null}
          <Action title="Refresh Journey" icon={Icon.ArrowClockwise} onAction={revalidate} />
        </ActionPanel>
      }
    />
  );
}

function DashboardItems({ actions, data, days, onViewChange, projectId, view }: GeoDashboardItemsProps) {
  if (view === "overview") {
    return <OverviewItems actions={actions} data={data} onViewChange={onViewChange} />;
  }

  if (view === "visibility") {
    return (
      <List.Section title="Visibility by Engine">
        {[...data.overview.engines]
          .sort((left, right) => right.mentionRate - left.mentionRate)
          .map((engine) => (
            <List.Item
              key={engine.engine}
              icon={Icon.Stars}
              title={formatModelName(engine.engine)}
              subtitle={`${formatInteger(engine.mentions)} mentions`}
              accessories={[{ text: `${formatPercent(engine.mentionRate)} mention rate` }]}
              detail={engineDetail(engine, data)}
              actions={actions}
            />
          ))}
      </List.Section>
    );
  }

  if (view === "share") {
    const points = [...data.competitorShare.points].sort((left, right) => right.mentions - left.mentions);
    const chart = barChartMarkdown(
      "Share of voice",
      points.map((point, index) => ({ label: point.brand, value: point.mentions, color: chartColor(index) })),
    );
    return (
      <>
        <List.Section title="Tracked Competitors">
          {data.competitors.competitors.map((competitor) => (
            <List.Item
              key={competitor.id}
              icon={{ source: Icon.Building, tintColor: competitor.color ?? undefined }}
              title={competitor.name}
              subtitle={competitor.domain ?? competitor.kind}
              accessories={[{ tag: competitor.kind }]}
              detail={
                <List.Item.Detail
                  markdown={`## ${escapeMarkdown(competitor.name)}\n\n${competitor.domain ? `[${escapeMarkdown(competitor.domain)}](https://${escapeMarkdownUrl(competitor.domain)})` : "No website recorded."}${competitor.synonyms.length ? `\n\n### Synonyms\n${competitor.synonyms.map((synonym) => `- ${escapeMarkdown(synonym)}`).join("\n")}` : ""}`}
                />
              }
              actions={actions}
            />
          ))}
        </List.Section>
        <List.Section title="Share of Voice">
          {points.map((point, index) => {
            const trend = lineChartMarkdown(`${point.brand} share of voice`, [
              {
                label: point.brand,
                color: chartColor(index),
                points: competitorSeries(data.competitorShare.timeseries, point.brand),
              },
            ]);
            return (
              <List.Item
                key={point.brand}
                icon={Icon.PieChart}
                title={point.brand}
                accessories={[{ text: `${formatInteger(point.mentions)} mentions` }]}
                detail={
                  <List.Item.Detail
                    markdown={`## ${escapeMarkdown(point.brand)}\n\n${trend}\n\n### Overall Share of Voice\n\n${chart}`}
                  />
                }
                actions={actions}
              />
            );
          })}
        </List.Section>
      </>
    );
  }

  if (view === "languages") {
    return (
      <List.Section title="Performance by Language">
        {[...data.languageShare.points]
          .sort((left, right) => right.mentionRate - left.mentionRate)
          .map((point, index) => {
            const chart = lineChartMarkdown(`${point.language} mention rate trend`, [
              {
                label: point.language,
                color: chartColor(index),
                points: (point.trend ?? []).map((trendPoint) => ({
                  label: trendPoint.day,
                  value: trendPoint.value * 100,
                })),
              },
            ]);
            return (
              <List.Item
                key={point.language}
                icon={Icon.Globe}
                title={point.language}
                subtitle={`${formatInteger(point.mentions)} mentions`}
                accessories={[{ text: formatPercent(point.mentionRate) }]}
                detail={
                  <List.Item.Detail
                    markdown={`## ${escapeMarkdown(point.language)}\n\n${chart}`}
                    metadata={
                      <List.Item.Detail.Metadata>
                        <List.Item.Detail.Metadata.Label title="Mention rate" text={formatPercent(point.mentionRate)} />
                        <List.Item.Detail.Metadata.Label title="Mentions" text={formatInteger(point.mentions)} />
                        <List.Item.Detail.Metadata.Label title="Checks" text={formatInteger(point.checks)} />
                        <List.Item.Detail.Metadata.Label
                          title="Average position"
                          text={formatPosition(point.avgPosition)}
                        />
                      </List.Item.Detail.Metadata>
                    }
                  />
                }
                actions={actions}
              />
            );
          })}
      </List.Section>
    );
  }

  if (view === "prompts") {
    return (
      <>
        <List.Section title="Tracked Prompts">
          {data.prompts.prompts.map((prompt) => (
            <List.Item
              key={prompt.id}
              icon={prompt.enabled ? { source: Icon.Message, tintColor: Color.Green } : Icon.Message}
              title={prompt.prompt}
              subtitle={prompt.source === "auto" ? "Generated by Notra" : "Custom prompt"}
              accessories={[{ tag: prompt.enabled ? "Active" : "Paused" }]}
              detail={
                <List.Item.Detail
                  markdown={`## ${escapeMarkdown(prompt.prompt)}`}
                  metadata={
                    <List.Item.Detail.Metadata>
                      <List.Item.Detail.Metadata.Label title="Source" text={prompt.source} />
                      <List.Item.Detail.Metadata.Label title="Status" text={prompt.enabled ? "Active" : "Paused"} />
                      <List.Item.Detail.Metadata.Label title="Created" text={formatGeoDate(prompt.createdAt)} />
                    </List.Item.Detail.Metadata>
                  }
                />
              }
              actions={actions}
            />
          ))}
        </List.Section>
        <List.Section title="Prompt Sequences">
          {data.sequences.sequences.map((sequence) => (
            <List.Item
              key={sequence.id}
              icon={sequence.enabled ? { source: Icon.List, tintColor: Color.Green } : Icon.List}
              title={sequence.name}
              subtitle={`${formatInteger(sequence.steps.length)} conversational steps`}
              accessories={[{ tag: sequence.enabled ? "Active" : "Paused" }]}
              detail={
                <List.Item.Detail
                  markdown={`## ${escapeMarkdown(sequence.name)}\n\n${sequence.steps.map((step, index) => `${index + 1}. ${escapeMarkdown(step)}`).join("\n")}`}
                  metadata={
                    <List.Item.Detail.Metadata>
                      <List.Item.Detail.Metadata.Label title="Steps" text={formatInteger(sequence.steps.length)} />
                      <List.Item.Detail.Metadata.Label title="Status" text={sequence.enabled ? "Active" : "Paused"} />
                      <List.Item.Detail.Metadata.Label title="Created" text={formatGeoDate(sequence.createdAt)} />
                    </List.Item.Detail.Metadata>
                  }
                />
              }
              actions={actions}
            />
          ))}
        </List.Section>
        <List.Section title="Latest Results">
          {data.promptResults.results.map((result) => (
            <List.Item
              key={`${result.promptId}:${result.engine}`}
              icon={result.mentioned ? { source: Icon.CheckCircle, tintColor: Color.Green } : Icon.Circle}
              title={result.prompt}
              subtitle={formatModelName(result.engine)}
              accessories={result.position ? [{ tag: `#${result.position}` }] : undefined}
              detail={promptDetail(result)}
              actions={actions}
            />
          ))}
        </List.Section>
      </>
    );
  }

  if (view === "gaps") {
    const maxOpportunity = Math.max(...data.gaps.promptGaps.map((gap) => gap.opportunity), 0);
    return (
      <>
        <List.Section title="Prompt Opportunities">
          {[...data.gaps.promptGaps]
            .sort((left, right) => right.opportunity - left.opportunity)
            .map((gap) => {
              const opportunity = maxOpportunity === 0 ? 0 : gap.opportunity / maxOpportunity;
              return (
                <List.Item
                  key={gap.id}
                  icon={Icon.LightBulb}
                  title={gap.title ?? gap.prompt}
                  subtitle={`${gap.competitors.length} competitors across ${gap.engines.length} engines`}
                  accessories={[{ tag: `${Math.round(opportunity * 100)}% opportunity` }]}
                  detail={
                    <List.Item.Detail
                      markdown={`## ${escapeMarkdown(gap.title ?? gap.prompt)}\n\n${gap.title ? `**Prompt:** ${escapeMarkdown(gap.prompt)}\n\n` : ""}### Competitors\n${gap.competitors.map((competitor) => `- ${escapeMarkdown(competitor)}`).join("\n") || "None"}\n\n### Engines\n${gap.engines.map((engine) => `- ${escapeMarkdown(formatModelName(engine))}`).join("\n") || "None"}`}
                      metadata={
                        <List.Item.Detail.Metadata>
                          <List.Item.Detail.Metadata.Label
                            title="Relative opportunity"
                            text={formatPercent(opportunity)}
                          />
                          <List.Item.Detail.Metadata.Label
                            title="Own mention rate"
                            text={formatPercent(gap.ownMentionRate)}
                          />
                          <List.Item.Detail.Metadata.Label
                            title="Engine checks"
                            text={formatInteger(gap.engineCoverage)}
                          />
                          {gap.brief ? <List.Item.Detail.Metadata.Label title="Brief" text={gap.brief.status} /> : null}
                        </List.Item.Detail.Metadata>
                      }
                    />
                  }
                  actions={actions}
                />
              );
            })}
        </List.Section>
        <List.Section title="Search Opportunities">
          {data.gaps.searchGaps.map((gap) => (
            <List.Item
              key={gap.id}
              icon={Icon.MagnifyingGlass}
              title={gap.title ?? gap.prompt}
              subtitle={gap.title ? gap.prompt : undefined}
              accessories={
                gap.impressions === null ? undefined : [{ text: `${formatInteger(gap.impressions)} impressions` }]
              }
              detail={
                <List.Item.Detail
                  markdown={`## ${escapeMarkdown(gap.title ?? gap.prompt)}${gap.title ? `\n\n**Search query:** ${escapeMarkdown(gap.prompt)}` : ""}`}
                  metadata={
                    <List.Item.Detail.Metadata>
                      {gap.impressions !== null ? (
                        <List.Item.Detail.Metadata.Label title="Impressions" text={formatInteger(gap.impressions)} />
                      ) : null}
                      {gap.brief ? <List.Item.Detail.Metadata.Label title="Brief" text={gap.brief.status} /> : null}
                    </List.Item.Detail.Metadata>
                  }
                />
              }
              actions={actions}
            />
          ))}
        </List.Section>
      </>
    );
  }

  if (view === "briefs") {
    return (
      <List.Section title="Content Briefs">
        {data.briefs.briefs.map((brief) => (
          <List.Item
            key={brief.id}
            icon={brief.postId ? { source: Icon.Document, tintColor: Color.Green } : Icon.Document}
            title={brief.workingTitle}
            subtitle={brief.topic}
            accessories={[{ tag: brief.status }, { date: new Date(brief.createdAt) }]}
            detail={
              <List.Item.Detail
                markdown={`## ${escapeMarkdown(brief.workingTitle)}\n\n**Topic:** ${escapeMarkdown(brief.topic)}`}
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label title="Status" text={brief.status} />
                    <List.Item.Detail.Metadata.Label title="Created" text={formatGeoDate(brief.createdAt)} />
                    {brief.postId ? <List.Item.Detail.Metadata.Label title="Article" text="Created" /> : null}
                  </List.Item.Detail.Metadata>
                }
              />
            }
            actions={
              <ActionPanel>
                <Action.Push
                  icon={Icon.Document}
                  title="Open Full Content Brief"
                  target={<GeoContentBriefDetail briefId={brief.id} projectId={projectId} />}
                />
                <Action.OpenInBrowser
                  icon={Icon.Globe}
                  title="Open GEO Writer"
                  url={notraUrl(`/${data.briefs.organization.slug}/geo/write?project=${encodeURIComponent(projectId)}`)}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    );
  }

  if (view === "readiness") {
    const report = data.readiness?.report;
    const activeScan = data.readiness?.scan;
    return (
      <>
        {report ? (
          <List.Section title="Latest Report">
            <List.Item
              icon={{
                source: report.score !== null && report.score >= 80 ? Icon.CheckCircle : Icon.ExclamationMark,
                tintColor:
                  report.score === null
                    ? Color.SecondaryText
                    : report.score >= 80
                      ? Color.Green
                      : report.score >= 50
                        ? Color.Orange
                        : Color.Red,
              }}
              title="Agent Readiness"
              subtitle={`${formatInteger(report.issues.filter((issue) => issue.result === "failed").length)} failed, ${formatInteger(report.issues.filter((issue) => issue.result === "partial").length)} partial`}
              accessories={
                report.score === null
                  ? undefined
                  : [
                      {
                        tag: {
                          value: `${report.score}/100`,
                          color: report.score >= 80 ? Color.Green : report.score >= 50 ? Color.Orange : Color.Red,
                        },
                      },
                    ]
              }
              detail={data.readiness ? readinessReportDetail(data.readiness) : undefined}
              actions={actions}
            />
          </List.Section>
        ) : null}
        {activeScan ? (
          <List.Section title="Current Scan">
            <List.Item
              icon={Icon.CircleProgress}
              title="Readiness scan in progress"
              subtitle={activeScan.targetUrl}
              accessories={[{ tag: activeScan.status }]}
              actions={actions}
            />
          </List.Section>
        ) : null}
        <List.Section title="Issues">
          {(report?.issues ?? []).map((issue) => (
            <List.Item
              key={issue.id}
              icon={{
                source: issue.result === "failed" ? Icon.XMarkCircle : Icon.Circle,
                tintColor: issue.result === "failed" ? Color.Red : Color.Orange,
              }}
              title={issue.name}
              subtitle={issue.details ?? issue.tier}
              accessories={[{ tag: issue.tier }]}
              detail={
                <List.Item.Detail
                  markdown={`## ${escapeMarkdown(issue.name)}\n\n${escapeMarkdown(issue.details ?? "This check needs attention.")}${issue.recommendation ? `\n\n### Recommendation\n${escapeMarkdown(issue.recommendation)}` : ""}`}
                  metadata={
                    <List.Item.Detail.Metadata>
                      <List.Item.Detail.Metadata.Label title="Tier" text={issue.tier} />
                      <List.Item.Detail.Metadata.Label title="Result" text={issue.result} />
                    </List.Item.Detail.Metadata>
                  }
                />
              }
              actions={actions}
            />
          ))}
        </List.Section>
        <List.Section title="Score History">
          {(data.readiness?.history ?? []).toReversed().map((point) => (
            <List.Item
              key={point.id}
              icon={Icon.LineChart}
              title={formatGeoDate(point.scannedAt)}
              subtitle={`${formatInteger(point.failedCount)} failed, ${formatInteger(point.partialCount)} partial`}
              accessories={point.score === null ? undefined : [{ tag: `${point.score}/100` }]}
              actions={actions}
            />
          ))}
        </List.Section>
      </>
    );
  }

  if (view === "settings") {
    const settings = data.settings.settings;
    if (!settings) {
      return null;
    }

    const trafficSetup = data.ingestSetup
      ? `\n\n### AI Traffic Setup\n\n**Ingest URL:** ${escapeMarkdown(data.ingestSetup.ingestUrl)}\n\n#### Next.js\n\`\`\`tsx\n${data.ingestSetup.snippets.next}\n\`\`\`\n\n#### Nuxt\n\`\`\`ts\n${data.ingestSetup.snippets.nuxt}\n\`\`\`\n\n#### Netlify\n\`\`\`ts\n${data.ingestSetup.snippets.netlify}\n\`\`\``
      : "";
    return (
      <List.Section title="Tracking Configuration">
        <List.Item
          icon={Icon.Gear}
          title={settings.companyName}
          subtitle={`${formatInteger(settings.engines.length)} engines, ${formatInteger(settings.languages.length)} languages`}
          accessories={[{ tag: settings.enabled ? "Live" : "Paused" }]}
          detail={
            <List.Item.Detail
              markdown={`## ${escapeMarkdown(settings.companyName)}\n\n### Engines\n${settings.engines.map((engine) => `- ${escapeMarkdown(formatModelName(engine))}`).join("\n") || "None"}\n\n### Languages\n${settings.languages.map((language) => `- ${escapeMarkdown(language)}`).join("\n") || "None"}\n\n### Brand Aliases\n${settings.aliases.map((alias) => `- ${escapeMarkdown(alias)}`).join("\n") || "None"}\n\n### Approved Non-ZDR Engines\n${settings.nonZdrApprovedEngines.map((engine) => `- ${escapeMarkdown(formatModelName(engine))}`).join("\n") || "None"}${trafficSetup}`}
              metadata={
                <List.Item.Detail.Metadata>
                  <List.Item.Detail.Metadata.Label title="Status" text={settings.enabled ? "Live" : "Paused"} />
                  <List.Item.Detail.Metadata.Label title="Scan interval" text={`${settings.scanIntervalHours} hours`} />
                  <List.Item.Detail.Metadata.Label
                    title="Zero data retention"
                    text={settings.enforceZdr ? "Required" : "Optional"}
                  />
                  <List.Item.Detail.Metadata.Label title="Last scan" text={formatGeoDate(settings.lastScanAt)} />
                  <List.Item.Detail.Metadata.Label title="Updated" text={formatGeoDate(settings.updatedAt)} />
                </List.Item.Detail.Metadata>
              }
            />
          }
          actions={actions}
        />
      </List.Section>
    );
  }

  if (!data.traffic.configured) {
    return null;
  }

  return (
    <>
      <List.Section title="Traffic Summary">
        <List.Item
          icon={Icon.Binoculars}
          title="AI Crawlers"
          accessories={[{ text: formatInteger(data.traffic.totals.crawler) }]}
          detail={
            <List.Item.Detail
              markdown={`## AI Traffic\n\n${lineChartMarkdown("AI traffic trend", [trafficSeries(data.traffic.points, "crawler"), trafficSeries(data.traffic.points, "ai_referral")])}`}
            />
          }
          actions={actions}
        />
        <List.Item
          icon={Icon.Link}
          title="AI Referrals"
          accessories={[{ text: formatInteger(data.traffic.totals.aiReferral) }]}
          detail={
            <List.Item.Detail
              markdown={`## AI Traffic\n\n${lineChartMarkdown("AI traffic trend", [trafficSeries(data.traffic.points, "crawler"), trafficSeries(data.traffic.points, "ai_referral")])}`}
            />
          }
          actions={actions}
        />
      </List.Section>
      <List.Section title="Sources">
        {[...data.traffic.sources]
          .sort((left, right) => right.visits - left.visits)
          .map((source) => (
            <List.Item
              key={`${source.visitorType}:${source.source}:${source.agent}:${source.category}`}
              icon={source.visitorType === "crawler" ? Icon.Binoculars : Icon.Link}
              title={source.source}
              subtitle={source.category}
              accessories={[{ text: `${formatInteger(source.visits)} visits` }]}
              detail={trafficDetail(source, data)}
              actions={actions}
            />
          ))}
      </List.Section>
      <List.Section title="Top Pages">
        {[...data.trafficPages.pages]
          .sort((left, right) => right.visits - left.visits)
          .map((page) => (
            <List.Item
              key={`${page.visitorType}:${page.source}:${page.path}`}
              icon={page.visitorType === "crawler" ? Icon.Binoculars : Icon.Link}
              title={page.path}
              subtitle={page.source}
              accessories={[{ text: `${formatInteger(page.visits)} visits` }]}
              detail={
                <List.Item.Detail
                  markdown={`## ${escapeMarkdown(page.path)}\n\nSeen through ${escapeMarkdown(page.source)}.`}
                  metadata={
                    <List.Item.Detail.Metadata>
                      <List.Item.Detail.Metadata.Label title="Visits" text={formatInteger(page.visits)} />
                      {page.previousVisits !== undefined ? (
                        <List.Item.Detail.Metadata.Label
                          title="Previous period"
                          text={formatInteger(page.previousVisits)}
                        />
                      ) : null}
                      <List.Item.Detail.Metadata.Label title="Visitor" text={page.visitorType} />
                      <List.Item.Detail.Metadata.Label title="Last seen" text={formatGeoDate(page.lastSeenAt)} />
                    </List.Item.Detail.Metadata>
                  }
                />
              }
              actions={actions}
            />
          ))}
      </List.Section>
      <List.Section title="Journeys">
        {data.trafficJourneys.journeys.map((journey) => (
          <List.Item
            key={journey.journeyId}
            icon={Icon.Footprints}
            title={journey.source}
            subtitle={`${formatInteger(journey.distinctPaths)} distinct paths`}
            accessories={[{ text: `${formatInteger(journey.pages)} pages` }]}
            detail={
              <List.Item.Detail
                markdown={`## ${escapeMarkdown(journey.source)} Journey\n\n### Sample Paths\n${journey.samplePaths.map((path) => `- ${escapeMarkdown(path)}`).join("\n") || "None"}`}
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label title="Pages" text={formatInteger(journey.pages)} />
                    <List.Item.Detail.Metadata.Label
                      title="Distinct paths"
                      text={formatInteger(journey.distinctPaths)}
                    />
                    <List.Item.Detail.Metadata.Label title="Visitor" text={journey.visitorType} />
                    <List.Item.Detail.Metadata.Label title="First seen" text={formatGeoDate(journey.firstSeenAt)} />
                    <List.Item.Detail.Metadata.Label title="Last seen" text={formatGeoDate(journey.lastSeenAt)} />
                  </List.Item.Detail.Metadata>
                }
              />
            }
            actions={
              <ActionPanel>
                <Action.Push
                  icon={Icon.List}
                  title="Open Journey Events"
                  target={<GeoTrafficJourneyDetail days={days} journeyId={journey.journeyId} projectId={projectId} />}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
      <List.Section title="Recent Requests" subtitle={`${formatInteger(data.trafficLog.total)} total`}>
        {data.trafficLog.log.map((entry, index) => (
          <List.Item
            key={`${entry.journeyId}:${entry.capturedAt}:${index}`}
            icon={entry.visitorType === "crawler" ? Icon.Binoculars : Icon.Link}
            title={entry.path}
            subtitle={`${entry.source} - ${entry.country}`}
            accessories={[{ date: new Date(entry.capturedAt) }]}
            detail={
              <List.Item.Detail
                markdown={`## ${escapeMarkdown(entry.path)}\n\n${escapeMarkdown(entry.ua)}`}
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label title="Source" text={entry.source} />
                    <List.Item.Detail.Metadata.Label title="Agent" text={entry.agent} />
                    <List.Item.Detail.Metadata.Label title="Category" text={entry.category} />
                    <List.Item.Detail.Metadata.Label title="Confidence" text={entry.confidence} />
                    <List.Item.Detail.Metadata.Label title="Country" text={entry.country} />
                    <List.Item.Detail.Metadata.Label title="Markdown" text={entry.wantsMarkdown ? "Requested" : "No"} />
                    <List.Item.Detail.Metadata.Label title="Captured" text={formatGeoDate(entry.capturedAt)} />
                  </List.Item.Detail.Metadata>
                }
              />
            }
            actions={actions}
          />
        ))}
      </List.Section>
    </>
  );
}

export function GeoDashboard({ organization, project }: GeoDashboardProps) {
  const [view, setView] = useState<GeoDashboardView>("overview");
  const [days, setDays] = useState(30);
  const { data, error, isLoading, revalidate } = useGeoDashboard(project.id, days);
  const settings = data?.settings.settings;
  const statusTag = settings
    ? settings.isScanning
      ? { value: "Scanning", color: GEO_STATUS_COLORS.scanning }
      : settings.enabled
        ? { value: "Live", color: GEO_STATUS_COLORS.configured }
        : { value: "Paused", color: GEO_STATUS_COLORS.disabled }
    : null;
  const availableViews = GEO_VIEWS.filter(
    (item) =>
      (item.value !== "traffic" || data?.traffic.configured) &&
      (item.value !== "readiness" || data?.readiness) &&
      (item.value !== "settings" || settings),
  );
  const visibleView = availableViews.some((item) => item.value === view) ? view : "overview";
  const actions = (
    <DashboardActions
      canRunScan={Boolean(settings?.enabled && !settings.isScanning)}
      days={days}
      onDaysChange={setDays}
      onRefresh={revalidate}
      organizationSlug={organization.slug}
      projectId={project.id}
    />
  );

  return (
    <List
      isLoading={isLoading}
      isShowingDetail
      navigationTitle={`${project.name} GEO`}
      searchBarAccessory={
        <List.Dropdown tooltip="GEO View" value={visibleView} onChange={(value) => setView(value as GeoDashboardView)}>
          {availableViews.map((item) => (
            <List.Dropdown.Item key={item.value} icon={item.icon} title={item.title} value={item.value} />
          ))}
        </List.Dropdown>
      }
    >
      {error ? (
        <List.EmptyView icon={Icon.Warning} title="Could Not Load GEO" description={error.message} actions={actions} />
      ) : data && data.errors.length === 0 && data.configured === false && !isLoading ? (
        <List.EmptyView
          icon={Icon.Gauge}
          title="GEO Is Not Configured"
          description="Set up this project in Notra before viewing its analytics."
          actions={actions}
        />
      ) : data ? (
        <>
          {data.errors.length > 0 ? (
            <List.Section title="Incomplete Data">
              <List.Item
                icon={{ source: Icon.Warning, tintColor: Color.Orange }}
                title="Some GEO Data Could Not Load"
                subtitle={`${data.errors.length} of 17 API sections unavailable`}
                accessories={[{ tag: { value: "Partial", color: Color.Orange } }]}
                detail={
                  <List.Item.Detail
                    markdown={`## Incomplete GEO Data\n\nThe available analytics are shown below, but these sections could not be loaded:\n\n${data.errors.map((message) => `- ${escapeMarkdown(message)}`).join("\n")}\n\nRefresh to try loading the missing data again.`}
                  />
                }
                actions={actions}
              />
            </List.Section>
          ) : null}
          <List.Section title={project.name} subtitle={`${days} days`}>
            <List.Item
              icon={data.settings.settings?.isScanning ? Icon.CircleProgress : Icon.Gauge}
              title={data.settings.settings?.companyName ?? project.name}
              subtitle={`Last scan: ${formatGeoDate(data.settings.settings?.lastScanAt ?? null)}`}
              accessories={statusTag ? [{ tag: { value: statusTag.value, color: statusTag.color } }] : undefined}
              detail={projectOverviewDetail(project.name, data, days)}
              actions={actions}
            />
          </List.Section>
          <DashboardItems
            actions={actions}
            data={data}
            days={days}
            onViewChange={setView}
            projectId={project.id}
            view={visibleView}
          />
        </>
      ) : null}
    </List>
  );
}
