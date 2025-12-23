import * as childProcess from 'node:child_process';
import * as nodePath from 'node:path';
import * as nodeOs from 'node:os';
import * as nodeFs from 'node:fs/promises';
import * as dns from 'node:dns/promises';
import { promisify } from 'node:util';

const execPromise = promisify(childProcess.exec);

export interface LighthouseScores {
  performance: number;
  accessibility: number;
  bestPractices: number;
  seo: number;
}

export interface LighthouseReport {
  requestedUrl?: string;
  finalUrl?: string;
  fetchTime?: string;
  lighthouseVersion?: string;
  configSettings?: {
    formFactor?: 'mobile' | 'desktop';
  };
  categories?: {
    [key: string]: {
      score: number;
      title?: string;
      auditRefs?: Array<{ id: string; weight: number; group?: string }>;
    };
  };
  audits?: {
    [key: string]: {
      id: string;
      title?: string;
      description?: string;
      displayValue?: string;
      score?: number | null;
      scoreDisplayMode?: string;
      details?: any;
    };
  };
  runWarnings?: string[];
  timing?: { total?: number };
}

export interface LighthouseOptions {
  url: string;
  outputPath?: string;
  lighthousePath?: string;
  device?: 'mobile' | 'desktop';
  categories?: string[];
}

export function expandHomeDir(filePath: string): string {
  if (filePath.startsWith('~')) {
    return nodePath.join(nodeOs.homedir(), filePath.slice(1));
  }
  return filePath;
}

export function processUrl(url: string): string {
  url = url.trim();
  if (/^https?:\/\//i.test(url)) {
    return url;
  }
  url = url.replace(/^www\./i, '');
  return `https://${url}`;
}

export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

export async function findLighthousePath(
  customPath?: string
): Promise<string | null> {
  if (customPath) {
    const expandedPath = expandHomeDir(customPath);
    try {
      await nodeFs.access(expandedPath, nodeFs.constants.X_OK);
      return expandedPath;
    } catch {
      // Continue if invalid
    }
  }

  const potentialPaths = [
    '/opt/homebrew/bin/lighthouse',
    '/usr/local/bin/lighthouse',
    '/usr/bin/lighthouse',
    `${nodeOs.homedir()}/.npm-global/bin/lighthouse`,
    '/opt/homebrew/lib/node_modules/lighthouse/cli/index.js',
    '/usr/local/lib/node_modules/lighthouse/cli/index.js',
  ];

  for (const path of potentialPaths) {
    try {
      await nodeFs.access(path, nodeFs.constants.X_OK);
      return path;
    } catch {
      continue;
    }
  }

  try {
    const { stdout } = await execPromise('which lighthouse');
    const path = stdout.trim();
    if (path) {
      await nodeFs.access(path, nodeFs.constants.X_OK);
      return path;
    }
  } catch {
    // Ignore
  }

  try {
    await execPromise('lighthouse --version');
    return 'lighthouse';
  } catch {
    return null;
  }
}

import * as crypto from 'node:crypto';

// ... (existing imports/interfaces)

export interface LighthouseOptions {
  url: string;
  outputPath?: string;
  lighthousePath?: string;
  device?: 'mobile' | 'desktop';
  categories?: string[];
  force?: boolean; // New option to bypass cache
}

// ... (existing helper functions)

function generateCacheKey(options: LighthouseOptions): string {
  const { url, device, categories } = options;
  const data = JSON.stringify({ url, device, categories: categories?.sort() });
  return crypto.createHash('md5').update(data).digest('hex');
}

export async function runLighthouseAudit(options: LighthouseOptions): Promise<{
  reportPath: string;
  report: LighthouseReport;
  fromCache: boolean;
}> {
  const {
    url,
    outputPath,
    lighthousePath,
    device = 'mobile',
    categories = ['performance', 'accessibility', 'best-practices', 'seo'],
    force = false,
  } = options;

  const formattedUrl = processUrl(url);
  if (!isValidUrl(formattedUrl)) {
    throw new Error('Invalid URL format');
  }

  // Validar que el host resuelva antes de ejecutar Lighthouse
  try {
    const { hostname } = new URL(formattedUrl);
    if (!hostname) throw new Error('Missing hostname');
    await dns.resolve(hostname);
  } catch (e: any) {
    throw new Error(
      'No se pudo resolver el dominio. Verifica que la URL exista y sea correcta.'
    );
  }

  const outputDir = expandHomeDir(outputPath || nodeOs.tmpdir());
  await nodeFs.mkdir(outputDir, { recursive: true });

  // Cache System
  const cacheKey = generateCacheKey({ url: formattedUrl, device, categories });
  const cachePath = nodePath.join(
    outputDir,
    `lighthouse-cache-${cacheKey}.json`
  );

  if (!force) {
    try {
      await nodeFs.access(cachePath);
      const reportContent = await nodeFs.readFile(cachePath, 'utf-8');
      const report = JSON.parse(reportContent) as LighthouseReport;
      return { reportPath: cachePath, report, fromCache: true };
    } catch {
      // Cache miss, proceed to audit
    }
  }

  const finalLighthousePath = await findLighthousePath(lighthousePath);
  if (!finalLighthousePath) {
    throw new Error(
      'Lighthouse CLI not found. Please install it globally: npm install -g lighthouse'
    );
  }

  const tempReportPath = nodePath.join(
    outputDir,
    `lighthouse-report-${Date.now()}.json`
  );

  const command = [
    `"${finalLighthousePath}"`,
    `"${formattedUrl}"`,
    `--output=json`,
    `--output-path="${tempReportPath}"`,
    `--only-categories=${categories.join(',')}`,
    '--quiet',
    '--disable-full-page-screenshot',
    '--throttling-method=devtools',
    '--chrome-flags="--headless --no-sandbox --disable-gpu --disable-web-security"',
  ];

  // Lighthouse v12 solo acepta preset=desktop o perf/experimental; modo móvil es el default.
  if (device === 'desktop') {
    command.push('--preset=desktop');
  }

  try {
    const fullCommand = command.join(' ');
    await execPromise(fullCommand, {
      env: {
        ...process.env,
        PATH: `/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:${process.env.PATH || ''}`,
      },
      maxBuffer: 1024 * 1024 * 10,
      timeout: 120000,
    });

    const reportContent = await nodeFs.readFile(tempReportPath, 'utf-8');
    const report = JSON.parse(reportContent) as LighthouseReport;

    // Save to cache
    await nodeFs.writeFile(cachePath, reportContent);
    // Cleanup temp file
    await nodeFs.unlink(tempReportPath).catch(() => {});

    return { reportPath: cachePath, report, fromCache: false };
  } catch (error: any) {
    throw new Error(`Lighthouse execution failed: ${error.message || error}`);
  }
}
