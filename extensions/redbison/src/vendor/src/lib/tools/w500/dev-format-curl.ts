/**
 * cURL command to code: a shell-aware parser for the curl options people
 * actually paste (browser "Copy as cURL", API docs) and generators for
 * fetch, Axios, Python requests, Go net/http and PHP ext-curl.
 *
 * The parser follows curl's documented semantics: -d implies POST and
 * application/x-www-form-urlencoded, repeated -d values join with "&",
 * --json sets both JSON headers, -G moves data into the query string, -F
 * builds multipart/form-data, -u is HTTP Basic auth, and so on.
 *
 * No React, no "@/" imports: this file is also bundled into the MCP server.
 */

export type CurlTarget = 'fetch' | 'axios' | 'python' | 'go' | 'php';

export interface FormPart {
  name: string;
  value: string;
  /** Set when the part uploads a file (-F name=@path). */
  file?: string;
  contentType?: string;
  filename?: string;
}

export interface ParsedCurl {
  url: string;
  method: string;
  /** Header name/value pairs in order, including those curl adds for -d, --json, -u, -A, -e and -b. */
  headers: [string, string][];
  body?: string;
  /** True when the body came from --json or Content-Type is JSON. */
  bodyIsJson: boolean;
  /** Body read from a file (-d @file, --data-binary @file, -T file). */
  bodyFile?: string;
  form: FormPart[];
  auth?: { user: string; password: string };
  insecure: boolean;
  followRedirects: boolean;
  compressed: boolean;
  /** --max-time in seconds. */
  timeout?: number;
  head: boolean;
  warnings: string[];
}

export class CurlParseError extends Error {}

/* ------------------------------------------------------------------ */
/* Shell words                                                         */
/* ------------------------------------------------------------------ */

function decodeAnsiC(s: string): string {
  return s.replace(/\\(x[0-9a-fA-F]{1,2}|u[0-9a-fA-F]{1,4}|U[0-9a-fA-F]{1,8}|[0-7]{1,3}|.)/g, (m, e: string) => {
    // bash keeps "\x", "\u" and "\U" without hex digits, and code points past U+10FFFF, as written.
    if (/^[xuU]/.test(e) && (e.length === 1 || parseInt(e.slice(1), 16) > 0x10ffff)) return m;
    switch (e[0]) {
      case 'n':
        return '\n';
      case 't':
        return '\t';
      case 'r':
        return '\r';
      case 'a':
        return '\x07';
      case 'b':
        return '\b';
      case 'e':
      case 'E':
        return '\x1b';
      case 'f':
        return '\f';
      case 'v':
        return '\v';
      case 'x':
        return String.fromCharCode(parseInt(e.slice(1), 16));
      case 'u':
      case 'U':
        return String.fromCodePoint(parseInt(e.slice(1), 16));
      case '\\':
      case "'":
      case '"':
      case '?':
        return e;
      default:
        if (/^[0-7]+$/.test(e)) return String.fromCharCode(parseInt(e, 8));
        return m; // bash keeps unknown escapes such as \q with their backslash
    }
  });
}

/** Splits a POSIX shell command line (bash/zsh quoting), joining "\" line continuations. */
export function splitShellWords(cmd: string): string[] {
  const words: string[] = [];
  let cur = '';
  let inWord = false;
  let i = 0;
  const s = cmd;
  while (i < s.length) {
    const c = s[i];
    if (c === '\\' && (s[i + 1] === '\n' || (s[i + 1] === '\r' && s[i + 2] === '\n'))) {
      i += s[i + 1] === '\r' ? 3 : 2;
      continue;
    }
    if (/\s/.test(c)) {
      if (inWord) {
        words.push(cur);
        cur = '';
        inWord = false;
      }
      i++;
      continue;
    }
    if (c === '#' && !inWord) {
      while (i < s.length && s[i] !== '\n') i++;
      continue;
    }
    inWord = true;
    if (c === "'") {
      const e = s.indexOf("'", i + 1);
      if (e < 0) throw new CurlParseError('Unclosed single quote.');
      cur += s.slice(i + 1, e);
      i = e + 1;
    } else if (c === '$' && s[i + 1] === "'") {
      let j = i + 2;
      while (j < s.length && s[j] !== "'") j += s[j] === '\\' ? 2 : 1;
      if (j >= s.length) throw new CurlParseError("Unclosed $'...' string.");
      cur += decodeAnsiC(s.slice(i + 2, j));
      i = j + 1;
    } else if (c === '"') {
      let j = i + 1;
      while (j < s.length && s[j] !== '"') {
        if (s[j] === '\\' && j + 1 < s.length) {
          const n = s[j + 1];
          if (n === '\n') {
            j += 2;
            continue;
          }
          cur += '$`"\\'.includes(n) ? n : '\\' + n;
          j += 2;
          continue;
        }
        cur += s[j];
        j++;
      }
      if (j >= s.length) throw new CurlParseError('Unclosed double quote.');
      i = j + 1;
    } else if (c === '\\') {
      cur += s[i + 1] ?? '';
      i += 2;
    } else {
      cur += c;
      i++;
    }
  }
  if (inWord) words.push(cur);
  return words;
}

/**
 * Splits a Windows cmd.exe line as written by Chrome's "Copy as cURL (cmd)".
 * cmd removes ^ escapes first, then curl.exe splits arguments with the
 * Microsoft C runtime rules: " toggles quoting and \" is a literal quote.
 */
export function splitCmdWords(cmd: string): string[] {
  const s = cmd.replace(/\^\r?\n/g, '').replace(/\^([\s\S])/g, '$1');
  const words: string[] = [];
  let cur = '';
  let inWord = false;
  let quoted = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c === '\\' && s[i + 1] === '"') {
      cur += '"';
      i++;
      inWord = true;
      continue;
    }
    if (c === '"') {
      quoted = !quoted;
      inWord = true;
      continue;
    }
    if (!quoted && /\s/.test(c)) {
      if (inWord) words.push(cur);
      cur = '';
      inWord = false;
      continue;
    }
    cur += c;
    inWord = true;
  }
  if (quoted) throw new CurlParseError('Unclosed double quote.');
  if (inWord) words.push(cur);
  return words;
}

/* ------------------------------------------------------------------ */
/* Options                                                             */
/* ------------------------------------------------------------------ */

const SHORT_WITH_ARG = new Set(['X', 'H', 'd', 'F', 'u', 'b', 'c', 'A', 'e', 'o', 'm', 'x', 'T', 'w', 'E', 'r', 'U', 'K', 'C', 'y', 'Y', 'z', 'D', 'P', 'Q', 't']);
const LONG_ALIAS: Record<string, string> = {
  request: 'X', header: 'H', data: 'd', 'data-ascii': 'd', form: 'F', user: 'u', cookie: 'b', 'user-agent': 'A', referer: 'e',
  output: 'o', 'max-time': 'm', proxy: 'x', 'upload-file': 'T', 'write-out': 'w', cert: 'E', get: 'G', head: 'I', insecure: 'k',
  location: 'L', silent: 's', 'show-error': 'S', verbose: 'v', include: 'i', fail: 'f', globoff: 'g', 'cookie-jar': 'c', range: 'r',
  'proxy-user': 'U', config: 'K', 'continue-at': 'C', 'dump-header': 'D', 'remote-name': 'O',
};
const LONG_WITH_ARG = new Set([
  'data-raw', 'data-binary', 'data-urlencode', 'json', 'form-string', 'url', 'connect-timeout', 'oauth2-bearer', 'key', 'cacert', 'resolve',
  'retry', 'retry-delay', 'retry-max-time', 'limit-rate', 'interface', 'url-query', 'aws-sigv4', 'proto', 'proto-redir', 'max-redirs', 'max-filesize',
  'expect100-timeout', 'keepalive-time', 'local-port', 'noproxy', 'pass', 'pinnedpubkey', 'request-target', 'unix-socket', 'abstract-unix-socket',
  'trace', 'trace-ascii', 'stderr', 'variable', 'connect-to', 'dns-servers', 'doh-url', 'ciphers', 'tls-max', 'cert-type', 'key-type', 'capath',
  'happy-eyeballs-timeout-ms', 'speed-limit', 'speed-time', 'socks5', 'socks5-hostname', 'preproxy', 'proxy-header', 'output-dir', 'etag-save', 'etag-compare',
]);
const IGNORED = new Set(['s', 'S', 'v', 'i', 'f', 'g', 'o', 'w', 'O', 'D', 'c', 'silent', 'show-error', 'verbose', 'include', 'fail', 'globoff', 'output', 'write-out',
  'remote-name', 'dump-header', 'cookie-jar', 'progress-bar', 'no-progress-meter', 'fail-with-body', 'no-buffer', 'N', 'trace', 'trace-ascii', 'stderr', 'http1.1', 'http2',
  'http2-prior-knowledge', 'http3', 'http1.0', '0', 'tlsv1.2', 'tlsv1.3', 'ipv4', 'ipv6', '4', '6', 'retry', 'retry-delay', 'retry-max-time', 'retry-all-errors',
  'retry-connrefused', 'no-keepalive', 'tcp-nodelay', 'path-as-is', 'create-dirs', 'remote-time', 'remote-header-name', 'J', 'R', 'q', 'disable', 'xattr', 'styled-output', 'no-styled-output']);

/** curl_easy_escape: everything except A-Z a-z 0-9 - . _ ~ becomes %XX (a space is %20). */
const urlEncode = (s: string) => encodeURIComponent(s).replace(/[!'()*]/g, (c) => '%' + c.charCodeAt(0).toString(16).toUpperCase());

/** --data-urlencode forms: "content", "=content", "name=content", "@file", "name@file". */
function encodeDataUrlencode(arg: string, warnings: string[]): string {
  const eq = arg.indexOf('=');
  const at = arg.indexOf('@');
  if (eq === 0) return urlEncode(arg.slice(1));
  if (eq > 0 && (at < 0 || eq < at)) return `${arg.slice(0, eq)}=${urlEncode(arg.slice(eq + 1))}`;
  if (at >= 0) {
    warnings.push(`--data-urlencode reads "${arg.slice(at + 1)}" from a file; replace FILE_CONTENTS in the code with that file's URL-encoded contents.`);
    return at === 0 ? 'FILE_CONTENTS' : `${arg.slice(0, at)}=FILE_CONTENTS`;
  }
  return urlEncode(arg);
}

function parseFormPart(arg: string, literal: boolean): FormPart {
  const eq = arg.indexOf('=');
  if (eq < 0) throw new CurlParseError(`-F "${arg}" needs the form name=value.`);
  const name = arg.slice(0, eq);
  const rest = arg.slice(eq + 1);
  if (literal) return { name, value: rest };
  if (rest.startsWith('@') || rest.startsWith('<')) {
    const segs = rest.slice(1).split(';');
    const part: FormPart = { name, value: '', file: segs[0] };
    for (const seg of segs.slice(1)) {
      const [k, ...v] = seg.split('=');
      if (k.trim() === 'type') part.contentType = v.join('=');
      if (k.trim() === 'filename') part.filename = v.join('=').replace(/^"|"$/g, '');
    }
    if (rest.startsWith('<')) {
      // "<file" sends the file's text as a normal field value.
      return { name, value: `CONTENTS_OF_${segs[0]}`, contentType: part.contentType };
    }
    return part;
  }
  const segs = rest.split(';type=');
  return segs.length > 1 ? { name, value: segs[0], contentType: segs[1] } : { name, value: rest };
}

const FILE_MARK = '\u0000file\u0000';

const hasHeader = (h: [string, string][], name: string) => h.some(([k]) => k.toLowerCase() === name.toLowerCase());

/** Parses a curl command line (bash, zsh or Windows cmd quoting). */
export function parseCurl(command: string): ParsedCurl {
  const trimmed = command.trim();
  if (!trimmed) throw new CurlParseError('Paste a curl command.');
  const cmdStyle = /\^"/.test(trimmed) || /\s\^\r?\n/.test(trimmed);
  let words = cmdStyle ? splitCmdWords(trimmed) : splitShellWords(trimmed);
  // Drop a leading "$ " prompt and anything before "curl".
  const ci = words.findIndex((w) => /(^|[\\/])curl(\.exe)?$/i.test(w));
  if (ci < 0) throw new CurlParseError('This does not look like a curl command: the word "curl" is missing.');
  words = words.slice(ci + 1);

  const warnings: string[] = [];
  const headers: [string, string][] = [];
  const data: string[] = [];
  const jsonData: string[] = [];
  const query: string[] = [];
  const form: FormPart[] = [];
  let url = '';
  let method = '';
  let get = false;
  let head = false;
  let insecure = false;
  let followRedirects = false;
  let compressed = false;
  let timeout: number | undefined;
  let auth: { user: string; password: string } | undefined;
  let bodyFile: string | undefined;
  let uploadFile: string | undefined;
  const cookies: string[] = [];
  // Headers removed with -H "Name:"; curl then does not add its own value for them either.
  const removed = new Set<string>();

  const handle = (opt: string, arg: string | undefined) => {
    switch (opt) {
      case 'X':
        method = arg!.toUpperCase();
        break;
      case 'H': {
        if (arg!.startsWith('@')) {
          warnings.push(`Headers are read from the file ${arg!.slice(1)}; add them to the code by hand.`);
          break;
        }
        const colon = arg!.indexOf(':');
        if (colon < 0) {
          // "Name;" sends an empty header.
          if (arg!.endsWith(';')) headers.push([arg!.slice(0, -1).trim(), '']);
          else warnings.push(`Header "${arg}" has no colon and was skipped.`);
          break;
        }
        const name = arg!.slice(0, colon).trim();
        const value = arg!.slice(colon + 1).trim();
        if (value === '') {
          // "Name:" removes a header curl would send.
          for (let k = headers.length - 1; k >= 0; k--) if (headers[k][0].toLowerCase() === name.toLowerCase()) headers.splice(k, 1);
          removed.add(name.toLowerCase());
          break;
        }
        headers.push([name, value]);
        break;
      }
      case 'd':
        if (arg!.startsWith('@')) {
          bodyFile = arg!.slice(1);
          data.push(FILE_MARK);
        } else data.push(arg!);
        break;
      case 'data-raw':
        data.push(arg!);
        break;
      case 'data-binary':
        if (arg!.startsWith('@')) {
          bodyFile = arg!.slice(1);
          data.push(FILE_MARK);
        } else data.push(arg!);
        break;
      case 'data-urlencode':
        data.push(encodeDataUrlencode(arg!, warnings));
        break;
      case 'json':
        if (arg!.startsWith('@')) {
          bodyFile = arg!.slice(1);
          jsonData.push(FILE_MARK);
        } else jsonData.push(arg!);
        break;
      case 'url-query':
        query.push(arg!.startsWith('+') ? arg!.slice(1) : encodeDataUrlencode(arg!, warnings));
        break;
      case 'F':
        form.push(parseFormPart(arg!, false));
        break;
      case 'form-string':
        form.push(parseFormPart(arg!, true));
        break;
      case 'u': {
        const colon = arg!.indexOf(':');
        if (colon < 0) {
          auth = { user: arg!, password: '' };
          warnings.push('-u has no password, so curl would prompt for one. The code uses an empty password.');
        } else auth = { user: arg!.slice(0, colon), password: arg!.slice(colon + 1) };
        break;
      }
      case 'oauth2-bearer':
        headers.push(['Authorization', `Bearer ${arg}`]);
        break;
      case 'b':
        if (arg!.includes('=')) cookies.push(arg!);
        else warnings.push(`-b ${arg} reads cookies from a file; add a Cookie header by hand.`);
        break;
      case 'A':
        headers.push(['User-Agent', arg!]);
        break;
      case 'e':
        headers.push(['Referer', arg!.replace(/;auto$/, '')]);
        break;
      case 'G':
        get = true;
        break;
      case 'I':
        head = true;
        break;
      case 'k':
        insecure = true;
        break;
      case 'L':
        followRedirects = true;
        break;
      case 'compressed':
        compressed = true;
        break;
      case 'url':
        url = arg!;
        break;
      case 'm':
        timeout = Number(arg);
        if (!Number.isFinite(timeout) || timeout < 0) {
          warnings.push(`--max-time "${arg}" is not a non-negative number and was ignored.`);
          timeout = undefined;
        }
        break;
      case 'T':
        uploadFile = arg!;
        break;
      case 'x':
        warnings.push(`A proxy (${arg}) is set; configure it in your HTTP client separately.`);
        break;
      case 'E':
      case 'key':
      case 'cacert':
        warnings.push(`TLS file option (${arg}) is not translated; configure client certificates in your HTTP client.`);
        break;
      case 'digest':
      case 'ntlm':
      case 'negotiate':
        warnings.push(`--${opt} authentication is not translated; the code uses Basic auth.`);
        break;
      case 'basic':
        break;
      case 'connect-timeout':
        break;
      default:
        if (!IGNORED.has(opt)) warnings.push(`Option ${opt.length === 1 ? '-' : '--'}${opt} is not translated.`);
    }
  };

  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    if (w === '--') {
      if (!url && words[i + 1]) url = words[++i];
      continue;
    }
    if (w.startsWith('--') && w.length > 2) {
      let name = w.slice(2);
      if (name.startsWith('no-') && !LONG_WITH_ARG.has(name)) continue; // --no-progress-meter and friends
      const alias = LONG_ALIAS[name];
      const takesArg = alias ? SHORT_WITH_ARG.has(alias) : LONG_WITH_ARG.has(name);
      if (alias) name = alias;
      if (takesArg) {
        if (i + 1 >= words.length) throw new CurlParseError(`${w} needs a value.`);
        handle(name, words[++i]);
      } else handle(name, undefined);
      continue;
    }
    if (w.startsWith('-') && w.length > 1) {
      for (let k = 1; k < w.length; k++) {
        const o = w[k];
        if (SHORT_WITH_ARG.has(o)) {
          let arg = w.slice(k + 1);
          if (arg === '') {
            if (i + 1 >= words.length) throw new CurlParseError(`-${o} needs a value.`);
            arg = words[++i];
          }
          handle(o, arg);
          break;
        }
        handle(o, undefined);
      }
      continue;
    }
    if (!url) url = w;
    else warnings.push(`Extra URL "${w}" ignored; only the first request is converted.`);
  }
  if (!url) throw new CurlParseError('No URL found in the command.');
  if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(url)) {
    url = `http://${url}`;
    warnings.push('The URL has no scheme; curl assumes http://, so that was added.');
  }
  if (/[{}[\]]/.test(url.replace(/%[0-9a-f]{2}/gi, ''))) warnings.push('curl treats {} and [] in URLs as globbing patterns unless -g is given; the URL is used literally here.');

  if (cookies.length && !hasHeader(headers, 'Cookie')) headers.push(['Cookie', cookies.join('; ')]);

  let body: string | undefined;
  let bodyIsJson = false;
  const addDefault = (name: string, value: string) => {
    if (!hasHeader(headers, name) && !removed.has(name.toLowerCase())) headers.push([name, value]);
  };
  if (jsonData.length) {
    body = [...data, ...jsonData].join('');
    bodyIsJson = true;
    addDefault('Content-Type', 'application/json');
    addDefault('Accept', 'application/json');
  } else if (data.length) {
    if (get) {
      query.push(...data);
    } else {
      body = data.join('&');
      addDefault('Content-Type', 'application/x-www-form-urlencoded');
    }
  }
  if (body === FILE_MARK) body = undefined;
  else if (body !== undefined && body.includes(FILE_MARK)) body = body.split(FILE_MARK).join('FILE_CONTENTS');
  if (query.length) {
    // The query goes before any #fragment.
    const hash = url.indexOf('#');
    const base = hash < 0 ? url : url.slice(0, hash);
    const fragment = hash < 0 ? '' : url.slice(hash);
    url = base + (base.includes('?') ? '&' : '?') + query.join('&') + fragment;
  }
  if (bodyFile) warnings.push(`The body is read from the file ${bodyFile}; the code reads it or has a placeholder. Note that -d @file strips carriage returns and newlines from the file, while --data-binary sends it unchanged.`);
  if (uploadFile) {
    bodyFile = uploadFile;
    warnings.push(`-T uploads the file ${uploadFile}; the code has a placeholder where its contents go.`);
  }

  if (form.length) {
    const k = headers.findIndex(([n]) => n.toLowerCase() === 'content-type');
    if (k >= 0) {
      if (/multipart\/form-data/i.test(headers[k][1])) headers.splice(k, 1);
      warnings.push('Multipart Content-Type is left to the HTTP client so it can add the boundary.');
    }
    if (data.length || jsonData.length) warnings.push('curl does not allow -d and -F together; the form fields are used.');
    body = undefined;
  }

  const ct = headers.find(([n]) => n.toLowerCase() === 'content-type')?.[1] ?? '';
  if (/json/i.test(ct) && body !== undefined) bodyIsJson = true;

  if (!method) {
    if (head) method = 'HEAD';
    else if (uploadFile) method = 'PUT';
    else if (get) method = 'GET';
    else if (body !== undefined || bodyFile || form.length) method = 'POST';
    else method = 'GET';
  }
  return { url, method, headers, body, bodyIsJson, bodyFile, form, auth, insecure, followRedirects, compressed, timeout, head, warnings };
}

/* ------------------------------------------------------------------ */
/* Literals                                                            */
/* ------------------------------------------------------------------ */

const jsStr = (s: string) => JSON.stringify(s).replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
const pyStr = (s: string) => {
  const j = JSON.stringify(s);
  // JSON escapes are valid Python escapes; prefer single quotes when the string has double quotes and no single quotes.
  // eslint-disable-next-line no-control-regex
  if (s.includes('"') && !s.includes("'") && !/[\\\x00-\x1f\x7f]/.test(s)) return `'${s}'`;
  return j;
};

/**
 * Header list for clients that take a name -> value map (fetch, Axios, requests),
 * where a repeated name would keep only its last value. Repeats are joined the way
 * HTTP allows (RFC 9110 section 5.3): ", " in general and "; " for Cookie.
 */
function mergeHeaders(headers: [string, string][]): [string, string][] {
  const out: [string, string][] = [];
  for (const [k, v] of headers) {
    const same = out.find(([n]) => n.toLowerCase() === k.toLowerCase());
    if (same) same[1] += (k.toLowerCase() === 'cookie' ? '; ' : ', ') + v;
    else out.push([k, v]);
  }
  return out;
}
const phpStr = (s: string) => `'${s.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
const hasControl = (s: string) => [...s].some((c) => c.charCodeAt(0) < 0x20 && c !== '\n' && c !== '\t');
const goStr = (s: string) => (!s.includes('`') && !hasControl(s) && s.includes('"') ? '`' + s + '`' : JSON.stringify(s));

function tryJson(body: string | undefined): unknown {
  if (body === undefined) return undefined;
  try {
    return JSON.parse(body);
  } catch {
    return undefined;
  }
}

/** JSON to a Python literal (True/False/None). */
function pyLiteral(v: unknown, indent: number): string {
  const pad = (n: number) => '    '.repeat(n);
  if (v === null) return 'None';
  if (v === true) return 'True';
  if (v === false) return 'False';
  if (typeof v === 'number') return Number.isFinite(v) ? String(v) : 'None';
  if (typeof v === 'string') return pyStr(v);
  if (Array.isArray(v)) {
    if (!v.length) return '[]';
    return `[\n${v.map((x) => pad(indent + 1) + pyLiteral(x, indent + 1)).join(',\n')},\n${pad(indent)}]`;
  }
  const entries = Object.entries(v as Record<string, unknown>);
  if (!entries.length) return '{}';
  return `{\n${entries.map(([k, x]) => `${pad(indent + 1)}${pyStr(k)}: ${pyLiteral(x, indent + 1)}`).join(',\n')},\n${pad(indent)}}`;
}

/** Text safe inside a JavaScript block comment. */
const blockComment = (s: string) => s.replace(/\*\//g, '* /');

const indentLines = (s: string, pad: string) => s.split('\n').map((l, i) => (i === 0 ? l : pad + l)).join('\n');

const base64 = (s: string) => {
  const bytes = new TextEncoder().encode(s);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
};

/* ------------------------------------------------------------------ */
/* Generators                                                          */
/* ------------------------------------------------------------------ */

function genFetch(p: ParsedCurl): string {
  const lines: string[] = [];
  const opts: string[] = [];
  const headers = mergeHeaders(p.headers);
  if (p.auth) headers.push(['Authorization', `Basic ${base64(`${p.auth.user}:${p.auth.password}`)}`]);
  if (p.method !== 'GET') opts.push(`method: ${jsStr(p.method)}`);
  if (headers.length) opts.push(`headers: {\n${headers.map(([k, v]) => `    ${jsStr(k)}: ${jsStr(v)}`).join(',\n')}\n  }`);
  if (p.form.length) {
    lines.push('const form = new FormData();');
    for (const f of p.form) {
      if (f.file) lines.push(`form.append(${jsStr(f.name)}, fileInput.files[0]${f.filename ? `, ${jsStr(f.filename)}` : ''}); // ${f.file}`);
      else lines.push(`form.append(${jsStr(f.name)}, ${jsStr(f.value)});`);
    }
    lines.push('');
    opts.push('body: form');
  } else if (p.bodyFile && p.body === undefined) {
    opts.push(`body: fileContents /* contents of ${blockComment(p.bodyFile)} */`); // a // comment would swallow the next option's comma
  } else if (p.body !== undefined) {
    const parsed = p.bodyIsJson ? tryJson(p.body) : undefined;
    opts.push(parsed !== undefined ? `body: JSON.stringify(${indentLines(JSON.stringify(parsed, null, 2), '  ')})` : `body: ${jsStr(p.body)}`);
  }
  if (p.timeout) opts.push(`signal: AbortSignal.timeout(${Math.round(p.timeout * 1000)})`);
  lines.push(`const response = await fetch(${jsStr(p.url)}${opts.length ? `, {\n  ${opts.join(',\n  ')}\n}` : ''});`);
  lines.push(p.head ? 'console.log(response.status, [...response.headers]);' : 'const data = await response.text();\nconsole.log(response.status, data);');
  if (p.insecure) lines.unshift('// -k (skip TLS verification) has no fetch equivalent in browsers; in Node use an undici Agent with connect: { rejectUnauthorized: false }.');
  return lines.join('\n') + '\n';
}

function genAxios(p: ParsedCurl): string {
  const pre: string[] = ["import axios from 'axios';"];
  if (p.insecure) pre.push("import https from 'node:https';");
  const opts: string[] = [`method: ${jsStr(p.method.toLowerCase())}`, `url: ${jsStr(p.url)}`];
  if (p.headers.length) opts.push(`headers: {\n${mergeHeaders(p.headers).map(([k, v]) => `    ${jsStr(k)}: ${jsStr(v)}`).join(',\n')}\n  }`);
  const body: string[] = [];
  if (p.form.length) {
    body.push('const form = new FormData();');
    for (const f of p.form) {
      if (f.file) body.push(`form.append(${jsStr(f.name)}, fileBlob${f.filename ? `, ${jsStr(f.filename)}` : ''}); // ${f.file}`);
      else body.push(`form.append(${jsStr(f.name)}, ${jsStr(f.value)});`);
    }
    body.push('');
    opts.push('data: form');
  } else if (p.bodyFile && p.body === undefined) {
    opts.push(`data: fileContents /* contents of ${blockComment(p.bodyFile)} */`);
  } else if (p.body !== undefined) {
    const parsed = p.bodyIsJson ? tryJson(p.body) : undefined;
    opts.push(parsed !== undefined ? `data: ${indentLines(JSON.stringify(parsed, null, 2), '  ')}` : `data: ${jsStr(p.body)}`);
  }
  if (p.auth) opts.push(`auth: { username: ${jsStr(p.auth.user)}, password: ${jsStr(p.auth.password)} }`);
  if (p.timeout) opts.push(`timeout: ${Math.round(p.timeout * 1000)}`);
  if (p.insecure) opts.push('httpsAgent: new https.Agent({ rejectUnauthorized: false })');
  if (!p.followRedirects) opts.push('maxRedirects: 0 // curl does not follow redirects without -L (Node only)');
  const out = [...pre, '', ...body, `const response = await axios({\n  ${opts.join(',\n  ')}\n});`, p.head ? 'console.log(response.status, response.headers);' : 'console.log(response.status, response.data);'];
  return out.join('\n') + '\n';
}

function genPython(p: ParsedCurl): string {
  const lines: string[] = ['import requests', ''];
  const args: string[] = [];
  if (p.headers.length) {
    lines.push(`headers = {\n${mergeHeaders(p.headers).map(([k, v]) => `    ${pyStr(k)}: ${pyStr(v)}`).join(',\n')},\n}`, '');
    args.push('headers=headers');
  }
  if (p.form.length) {
    const files = p.form.filter((f) => f.file);
    const fields = p.form.filter((f) => !f.file);
    if (fields.length) {
      lines.push(`data = {\n${fields.map((f) => `    ${pyStr(f.name)}: ${pyStr(f.value)}`).join(',\n')},\n}`, '');
      args.push('data=data');
    }
    if (files.length) {
      lines.push(
        `files = {\n${files
          .map((f) => {
            const fname = f.filename ?? f.file!.split(/[\\/]/).pop()!;
            return `    ${pyStr(f.name)}: (${pyStr(fname)}, open(${pyStr(f.file!)}, "rb")${f.contentType ? `, ${pyStr(f.contentType)}` : ''})`;
          })
          .join(',\n')},\n}`,
        '',
      );
      args.push('files=files');
    } else if (fields.length) {
      // requests only sends multipart when files= is given; send text fields as multipart too, like curl -F.
      lines.splice(lines.length - 2, 2, `files = {\n${fields.map((f) => `    ${pyStr(f.name)}: (None, ${pyStr(f.value)})`).join(',\n')},\n}`, '');
      args.splice(args.indexOf('data=data'), 1, 'files=files');
    }
  } else if (p.bodyFile && p.body === undefined) {
    lines.push(`with open(${pyStr(p.bodyFile)}, "rb") as f:\n    data = f.read()`, '');
    args.push('data=data');
  } else if (p.body !== undefined) {
    const parsed = p.bodyIsJson ? tryJson(p.body) : undefined;
    if (parsed !== undefined) {
      lines.push(`json_data = ${pyLiteral(parsed, 0)}`, '');
      args.push('json=json_data');
    } else {
      lines.push(`data = ${pyStr(p.body)}`, '');
      args.push("data=data.encode('utf-8')");
    }
  }
  if (p.auth) args.push(`auth=(${pyStr(p.auth.user)}, ${pyStr(p.auth.password)})`);
  if (p.timeout) args.push(`timeout=${p.timeout}`);
  if (p.insecure) args.push('verify=False');
  if (!p.followRedirects && p.method !== 'HEAD') args.push('allow_redirects=False');
  const fn = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'].includes(p.method) ? p.method.toLowerCase() : null;
  const call = fn ? `requests.${fn}(${[pyStr(p.url), ...args].join(', ')})` : `requests.request(${[pyStr(p.method), pyStr(p.url), ...args].join(', ')})`;
  lines.push(`response = ${call}`);
  lines.push(p.head ? 'print(response.status_code, response.headers)' : 'print(response.status_code)\nprint(response.text)');
  return lines.join('\n') + '\n';
}

function genGo(p: ParsedCurl): string {
  const imports = new Set(['fmt', 'io', 'log', 'net/http']);
  const body: string[] = [];
  let reader = 'nil';
  if (p.form.length) {
    imports.add('bytes');
    imports.add('mime/multipart');
    body.push('\tvar buf bytes.Buffer', '\tw := multipart.NewWriter(&buf)');
    for (const f of p.form) {
      if (f.file) {
        imports.add('os');
        const fname = f.filename ?? f.file.split(/[\\/]/).pop()!;
        body.push(
          `\tfile, err := os.Open(${goStr(f.file)})`,
          '\tif err != nil {\n\t\tlog.Fatal(err)\n\t}',
          '\tdefer file.Close()',
          `\tpart, err := w.CreateFormFile(${goStr(f.name)}, ${goStr(fname)})`,
          '\tif err != nil {\n\t\tlog.Fatal(err)\n\t}',
          '\tif _, err = io.Copy(part, file); err != nil {\n\t\tlog.Fatal(err)\n\t}',
        );
      } else body.push(`\tw.WriteField(${goStr(f.name)}, ${goStr(f.value)})`);
    }
    body.push('\tw.Close()');
    reader = '&buf';
  } else if (p.bodyFile && p.body === undefined) {
    imports.add('os');
    body.push(`\tdata, err := os.Open(${goStr(p.bodyFile)})`, '\tif err != nil {\n\t\tlog.Fatal(err)\n\t}', '\tdefer data.Close()');
    reader = 'data';
  } else if (p.body !== undefined) {
    imports.add('strings');
    body.push(`\tdata := strings.NewReader(${goStr(p.body)})`);
    reader = 'data';
  }
  body.push(`\treq, err := http.NewRequest(${goStr(p.method)}, ${goStr(p.url)}, ${reader})`, '\tif err != nil {\n\t\tlog.Fatal(err)\n\t}');
  const seen = new Set<string>();
  for (const [k, v] of p.headers) {
    if (k.toLowerCase() === 'host') body.push(`\treq.Host = ${goStr(v)}`);
    // Set replaces earlier values, so a repeated header (sent twice by curl) uses Add.
    else body.push(`\treq.Header.${seen.has(k.toLowerCase()) ? 'Add' : 'Set'}(${goStr(k)}, ${goStr(v)})`);
    seen.add(k.toLowerCase());
  }
  if (p.form.length) body.push('\treq.Header.Set("Content-Type", w.FormDataContentType())');
  if (p.auth) body.push(`\treq.SetBasicAuth(${goStr(p.auth.user)}, ${goStr(p.auth.password)})`);
  const client: string[] = [];
  if (p.timeout) {
    imports.add('time');
    client.push(`Timeout: ${Math.round(p.timeout * 1000)} * time.Millisecond`);
  }
  if (p.insecure) {
    imports.add('crypto/tls');
    client.push('Transport: &http.Transport{TLSClientConfig: &tls.Config{InsecureSkipVerify: true}}');
  }
  if (!p.followRedirects) client.push('CheckRedirect: func(req *http.Request, via []*http.Request) error { return http.ErrUseLastResponse }');
  const clientDecl = client.length ? `\tclient := &http.Client{\n${client.map((c) => `\t\t${c},`).join('\n')}\n\t}` : '\tclient := &http.Client{}';
  const sorted = [...imports].sort((a, b) => a.localeCompare(b));
  return [
    'package main',
    '',
    `import (\n${sorted.map((i) => `\t"${i}"`).join('\n')}\n)`,
    '',
    'func main() {',
    clientDecl,
    ...body,
    '\tresp, err := client.Do(req)',
    '\tif err != nil {\n\t\tlog.Fatal(err)\n\t}',
    '\tdefer resp.Body.Close()',
    '\tbodyText, err := io.ReadAll(resp.Body)',
    '\tif err != nil {\n\t\tlog.Fatal(err)\n\t}',
    '\tfmt.Println(resp.Status)',
    '\tfmt.Printf("%s\\n", bodyText)',
    '}',
    '',
  ].join('\n');
}

function genPhp(p: ParsedCurl): string {
  const l: string[] = ['<?php', '', '$ch = curl_init();', `curl_setopt($ch, CURLOPT_URL, ${phpStr(p.url)});`, 'curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);'];
  const hasBody = p.form.length > 0 || p.body !== undefined || !!p.bodyFile;
  if (p.method === 'HEAD') l.push('curl_setopt($ch, CURLOPT_NOBODY, true);');
  else if (!(p.method === 'GET' && !hasBody) && !(p.method === 'POST' && hasBody)) l.push(`curl_setopt($ch, CURLOPT_CUSTOMREQUEST, ${phpStr(p.method)});`);
  if (p.headers.length) l.push(`curl_setopt($ch, CURLOPT_HTTPHEADER, [\n${p.headers.map(([k, v]) => `    ${phpStr(`${k}: ${v}`)},`).join('\n')}\n]);`);
  if (p.form.length) {
    l.push(
      `curl_setopt($ch, CURLOPT_POSTFIELDS, [\n${p.form
        .map((f) =>
          f.file
            ? `    ${phpStr(f.name)} => new CURLFile(${phpStr(f.file)}${f.contentType || f.filename ? `, ${f.contentType ? phpStr(f.contentType) : 'null'}` : ''}${f.filename ? `, ${phpStr(f.filename)}` : ''}),`
            : `    ${phpStr(f.name)} => ${phpStr(f.value)},`,
        )
        .join('\n')}\n]);`,
    );
  } else if (p.bodyFile && p.body === undefined) {
    l.push(`curl_setopt($ch, CURLOPT_POSTFIELDS, file_get_contents(${phpStr(p.bodyFile)}));`);
  } else if (p.body !== undefined) {
    l.push(`curl_setopt($ch, CURLOPT_POSTFIELDS, ${phpStr(p.body)});`);
  }
  if (p.auth) l.push(`curl_setopt($ch, CURLOPT_USERPWD, ${phpStr(`${p.auth.user}:${p.auth.password}`)});`);
  if (p.followRedirects) l.push('curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);');
  if (p.compressed) l.push("curl_setopt($ch, CURLOPT_ENCODING, '');");
  if (p.insecure) l.push('curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);', 'curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, 0);');
  if (p.timeout) l.push(`curl_setopt($ch, CURLOPT_TIMEOUT_MS, ${Math.round(p.timeout * 1000)});`);
  l.push('', '$response = curl_exec($ch);', 'if ($response === false) {', '    echo curl_error($ch);', '} else {', '    echo curl_getinfo($ch, CURLINFO_RESPONSE_CODE), "\\n", $response;', '}', '');
  return l.join('\n');
}

export const CURL_TARGETS: { id: CurlTarget; label: string; lang: string; ext: string }[] = [
  { id: 'fetch', label: 'JavaScript fetch', lang: 'javascript', ext: 'js' },
  { id: 'axios', label: 'Node.js Axios', lang: 'javascript', ext: 'js' },
  { id: 'python', label: 'Python requests', lang: 'python', ext: 'py' },
  { id: 'go', label: 'Go net/http', lang: 'go', ext: 'go' },
  { id: 'php', label: 'PHP cURL', lang: 'php', ext: 'php' },
];

export function generateCode(p: ParsedCurl, target: CurlTarget): string {
  switch (target) {
    case 'fetch':
      return genFetch(p);
    case 'axios':
      return genAxios(p);
    case 'python':
      return genPython(p);
    case 'go':
      return genGo(p);
    case 'php':
      return genPhp(p);
  }
}

export type CurlConvertResult =
  | { ok: true; code: string; parsed: ParsedCurl; warnings: string[]; error?: undefined }
  | { ok: false; error: string; code?: undefined; parsed?: undefined; warnings?: undefined };

export function convertCurl(command: string, target: CurlTarget): CurlConvertResult {
  try {
    const parsed = parseCurl(command);
    const warnings = [...parsed.warnings];
    if (!parsed.followRedirects && (target === 'fetch')) warnings.push('fetch follows redirects by default; curl only does with -L. Add redirect: "manual" if that matters.');
    return { ok: true, code: generateCode(parsed, target), parsed, warnings };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}
