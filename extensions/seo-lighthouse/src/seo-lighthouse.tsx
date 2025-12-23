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
  openCommandPreferences,
} from '@raycast/api';
import { useForm, FormValidation, usePromise } from '@raycast/utils';
import { useState, useEffect, useMemo, useRef } from 'react';
import * as nodeOs from 'node:os';
import * as childProcess from 'node:child_process';
import {
  runLighthouseAudit,
  LighthouseReport,
  LighthouseOptions,
  processUrl,
} from './utils/lighthouse';
import { t } from './utils/i18n';

function DetailedAuditsView({ report }: { report: LighthouseReport }) {
  const generateMarkdown = () => {
    const descMap: Record<string, string> = {
      interactive: t('desc_interactive'),
      'first-contentful-paint': t('desc_fcp'),
      'largest-contentful-paint': t('desc_lcp'),
      'speed-index': t('desc_speed_index'),
      'total-blocking-time': t('desc_tbt'),
      'cumulative-layout-shift': t('desc_cls'),
      'main-thread-tasks': t('desc_mainthread'),
      'total-byte-weight': t('desc_totalbyte'),
    };

    let markdown = `# ${t('detailed_fields_title')}\n\n`;

    const categories = [
      { id: 'performance', title: t('performance') },
      { id: 'accessibility', title: t('accessibility') },
      { id: 'best-practices', title: t('best_practices') },
      { id: 'seo', title: t('seo') },
    ];

    categories.forEach(cat => {
      markdown += `## ${cat.title}\n\n`;
      const categoryAudits =
        report.categories?.[cat.id as keyof typeof report.categories]
          ?.auditRefs || [];
      const audits = categoryAudits
        .map(ref => report.audits?.[ref.id])
        .filter((a): a is NonNullable<typeof a> => !!a && (a.score || 1) < 0.9)
        .sort((a, b) => (a.score || 0) - (b.score || 0));

      if (audits.length === 0) {
        markdown += `_${t('no_issues_found')}_\n\n`;
      } else {
        markdown += `| ${t('status')} | ${t('field')} | ${t('description')} |\n|:---:|:---|:---|\n`;
        audits.forEach(audit => {
          const score = audit.score ?? 0;
          const statusIcon = score >= 0.9 ? '🟢' : score >= 0.5 ? '🟡' : '🔴';
          const descKey = (audit.id || '').replace(/_/g, '-');
          const cleanDesc =
            descMap[descKey] ||
            audit.description
              ?.replace(/\[Learn more\].*/, '')
              .replace(/<br\s*\/?>/gi, ' ') ||
            '';
          markdown += `| ${statusIcon} | **${audit.title || '-'}** | ${cleanDesc || '-'} |\n`;
        });
        markdown += '\n';
      }
    });

    return markdown;
  };

  return <Detail markdown={generateMarkdown()} />;
}

interface Preferences {
  outputPath?: string;
  lighthousePath?: string;
}

interface FormValues {
  url: string;
  device: 'mobile' | 'desktop';
  performance: boolean;
  accessibility: boolean;
  bestPractices: boolean;
  seo: boolean;
  outputPath: string;
}

function LighthouseReportView({
  reportPath,
  report,
  originalUrl,
  onReanalyze,
}: {
  reportPath: string;
  report: LighthouseReport;
  originalUrl: string;
  onReanalyze: () => void;
}) {
  const [aiAnalysis, setAiAnalysis] = useState<string>('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const isMac = nodeOs.platform() === 'darwin';

  const formatScore = (score: number | undefined) =>
    score !== undefined ? `${Math.round(score * 100)}` : 'N/A';

  const getHostname = (url: string) => {
    try {
      return new URL(processUrl(url)).hostname;
    } catch {
      return url;
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 0.9) return Color.Green;
    if (score >= 0.5) return Color.Yellow;
    return Color.Red;
  };

  const getStatusIcon = (score: number | null | undefined) => {
    if (score === null || score === undefined) return '⚪️';
    if (score >= 0.9) return '🟢';
    if (score >= 0.5) return '🟡';
    return '🔴';
  };

  const formatRating = (score?: number | null) => {
    if (score === null || score === undefined) return 'unknown';
    if (score >= 0.9) return 'good';
    if (score >= 0.5) return 'medium';
    return 'poor';
  };

  const generateMarkdownContent = () => {
    let markdown = `# ${t('report_title')}\n\n`;

    // AI Analysis Section
    if (aiAnalysis) {
      markdown += `> [!TIP]\n> **AI Insights**\n>\n${aiAnalysis
        .split('\n')
        .map(l => `> ${l}`)
        .join('\n')}\n\n---\n\n`;
    } else if (isAiLoading) {
      markdown += `> [!NOTE]\n> **AI is analyzing findings...**\n\n---\n\n`;
    }

    markdown += `## Performance & Core Metrics (Críticos)\n\n`;
    markdown += `| ${t('status')} | Métrica | Valor | Referencia |\n| :---: | :--- | :--- | :--- |\n`;
    const perfMetrics = [
      {
        id: 'largest-contentful-paint',
        title: 'LCP (Largest Contentful Paint)',
        bench: '< 2.5s',
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
    ];
    perfMetrics.forEach(m => {
      const audit = report.audits?.[m.id];
      if (audit) {
        markdown += `| ${getStatusIcon(audit.score)} | ${m.title} | **${audit.displayValue || '-'}** | \`${m.bench}\` |\n`;
      }
    });

    markdown += `\n## SEO & Accessibility (Marketing)\n\n`;
    markdown += `| ${t('status')} | Campo | Valor |\n|:---:|:---|:---|\n`;
    const seoScore = report.categories?.seo?.score;
    const accScore = report.categories?.accessibility?.score;
    if (seoScore !== undefined || accScore !== undefined) {
      if (seoScore !== undefined)
        markdown += `| ${getStatusIcon(seoScore)} | SEO (score) | ${formatScore(seoScore)}% |\n`;
      if (accScore !== undefined)
        markdown += `| ${getStatusIcon(accScore)} | Accessibility (score) | ${formatScore(accScore)}% |\n`;
    }
    const seoFields = [
      { id: 'document-title', label: 'Title tag' },
      { id: 'meta-description', label: 'Meta description' },
      { id: 'canonical', label: 'Canonical URL' },
      { id: 'html-has-lang', label: 'Idioma (html lang)' },
      { id: 'structured-data', label: 'Structured Data' },
    ];
    seoFields.forEach(f => {
      const audit = report.audits?.[f.id];
      if (audit) {
        const extra =
          f.id === 'structured-data' && audit.details?.items
            ? ` (${
                (audit.details.items as any[])
                  .map((i: any) => i?.type || i?.name)
                  .filter(Boolean)
                  .join(', ') || 'sin tipos'
              })`
            : '';
        markdown += `| ${getStatusIcon(audit.score)} | ${f.label} | ${audit.displayValue || audit.title || '-'}${extra} |\n`;
      }
    });

    const opportunities = Object.values(report.audits || {})
      .filter(a => a.details && (a.details as any).type === 'opportunity')
      .slice(0, 5);
    if (opportunities.length > 0) {
      markdown += `\n## Oportunidades Prioritarias (High ROI)\n`;
      markdown += `| ${t('status')} | Audit | Ahorro estimado | Ítems |\n|:---:|:---|:---|:---|\n`;
      opportunities.forEach(op => {
        const savingsMs = (op.details as any).overallSavingsMs;
        const savingsBytes = (op.details as any).overallSavingsBytes;
        const savings =
          savingsMs || savingsBytes
            ? `${savingsMs ? `${Math.round(savingsMs)} ms` : ''}${savingsMs && savingsBytes ? ' · ' : ''}${savingsBytes ? `${Math.round(savingsBytes / 1024)} KB` : ''}`
            : '-';
        const items = Array.isArray((op.details as any).items)
          ? (op.details as any).items
          : [];
        const firstUrl = items.find((i: any) => i?.url)?.url;
        const itemsInfo = `${items.length} ${firstUrl ? `(${firstUrl})` : ''}`;
        markdown += `| ${getStatusIcon(op.score)} | **${op.title}** | ${savings} | ${itemsInfo} |\n`;
      });
    }

    const diagnostics = [
      { id: 'dom-size', label: 'DOM Size (nodos)' },
      { id: 'unused-javascript', label: 'Unused JavaScript' },
      { id: 'unused-css-rules', label: 'Unused CSS' },
      { id: 'third-party-summary', label: 'Third-party blocking time' },
      { id: 'offscreen-images', label: 'Offscreen images' },
    ];
    const diagAudits = diagnostics
      .map(d => ({ ...d, audit: report.audits?.[d.id] }))
      .filter(d => d.audit);
    if (diagAudits.length) {
      markdown += `\n## Diagnósticos Técnicos (Debugging)\n`;
      diagAudits.forEach(d => {
        const details = (d.audit as any)?.details;
        const blocking =
          d.id === 'third-party-summary' && details?.summary?.blockingTime
            ? ` (${Math.round(details.summary.blockingTime)} ms)`
            : '';
        markdown += `- ${d.label}: ${d.audit?.displayValue || '-'}${blocking}\n`;
      });
    }

    const warnings = (report as any).runWarnings as string[] | undefined;
    if (warnings && warnings.length) {
      markdown += `\n### Advertencias de ejecución\n`;
      warnings.forEach(w => {
        markdown += `- ⚠️ ${w}\n`;
      });
    }

    markdown += `\n---\n\n`;
    markdown += `_${t('view_detailed_audits')} in the actions menu (Cmd + D)._\n`;

    return markdown;
  };

  const generateMetadata = () => {
    const categoriesToShow = [
      { key: 'performance', name: t('performance') },
      { id: 'accessibility', name: t('accessibility') },
      { id: 'best-practices', name: t('best_practices') },
      { id: 'seo', name: t('seo') },
    ];

    const reportCreatedText = (() => {
      const ts = (report as any).fetchTime;
      const date = ts ? new Date(ts) : new Date();
      return date.toLocaleString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
      });
    })();
    const lhVersion = (report as any).lighthouseVersion as string | undefined;
    const auditDuration = (() => {
      const total = (report as any).timing?.total as number | undefined;
      return total ? `${Math.round(total / 1000)}s` : undefined;
    })();

    return (
      <Detail.Metadata>
        <Detail.Metadata.TagList title={t('overall_scores')}>
          {categoriesToShow.map(catInfo => {
            const key = (catInfo as any).key || (catInfo as any).id;
            const cat =
              report.categories?.[key as keyof typeof report.categories];
            if (!cat) return null;
            const score = cat.score || 0;
            return (
              <Detail.Metadata.TagList.Item
                key={key}
                text={`${catInfo.name}: ${formatScore(score)}%`}
                color={getScoreColor(score)}
              />
            );
          })}
        </Detail.Metadata.TagList>
        <Detail.Metadata.Separator />
        <Detail.Metadata.Label
          title={t('analysis_domain')}
          text={getHostname(originalUrl)}
          icon={Icon.Globe}
        />
        <Detail.Metadata.Label
          title={t('device_mode')}
          text={
            report.configSettings?.formFactor === 'mobile'
              ? t('mobile')
              : t('desktop')
          }
          icon={
            report.configSettings?.formFactor === 'mobile'
              ? Icon.Mobile
              : Icon.Monitor
          }
        />
        <Detail.Metadata.Separator />
        <Detail.Metadata.Label
          title={t('report_created')}
          text={reportCreatedText}
        />
        {lhVersion ? (
          <Detail.Metadata.Label title="Lighthouse" text={`v${lhVersion}`} />
        ) : null}
        {auditDuration ? (
          <Detail.Metadata.Label
            title="Duración auditoría"
            text={auditDuration}
            icon={Icon.Clock}
          />
        ) : null}
      </Detail.Metadata>
    );
  };

  const handleAskAI = async () => {
    if (isAiLoading) return;
    setIsAiLoading(true);
    setAiAnalysis('');
    try {
      const scores = {
        performance: report.categories?.performance?.score
          ? Math.round((report.categories.performance.score || 0) * 100)
          : undefined,
        accessibility: report.categories?.accessibility?.score
          ? Math.round((report.categories.accessibility.score || 0) * 100)
          : undefined,
        seo: report.categories?.seo?.score
          ? Math.round((report.categories.seo.score || 0) * 100)
          : undefined,
        best_practices: report.categories?.['best-practices']?.score
          ? Math.round((report.categories['best-practices'].score || 0) * 100)
          : undefined,
        pwa: report.categories?.pwa?.score
          ? Math.round((report.categories.pwa.score || 0) * 100)
          : undefined,
      };

      const pickAudit = (id: string) => report.audits?.[id];
      const vitals = {
        lcp: {
          value: pickAudit('largest-contentful-paint')?.displayValue,
          rating: formatRating(pickAudit('largest-contentful-paint')?.score),
        },
        cls: {
          value: pickAudit('cumulative-layout-shift')?.displayValue,
          rating: formatRating(pickAudit('cumulative-layout-shift')?.score),
        },
        ttfb: {
          value: pickAudit('server-response-time')?.displayValue,
          rating: formatRating(pickAudit('server-response-time')?.score),
        },
        fcp: {
          value: pickAudit('first-contentful-paint')?.displayValue,
          rating: formatRating(pickAudit('first-contentful-paint')?.score),
        },
        speedIndex: {
          value: pickAudit('speed-index')?.displayValue,
          rating: formatRating(pickAudit('speed-index')?.score),
        },
      };

      const opportunities = Object.values(report.audits || {})
        .filter(a => a.details && (a.details as any).type === 'opportunity')
        .slice(0, 5)
        .map(op => {
          const items = Array.isArray((op.details as any).items)
            ? (op.details as any).items
            : [];
          const firstUrl = items.find((i: any) => i?.url)?.url;
          return {
            id: op.id,
            title: op.title,
            impactMs: (op.details as any).overallSavingsMs,
            impactBytes: (op.details as any).overallSavingsBytes,
            priority: formatRating(op.score),
            exampleUrl: firstUrl,
          };
        });

      const failingAudits = Object.values(report.audits || {})
        .filter(a => (a.score || 1) < 0.5 && a.title)
        .slice(0, 5)
        .map(a => ({
          id: a.id,
          title: a.title,
          score: a.score,
        }));

      const warnings = (report as any).runWarnings || [];

      const ctx = {
        url: originalUrl,
        timestamp: (report as any).fetchTime,
        version: (report as any).lighthouseVersion,
        scores,
        vitals,
        issues: failingAudits,
        opportunities,
        seo: {
          title: pickAudit('document-title')?.displayValue,
          description: pickAudit('meta-description')?.displayValue,
          canonical: pickAudit('canonical')?.displayValue,
          lang: pickAudit('html-has-lang')?.displayValue,
          structuredDataTypes: (
            pickAudit('structured-data')?.details?.items || []
          )
            .map((i: any) => i?.type || i?.name)
            .filter(Boolean),
          structuredDataErrors: (
            pickAudit('structured-data')?.details?.items || []
          )
            .map((i: any) => i?.errors)
            .flat()
            .filter(Boolean),
        },
        warnings,
      };

      const prompt = `Act as an expert SEO/Performance engineer. Here is the Lighthouse context (JSON):
${JSON.stringify(ctx, null, 2)}

Give a brief executive summary in ${t('language_name')}. Highlight the biggest bottleneck and 3 concrete fixes (short bullets). Focus on performance, accessibility, and SEO impact.`;

      const answer = await AI.ask(prompt);
      if (answer) {
        setAiAnalysis(answer);
      } else {
        throw new Error('AI returned an empty response');
      }
    } catch (error) {
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
    const scores = Object.entries(report.categories || {})
      .map(
        ([k, v]) => `${k.toUpperCase()}: ${Math.round((v.score || 0) * 100)}%`
      )
      .join('\n');

    const scoreLines = Object.entries(report.categories || {})
      .map(
        ([key, value]) =>
          `• ${t(key)} — ${Math.round((value.score || 0) * 100)}%`
      )
      .join('\n');

    const aiBlock = aiAnalysis ? aiAnalysis : t('email_no_ai');

    const fullBody = `${t('email_greeting')}

${t('email_intro')} ${originalUrl}

${t('email_scores_title')}:
${scoreLines || scores}

${t('email_ai_title')}:
${aiBlock}

${t('email_details_title')}:
${t('email_report_path')}: ${reportPath}

${t('email_footer')}
${t('email_thanks')}`;

    if (fullBody.length > 1800) {
      return fullBody.substring(0, 1797) + '...';
    }
    return fullBody;
  };

  const openMailDraft = async (subject: string, body: string) => {
    const script = `
      tell application "Mail"
        set newMessage to make new outgoing message with properties {visible:true, subject:${JSON.stringify(
          subject
        )}, content:${JSON.stringify(body)} & "\\n\\n"}
        tell newMessage
          make new to recipient at end of to recipients with properties {address:""}
          activate
        end tell
      end tell`;

    return new Promise<void>((resolve, reject) => {
      childProcess.execFile('osascript', ['-e', script], error => {
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      });
    });
  };

  const handleComposeMail = async () => {
    try {
      await openMailDraft(
        `${t('report_title')}: ${getHostname(originalUrl)}`,
        getEmailBody()
      );
      showToast({
        style: Toast.Style.Success,
        title: t('send_to_developer'),
        message: 'Borrador creado en Mail',
      });
    } catch (error: any) {
      showToast({
        style: Toast.Style.Failure,
        title: 'No se pudo crear el borrador',
        message: error?.message || 'Revisa que la app Mail esté instalada',
      });
    }
  };

  return (
    <Detail
      markdown={generateMarkdownContent()}
      metadata={generateMetadata()}
      actions={
        <ActionPanel>
          <ActionPanel.Section title="AI & Feedback">
            <Action
              title={t('ask_ai')}
              icon={Icon.Stars}
              onAction={handleAskAI}
              shortcut={{ modifiers: ['cmd'], key: 'i' }}
            />
            <Action.Push
              title={t('view_detailed_audits')}
              icon={Icon.List}
              target={<DetailedAuditsView report={report} />}
              shortcut={{ modifiers: ['cmd'], key: 'd' }}
            />
            {isMac ? (
              <Action
                title={t('send_email')}
                icon={Icon.Envelope}
                onAction={handleComposeMail}
                shortcut={{ modifiers: ['cmd', 'shift'], key: 'e' }}
              />
            ) : (
              <Action
                title="Send Email (macos)"
                icon={Icon.Envelope}
                onAction={() =>
                  showToast({
                    style: Toast.Style.Failure,
                    title: 'No disponible en Windows',
                    message: 'El borrador de Mail solo funciona en macOS.',
                  })
                }
              />
            )}
          </ActionPanel.Section>
          <ActionPanel.Section title="Report Management">
            <Action
              title="Re-analyze"
              icon={Icon.ArrowClockwise}
              onAction={onReanalyze}
            />
            <Action.Open
              title="Open Json Report"
              target={reportPath}
              icon={Icon.Code}
            />
            <Action.ShowInFinder
              path={reportPath}
              icon={Icon.Finder}
              title={t('show_in_finder')}
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
  const progressTexts = [
    { upTo: 20, text: 'Preparando entorno y resolviendo DNS...' },
    { upTo: 45, text: 'Midiendo rendimiento y tiempos críticos...' },
    { upTo: 70, text: 'Auditando accesibilidad y mejores prácticas...' },
    { upTo: 90, text: 'Evaluando SEO y metadatos...' },
    { upTo: 99, text: 'Generando reporte enriquecido...' },
    { upTo: 100, text: 'Listo: presentando resultados.' },
  ];

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
    setProgressPct(prev => (prev === 0 ? 0 : prev));
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

    return (
      <Detail
        markdown={
          isInstallError
            ? `# ${t('lighthouse_missing_title')}\n\nGoogle Lighthouse CLI is required.\n\n\`\`\`bash\nnpm install -g lighthouse\n\`\`\``
            : `# ${t('audit_error_title')}\n\n${error.message}`
        }
        actions={
          <ActionPanel>
            {isInstallError ? (
              <Action.CopyToClipboard
                title={t('copy_install_command')}
                content="npm install -g lighthouse"
              />
            ) : null}
            <Action
              title={t('try_again')}
              icon={Icon.ArrowClockwise}
              onAction={revalidate}
            />
          </ActionPanel>
        }
      />
    );
  }

  if (isLoading || !data) {
    const hostname = (() => {
      try {
        return new URL(processUrl(options.url)).hostname;
      } catch {
        return options.url;
      }
    })();
    const phase =
      progressTexts.find(p => progressPct <= p.upTo) ||
      progressTexts[progressTexts.length - 1];
    const bar = (() => {
      const pct = data ? 100 : Math.min(progressPct, 98);
      const barLength = 50;
      const filled = Math.round((pct / 100) * barLength);
      return `[${'█'.repeat(filled).padEnd(barLength, '░')}] ${pct}%`;
    })();
    return (
      <Detail
        isLoading={true}
        markdown={`# ${t('loading_summary')}\n\n${t('analyzing')}\n\n**Domain:** ${hostname}\n\n![Party Parrot](https://cultofthepartyparrot.com/parrots/hd/parrot.gif)\n\n${bar}\n\n_${phase.text}_`}
      />
    );
  }

  return (
    <LighthouseReportView
      reportPath={data.reportPath}
      report={data.report}
      originalUrl={options.url}
      onReanalyze={handleReanalyze}
    />
  );
}

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();
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
            title={t('form_analyze_button')}
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
      <Form.Description text={t('form_section_basic')} />
      <Form.TextField
        title={t('form_url_title')}
        placeholder={t('form_url_placeholder')}
        {...itemProps.url}
      />
      <Form.Dropdown title={t('form_device_title')} {...itemProps.device}>
        <Form.Dropdown.Item
          value="mobile"
          title={t('mobile')}
          icon={Icon.Mobile}
        />
        <Form.Dropdown.Item
          value="desktop"
          title={t('desktop')}
          icon={Icon.Monitor}
        />
      </Form.Dropdown>

      <Form.Separator />
      <Form.Description text={t('form_section_categories')} />
      <Form.Checkbox label={t('form_perf_title')} {...itemProps.performance} />
      <Form.Checkbox label={t('form_acc_title')} {...itemProps.accessibility} />
      <Form.Checkbox label={t('form_bp_title')} {...itemProps.bestPractices} />
      <Form.Checkbox label={t('form_seo_title')} {...itemProps.seo} />

      <Form.Separator />
      <Form.Description text={t('form_section_advanced')} />
      <Form.TextField
        title={t('form_output_title')}
        {...itemProps.outputPath}
      />
      <Form.Description text={t('form_output_helper')} />
    </Form>
  );
}
