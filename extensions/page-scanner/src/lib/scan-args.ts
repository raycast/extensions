/**
 * The `page-scanner scan` arguments the preferences stand for. A choice left at "As in Page
 * Scanner's settings" passes no flag at all, so the extension's own setting decides, as it does
 * for a scan started in the browser. Kept free of @raycast/api so it can be tested.
 */

export interface ScanPreferences {
  saveDirectory?: string;
  fileName?: string;
  format?: 'pdf' | 'png' | 'jpeg';
  pageSize?: 'a4' | 'letter' | 'auto';
  markdown?: 'none' | 'beside' | 'only';
  scheme?: 'extension' | 'auto' | 'light' | 'dark';
  pageWidth?: 'extension' | 'window' | 'a4' | 'letter';
  hide?: 'extension' | 'all' | 'none';
  afterScan?: 'copy' | 'reveal' | 'open' | 'editor';
  browser?: string;
}

/** What the extension's setting means, as a preference value. */
const EXTENSION = 'extension';

export function scanArgs(
  prefs: ScanPreferences,
  target: { tabId: number; browserId: string; out: string },
): string[] {
  const args = ['scan', '--tab', String(target.tabId), '--browser', target.browserId];
  args.push('--out', target.out);
  const name = prefs.fileName?.trim();
  if (name) args.push('--name', name);
  args.push('--format', prefs.format ?? 'pdf');
  args.push('--page-size', prefs.pageSize ?? 'a4');
  if (prefs.markdown && prefs.markdown !== 'none') args.push('--markdown', prefs.markdown);
  if (prefs.scheme && prefs.scheme !== EXTENSION) args.push('--scheme', prefs.scheme);
  if (prefs.pageWidth && prefs.pageWidth !== EXTENSION) args.push('--page-width', prefs.pageWidth);
  if (prefs.hide && prefs.hide !== EXTENSION) args.push('--hide', prefs.hide);
  if (prefs.afterScan === 'editor') args.push('--open-editor');
  return args;
}
