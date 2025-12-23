import { runLighthouseAudit } from '../utils/lighthouse';

type Props = {
  arguments: {
    url: string;
  };
};

export default async function (props: Props) {
  const { url } = props.arguments;

  try {
    const { report } = await runLighthouseAudit({
      url,
      categories: ['performance', 'accessibility', 'best-practices', 'seo'],
      device: 'mobile',
    });

    // Extract scores
    const scores = {
      performance: report.categories?.performance?.score ?? 0,
      accessibility: report.categories?.accessibility?.score ?? 0,
      bestPractices: report.categories?.['best-practices']?.score ?? 0,
      seo: report.categories?.seo?.score ?? 0,
    };

    // Extract key metrics (e.g. Core Web Vitals)
    const metrics = {
      lcp: report.audits?.['largest-contentful-paint']?.displayValue,
      fcp: report.audits?.['first-contentful-paint']?.displayValue,
      cls: report.audits?.['cumulative-layout-shift']?.displayValue,
      tbt: report.audits?.['total-blocking-time']?.displayValue,
    };

    return {
      status: 'success',
      url,
      scores,
      metrics,
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
