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
  openCommandPreferences,
} from '@raycast/api';
import { useState, useEffect } from 'react';
import * as childProcess from 'node:child_process';
import * as nodePath from 'node:path';
import * as nodeOs from 'node:os';
import * as nodeFs from 'node:fs/promises';
import { promisify } from 'node:util';

const execPromise = promisify(childProcess.exec);

interface FormValues {
  url: string;
  device: 'mobile' | 'desktop';
  performance: boolean;
  accessibility: boolean;
  bestPractices: boolean;
  seo: boolean;
  outputPath: string;
}

interface Preferences {
  outputPath?: string;
  lighthousePath?: string;
}

interface LighthouseReport {
  categories?: {
    performance?: { score: number; title?: string };
    accessibility?: { score: number; title?: string };
    'best-practices'?: { score: number; title?: string };
    seo?: { score: number; title?: string };
  };
  audits?: {
    [key: string]: {
      title?: string;
      description?: string;
      displayValue?: string;
      score?: number | null;
    };
  };
}

function expandHomeDir(filePath: string): string {
  if (filePath.startsWith('~')) {
    return nodePath.join(nodeOs.homedir(), filePath.slice(1));
  }
  return filePath;
}

// Utility function to validate and process URL
function processUrl(url: string): string {
  // Trim whitespace
  url = url.trim();

  // Check if URL is already prefixed with http:// or https://
  if (/^https?:\/\//i.test(url)) {
    return url;
  }

  // Remove any leading www.
  url = url.replace(/^www\./i, '');

  // Add https:// by default
  return `https://${url}`;
}

// Validate URL format
function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

// Lighthouse Path Finding Function
async function findLighthousePath(
  preferences: Preferences
): Promise<string | null> {
  // First check preferences path if set
  if (preferences.lighthousePath) {
    const expandedPath = expandHomeDir(preferences.lighthousePath);
    try {
      await nodeFs.access(expandedPath, nodeFs.constants.X_OK);
      return expandedPath;
    } catch (error) {
      // Silently continue if preference path is invalid
    }
  }

  // Define all potential paths
  const potentialPaths = [
    // Global CLI paths first (most likely to exist)
    '/opt/homebrew/bin/lighthouse',
    '/usr/local/bin/lighthouse',
    '/usr/bin/lighthouse',
    `${nodeOs.homedir()}/.npm-global/bin/lighthouse`,

    // Then check CLI index.js files
    '/opt/homebrew/lib/node_modules/lighthouse/cli/index.js',
    '/usr/local/lib/node_modules/lighthouse/cli/index.js',
    '/usr/lib/node_modules/lighthouse/cli/index.js',
    `${nodeOs.homedir()}/.npm-global/lib/node_modules/lighthouse/cli/index.js`,
    nodePath.join(
      nodeOs.homedir(),
      '.npm/lib/node_modules/lighthouse/cli/index.js'
    ),

    // Local installation paths (least likely)
    nodePath.join(__dirname, 'node_modules', '.bin', 'lighthouse'),
    nodePath.join(__dirname, 'node_modules', 'lighthouse', 'cli', 'index.js'),
  ];

  // Try all paths silently
  for (const potentialPath of potentialPaths) {
    try {
      await nodeFs.access(potentialPath, nodeFs.constants.X_OK);
      return potentialPath;
    } catch {
      // Silently continue to next path
    }
  }

  // Try using 'which' command as last resort
  try {
    const { stdout } = await execPromise('which lighthouse');
    const path = stdout.trim();
    if (path) {
      await nodeFs.access(path, nodeFs.constants.X_OK);
      return path;
    }
  } catch {
    // Silently handle which command failure
  }

  // If no path is found but we know lighthouse is installed globally,
  // return just 'lighthouse' as a fallback
  try {
    await execPromise('lighthouse --version');
    return 'lighthouse';
  } catch {
    // Only log error if we truly can't find lighthouse anywhere
    console.error('Lighthouse not found in system');
    return null;
  }
}

// Lighthouse Report View Component
function LighthouseReportView({ reportPath }: { reportPath: string }) {
  const [report, setReport] = useState<LighthouseReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadReport() {
      try {
        const reportContent = await nodeFs.readFile(reportPath, 'utf-8');
        const parsedReport = JSON.parse(reportContent);

        // Validate report structure
        if (!parsedReport.categories && !parsedReport.audits) {
          throw new Error('Invalid Lighthouse report format');
        }

        setReport(parsedReport);
      } catch (error) {
        console.error('Failed to load report:', error);
        setError(
          error instanceof Error
            ? error.message
            : 'Unknown error loading report'
        );
      }
    }
    loadReport();
  }, [reportPath]);

  if (error) {
    return <Detail markdown={`Error loading report: ${error}`} />;
  }

  if (!report) {
    return <Detail markdown="Loading report..." />;
  }

  const renderScoreIcon = (score: number) => {
    if (score >= 0.9)
      return { source: Icon.CheckCircle, tintColor: Color.Green };
    if (score >= 0.5) return { source: Icon.Warning, tintColor: Color.Yellow };
    return { source: Icon.XMarkCircle, tintColor: Color.Red };
  };

  const formatScore = (score: number | undefined) =>
    score !== undefined ? `${Math.round(score * 100)}%` : 'N/A';

  // Dynamic markdown content generation
  const generateMarkdownContent = () => {
    let markdownContent =
      '# Lighthouse Analysis Report\n\n## Overall Scores\n\n';
    markdownContent += '| Category | Score | Status |\n';
    markdownContent += '| -------- | ----- | ------ |\n';

    const categories = [
      { key: 'performance', name: 'Performance' },
      { key: 'accessibility', name: 'Accessibility' },
      { key: 'best-practices', name: 'Best Practices' },
      { key: 'seo', name: 'SEO' },
    ];

    categories.forEach(({ key, name }) => {
      const category =
        report.categories?.[
          key as 'performance' | 'accessibility' | 'best-practices' | 'seo'
        ];
      if (category) {
        markdownContent += `| ${name} | ${formatScore(category.score)} | ${formatScore(category.score)} |\n`;
      }
    });

    // Performance Metrics
    markdownContent +=
      '\n## Key Performance Metrics\n\n### Core Web Vitals\n\n';

    const performanceMetrics = [
      'first-contentful-paint',
      'largest-contentful-paint',
      'total-blocking-time',
      'cumulative-layout-shift',
      'interactive',
      'speed-index',
    ];

    performanceMetrics.forEach(metric => {
      const audit = report.audits?.[metric];
      if (audit) {
        markdownContent += `- **${audit.title || metric}**: ${audit.displayValue || 'N/A'}\n`;
      }
    });

    return markdownContent;
  };

  // Dynamic metadata generation
  const generateMetadataLabels = () => {
    const categories = [
      { key: 'performance', name: 'Performance' },
      { key: 'accessibility', name: 'Accessibility' },
      { key: 'best-practices', name: 'Best Practices' },
      { key: 'seo', name: 'SEO' },
    ];

    return categories
      .filter(
        ({ key }) =>
          report.categories?.[
            key as 'performance' | 'accessibility' | 'best-practices' | 'seo'
          ]
      )
      .map(({ key, name }) => {
        const category =
          report.categories?.[
            key as 'performance' | 'accessibility' | 'best-practices' | 'seo'
          ];
        return category ? (
          <Detail.Metadata.Label
            key={key}
            title={`${name} Score`}
            text={formatScore(category.score)}
            icon={renderScoreIcon(category.score)}
          />
        ) : null;
      })
      .filter(Boolean);
  };

  return (
    <Detail
      markdown={generateMarkdownContent()}
      metadata={<Detail.Metadata>{generateMetadataLabels()}</Detail.Metadata>}
      actions={
        <ActionPanel>
          <Action.Open
            title="Open Json Report"
            target={reportPath}
            icon={Icon.Document}
          />
          <Action.ShowInFinder path={reportPath} title="Show in Finder" />
          <Action.OpenWith path={reportPath} />
        </ActionPanel>
      }
    />
  );
}

export default function Command() {
  const preferences: Preferences = getPreferenceValues<Preferences>();
  const [reportPath, setReportPath] = useState<string | null>(null);
  const [outputPath, setOutputPath] = useState<string>(
    preferences.outputPath || nodeOs.tmpdir()
  );
  const [lighthousePath, setLighthousePath] = useState<string>(
    preferences.lighthousePath || ''
  );

  useEffect(() => {
    // If lighthousePath is not set, try to find it
    if (!lighthousePath) {
      const findPath = async () => {
        const foundPath = await findLighthousePath(preferences);
        if (foundPath) {
          setLighthousePath(foundPath);
        } else {
          //console.error('Lighthouse CLI not found.');
        }
      };
      findPath();
    }
  }, [lighthousePath, preferences]);

  // If a report path exists, show the report view
  if (reportPath) {
    return <LighthouseReportView reportPath={reportPath} />;
  }

  async function handleChooseDirectory() {
    try {
      const { stdout } = await execPromise(`
        osascript -e 'POSIX path of (choose folder with prompt "Select Output Directory")'
      `);
      const selectedPath = stdout.trim();
      if (selectedPath) {
        setOutputPath(selectedPath);
        await showToast({
          style: Toast.Style.Success,
          title: 'Directory Selected',
          message: `Output path set to: ${selectedPath}`,
        });
      }
    } catch (error) {
      console.error('Directory selection failed:', error);
      await showToast({
        style: Toast.Style.Failure,
        title: 'Directory Selection Failed',
        message: 'Could not set the output path.',
      });
    }
  }

  async function handleSubmit(values: FormValues): Promise<void> {
    await showToast({
      style: Toast.Style.Animated,
      title: 'Running Lighthouse Analysis...',
    });

    try {
      // Validate URL
      if (!values.url) {
        throw new Error('URL is required');
      }

      // Process and validate URL
      const formattedUrl = processUrl(values.url);
      if (!isValidUrl(formattedUrl)) {
        throw new Error('Invalid URL format');
      }

      // Find Lighthouse path
      const finalLighthousePath = await findLighthousePath(preferences);
      if (!finalLighthousePath) {
        if (!preferences.lighthousePath) {
          throw new Error(
            'Lighthouse CLI not found. Please set the path manually in settings or install globally using:\n\nnpm install -g lighthouse'
          );
        } else {
          throw new Error(
            'Specified Lighthouse CLI path is invalid. Please set the path manually in settings.'
          );
        }
      }

      // Prepare categories
      const categories: string[] = [];
      if (values.performance) categories.push('performance');
      if (values.accessibility) categories.push('accessibility');
      if (values.bestPractices) categories.push('best-practices');
      if (values.seo) categories.push('seo');

      // Fallback to all categories if none selected
      const finalCategories =
        categories.length > 0
          ? categories
          : ['performance', 'accessibility', 'best-practices', 'seo'];

      // Prepare output path from form or preferences or fallback to temp directory
      const finalOutputDirectory =
        values.outputPath || preferences.outputPath || nodeOs.tmpdir();

      // Create the output directory if it doesn't exist
      try {
        await nodeFs.mkdir(finalOutputDirectory, { recursive: true });
        const stats = await nodeFs.stat(finalOutputDirectory);
        if (!stats.isDirectory()) {
          throw new Error('Selected output path is not a directory.');
        }
      } catch (error) {
        console.error('Output directory validation failed:', error);
        throw new Error(
          'Invalid output path. Please provide a valid directory.'
        );
      }

      const outputFilePath = nodePath.join(
        finalOutputDirectory,
        `lighthouse-report-${Date.now()}.json`
      );

      // Construct Lighthouse CLI command with enhanced configuration
      const command = [
        `"${finalLighthousePath}"`,
        `"${formattedUrl}"`,
        `--output=json`,
        `--output-path="${outputFilePath}"`,
        `--only-categories=${finalCategories.join(',')}`,
        '--quiet',
        '--disable-full-page-screenshot',
        '--disable-storage-reset',
        '--throttling-method=devtools',
        '--max-wait-for-load=45000', // Increase max wait time
        '--max-timeout=90000', // Increase overall timeout
        '--chrome-flags="--headless --no-sandbox --disable-gpu --disable-web-security --allow-insecure-localhost"',
      ];

      // Add device-specific settings
      if (values.device === 'desktop') {
        command.push('--preset=desktop');
      } else {
        command.push('--form-factor=mobile');
      }

      const fullCommand = command.join(' ');
      console.log('Executing Lighthouse command:', fullCommand);

      try {
        // Execute Lighthouse with enhanced error handling
        await execPromise(fullCommand, {
          env: {
            ...process.env,
            PATH: `/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:${process.env.PATH || ''}`,
          },
          shell: '/bin/bash', // Specify the shell
          maxBuffer: 1024 * 1024 * 10, // Increase buffer size
          timeout: 120000, // 2-minute timeout
        });

        // Check if report was created
        try {
          await nodeFs.access(outputFilePath);
        } catch (error) {
          console.error('Report generation failed:', error);
          throw new Error('Failed to generate Lighthouse report');
        }

        // Update success toast
        await showToast({
          style: Toast.Style.Success,
          title: 'Analysis Complete',
          message: `JSON Report saved to: ${outputFilePath}`,
        });

        // Set the report path to trigger report view
        setReportPath(outputFilePath);
      } catch (execError: any) {
        // More detailed error handling for Lighthouse execution
        console.error('Lighthouse Execution Error:', execError);

        // Specific error handling for common scenarios
        const errorMessage = execError.stderr || execError.message;

        if (
          errorMessage.includes('503') ||
          errorMessage.includes('Unable to reliably load the page')
        ) {
          await showToast({
            style: Toast.Style.Failure,
            title: 'Website Unavailable',
            message:
              'The website is temporarily unavailable or blocking the analysis. Please try again later.',
          });
          return; // Prevent further error handling
        }

        // Generic error handling
        await showToast({
          style: Toast.Style.Failure,
          title: 'Lighthouse Analysis Failed',
          message: errorMessage || 'An unexpected error occurred',
        });
      }
    } catch (error) {
      console.error('Lighthouse Analysis Error:', error);

      // Detailed error handling
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Failed to run Lighthouse analysis';

      // Update failure toast with specific guidance
      await showToast({
        style: Toast.Style.Failure,
        title: 'Analysis Failed',
        message: errorMessage,
      });

      // Additional specific error handling
      if (
        errorMessage.includes('Lighthouse CLI not found') ||
        errorMessage.includes('invalid')
      ) {
        await showToast({
          style: Toast.Style.Failure,
          title: 'Lighthouse CLI Path Issue',
          message:
            'Please set the Lighthouse CLI path manually in the extension settings.',
        });
      }
    }
  }

  async function handleChangeLighthousePath(): Promise<void> {
    await openCommandPreferences();
  }

  return (
    <Form
      actions={
        <ActionPanel title="Extension Preferences">
          <Action.SubmitForm
            title="Run Lighthouse Analysis"
            icon={Icon.MagnifyingGlass}
            onSubmit={handleSubmit}
          />
          <Action
            title="Open Extension Preferences"
            onAction={handleChangeLighthousePath}
            icon={Icon.Gear}
          />
          <Action
            title="Choose Output Directory"
            onAction={handleChooseDirectory}
            icon={Icon.Folder}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="url"
        title="Website URL"
        placeholder="example.com"
        autoFocus
      />

      <Form.Dropdown id="device" title="Device" defaultValue="mobile">
        <Form.Dropdown.Item value="mobile" title="Mobile" />
        <Form.Dropdown.Item value="desktop" title="Desktop" />
      </Form.Dropdown>

      <Form.Checkbox id="performance" label="Performance" defaultValue={true} />
      <Form.Checkbox
        id="accessibility"
        label="Accessibility"
        defaultValue={true}
      />
      <Form.Checkbox
        id="bestPractices"
        label="Best Practices"
        defaultValue={true}
      />
      <Form.Checkbox id="seo" label="SEO" defaultValue={true} />
      <Form.TextField
        id="outputPath"
        title="Download Report Path"
        placeholder="Enter directory path or use the button above"
        value={outputPath}
        onChange={newValue => setOutputPath(newValue)}
      />
      <Form.Description
        title="Choose Output Directory"
        text="Click the 'Choose Output Directory' button in the actions panel above to select a folder where the JSON report will be saved."
      />
    </Form>
  );
}
