/**
 * Redirect rule generator for Apache (.htaccess with mod_rewrite), nginx,
 * Netlify (_redirects) and Vercel (vercel.json). Input is one rule per line:
 *   /old-page /new-page [301|302|307|308]
 *   /blog/* /news/:splat 301      (prefix rule, rest of the path carried over)
 * Rules are checked for loops, chains and duplicates before output.
 */

import { msg } from '../../msg';

export type RedirectCode = 301 | 302 | 307 | 308;
export const REDIRECT_CODES: RedirectCode[] = [301, 302, 307, 308];

export type RedirectRule = {
  from: string;
  to: string;
  code: RedirectCode;
  /** from ended in "/*": match the prefix and carry the rest of the path. */
  prefix: boolean;
  line: number;
};

export type RedirectIssue = { line: number; level: 'error' | 'warning'; message: string };

/** An issue's message as interface text with {placeholders} (StepMsg shape), for pages to translate. */
export type IssueMsg = { text: string; vars: Record<string, string | number> };
const ISSUE_MSG = new WeakMap<RedirectIssue, IssueMsg>();
/** The translatable form of an issue made by parseRules (kept out of the issue object, so JSON output is unchanged). */
export const issueMessage = (i: RedirectIssue): IssueMsg | undefined => ISSUE_MSG.get(i);
function issue(line: number, level: 'error' | 'warning', text: string, vars: IssueMsg['vars'] = {}): RedirectIssue {
  const out: RedirectIssue = { line, level, message: text.replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k])) };
  ISSUE_MSG.set(out, { text, vars });
  return out;
}

export type Platform = 'apache' | 'nginx' | 'netlify' | 'vercel';

export const PLATFORMS: { id: Platform; name: string; file: string }[] = [
  { id: 'apache', name: msg('Apache .htaccess'), file: '.htaccess' },
  { id: 'nginx', name: msg('Nginx'), file: msg('nginx.conf (server block)') },
  { id: 'netlify', name: msg('Netlify _redirects'), file: '_redirects' },
  { id: 'vercel', name: msg('Vercel vercel.json'), file: 'vercel.json' },
];

export type SiteRules = {
  /** Send http:// to https:// */
  forceHttps?: boolean;
  /** Canonical host: redirect the other variant to this one. */
  host?: 'none' | 'www' | 'apex';
  /** Your apex domain, e.g. example.com (needed for host rules). */
  domain?: string;
};

export type RedirectOptions = {
  defaultCode?: RedirectCode;
  /** Keep the incoming ?query on the redirect (default true). */
  keepQuery?: boolean;
  site?: SiteRules;
};

/** Strip scheme and host from a pasted absolute "from" URL. */
function pathOnly(s: string): { path: string; hadHost: boolean } {
  const m = s.match(/^https?:\/\/[^/]+(\/.*)?$/i);
  if (m) return { path: m[1] || '/', hadHost: true };
  return { path: s, hadHost: false };
}

export function parseRules(text: string, defaultCode: RedirectCode = 301): { rules: RedirectRule[]; issues: RedirectIssue[] } {
  const rules: RedirectRule[] = [];
  const issues: RedirectIssue[] = [];
  text.split(/\r?\n/).forEach((raw, idx) => {
    const line = idx + 1;
    const t = raw.trim();
    if (!t || t.startsWith('#')) return;
    const parts = t.split(/[\s,]+/).filter(Boolean);
    if (parts.length < 2) {
      issues.push(issue(line, 'error', msg('Needs a source and a destination separated by a space, comma or tab.')));
      return;
    }
    let code = defaultCode;
    if (parts.length >= 3) {
      const c = Number(parts[2].replace(/!$/, ''));
      if (!REDIRECT_CODES.includes(c as RedirectCode)) {
        issues.push(issue(line, 'error', msg('"{code}" is not a redirect code. Use 301, 302, 307 or 308.'), { code: parts[2] }));
        return;
      }
      code = c as RedirectCode;
    }
    const src = pathOnly(parts[0]);
    let from = src.path;
    if (src.hadHost) issues.push(issue(line, 'warning', msg('Source had a scheme and host; only the path is used. Use the host options for domain moves.')));
    if (!from.startsWith('/')) {
      issues.push(issue(line, 'error', msg('Source "{source}" must start with "/".'), { source: parts[0] }));
      return;
    }
    if (from.includes('?')) {
      issues.push(issue(line, 'warning', msg('Query strings in the source are ignored by these rule types; the path before "?" is matched.')));
      from = from.split('?')[0];
    }
    let prefix = false;
    if (from.endsWith('/*') || from.endsWith('*')) {
      prefix = true;
      from = from.replace(/\*$/, '');
    } else if (from.includes('*')) {
      issues.push(issue(line, 'error', msg('A "*" is only allowed at the end of the source.')));
      return;
    }
    let to = parts[1];
    if (!to.startsWith('/') && !/^https?:\/\//i.test(to)) {
      issues.push(issue(line, 'error', msg('Destination "{destination}" must start with "/" or http(s)://.'), { destination: to }));
      return;
    }
    to = to.replace(/:splat$/, '').replace(/\*$/, '');
    rules.push({ from, to, code, prefix, line });
  });

  // Loops, chains and duplicates
  const seen = new Map<string, number>();
  for (const r of rules) {
    const key = `${r.prefix ? 'P' : 'E'}${normPath(r.from)}`;
    if (seen.has(key)) issues.push(issue(r.line, 'warning', msg('Duplicate source; line {first} already redirects {source}. The first matching rule wins.'), { first: seen.get(key) ?? '', source: r.from }));
    else seen.set(key, r.line);
    if (!r.prefix && !/^https?:/i.test(r.to) && normPath(r.to) === normPath(r.from)) {
      issues.push(issue(r.line, 'error', msg('Redirects to itself, which loops forever.')));
    }
    if (r.prefix && !/^https?:/i.test(r.to) && insidePrefix(normPath(r.to), normPath(r.from))) {
      issues.push(issue(r.line, 'error', msg('The destination is inside the prefix it redirects, so every redirect matches again and loops.')));
    }
  }
  for (const r of rules) {
    if (/^https?:/i.test(r.to) || r.prefix) continue;
    const next = rules.find((o) => o !== r && !o.prefix && normPath(o.from) === normPath(r.to));
    if (next && normPath(next.to) !== normPath(r.from)) {
      issues.push(issue(r.line, 'warning', msg('Chain: {from} → {to} → {next}. Point line {line} straight at {next} to save a round trip.'), { from: r.from, to: r.to, next: next.to, line: r.line }));
    } else if (next) {
      issues.push(issue(r.line, 'error', msg('Loop: {from} and {other} redirect to each other.'), { from: r.from, other: next.from }));
    }
  }
  issues.sort((a, b) => a.line - b.line);
  return { rules, issues };
}

/** Does `path` fall under the prefix rule `prefix` (whole path segments, so /blog-new is not under /blog)? */
function insidePrefix(path: string, prefix: string): boolean {
  return prefix === '/' || path === prefix || path.startsWith(prefix.endsWith('/') ? prefix : prefix + '/');
}

/** Paths compared without a trailing slash (except root). */
function normPath(p: string): string {
  const s = p.split('?')[0];
  return s.length > 1 ? s.replace(/\/+$/, '') : s;
}

const reEscape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// ---------- Apache (mod_rewrite) ----------

function apache(rules: RedirectRule[], o: Required<Omit<RedirectOptions, 'site'>> & { site: SiteRules }): string {
  const lines = ['# Apache 2.4 .htaccess (needs mod_rewrite and AllowOverride FileInfo)', 'RewriteEngine On', ''];
  const site = siteBlock('apache', o.site);
  if (site) lines.push(site, '');
  const qsd = o.keepQuery ? '' : ',QSD';
  for (const r of rules) {
    // In .htaccess the pattern is matched against the path without its leading slash.
    const base = reEscape(normPath(r.from).replace(/^\//, ''));
    if (r.prefix) {
      const target = r.to.endsWith('/') ? r.to : r.to + '/';
      const pat = base ? `^${base}/(.*)$` : '^(.*)$';
      lines.push(`RewriteRule ${pat} ${target}$1 [R=${r.code},L${qsd}]`);
    } else {
      lines.push(`RewriteRule ^${base}/?$ ${r.to} [R=${r.code},L${qsd}]`);
    }
  }
  return lines.join('\n').trimEnd() + '\n';
}

// ---------- nginx ----------

function nginx(rules: RedirectRule[], o: Required<Omit<RedirectOptions, 'site'>> & { site: SiteRules }): string {
  const lines = ['# Inside the server { } block for your site', ''];
  const site = siteBlock('nginx', o.site);
  if (site) lines.push(site, '');
  const args = o.keepQuery ? '$is_args$args' : '';
  for (const r of rules) {
    const p = normPath(r.from);
    if (r.prefix) {
      const target = r.to.endsWith('/') ? r.to : r.to + '/';
      const pat = p === '/' ? '^/(.*)$' : `^${reEscape(p)}/(.*)$`;
      lines.push(`location ~ ${pat} {`, `    return ${r.code} ${target}$1${args};`, '}');
    } else {
      lines.push(`location = ${p} {`, `    return ${r.code} ${r.to}${args};`, '}');
      if (p !== '/') lines.push(`location = ${p}/ {`, `    return ${r.code} ${r.to}${args};`, '}');
    }
  }
  return lines.join('\n').trimEnd() + '\n';
}

// ---------- Netlify ----------

function netlify(rules: RedirectRule[], o: Required<Omit<RedirectOptions, 'site'>> & { site: SiteRules }): string {
  const lines = ['# public/_redirects (or the publish directory). First match wins.'];
  const site = siteBlock('netlify', o.site);
  if (site) lines.push(site);
  const w = Math.max(10, ...rules.map((r) => (r.prefix ? normPath(r.from) + '/*' : normPath(r.from)).length));
  for (const r of rules) {
    const from = r.prefix ? `${normPath(r.from) === '/' ? '' : normPath(r.from)}/*` : normPath(r.from);
    const to = r.prefix ? `${r.to.endsWith('/') ? r.to : r.to + '/'}:splat` : r.to;
    lines.push(`${from.padEnd(w)}  ${to}  ${r.code}`);
  }
  return lines.join('\n') + '\n';
}

// ---------- Vercel ----------

function vercel(rules: RedirectRule[], o: Required<Omit<RedirectOptions, 'site'>> & { site: SiteRules }): string {
  const redirects: Record<string, unknown>[] = [];
  const s = o.site;
  const domain = cleanDomain(s.domain);
  if (s.host && s.host !== 'none' && domain) {
    const apex = domain.replace(/^www\./, '');
    const wrong = s.host === 'www' ? apex : `www.${apex}`;
    const right = s.host === 'www' ? `www.${apex}` : apex;
    redirects.push({ source: '/:path(.*)', has: [{ type: 'host', value: wrong }], destination: `https://${right}/:path`, permanent: true });
  }
  for (const r of rules) {
    const code = r.code === 308 ? { permanent: true } : r.code === 307 ? { permanent: false } : { statusCode: r.code };
    if (r.prefix) {
      const base = normPath(r.from) === '/' ? '' : normPath(r.from);
      const to = r.to.endsWith('/') ? r.to.slice(0, -1) : r.to;
      redirects.push({ source: `${base}/:path*`, destination: `${to}/:path*`, ...code });
    } else {
      redirects.push({ source: normPath(r.from), destination: r.to, ...code });
    }
  }
  return JSON.stringify({ redirects }, null, 2) + '\n';
}

/** "https://www.example.com/path" -> "www.example.com" */
function cleanDomain(d: string | undefined): string {
  return (d || '').trim().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
}

function siteBlock(p: Platform, s: SiteRules): string {
  const domain = cleanDomain(s.domain);
  const apex = domain.replace(/^www\./, '');
  const host = s.host && s.host !== 'none' && apex ? s.host : 'none';
  const canon = host === 'www' ? `www.${apex}` : apex;
  if (p === 'apache') {
    const out: string[] = [];
    if (host !== 'none') {
      const wrongRe = host === 'www' ? `^${reEscape(apex)}$` : `^www\\.${reEscape(apex)}$`;
      out.push('# Canonical host', `RewriteCond %{HTTP_HOST} ${wrongRe} [NC]`, `RewriteRule ^(.*)$ https://${canon}/$1 [R=301,L]`);
    }
    if (s.forceHttps) {
      out.push('# Force HTTPS', 'RewriteCond %{HTTPS} off', `RewriteRule ^(.*)$ https://${host !== 'none' ? canon : '%{HTTP_HOST}'}/$1 [R=301,L]`);
    }
    return out.join('\n');
  }
  if (p === 'nginx') {
    const out: string[] = [];
    if (s.forceHttps || host !== 'none') {
      out.push('# Put these in their own server blocks, next to your main HTTPS server { }');
    }
    if (s.forceHttps) {
      out.push(
        '# server {',
        '#     listen 80;',
        `#     server_name ${host !== 'none' ? `${apex} www.${apex}` : 'example.com www.example.com'};`,
        `#     return 301 https://${host !== 'none' ? canon : '$host'}$request_uri;`,
        '# }',
      );
    }
    if (host !== 'none') {
      out.push(
        '# server {',
        '#     listen 443 ssl;',
        `#     server_name ${host === 'www' ? apex : `www.${apex}`};`,
        '#     # ssl_certificate lines for that name',
        `#     return 301 https://${canon}$request_uri;`,
        '# }',
      );
    }
    return out.join('\n');
  }
  if (p === 'netlify') {
    const out: string[] = [];
    if (s.forceHttps) out.push('# HTTPS is enforced by Netlify once a certificate is active; no rule needed.');
    if (host !== 'none') {
      const wrong = host === 'www' ? apex : `www.${apex}`;
      out.push(`https://${wrong}/*  https://${canon}/:splat  301!`, `http://${wrong}/*  https://${canon}/:splat  301!`);
    }
    return out.join('\n');
  }
  return '';
}

export function generateRedirects(text: string, platform: Platform, options: RedirectOptions = {}): { output: string; rules: RedirectRule[]; issues: RedirectIssue[]; notes: string[] } {
  const o = { defaultCode: options.defaultCode ?? 301, keepQuery: options.keepQuery ?? true, site: options.site ?? {} };
  const { rules, issues } = parseRules(text, o.defaultCode);
  const fns = { apache, nginx, netlify, vercel };
  const output = fns[platform](rules, o);
  return { output, rules, issues, notes: platformNotes(platform, o.keepQuery, o.site) };
}

export function platformNotes(p: Platform, keepQuery: boolean, site: SiteRules): string[] {
  const n: string[] = [];
  if (p === 'apache') {
    n.push(msg('mod_rewrite appends the original query string unless the target has its own "?" or the QSD flag (added when "keep query string" is off).'));
    n.push(msg('Rules match with or without a trailing slash. Test with curl -I before relying on a 301, because browsers cache permanent redirects.'));
  }
  if (p === 'nginx') {
    n.push(msg('"location =" is an exact match and is checked before regex locations; the second block catches the trailing-slash version.'));
    n.push(keepQuery ? msg('$is_args$args keeps the query string; "return" does not add it on its own.') : msg('The query string is dropped because "return" does not add it.'));
    n.push(msg('Run nginx -t, then reload. Absolute or relative targets both work.'));
  }
  if (p === 'netlify') {
    n.push(msg('Netlify matches with or without a trailing slash and passes the query string through for 301 and 302 by default.'));
    n.push(msg('A rule does not fire if a file exists at the source path (shadowing). Add "!" after the code (301!) to force it.'));
    if (!keepQuery) n.push(msg('Netlify has no switch to drop the query string for a plain rule; it is passed through regardless.'));
  }
  if (p === 'vercel') {
    n.push(msg('"permanent": true sends 308 and false sends 307; 301 and 302 use "statusCode". Merge the "redirects" array into your existing vercel.json.'));
    n.push(msg('Next.js projects can put the same objects in next.config.js redirects() instead.'));
    if (site.forceHttps) n.push(msg('Vercel serves every domain over HTTPS and redirects HTTP automatically; no rule needed.'));
  }
  return n;
}
