import { getPreferenceValues } from '@raycast/api';
import { runLighthouseAudit } from '../utils/lighthouse';
import {
  extractOpportunities,
  extractFailedAudits,
  extractVitals,
  formatRating,
  getAuditScore,
} from '../utils/report';

type Props = {
  arguments: {
    url: string;
  };
};

export default async function (props: Props) {
  const { url } = props.arguments;
  const preferences = getPreferenceValues();

  try {
    const { report, fromCache } = await runLighthouseAudit({
      url,
      categories: ['performance', 'accessibility', 'best-practices', 'seo'],
      device: 'mobile',
      outputPath: preferences.outputPath,
      lighthousePath: preferences.lighthousePath,
    });

    const scores = {
      performance: getAuditScore(report.categories?.performance),
      accessibility: getAuditScore(report.categories?.accessibility),
      bestPractices: getAuditScore(report.categories?.['best-practices']),
      seo: getAuditScore(report.categories?.seo),
    };

    const metrics = extractVitals(report);
    const opportunities = extractOpportunities(report, 5);
    const issues = extractFailedAudits(report, 5);

    return {
      status: 'success',
      url: report.finalUrl || url,
      fromCache,
      lighthouseVersion: report.lighthouseVersion,
      auditDurationMs: report.timing?.total,
      runWarnings: report.runWarnings || [],
      scores: {
        performance: Math.round(scores.performance * 100),
        accessibility: Math.round(scores.accessibility * 100),
        bestPractices: Math.round(scores.bestPractices * 100),
        seo: Math.round(scores.seo * 100),
      },
      coreWebVitals: {
        lcp: { value: metrics.lcp.value, rating: metrics.lcp.rating },
        inp: { value: metrics.inp.value, rating: metrics.inp.rating },
        tbt: { value: metrics.tbt.value, rating: metrics.tbt.rating },
        cls: { value: metrics.cls.value, rating: metrics.cls.rating },
        ttfb: { value: metrics.ttfb.value, rating: metrics.ttfb.rating },
        fcp: { value: metrics.fcp.value, rating: metrics.fcp.rating },
        speedIndex: {
          value: metrics.speedIndex.value,
          rating: metrics.speedIndex.rating,
        },
      },
      opportunities: opportunities.map(op => ({
        title: op.title,
        savingsMs: op.savingsMs,
        savingsBytes: op.savingsBytes,
        priority: formatRating(op.score),
        itemCount: op.itemCount,
        exampleUrl: op.exampleUrl,
      })),
      criticalIssues: issues,
      summary: `Performance: ${Math.round(scores.performance * 100)}, Accessibility: ${Math.round(scores.accessibility * 100)}, Best Practices: ${Math.round(scores.bestPractices * 100)}, SEO: ${Math.round(scores.seo * 100)}`,
    };
  } catch (error) {
    return {
      status: 'error',
      message:
        error instanceof Error
          ? error.message
          : 'Unknown error occurred during audit',
    };
  }
}
