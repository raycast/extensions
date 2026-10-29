import {
  Clipboard,
  Toast,
  environment,
  showHUD,
  showToast,
} from '@raycast/api';
import { execFile } from 'node:child_process';
import {
  constants,
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { theme } from './svg';

const execFileAsync = promisify(execFile);

const SCALE = 2;
const PADDING = 16;
const RADIUS = 18;

export const canShareScorecardImage = process.platform === 'darwin';

export type ShareMode = 'copy' | 'save';

type Canvas = { svg: string; side: number; width: number; height: number };

function toExportCanvas(markup: string): Canvas {
  const m = markup.match(
    /^<svg[^>]*\bwidth="([\d.]+)"\s+height="([\d.]+)"[^>]*>([\s\S]*)<\/svg>\s*$/
  );
  if (!m) throw new Error('Unexpected scorecard markup');

  const innerW = Number(m[1]);
  const innerH = Number(m[2]);
  const cardW = innerW + PADDING * 2;
  const cardH = innerH + PADDING * 2;
  const side = Math.max(cardW, cardH);
  const x = (side - cardW) / 2;
  const y = (side - cardH) / 2;
  const background = theme.isDark ? '#1c1c1e' : '#ffffff';
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${side}" height="${side}" viewBox="0 0 ${side} ${side}">` +
    `<rect x="${x}" y="${y}" width="${cardW}" height="${cardH}" rx="${RADIUS}" fill="${background}"/>` +
    `<g transform="translate(${x + PADDING},${y + PADDING})">${m[3]}</g></svg>`;
  return { svg, side, width: cardW, height: cardH };
}

async function rasterize(
  markup: string
): Promise<{ png: string; dir: string }> {
  const dir = mkdtempSync(join(tmpdir(), 'lighthouse-scorecard-'));
  try {
    const canvas = toExportCanvas(markup);
    const svgPath = join(dir, 'scorecard.svg');
    writeFileSync(svgPath, canvas.svg);
    const size = Math.round(canvas.side * SCALE);
    await execFileAsync(
      '/usr/bin/qlmanage',
      ['-t', '-s', String(size), '-o', dir, svgPath],
      { timeout: 20_000 }
    );
    const thumbnail = `${svgPath}.png`;
    if (!existsSync(thumbnail)) {
      throw new Error('QuickLook could not render the scorecard');
    }
    const png = join(dir, 'lighthouse-scorecard.png');
    await execFileAsync(
      '/usr/bin/sips',
      [
        '-c',
        String(Math.round(canvas.height * SCALE)),
        String(Math.round(canvas.width * SCALE)),
        thumbnail,
        '--out',
        png,
      ],
      { timeout: 20_000 }
    );
    if (!existsSync(png)) {
      throw new Error('Could not crop the rendered scorecard');
    }
    return { png, dir };
  } catch (error) {
    rmSync(dir, { recursive: true, force: true });
    throw error;
  }
}

function stamp(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`;
}

function saveToDownloads(path: string, fileName: string): string {
  const downloads = join(homedir(), 'Downloads');
  mkdirSync(downloads, { recursive: true });
  const dot = fileName.lastIndexOf('.');
  const stem = fileName.slice(0, dot);
  const ext = fileName.slice(dot);
  for (let n = 1; n < 100; n++) {
    const target = join(downloads, n === 1 ? fileName : `${stem}-${n}${ext}`);
    try {
      copyFileSync(path, target, constants.COPYFILE_EXCL);
      return target;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
    }
  }
  throw new Error('Too many files with this name in Downloads');
}

export async function shareScorecardImage(
  markup: string,
  mode: ShareMode
): Promise<void> {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: 'Rendering scorecard image…',
  });
  try {
    const { png, dir } = await rasterize(markup);
    try {
      if (mode === 'save') {
        const target = saveToDownloads(png, `lighthouse-${stamp()}.png`);
        toast.style = Toast.Style.Success;
        toast.title = 'Saved to Downloads';
        toast.message = target.split('/').pop();
        return;
      }
      mkdirSync(environment.supportPath, { recursive: true });
      const stable = join(environment.supportPath, 'lighthouse-scorecard.png');
      copyFileSync(png, stable);
      await Clipboard.copy({ file: stable });
      await toast.hide();
      await showHUD('Scorecard image copied');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = 'Could Not Export Scorecard';
    toast.message = error instanceof Error ? error.message : 'Unknown error';
  }
}
