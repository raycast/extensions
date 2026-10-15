import { environment } from '@raycast/api';
import * as childProcess from 'node:child_process';
import * as nodePath from 'node:path';
import * as nodeOs from 'node:os';
import * as nodeFs from 'node:fs/promises';
import * as dns from 'node:dns/promises';
import * as crypto from 'node:crypto';
import { promisify } from 'node:util';

const execFilePromise = promisify(childProcess.execFile);

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const CACHE_PREFIX = 'lighthouse-cache-';
const MAX_URL_LENGTH = 2048;

const ALLOWED_CATEGORIES = [
  'performance',
  'accessibility',
  'best-practices',
  'seo',
  'pwa',
] as const;
type AllowedCategory = (typeof ALLOWED_CATEGORIES)[number];

export interface AuditDetailItem {
  url?: string;
  type?: string;
  name?: string;
  snippet?: string;
  selector?: string;
  value?: unknown;
  [key: string]: unknown;
}

export interface AuditDetails {
  type?: string;
  items?: AuditDetailItem[];
  headings?: Array<{ key?: string; label?: string; valueType?: string }>;
  overallSavingsMs?: number;
  overallSavingsBytes?: number;
  summary?: { blockingTime?: number };
  [key: string]: unknown;
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
      metricSavings?: Record<string, number>;
      details?: AuditDetails;
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
  force?: boolean;
}

export interface LighthouseResult {
  reportPath: string;
  report: LighthouseReport;
  fromCache: boolean;
}

export function expandHomeDir(filePath: string): string {
  if (filePath.startsWith('~')) {
    return nodePath.join(nodeOs.homedir(), filePath.slice(1));
  }
  return filePath;
}

export function processUrl(url: string): string {
  url = url.trim();
  if (url.length > MAX_URL_LENGTH) {
    throw new Error(
      `URL exceeds maximum length of ${MAX_URL_LENGTH} characters`
    );
  }
  if (/^https?:\/\//i.test(url)) {
    return url;
  }
  url = url.replace(/^www\./i, '');
  return `https://${url}`;
}

export function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

function sanitizeCategories(categories: string[]): string[] {
  return categories.filter((c): c is AllowedCategory =>
    (ALLOWED_CATEGORIES as readonly string[]).includes(c)
  );
}

export async function findLighthousePath(
  customPath?: string
): Promise<string | null> {
  if (customPath?.trim()) {
    const expandedPath = expandHomeDir(customPath.trim());
    const hint =
      'Lighthouse Path must point to the Lighthouse CLI, not Chrome or another browser. Clear this preference to auto-detect Lighthouse.';
    if (/\.app(?:\/|$)/i.test(expandedPath)) {
      throw new Error(hint);
    }
    try {
      await nodeFs.access(expandedPath, nodeFs.constants.X_OK);
      const { stdout } = await execFilePromise(expandedPath, ['--version'], {
        timeout: 10_000,
        maxBuffer: 64 * 1024,
        env: {
          ...process.env,
          PATH: `/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:${process.env.PATH || ''}`,
        },
      });
      if (!/^\d+\.\d+\.\d+(?:-[\w.-]+)?$/.test(stdout.trim())) {
        throw new Error('The executable did not return a Lighthouse version.');
      }
      return expandedPath;
    } catch (error) {
      throw new Error(
        `${hint} ${error instanceof Error ? error.message : String(error)}`
      );
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
    const { stdout } = await execFilePromise('which', ['lighthouse']);
    const path = stdout.trim();
    if (path) {
      await nodeFs.access(path, nodeFs.constants.X_OK);
      return path;
    }
  } catch {
    // Ignore
  }

  try {
    await execFilePromise('lighthouse', ['--version']);
    return 'lighthouse';
  } catch {
    return null;
  }
}

function generateCacheKey(
  options: Pick<LighthouseOptions, 'url' | 'device' | 'categories'>
): string {
  const { url, device, categories } = options;
  const sortedCategories = [...(categories || [])].sort();
  const data = JSON.stringify({ url, device, categories: sortedCategories });
  return crypto.createHash('md5').update(data).digest('hex');
}

function cacheDirectory(): string {
  return nodePath.join(environment.supportPath, 'cache');
}

function pad2(value: number): string {
  return String(value).padStart(2, '0');
}

function stampFromDate(date: Date): string {
  return `${date.getFullYear()}${pad2(date.getMonth() + 1)}${pad2(date.getDate())}-${pad2(date.getHours())}${pad2(date.getMinutes())}${pad2(date.getSeconds())}`;
}

function readableReportFileName(url: string, fetchTime?: string): string {
  let host = 'report';
  try {
    host = new URL(url).hostname || 'report';
  } catch {
    // Keep the fallback name when the URL cannot be parsed.
  }
  const safeHost = host.replace(/[^a-zA-Z0-9.-]/g, '_').slice(0, 80);
  const date = fetchTime ? new Date(fetchTime) : new Date();
  const stamp = Number.isNaN(date.getTime())
    ? stampFromDate(new Date())
    : stampFromDate(date);
  return `lighthouse-${safeHost}-${stamp}.json`;
}

async function cleanExpiredCache(outputDir: string): Promise<void> {
  try {
    const entries = await nodeFs.readdir(outputDir);
    const now = Date.now();
    for (const entry of entries) {
      if (!entry.startsWith(CACHE_PREFIX) || !entry.endsWith('.json')) continue;
      const fullPath = nodePath.join(outputDir, entry);
      try {
        const stats = await nodeFs.stat(fullPath);
        if (now - stats.mtimeMs > CACHE_TTL_MS) {
          await nodeFs.unlink(fullPath).catch(() => {});
        }
      } catch {
        // Skip unreadable entries
      }
    }
  } catch {
    // Non-fatal: cache cleanup is best-effort
  }
}

export async function runLighthouseAudit(
  options: LighthouseOptions
): Promise<LighthouseResult> {
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
    throw new Error('Invalid URL format. Must be a valid http or https URL.');
  }

  const sanitizedCategories = sanitizeCategories(categories);
  if (sanitizedCategories.length === 0) {
    throw new Error(
      `No valid categories selected. Allowed: ${ALLOWED_CATEGORIES.join(', ')}`
    );
  }

  const sanitizedOutputPath = (() => {
    const raw = outputPath || nodeOs.tmpdir();
    const trimmed = raw.trim();
    return trimmed.replace(/^"|"$/g, '').replace(/^'|'$/g, '');
  })();

  const outputDir = expandHomeDir(sanitizedOutputPath);
  await nodeFs.mkdir(outputDir, { recursive: true });

  const cacheDir = cacheDirectory();
  await nodeFs.mkdir(cacheDir, { recursive: true });
  await cleanExpiredCache(cacheDir);

  const cacheKey = generateCacheKey({
    url: formattedUrl,
    device,
    categories: sanitizedCategories,
  });
  const cachePath = nodePath.join(cacheDir, `${CACHE_PREFIX}${cacheKey}.json`);

  if (!force) {
    try {
      const stats = await nodeFs.stat(cachePath);
      const age = Date.now() - stats.mtimeMs;
      if (age < CACHE_TTL_MS) {
        const reportContent = await nodeFs.readFile(cachePath, 'utf-8');
        const report = JSON.parse(reportContent) as LighthouseReport;
        const reportPath = nodePath.join(
          outputDir,
          readableReportFileName(formattedUrl, report.fetchTime)
        );
        try {
          await nodeFs.access(reportPath);
        } catch {
          await nodeFs.writeFile(reportPath, reportContent);
        }
        return { reportPath, report, fromCache: true };
      }
    } catch {
      // Cache miss or expired, proceed to audit
    }
  }

  try {
    const { hostname } = new URL(formattedUrl);
    if (!hostname) throw new Error('Missing hostname');
    await dns.lookup(hostname);
  } catch {
    throw new Error(
      'Could not resolve domain. Verify the URL exists and is correct.'
    );
  }

  const finalLighthousePath = await findLighthousePath(lighthousePath);
  if (!finalLighthousePath) {
    throw new Error(
      'Lighthouse CLI not found. Please install it globally: npm install -g lighthouse'
    );
  }

  const tempReportPath = nodePath.join(
    cacheDir,
    `lighthouse-tmp-${Date.now()}.json`
  );

  const args = [
    formattedUrl,
    '--output=json',
    `--output-path=${tempReportPath}`,
    `--only-categories=${sanitizedCategories.join(',')}`,
    '--quiet',
    '--disable-full-page-screenshot',
    '--throttling-method=devtools',
    '--chrome-flags=--headless --disable-gpu',
  ];

  if (device === 'desktop') {
    args.push('--preset=desktop');
  }

  try {
    await execFilePromise(finalLighthousePath, args, {
      env: {
        ...process.env,
        PATH: `/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:${process.env.PATH || ''}`,
      },
      maxBuffer: 1024 * 1024 * 10,
      timeout: 120000,
    });

    const reportContent = await nodeFs.readFile(tempReportPath, 'utf-8');
    const report = JSON.parse(reportContent) as LighthouseReport;
    const reportPath = nodePath.join(
      outputDir,
      readableReportFileName(formattedUrl, report.fetchTime)
    );

    await nodeFs.writeFile(cachePath, reportContent);
    await nodeFs.writeFile(reportPath, reportContent);
    await nodeFs.unlink(tempReportPath).catch(() => {});

    return { reportPath, report, fromCache: false };
  } catch (error: unknown) {
    await nodeFs.unlink(tempReportPath).catch(() => {});

    const message = error instanceof Error ? error.message : String(error);
    const stderr =
      error && typeof error === 'object' && 'stderr' in error
        ? String((error as { stderr?: string }).stderr || '')
        : '';
    const combined = `${message}\n${stderr}`;

    // ENOENT can refer to the executable, Chrome, or the report file.
    // Preserve the original diagnostic instead of blaming the output folder.
    if (combined.includes('ENOENT')) {
      throw new Error(`Lighthouse execution failed: ${combined.trim()}`);
    }
    if (combined.includes('No Chrome installations found')) {
      throw new Error(
        'No Chrome installations found. Install Chrome: brew install --cask google-chrome'
      );
    }
    throw new Error(`Lighthouse execution failed: ${message}`);
  }
}
