import {
  Detail,
  ActionPanel,
  Form,
  Action,
  Icon,
  Color,
  showToast,
  Toast,
  getPreferenceValues,
  useNavigation,
  AI,
  Keyboard,
  openCommandPreferences,
} from '@raycast/api';
import {
  useForm,
  FormValidation,
  usePromise,
  runAppleScript,
} from '@raycast/utils';
import React, { useState, useEffect, useMemo, useRef } from 'react';
import * as nodeOs from 'node:os';
import {
  runLighthouseAudit,
  LighthouseReport,
  LighthouseOptions,
  processUrl,
} from './utils/lighthouse';
import {
  extractOpportunities,
  extractFailedAudits,
  extractSeoFields,
  extractVitals,
  extractCategoryScores,
  getStatusIcon,
  formatScore,
  formatRating,
  formatSavings,
  escapeMarkdownCell,
  getAuditScore,
  isFailed,
  type OpportunityInfo,
} from './utils/report';
import {
  DASHBOARD_W,
  buildScorecard,
  loadingDashboardSvg,
} from './utils/charts';
import { mdImg } from './utils/svg';
import {
  canShareScorecardImage,
  shareScorecardImage,
} from './utils/scorecard-image';

interface FormValues {
  url: string;
  device: 'mobile' | 'desktop';
  performance: boolean;
  accessibility: boolean;
  bestPractices: boolean;
  seo: boolean;
  outputPath: string;
}

const SCORE_COLORS: { threshold: number; color: Color }[] = [
  { threshold: 0.9, color: Color.Green },
  { threshold: 0.5, color: Color.Yellow },
  { threshold: 0, color: Color.Red },
];

function getScoreColor(score: number): Color {
  return SCORE_COLORS.find(s => score >= s.threshold)?.color ?? Color.Red;
}

function getHostname(url: string): string {
  try {
    return new URL(processUrl(url)).hostname;
  } catch {
    return url;
  }
}

const PROGRESS_PHASES = [
  { upTo: 20, text: 'Preparing environment and resolving DNS...' },
  { upTo: 45, text: 'Measuring performance and critical times...' },
  { upTo: 70, text: 'Auditing accessibility and best practices...' },
  { upTo: 90, text: 'Evaluating SEO and metadata...' },
  { upTo: 99, text: 'Compiling report...' },
  { upTo: 100, text: 'Ready: presenting results' },
] as const;

const PERF_METRICS = [
  {
    id: 'largest-contentful-paint',
    title: 'LCP (Largest Contentful Paint)',
    bench: '< 2.5s',
  },
  {
    id: 'interaction-to-next-paint',
    title: 'INP (Interaction to Next Paint)',
    bench: '< 200ms',
  },
  {
    id: 'total-blocking-time',
    title: 'TBT (Total Blocking Time)',
    bench: '< 200ms',
  },
  { id: 'speed-index', title: 'Speed Index', bench: '< 3.4s' },
  {
    id: 'first-contentful-paint',
    title: 'FCP (First Contentful Paint)',
    bench: '< 1.8s',
  },
  {
    id: 'server-response-time',
    title: 'TTFB (Time to First Byte)',
    bench: '< 0.8s',
  },
  {
    id: 'cumulative-layout-shift',
    title: 'CLS (Cumulative Layout Shift)',
    bench: '< 0.1',
  },
  { id: 'main-thread-tasks', title: 'Main Thread Work', bench: '< 2s' },
  { id: 'total-byte-weight', title: 'Total Byte Weight', bench: '< 1.6MB' },
] as const;

const DIAGNOSTICS = [
  { id: 'dom-size', label: 'DOM Size (nodes)' },
  { id: 'unused-javascript', label: 'Unused JavaScript' },
  { id: 'unused-css-rules', label: 'Unused CSS' },
  { id: 'third-party-summary', label: 'Third-Party Blocking Time' },
  { id: 'offscreen-images', label: 'Offscreen Images' },
] as const;

const DESC_MAP: Record<string, string> = {
  interactive:
    'Time to Interactive is the time it takes for the page to become fully interactive.',
  'first-contentful-paint':
    'First Contentful Paint marks when the first text or image is painted.',
  'largest-contentful-paint':
    'Largest Contentful Paint marks when the largest text or image is painted.',
  'speed-index':
    'Speed Index shows how quickly the contents of a page are visibly populated.',
  'total-blocking-time':
    'Total Blocking Time measures how long the main thread was blocked by long tasks.',
  'cumulative-layout-shift':
    'Cumulative Layout Shift measures unexpected layout shift that affects visual stability.',
  'main-thread-tasks':
    'Main Thread Work measures time spent in JavaScript and style/layout tasks.',
  'total-byte-weight':
    'Total Byte Weight is the combined download size of all page resources.',
};

function DetailedAuditsView({ report }: { report: LighthouseReport }) {
  const markdown = useMemo(() => {
    let md = `# Detailed Field Guide\n\n`;

    const categories = [
      { id: 'performance', title: 'Performance' },
      { id: 'accessibility', title: 'Accessibility' },
      { id: 'best-practices', title: 'Best Practices' },
      { id: 'seo', title: 'SEO' },
    ];

    categories.forEach(cat => {
      md += `## ${cat.title}\n\n`;
      const categoryAudits =
        report.categories?.[cat.id as keyof typeof report.categories]
          ?.auditRefs || [];
      const audits = categoryAudits
        .map(ref => report.audits?.[ref.id])
        .filter((a): a is NonNullable<typeof a> => !!a && isFailed(a))
        .sort((a, b) => getAuditScore(a) - getAuditScore(b));

      if (audits.length === 0) {
        md += `_No issues found in this category._\n\n`;
      } else {
        md += `| Status | Field | Description |\n|:---:|:---|:---|\n`;
        audits.forEach(audit => {
          const score = getAuditScore(audit);
          const statusIcon = score >= 0.9 ? '🟢' : score >= 0.5 ? '🟡' : '🔴';
          const descKey = (audit.id || '').replace(/_/g, '-');
          const cleanDesc =
            DESC_MAP[descKey] ||
            audit.description
              ?.replace(/\[Learn more\].*/, '')
              .replace(/<br\s*\/?>/gi, ' ') ||
            '';
          md += `| ${statusIcon} | **${escapeMarkdownCell(audit.title)}** | ${escapeMarkdownCell(cleanDesc)} |\n`;
        });
        md += '\n';
      }
    });

    return md;
  }, [report]);

  return <Detail markdown={markdown} />;
}

function LighthouseReportView({
  reportPath,
  report,
  originalUrl,
  fromCache,
  onReanalyze,
}: {
  reportPath: string;
  report: LighthouseReport;
  originalUrl: string;
  fromCache: boolean;
  onReanalyze: () => void;
}) {
  const [aiAnalysis, setAiAnalysis] = useState<string>('');
  const [isAiLoading, setIsAiLoading] = useState(false);

  const hostname = getHostname(originalUrl);
  const scorecardSvg = useMemo(
    () => buildScorecard(report, hostname, fromCache),
    [report, hostname, fromCache]
  );

  const generateMarkdownContent = useMemo(() => {
    return (): string => {
      let markdown = `${mdImg(scorecardSvg, `Lighthouse ${hostname}`, DASHBOARD_W)}\n\n`;

      if (aiAnalysis) {
        markdown += `> [!TIP]\n> **AI Insights**\n>\n${aiAnalysis
          .split('\n')
          .map(l => `> ${l}`)
          .join('\n')}\n\n---\n\n`;
      } else if (isAiLoading) {
        markdown += `> [!NOTE]\n> **AI is analyzing findings...**\n\n---\n\n`;
      }

      if (fromCache) {
        markdown += `> [!NOTE]\n> Loaded from cache (24h TTL). Use **Re-analyze** to force a fresh audit.\n\n`;
      }

      markdown += `## Performance & Core Metrics (Critical)\n\n`;
      markdown += `| Status | Metric | Value | Benchmark |\n| :---: | :--- | :--- | :--- |\n`;
      PERF_METRICS.forEach(m => {
        const audit = report.audits?.[m.id];
        if (audit) {
          markdown += `| ${getStatusIcon(audit.score)} | ${m.title} | **${escapeMarkdownCell(audit.displayValue)}** | \`${m.bench}\` |\n`;
        }
      });

      markdown += `\n## SEO & Accessibility (Marketing)\n\n`;
      markdown += `| Status | Field | Value |\n|:---:|:---|:---|\n`;
      const seoScore = report.categories?.seo?.score;
      const accScore = report.categories?.accessibility?.score;
      if (seoScore !== undefined) {
        markdown += `| ${getStatusIcon(seoScore)} | SEO (score) | ${formatScore(seoScore)}% |\n`;
      }
      if (accScore !== undefined) {
        markdown += `| ${getStatusIcon(accScore)} | Accessibility (score) | ${formatScore(accScore)}% |\n`;
      }

      const seoFields = extractSeoFields(report);
      seoFields.forEach(f => {
        const extra =
          f.id === 'structured-data' && f.structuredDataTypes?.length
            ? ` (${f.structuredDataTypes.join(', ')})`
            : '';
        markdown += `| ${getStatusIcon(f.score)} | ${f.label} | ${escapeMarkdownCell(f.displayValue || f.label)}${extra} |\n`;
      });

      const opportunities = extractOpportunities(report, 5);
      if (opportunities.length > 0) {
        markdown += `\n## Priority Opportunities (High ROI)\n`;
        markdown += `| Status | Audit | Estimated Savings | Items |\n|:---:|:---|:---|:---|\n`;
        opportunities.forEach(op => {
          const itemsInfo = `${op.itemCount} ${op.exampleUrl ? `(${escapeMarkdownCell(op.exampleUrl)})` : ''}`;
          markdown += `| ${getStatusIcon(op.score)} | **${escapeMarkdownCell(op.title)}** | ${formatSavings(op)} | ${itemsInfo} |\n`;
        });
      }

      const diagAudits = DIAGNOSTICS.map(d => ({
        ...d,
        audit: report.audits?.[d.id],
      })).filter(d => d.audit);
      if (diagAudits.length) {
        markdown += `\n## Technical Diagnostics\n`;
        diagAudits.forEach(d => {
          const details = d.audit?.details;
          const blocking =
            d.id === 'third-party-summary' && details?.summary?.blockingTime
              ? ` (${Math.round(details.summary.blockingTime)} ms)`
              : '';
          markdown += `- ${d.label}: ${escapeMarkdownCell(d.audit?.displayValue)}${blocking}\n`;
        });
      }

      const warnings = report.runWarnings;
      if (warnings && warnings.length) {
        markdown += `\n### Execution Warnings\n`;
        warnings.forEach(w => {
          markdown += `- ⚠️ ${escapeMarkdownCell(w)}\n`;
        });
      }

      markdown += `\n---\n\n`;
      markdown += `_Detailed Field Description in the actions menu (Cmd + D)._\n`;

      return markdown;
    };
  }, [report, aiAnalysis, isAiLoading, fromCache, scorecardSvg, hostname]);

  const generateMetadata = useMemo(() => {
    return () => {
      const categoriesToShow = [
        { key: 'performance', name: 'Performance' },
        { key: 'accessibility', name: 'Accessibility' },
        { key: 'best-practices', name: 'Best Practices' },
        { key: 'seo', name: 'SEO' },
      ];

      const reportCreatedText = (() => {
        const ts = report.fetchTime;
        const date = ts ? new Date(ts) : new Date();
        return date.toLocaleString(undefined, {
          dateStyle: 'medium',
          timeStyle: 'short',
        });
      })();
      const lhVersion = report.lighthouseVersion;
      const auditDuration = (() => {
        const total = report.timing?.total;
        return total ? `${Math.round(total / 1000)}s` : undefined;
      })();

      return (
        <Detail.Metadata>
          <Detail.Metadata.TagList title="Overall Scores">
            {categoriesToShow.map(catInfo => {
              const cat =
                report.categories?.[
                  catInfo.key as keyof typeof report.categories
                ];
              if (!cat) return null;
              const score = getAuditScore(cat);
              return (
                <Detail.Metadata.TagList.Item
                  key={catInfo.key}
                  text={`${catInfo.name}: ${formatScore(score)}%`}
                  color={getScoreColor(score)}
                />
              );
            })}
          </Detail.Metadata.TagList>
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label
            title="Analysis Domain"
            text={getHostname(originalUrl)}
            icon={Icon.Globe}
          />
          <Detail.Metadata.Label
            title="Device Mode"
            text={
              report.configSettings?.formFactor === 'mobile'
                ? 'Mobile'
                : 'Desktop'
            }
            icon={
              report.configSettings?.formFactor === 'mobile'
                ? Icon.Mobile
                : Icon.Monitor
            }
          />
          {fromCache ? (
            <Detail.Metadata.Label
              title="Source"
              text="Cache (24h TTL)"
              icon={Icon.Tray}
            />
          ) : null}
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label
            title="Report Created"
            text={reportCreatedText}
          />
          {lhVersion ? (
            <Detail.Metadata.Label title="Lighthouse" text={`v${lhVersion}`} />
          ) : null}
          {auditDuration ? (
            <Detail.Metadata.Label
              title="Audit Duration"
              text={auditDuration}
              icon={Icon.Clock}
            />
          ) : null}
        </Detail.Metadata>
      );
    };
  }, [report, originalUrl, fromCache]);

  const handleAskAI = async () => {
    if (isAiLoading) return;
    setIsAiLoading(true);
    setAiAnalysis('');
    try {
      const vitals = extractVitals(report);
      const opportunities = extractOpportunities(report, 5);
      const issues = extractFailedAudits(report, 5);
      const seoFields = extractSeoFields(report);
      const categoryScores = extractCategoryScores(report);

      const ctx = {
        url: originalUrl,
        finalUrl: report.finalUrl,
        timestamp: report.fetchTime,
        version: report.lighthouseVersion,
        scores: Object.fromEntries(
          categoryScores.map(c => [c.key, Math.round(c.score * 100)])
        ),
        vitals,
        opportunities: opportunities.map((op: OpportunityInfo) => ({
          id: op.id,
          title: op.title,
          impactMs: op.savingsMs,
          impactBytes: op.savingsBytes,
          priority: formatRating(op.score),
          exampleUrl: op.exampleUrl,
        })),
        issues,
        seo: {
          title: seoFields.find(f => f.id === 'document-title')?.displayValue,
          description: seoFields.find(f => f.id === 'meta-description')
            ?.displayValue,
          canonical: seoFields.find(f => f.id === 'canonical')?.displayValue,
          lang: seoFields.find(f => f.id === 'html-has-lang')?.displayValue,
          structuredDataTypes:
            seoFields.find(f => f.id === 'structured-data')
              ?.structuredDataTypes || [],
        },
        warnings: report.runWarnings || [],
      };

      const prompt = `Act as an expert SEO/Performance engineer. Here is the Lighthouse context (JSON):
${JSON.stringify(ctx, null, 2)}

Give a brief executive summary in English. Highlight the biggest bottleneck and 3 concrete fixes (short bullets). Focus on performance, accessibility, and SEO impact.`;

      const answer = await AI.ask(prompt);
      if (answer) {
        setAiAnalysis(answer);
      } else {
        throw new Error('AI returned an empty response');
      }
    } catch {
      showToast({
        style: Toast.Style.Failure,
        title: 'AI Insights Unavailable',
        message: 'Could not reach AI services. Please try again.',
      });
    } finally {
      setIsAiLoading(false);
    }
  };

  const getEmailBody = () => {
    const categoryScores = extractCategoryScores(report);
    const scoreLines = categoryScores
      .map(c => `• ${c.name} — ${Math.round(c.score * 100)}%`)
      .join('\n');

    const aiBlock = aiAnalysis || 'No AI insights yet.';

    const fullBody = `Hi team,

I just ran a Lighthouse audit and here are the highlights: ${originalUrl}

Scores:
${scoreLines || 'N/A'}

AI Findings:
${aiBlock}

Technical details:
Report path: ${reportPath}

Sent via SEO Lighthouse Raycast extension.
Thanks,`;

    if (fullBody.length > 1800) {
      return fullBody.substring(0, 1797) + '...';
    }
    return fullBody;
  };

  const handleComposeMail = async () => {
    const subject = `Lighthouse Analysis Report: ${getHostname(originalUrl)}`;
    const body = getEmailBody();

    try {
      await runAppleScript(`
        tell application "Mail"
          set newMessage to make new outgoing message with properties {visible:true, subject:${JSON.stringify(subject)}, content:${JSON.stringify(body)} & "\\n\\n"}
          tell newMessage
            make new to recipient at end of to recipients with properties {address:""}
            activate
          end tell
        end tell
      `);
      showToast({
        style: Toast.Style.Success,
        title: 'Send to Developer',
        message: 'Draft created in Mail',
      });
    } catch {
      showToast({
        style: Toast.Style.Failure,
        title: 'Could Not Create Draft',
        message: 'Check that Mail app is installed',
      });
    }
  };

  return (
    <Detail
      markdown={generateMarkdownContent()}
      metadata={generateMetadata()}
      actions={
        <ActionPanel>
          {canShareScorecardImage ? (
            <ActionPanel.Section title="Scorecard">
              <Action
                title="Copy Scorecard Image"
                icon={Icon.Image}
                shortcut={Keyboard.Shortcut.Common.CopyName}
                onAction={() => shareScorecardImage(scorecardSvg, 'copy')}
              />
              <Action
                title="Save Scorecard Image"
                icon={Icon.Download}
                shortcut={{ modifiers: ['cmd', 'shift'], key: 's' }}
                onAction={() => shareScorecardImage(scorecardSvg, 'save')}
              />
            </ActionPanel.Section>
          ) : null}
          <ActionPanel.Section title="AI & Feedback">
            <Action
              title="Ask AI for Insights"
              icon={Icon.Stars}
              onAction={handleAskAI}
              shortcut={{ modifiers: ['cmd'], key: 'i' }}
            />
            <Action.Push
              title="Detailed Field Description"
              icon={Icon.List}
              target={<DetailedAuditsView report={report} />}
              shortcut={{ modifiers: ['cmd'], key: 'd' }}
            />
            <Action
              title="Send by Mail"
              icon={Icon.Envelope}
              onAction={handleComposeMail}
              shortcut={{ modifiers: ['cmd', 'shift'], key: 'e' }}
            />
          </ActionPanel.Section>
          <ActionPanel.Section title="Report Management">
            <Action
              title="Re-analyze"
              icon={Icon.ArrowClockwise}
              onAction={onReanalyze}
            />
            <Action.Open
              title="Open JSON Report"
              target={reportPath}
              icon={Icon.Code}
            />
            <Action.ShowInFinder
              path={reportPath}
              icon={Icon.Finder}
              title="Show in Finder"
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

function ReportLoader({ options }: { options: LighthouseOptions }) {
  const [reanalyzeCount, setReanalyzeCount] = useState(0);
  const currentOptions = useMemo(
    () => ({ ...options, force: reanalyzeCount > 0 }),
    [options, reanalyzeCount]
  );
  const [progressPct, setProgressPct] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const { isLoading, data, error, revalidate } = usePromise(
    runLighthouseAudit,
    [currentOptions],
    {
      onError: () => {},
    }
  );

  useEffect(() => {
    if (!isLoading && data) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = null;
      setProgressPct(100);
      return;
    }
    if (!isLoading && !data) return;

    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      setProgressPct(prev => {
        const next =
          prev < 20
            ? prev + 2
            : prev < 50
              ? prev + 3
              : prev < 70
                ? prev + 5
                : prev < 90
                  ? prev + 7
                  : prev + 5;
        return Math.min(next, 98);
      });
    }, 750);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = null;
    };
  }, [isLoading, data]);

  const handleReanalyze = () => {
    setReanalyzeCount(c => c + 1);
    revalidate();
  };

  if (error) {
    const isInstallError = error.message.includes('npm install -g lighthouse');
    const isChromeMissing = error.message.includes(
      'No Chrome installations found'
    );

    return (
      <Detail
        markdown={
          isInstallError
            ? `# Lighthouse Missing\n\nGoogle Lighthouse CLI is required.\n\n\`\`\`bash\nnpm install -g lighthouse\n\`\`\``
            : isChromeMissing
              ? `# Chrome or Chromium Required\n\nLighthouse needs a Chromium-based browser to run in headless mode.\n\nInstall Chrome:\n\n\`\`\`bash\nbrew install --cask google-chrome\n\`\`\`\n\nOr set a custom path in extension preferences (Lighthouse Path) to a Chromium-based browser binary.`
              : `# Audit Error\n\n${error.message}`
        }
        actions={
          <ActionPanel>
            {isInstallError ? (
              <Action.CopyToClipboard
                title="Copy Install Command"
                content="npm install -g lighthouse"
              />
            ) : isChromeMissing ? (
              <Action.CopyToClipboard
                title="Copy Chrome Install Command"
                content="brew install --cask google-chrome"
              />
            ) : null}
            <Action
              title="Try Again"
              icon={Icon.ArrowClockwise}
              onAction={revalidate}
            />
          </ActionPanel>
        }
      />
    );
  }

  if (isLoading || !data) {
    const hostname = getHostname(options.url);
    const phase =
      PROGRESS_PHASES.find(p => progressPct <= p.upTo) ||
      PROGRESS_PHASES[PROGRESS_PHASES.length - 1];
    const pct = data ? 100 : Math.min(progressPct, 98);
    const loadingSvg = loadingDashboardSvg({
      hostname,
      progress: pct,
      phase: phase.text,
    });

    return (
      <Detail
        markdown={mdImg(
          loadingSvg,
          `Auditing ${hostname} ${Math.round(pct)}`,
          DASHBOARD_W
        )}
      />
    );
  }

  return (
    <LighthouseReportView
      reportPath={data.reportPath}
      report={data.report}
      originalUrl={options.url}
      fromCache={data.fromCache}
      onReanalyze={handleReanalyze}
    />
  );
}

export default function Command() {
  const preferences = getPreferenceValues();
  const { push } = useNavigation();

  const { handleSubmit, itemProps } = useForm<FormValues>({
    initialValues: {
      device: 'mobile',
      performance: true,
      accessibility: true,
      bestPractices: true,
      seo: true,
      outputPath: preferences.outputPath || nodeOs.tmpdir(),
    },
    validation: {
      url: FormValidation.Required,
      outputPath: value => {
        if (!value) return 'Output path is required';
        return undefined;
      },
    },
    onSubmit: values => {
      const categories: string[] = [];
      if (values.performance) categories.push('performance');
      if (values.accessibility) categories.push('accessibility');
      if (values.bestPractices) categories.push('best-practices');
      if (values.seo) categories.push('seo');

      push(
        <ReportLoader
          options={{
            url: values.url,
            device: values.device,
            categories,
            outputPath: values.outputPath,
            lighthousePath: preferences.lighthousePath,
          }}
        />
      );
    },
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Run Lighthouse Audit"
            icon={Icon.Check}
            onSubmit={handleSubmit}
          />
          <Action
            title="Open Preferences"
            icon={Icon.Gear}
            onAction={openCommandPreferences}
          />
        </ActionPanel>
      }
    >
      <Form.Description text="Basic Configuration" />
      <Form.TextField
        title="Website URL"
        placeholder="https://example.com"
        {...itemProps.url}
      />
      <Form.Dropdown title="Device Mode" {...itemProps.device}>
        <Form.Dropdown.Item value="mobile" title="Mobile" icon={Icon.Mobile} />
        <Form.Dropdown.Item
          value="desktop"
          title="Desktop"
          icon={Icon.Monitor}
        />
      </Form.Dropdown>

      <Form.Separator />
      <Form.Description text="Analysis Categories" />
      <Form.Checkbox label="Performance Analysis" {...itemProps.performance} />
      <Form.Checkbox
        label="Accessibility Analysis"
        {...itemProps.accessibility}
      />
      <Form.Checkbox
        label="Best Practices Analysis"
        {...itemProps.bestPractices}
      />
      <Form.Checkbox label="SEO Analysis" {...itemProps.seo} />

      <Form.Separator />
      <Form.Description text="Advanced Settings" />
      <Form.TextField title="Output Folder" {...itemProps.outputPath} />
      <Form.Description text="JSON reports are saved to this folder. Change the default in extension preferences." />
    </Form>
  );
}
