/**
 * The commands VS Code answers itself, with no network call.
 *
 * The honest test for putting a tool here is whether the editor can give the
 * same answer the website would. Node ships a real crypto implementation and
 * a real JSON parser, and case conversion or line de-duplication is a dozen
 * lines of string handling, so for those a round trip buys nothing but
 * latency and a dependency on being online.
 *
 * What stays remote is what carries a third-party dependency too large to
 * bundle: the zxcvbn dictionaries, ajv, js-beautify, cron-parser. Shipping a
 * second, weaker parser inside an editor plugin is how a formatter quietly
 * mangles someone's file, so where a real library does the work we call the
 * one the website calls rather than writing a lesser one here.
 *
 * An earlier version of this comment claimed YAML, SQL, HTML, XML, cron
 * explanation, the HTTP status and MIME tables and the .gitignore templates
 * stayed remote because they "need a real parser or a real data set". That
 * was wrong on every count: each of those is a hand-written, dependency-free
 * function of a few dozen lines, and the HTTP and MIME tables are imported
 * directly below. Check the dependency before believing a tool has to be
 * remote; most of them did not.
 *
 * Returning undefined means "not handled here" and the caller falls through
 * to MCP. Throwing means the input was wrong and the reader should be told.
 */
import { createHash, createHmac, randomUUID, randomBytes, randomInt } from 'node:crypto';
// The website's own implementations, imported rather than reimplemented, so
// the editor gives the answer the site gives. These three carry no
// third-party dependency, which is what makes them worth bundling.
import { HTTP_STATUSES } from '../../../src/lib/tools/w500/webops-http';
import { lookupExtension, lookupMime } from '../../../src/lib/tools/w500/webops-mime';
import { clampLoremCount, loremSentence } from '../../../src/lib/tools/lorem-generator';
/*
 * The second wave, moved off the network for the same reason as the first:
 * checking the dependency rather than believing the catalog. Twenty-four
 * tools were marked remote while importing nothing but the MCP framework
 * itself — a round trip to join two strings into a CSS gradient, or to pick a
 * number in a range. Each is the site's own function, imported, so the
 * offline answer is the online answer and not a second opinion.
 */
import { convertCurl } from '../../../src/lib/tools/w500/dev-format-curl';
import { encodeMorse, decodeMorse, looksLikeMorse } from '../../../src/lib/tools/w500/writing-morse';
import { spellNatoText, decodeNato } from '../../../src/lib/tools/w500/writing-nato';
import { buildGitignore, checkIgnored } from '../../../src/lib/tools/w500/webops-gitignore';
import {
  generateRedirects,
  type Platform,
  type RedirectOptions,
  type SiteRules,
} from '../../../src/lib/tools/w500/webops-redirect';
import { analyzeGtin } from '../../../src/lib/tools/w500/business2-barcode';
import {
  amountToCheckWords,
  binaryToText,
  decimalToWords,
  isDecodeError,
  numberToWords,
  ordinalToWords,
  textToBinary,
} from '../../../src/lib/tools/specialty-converters';
import { readability, analyzeSentences, fleschBand } from '../../../src/lib/tools/w500/writing';
import { colorForms, contrastReport, gradientCss } from '../../../src/lib/tools/w500/color-basics';
// The format viewers: trees and schema checks the editor can draw itself.
import { renderJsonTree } from '../../../src/lib/tools/json-tree';
import { renderXmlTree } from '../../../src/lib/tools/xml-tree';
import { checkAvroSchema, describeType } from '../../../src/lib/tools/avro-tools';
import { parseThreadDump, renderThreadDumpSummary } from '../../../src/lib/tools/jvm-thread-dump';
import { parseHar, renderHarSummary } from '../../../src/lib/tools/har-analyzer';
import { parseGcLog, renderGcLogSummary } from '../../../src/lib/tools/gc-log-analyzer';
import { decodeProtoWire, renderProtoWire } from '../../../src/lib/tools/proto-wire';
import { decodeMessagePack, decodeCbor } from '../../../src/lib/tools/binary-json-formats';
import { randomEmails, randomNames, randomNumbers } from '../../../src/lib/tools/random-testdata';
import { tidyYaml, toYaml, yamlToValue } from '../../../src/lib/tools/w500/data-yaml-lite';
import { beautifyHtml, beautifySql, beautifyXml } from '../../../src/lib/tools/w500/markup-beautify';
import { validateCron } from '../../../src/lib/tools/w500/dev-cron-check';
import { diffText } from '../../../src/lib/tools/w500/text-linediff';
import { convertZone } from '../../../src/lib/tools/w500/time-zone-shift';
import {
  buildPalette,
  exportCssVariables,
  exportScaleCss,
  exportTailwindConfig,
  exportTailwindTheme,
  formatRatio,
  type ColorWheel,
  type HarmonyRule,
} from '../../../src/lib/tools/w500/image-edit-palette';

export class LocalToolError extends Error {}

/**
 * Run an imported site function and report its refusal as one of ours.
 *
 * The site's functions raise their own error types — BarcodeInputError from
 * the GTIN reader, a plain Error from the palette builder — and those are
 * refusals of the input, not faults. Letting them escape meant the CLI
 * printed them down the "something went wrong" path and VS Code showed them
 * with an `Error:` prefix, while the same refusal from a hand-written case
 * read cleanly. The caller cannot tell the difference and should not have to.
 */

/** A hex or base64 selection as bytes; whichever parses cleanly wins. */
function bytesFromText(input: string): Uint8Array {
  const clean = input.replace(/\s+/g, '');
  if (/^[0-9a-fA-F]+$/.test(clean) && clean.length % 2 === 0) {
    return new Uint8Array(clean.match(/../g)!.map((x) => parseInt(x, 16)));
  }
  try {
    const bin = atob(clean.replace(/-/g, '+').replace(/_/g, '/'));
    return Uint8Array.from(bin, (c) => c.charCodeAt(0));
  } catch {
    throw new LocalToolError('Give the bytes as hex (089601) or base64; the selection is neither.');
  }
}

function refuse<T>(fn: () => T): T {
  try {
    return fn();
  } catch (e) {
    if (e instanceof LocalToolError) throw e;
    throw new LocalToolError(e instanceof Error ? e.message : String(e));
  }
}

const parseJson = (text: string): unknown => {
  try {
    return JSON.parse(text);
  } catch (e) {
    // The parser's own message carries the position, which is the useful part.
    throw new LocalToolError(e instanceof Error ? e.message : 'The selection is not valid JSON.');
  }
};

/** Accept the URL-safe alphabet and missing padding, as a JWT segment has. */
function fromBase64(input: string): Buffer {
  const normalised = input.trim().replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalised + '='.repeat((4 - (normalised.length % 4)) % 4);
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(padded)) throw new LocalToolError('The selection is not Base64.');
  const bytes = Buffer.from(padded, 'base64');
  // Buffer.from ignores trailing rubbish rather than failing, so check the
  // round trip instead of trusting it.
  if (bytes.toString('base64').replace(/=+$/, '') !== padded.replace(/=+$/, ''))
    throw new LocalToolError('The selection is not Base64.');
  return bytes;
}

/** Split into words on case boundaries, spaces, hyphens and underscores. */
const words = (text: string): string[] =>
  text
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean);

const upperFirst = (w: string) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();

/** The options a command can take, gathered by the caller before it runs. */
export type LocalOptions = Record<string, unknown>;

export function runLocal(id: string, input: string, options: LocalOptions = {}): string | undefined {
  const opt = (key: string, fallback: string) => String(options[key] ?? fallback);
  /*
   * A list option arrives as an array from the editor and the MCP schema, and
   * as the comma-separated string a command line can type. Both mean the same
   * list, and a tool that accepted only one of them would work in the editor
   * and not in the terminal.
   */
  const list = (value: unknown): string[] => {
    if (Array.isArray(value)) return value.map(String);
    if (typeof value !== 'string' || !value.trim()) return [];
    return value.split(',').map((v) => v.trim()).filter(Boolean);
  };

  switch (id) {
    /* ---------------------------------------------------------- JSON */
    case 'json-format': {
      const indent = Number(options.indent ?? 2);
      return JSON.stringify(parseJson(input), null, Number.isFinite(indent) ? indent : 2);
    }
    case 'json-minify':
      return JSON.stringify(parseJson(input));
    case 'json-validate': {
      parseJson(input);
      const value = parseJson(input);
      const kind = Array.isArray(value) ? 'array' : value === null ? 'null' : typeof value;
      return `Valid JSON.\nTop level: ${kind}${Array.isArray(value) ? ` of ${value.length}` : ''}`;
    }

    /* ------------------------------------------------------ encoding */
    case 'base64-encode':
      return Buffer.from(input, 'utf8').toString(opt('variant', 'standard') === 'url' ? 'base64url' : 'base64');
    case 'base64-decode':
      return fromBase64(input).toString('utf8');
    case 'url-encode':
      // component escapes & = ? and / as a query value needs; uri keeps them.
      return opt('variant', 'component') === 'uri' ? encodeURI(input) : encodeURIComponent(input);
    case 'url-decode':
      try {
        return decodeURIComponent(input);
      } catch {
        throw new LocalToolError('The selection has a percent-escape that is not valid.');
      }

    /* ----------------------------------------------------- identity */
    case 'uuid': {
      const variant = opt('variant', 'v4');
      if (variant === 'v4') return randomUUID();
      if (variant === 'v4-upper') return randomUUID().toUpperCase();
      if (variant === 'v4-compact') return randomUUID().replace(/-/g, '');
      if (variant === 'nil') return '00000000-0000-0000-0000-000000000000';
      if (variant === 'v7') {
        // RFC 9562 version 7: 48 bits of Unix milliseconds, then random, so
        // a batch sorts in creation order. Useful as a database key.
        const ms = Date.now();
        const b = randomBytes(16);
        b.writeUIntBE(ms, 0, 6);
        b[6] = (b[6] & 0x0f) | 0x70; // version 7
        b[8] = (b[8] & 0x3f) | 0x80; // RFC 4122 variant
        const h = b.toString('hex');
        return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
      }
      return randomUUID();
    }
    case 'password': {
      const length = Math.min(Math.max(Number(options.length ?? 20) || 20, 8), 128);
      const sets: Record<string, string> = {
        letters: 'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ',
        alphanumeric: 'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789',
        full: 'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$%^&*()-_=+[]{}',
      };
      // No lookalikes in any set: 0/O and 1/l/I cost more in support than
      // they add in entropy at these lengths.
      const alphabet = sets[opt('charset', 'full')] ?? sets.full;
      let out = '';
      for (let i = 0; i < length; i += 1) out += alphabet[randomInt(alphabet.length)];
      return out;
    }

    /* -------------------------------------------------------- crypto */
    case 'hash': {
      const algorithm = opt('algorithm', 'sha256');
      if (!['md5', 'sha1', 'sha256', 'sha384', 'sha512'].includes(algorithm))
        throw new LocalToolError(`${algorithm} is not one of md5, sha1, sha256, sha384 or sha512.`);
      const digest = createHash(algorithm).update(input, 'utf8');
      return opt('encoding', 'hex') === 'base64' ? digest.digest('base64') : digest.digest('hex');
    }
    case 'hmac': {
      const key = String(options.key ?? '');
      if (!key) throw new LocalToolError('An HMAC needs a key.');
      const algorithm = opt('algorithm', 'sha256');
      const mac = createHmac(algorithm, key).update(input, 'utf8');
      return opt('encoding', 'hex') === 'base64' ? mac.digest('base64') : mac.digest('hex');
    }
    case 'jwt-decode': {
      const parts = input.trim().split('.');
      if (parts.length < 2) throw new LocalToolError('That is not a JWT: it needs a header and a payload.');
      const read = (part: string, what: string) => {
        try {
          return JSON.parse(fromBase64(part).toString('utf8'));
        } catch {
          throw new LocalToolError(`The ${what} is not valid JSON once decoded.`);
        }
      };
      const header = read(parts[0], 'header');
      const payload = read(parts[1], 'payload') as Record<string, unknown>;
      const when = (v: unknown) =>
        typeof v === 'number' ? ` (${new Date(v * 1000).toISOString()})` : '';
      const notes = [
        typeof payload.exp === 'number'
          ? `exp${when(payload.exp)}${payload.exp * 1000 < Date.now() ? '  EXPIRED' : ''}`
          : '',
        typeof payload.iat === 'number' ? `iat${when(payload.iat)}` : '',
        typeof payload.nbf === 'number' ? `nbf${when(payload.nbf)}` : '',
      ].filter(Boolean);
      return [
        '// header',
        JSON.stringify(header, null, 2),
        '',
        '// payload',
        JSON.stringify(payload, null, 2),
        notes.length ? `\n// ${notes.join('  ')}` : '',
        '\n// The signature is NOT verified. Decoding is not authentication.',
      ].join('\n');
    }

    /* ---------------------------------------------------------- text */
    case 'case-convert': {
      const w = words(input);
      if (!w.length) return input;
      switch (opt('style', 'camel')) {
        case 'camel':
          return w.map((x, i) => (i ? upperFirst(x) : x.toLowerCase())).join('');
        case 'pascal':
          return w.map(upperFirst).join('');
        case 'snake':
          return w.map((x) => x.toLowerCase()).join('_');
        case 'kebab':
          return w.map((x) => x.toLowerCase()).join('-');
        case 'constant':
          return w.map((x) => x.toUpperCase()).join('_');
        case 'upper':
          return input.toUpperCase();
        case 'lower':
          return input.toLowerCase();
        case 'title':
          return w.map(upperFirst).join(' ');
        default:
          return input;
      }
    }
    case 'slugify':
      return input
        .normalize('NFKD')
        .replace(/[̀-ͯ]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
    case 'dedupe-lines': {
      const seen = new Set<string>();
      const keep = opt('compare', 'exact') === 'ignore-case';
      return input
        .split('\n')
        .filter((line) => {
          const key = keep ? line.toLowerCase() : line;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        })
        .join('\n');
    }
    case 'lines-to-comma': {
      const sep = opt('separator', ', ');
      const quote = opt('quote', 'none');
      const parts = input
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean)
        .map((l) => (quote === 'double' ? `"${l}"` : quote === 'single' ? `'${l}'` : l));
      return parts.join(sep);
    }
    case 'word-count': {
      const chars = [...input].length;
      const noSpaces = [...input.replace(/\s/g, '')].length;
      const wordCount = input.trim() ? input.trim().split(/\s+/).length : 0;
      const lines = input ? input.split('\n').length : 0;
      // 238 words a minute, Brysbaert's 2019 meta-analysis of silent reading.
      const minutes = Math.max(1, Math.round(wordCount / 238));
      return [
        `Words:                ${wordCount}`,
        `Characters:           ${chars}`,
        `Characters (no space): ${noSpaces}`,
        `Lines:                ${lines}`,
        `Reading time:         about ${minutes} min`,
      ].join('\n');
    }

    /* -------------------------------------------------------- numbers */
    case 'number-base': {
      const raw = input.trim().replace(/[_,\s]/g, '');
      const from = /^0x/i.test(raw) ? 16 : /^0o/i.test(raw) ? 8 : /^0b/i.test(raw) ? 2 : Number(opt('from', '10'));
      const digits = raw.replace(/^0[xob]/i, '');
      let value: bigint;
      try {
        value = from === 10 ? BigInt(digits) : BigInt(`0${from === 16 ? 'x' : from === 8 ? 'o' : 'b'}${digits}`);
      } catch {
        throw new LocalToolError(`${input.trim()} is not a base ${from} number.`);
      }
      return [
        `Decimal:  ${value.toString(10)}`,
        `Hex:      0x${value.toString(16).toUpperCase()}`,
        `Octal:    0o${value.toString(8)}`,
        `Binary:   0b${value.toString(2)}`,
      ].join('\n');
    }
    case 'epoch': {
      const raw = input.trim();
      const n = Number(raw);
      // Ten digits is seconds, thirteen is milliseconds; anything else is
      // read as a date string.
      const date = Number.isFinite(n) && raw !== ''
        ? new Date(raw.length <= 10 ? n * 1000 : n)
        : new Date(raw);
      if (Number.isNaN(date.getTime())) throw new LocalToolError(`${raw} is not a timestamp or a date.`);
      return [
        `ISO 8601 (UTC):  ${date.toISOString()}`,
        `Local:           ${date.toString()}`,
        `Unix seconds:    ${Math.floor(date.getTime() / 1000)}`,
        `Unix millis:     ${date.getTime()}`,
      ].join('\n');
    }

    /* -------------------------------------------------------- regex */
    case 'regex-test': {
      const pattern = String(options.pattern ?? '');
      if (!pattern) throw new LocalToolError('Enter a regular expression first.');
      let re: RegExp;
      try {
        re = new RegExp(pattern, opt('flags', 'g').includes('g') ? opt('flags', 'g') : `${opt('flags', 'g')}g`);
      } catch (e) {
        throw new LocalToolError(e instanceof Error ? e.message : 'That is not a valid regular expression.');
      }
      const out: string[] = [];
      let count = 0;
      for (const m of input.matchAll(re)) {
        count += 1;
        if (out.length < 50) {
          const groups = m.slice(1).map((g, i) => `    ${i + 1}: ${g ?? '(no match)'}`);
          out.push(`${String(m.index).padStart(6)}: ${m[0]}${groups.length ? `\n${groups.join('\n')}` : ''}`);
        }
      }
      if (!count) return `No matches for /${pattern}/`;
      return [`${count} match${count === 1 ? '' : 'es'} for /${pattern}/`, '', ...out,
        count > 50 ? `\n… ${count - 50} more` : ''].join('\n');
    }

    /* ------------------------------------------------------- lookups */
    case 'http-status': {
      const q = input.trim();
      const code = Number(q);
      const found = Number.isFinite(code)
        ? HTTP_STATUSES.filter((st) => st.code === code)
        : HTTP_STATUSES.filter((st) => st.name.toLowerCase().includes(q.toLowerCase())).slice(0, 8);
      if (!found.length) throw new LocalToolError(`No HTTP status matches ${q}.`);
      return found
        .map((st) => [`${st.code} ${st.name}`, `  ${st.spec}`, `  ${st.summary}`].join('\n'))
        .join('\n\n');
    }
    case 'mime-lookup': {
      const q = input.trim();
      const byExt = lookupExtension(q);
      const byMime = lookupMime(q);
      if (byExt) return `${q}\n  ${byExt.mime}${byExt.note ? `\n  ${byExt.note}` : ''}`;
      if (byMime.length)
        return byMime.map((m) => `${m.mime}\n  .${m.ext.join('  .')}`).join('\n\n');
      throw new LocalToolError(`Nothing registered for ${q}.`);
    }
    case 'lorem': {
      const n = clampLoremCount(String(options.count ?? 2));
      const unit = opt('unit', 'paragraphs');
      if (unit === 'sentences') return Array.from({ length: n }, () => loremSentence()).join(' ');
      if (unit === 'words') return Array.from({ length: n }, () => loremSentence()).join(' ').split(/\s+/).slice(0, n).join(' ');
      return Array.from({ length: n }, () =>
        Array.from({ length: 4 }, () => loremSentence()).join(' '),
      ).join('\n\n');
    }

    /* ------------------------------------------------------- tabular */
    case 'csv-to-json': {
      // RFC 4180: quoted fields may hold commas, newlines and doubled quotes.
      const rows: string[][] = [];
      let row: string[] = [];
      let cell = '';
      let quoted = false;
      for (let i = 0; i < input.length; i += 1) {
        const c = input[i];
        if (quoted) {
          if (c === '"' && input[i + 1] === '"') { cell += '"'; i += 1; }
          else if (c === '"') quoted = false;
          else cell += c;
        } else if (c === '"') quoted = true;
        else if (c === ',') { row.push(cell); cell = ''; }
        else if (c === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; }
        else if (c !== '\r') cell += c;
      }
      if (cell || row.length) { row.push(cell); rows.push(row); }
      if (!rows.length) throw new LocalToolError('The selection has no rows.');
      const [head, ...body] = rows;
      return JSON.stringify(
        body.filter((r) => r.some((v) => v !== '')).map((r) => Object.fromEntries(head.map((h, i) => [h, r[i] ?? '']))),
        null,
        2,
      );
    }
    case 'json-to-csv': {
      const value = parseJson(input);
      if (!Array.isArray(value)) throw new LocalToolError('JSON to CSV needs an array of objects.');
      const keys = [...new Set(value.flatMap((r) => (r && typeof r === 'object' ? Object.keys(r) : [])))];
      if (!keys.length) throw new LocalToolError('No object keys to use as a header.');
      const esc = (v: unknown) => {
        const str = v === null || v === undefined ? '' : String(v);
        return /[",\n\r]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
      };
      // The header is escaped like any cell: a key holding a comma, a quote or
      // a newline otherwise splits into extra columns.
      return [keys.map(esc).join(','), ...value.map((r) => keys.map((k) => esc((r as Record<string, unknown>)?.[k])).join(','))].join('\n');
    }
    case 'markdown-table': {
      const rows = input.trim().split('\n').map((line) =>
        line.includes('|')
          ? line.replace(/^\s*\|/, '').replace(/\|\s*$/, '').split('|').map((c) => c.trim())
          : line.split(/\t|,/).map((c) => c.trim()),
      ).filter((r) => r.length && !r.every((c) => /^:?-{2,}:?$/.test(c) || c === ''));
      if (rows.length < 2) throw new LocalToolError('A table needs a header row and at least one row of data.');
      const cols = Math.max(...rows.map((r) => r.length));
      const width = Array.from({ length: cols }, (_, i) => Math.max(3, ...rows.map((r) => (r[i] ?? '').length)));
      const line = (cells: string[]) => `| ${cells.map((c, i) => (c ?? '').padEnd(width[i])).join(' | ')} |`;
      const [head, ...body] = rows;
      return [line(head), `| ${width.map((w) => '-'.repeat(w)).join(' | ')} |`, ...body.map(line)].join('\n');
    }


    /* ------------------------------------------------- native: lines */
    case 'sort-lines': {
      const order = opt('order', 'asc');
      const lines = input.split('\n');
      const cmp =
        order === 'natural' || order === 'natural-desc'
          ? (a: string, b: string) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
          : order === 'length' ? (a: string, b: string) => a.length - b.length
          : (a: string, b: string) => a.localeCompare(b);
      const sorted = [...lines].sort(cmp);
      return order.endsWith('desc') ? sorted.reverse().join('\n') : sorted.join('\n');
    }
    case 'reverse-lines':
      return input.split('\n').reverse().join('\n');
    case 'shuffle-lines': {
      const lines = input.split('\n');
      // Fisher-Yates with the platform random source, not sort(() => Math.random() - 0.5),
      // which is biased and not even a permutation on some engines.
      for (let i = lines.length - 1; i > 0; i -= 1) {
        const j = randomInt(i + 1);
        [lines[i], lines[j]] = [lines[j], lines[i]];
      }
      return lines.join('\n');
    }
    case 'number-lines': {
      const lines = input.split('\n');
      const pad = String(lines.length).length;
      const sep = opt('separator', '. ');
      return lines.map((l, i) => `${String(i + 1).padStart(pad)}${sep}${l}`).join('\n');
    }
    case 'trim-lines':
      return input.split('\n').map((l) => l.trim()).join('\n');
    case 'wrap-lines': {
      const width = Math.max(20, Number(options.width ?? 72) || 72);
      return input
        .split('\n')
        .map((line) => {
          if (line.length <= width) return line;
          const out: string[] = [];
          let current = '';
          for (const word of line.split(/\s+/)) {
            if (!current) current = word;
            else if (`${current} ${word}`.length <= width) current += ` ${word}`;
            else { out.push(current); current = word; }
          }
          if (current) out.push(current);
          return out.join('\n');
        })
        .join('\n');
    }

    /* -------------------------------------------------- native: text */
    case 'reverse-text':
      // By grapheme, so an accent or an emoji is not split in half.
      return [...input].reverse().join('');
    case 'rot13':
      return input.replace(/[a-zA-Z]/g, (c) => {
        const base = c <= 'Z' ? 65 : 97;
        return String.fromCharCode(((c.charCodeAt(0) - base + 13) % 26) + base);
      });
    case 'remove-accents':
      return input.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    case 'strip-html':
      return input
        .replace(/<script[\s\S]*?<\/script>/gi, '')
        .replace(/<style[\s\S]*?<\/style>/gi, '')
        .replace(/<[^>]+>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/\n{3,}/g, '\n\n')
        .trim();
    case 'html-escape':
      return input
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    case 'html-unescape':
      return input
        .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
        .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
        .replace(/&quot;/g, '"')
        .replace(/&#39;|&apos;/g, "'")
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&');

    /* --------------------------------------------------- native: hex */
    case 'to-hex': {
      const sep = opt('separator', ' ');
      return [...Buffer.from(input, 'utf8')].map((b) => b.toString(16).padStart(2, '0')).join(sep);
    }
    case 'from-hex': {
      const clean = input.replace(/0x/gi, '').replace(/[^0-9a-f]/gi, '');
      if (!clean) throw new LocalToolError('No hex digits in the selection.');
      if (clean.length % 2) throw new LocalToolError('Hex needs an even number of digits.');
      return Buffer.from(clean, 'hex').toString('utf8');
    }

    /* ------------------------------------------------ native: pull out */
    case 'extract-urls':
      return [...new Set(input.match(/https?:\/\/[^\s<>"')\]]+/g) ?? [])].join('\n') || '(no URLs found)';
    case 'extract-emails':
      return [...new Set(input.match(/[\w.+-]+@[\w-]+\.[\w.-]+/g) ?? [])].join('\n') || '(no addresses found)';
    case 'extract-numbers':
      return (input.match(/-?\d+(?:\.\d+)?/g) ?? []).join('\n') || '(no numbers found)';

    /* ------------------------------------------------- native: structured */
    case 'sort-json-keys': {
      const sortDeep = (v: unknown): unknown => {
        if (Array.isArray(v)) return v.map(sortDeep);
        if (v && typeof v === 'object')
          return Object.fromEntries(Object.entries(v as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([k, x]) => [k, sortDeep(x)]));
        return v;
      };
      return JSON.stringify(sortDeep(parseJson(input)), null, 2);
    }
    case 'query-to-json': {
      const raw = input.trim().replace(/^[^?]*\?/, '');
      // URLSearchParams reads a bare word as one valueless parameter, so
      // selecting a word by mistake would return {"word": ""} rather than
      // saying it is not a query string. Require a separator.
      if (!/[=&]/.test(raw)) throw new LocalToolError('No query parameters in the selection.');
      const out: Record<string, unknown> = {};
      for (const [k, v] of new URLSearchParams(raw)) {
        if (k in out) out[k] = Array.isArray(out[k]) ? [...(out[k] as unknown[]), v] : [out[k], v];
        else out[k] = v;
      }
      if (!Object.keys(out).length) throw new LocalToolError('No query parameters in the selection.');
      return JSON.stringify(out, null, 2);
    }
    case 'json-to-query': {
      const value = parseJson(input);
      if (!value || typeof value !== 'object' || Array.isArray(value))
        throw new LocalToolError('This needs a JSON object.');
      const params = new URLSearchParams();
      for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
        if (Array.isArray(v)) v.forEach((x) => params.append(k, String(x)));
        else params.append(k, String(v));
      }
      return params.toString();
    }
    case 'url-parse': {
      let u: URL;
      try {
        u = new URL(input.trim());
      } catch {
        throw new LocalToolError('That is not a URL this can parse. It needs a scheme, such as https://.');
      }
      const params = [...u.searchParams].map(([k, v]) => `    ${k} = ${v}`);
      return [
        `Scheme:    ${u.protocol.replace(':', '')}`,
        u.username ? `User:      ${u.username}` : '',
        `Host:      ${u.hostname}`,
        u.port ? `Port:      ${u.port}` : '',
        `Path:      ${u.pathname}`,
        params.length ? `Query:\n${params.join('\n')}` : '',
        u.hash ? `Fragment:  ${u.hash.slice(1)}` : '',
      ].filter(Boolean).join('\n');
    }

    /* ------------------------------------------------- native: counting */
    case 'unique-words': {
      const counts = new Map<string, number>();
      for (const w of input.toLowerCase().match(/[\p{L}\p{N}'-]+/gu) ?? [])
        counts.set(w, (counts.get(w) ?? 0) + 1);
      if (!counts.size) throw new LocalToolError('No words in the selection.');
      return [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
        .map(([w, n]) => `${String(n).padStart(6)}  ${w}`).join('\n');
    }
    case 'char-frequency': {
      const counts = new Map<string, number>();
      for (const c of input) counts.set(c, (counts.get(c) ?? 0) + 1);
      const name = (c: string) =>
        c === ' ' ? '(space)' : c === '\n' ? '(newline)' : c === '\t' ? '(tab)' : c === '\r' ? '(return)' : c;
      return [...counts].sort((a, b) => b[1] - a[1])
        .map(([c, n]) => `${String(n).padStart(6)}  ${name(c)}`).join('\n');
    }


    /* ----------------------------------- local: small pure computations */
    case 'tsv-parse': {
      const rows = input.split('\n').filter((l) => l.trim()).map((l) => l.split('\t'));
      if (rows.length < 2) throw new LocalToolError('TSV needs a header row and at least one row of data.');
      const [head, ...body] = rows;
      return JSON.stringify(body.map((r) => Object.fromEntries(head.map((h, i) => [h.trim(), (r[i] ?? '').trim()]))), null, 2);
    }
    case 'find-duplicates': {
      const counts = new Map<string, number>();
      for (const l of input.split('\n')) counts.set(l, (counts.get(l) ?? 0) + 1);
      const dupes = [...counts].filter(([, n]) => n > 1).sort((a, b) => b[1] - a[1]);
      if (!dupes.length) return 'No duplicate lines.';
      return dupes.map(([l, n]) => `${String(n).padStart(5)}x  ${l}`).join('\n');
    }
    case 'remove-extra-spaces':
      return input.split('\n').map((l) => l.replace(/[ \t]+/g, ' ').trim()).join('\n');
    case 'remove-empty-lines':
      return input.split('\n').filter((l) => l.trim()).join('\n');
    case 'comma-to-lines':
      return input.split(opt('separator', ','))
        .map((x) => x.trim()).filter(Boolean).join('\n');
    case 'hash-compare': {
      const b = String(options.b ?? '');
      if (!b) throw new LocalToolError('Paste the hash to compare against.');
      const norm = (x: string) => x.trim().toLowerCase().replace(/\s+/g, '');
      const same = norm(input) === norm(b);
      return same ? 'MATCH\nThe two hashes are the same.' : `NO MATCH\n  a: ${norm(input)}\n  b: ${norm(b)}`;
    }
    case 'escape-characters': {
      const format = opt('format', 'json');
      if (format === 'json') return JSON.stringify(input).slice(1, -1);
      if (format === 'html') return runLocal('html-escape', input) as string;
      if (format === 'xml') return input.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
      return JSON.stringify(input).slice(1, -1);
    }
    case 'subnet': {
      const m = input.trim().match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)\/(\d+)$/);
      if (!m) throw new LocalToolError('Expected a CIDR block such as 10.0.0.0/24.');
      const octets = m.slice(1, 5).map(Number);
      const bits = Number(m[5]);
      if (octets.some((o) => o > 255) || bits > 32) throw new LocalToolError('That is not a valid IPv4 CIDR block.');
      const ip = octets.reduce((a, o) => (a << 8) + o, 0) >>> 0;
      const mask = bits === 0 ? 0 : (0xffffffff << (32 - bits)) >>> 0;
      const network = (ip & mask) >>> 0;
      const broadcast = (network | (~mask >>> 0)) >>> 0;
      const quad = (n: number) => [24, 16, 8, 0].map((sh) => (n >>> sh) & 255).join('.');
      const total = 2 ** (32 - bits);
      return [
        `Network:    ${quad(network)}/${bits}`,
        `Netmask:    ${quad(mask)}`,
        `Broadcast:  ${quad(broadcast)}`,
        `Hosts:      ${total > 2 ? `${quad(network + 1)} to ${quad(broadcast - 1)}  (${total - 2} usable)` : `${total} addresses`}`,
      ].join('\n');
    }
    case 'ip-convert': {
      const raw = input.trim();
      let n: number;
      if (/^\d+\.\d+\.\d+\.\d+$/.test(raw)) {
        const parts = raw.split('.').map(Number);
        if (parts.some((p) => p > 255)) throw new LocalToolError('Each octet must be 0 to 255.');
        n = parts.reduce((a, o) => (a << 8) + o, 0) >>> 0;
      } else {
        n = Number(/^0x/i.test(raw) ? BigInt(raw) : BigInt(raw));
        if (!Number.isFinite(n) || n < 0 || n > 0xffffffff) throw new LocalToolError('Not an IPv4 address or a 32-bit integer.');
      }
      const quad = [24, 16, 8, 0].map((sh) => (n >>> sh) & 255).join('.');
      return [
        `Dotted:   ${quad}`,
        `Integer:  ${n >>> 0}`,
        `Hex:      0x${(n >>> 0).toString(16).toUpperCase().padStart(8, '0')}`,
        `Binary:   ${[24, 16, 8, 0].map((sh) => ((n >>> sh) & 255).toString(2).padStart(8, '0')).join('.')}`,
        `IPv6:     ::ffff:${quad}`,
      ].join('\n');
    }
    case 'chmod': {
      const raw = input.trim();
      const names = ['owner', 'group', 'others'];
      if (/^[0-7]{3,4}$/.test(raw)) {
        const digits = raw.slice(-3).split('').map(Number);
        const rwx = digits.map((d) => `${d & 4 ? 'r' : '-'}${d & 2 ? 'w' : '-'}${d & 1 ? 'x' : '-'}`);
        return [`Octal:   ${raw}`, `Symbolic: ${rwx.join('')}`, ...rwx.map((r, i) => `  ${names[i].padEnd(7)} ${r}`)].join('\n');
      }
      const sym = raw.replace(/^[-dl]/, '');
      if (!/^[rwx-]{9}$/.test(sym)) throw new LocalToolError('Expected 755 or rwxr-xr-x.');
      const octal = [0, 3, 6].map((i) => {
        const part = sym.slice(i, i + 3);
        return (part[0] === 'r' ? 4 : 0) + (part[1] === 'w' ? 2 : 0) + (part[2] === 'x' ? 1 : 0);
      }).join('');
      return [`Symbolic: ${sym}`, `Octal:   ${octal}`].join('\n');
    }
    case 'ieee754': {
      const value = Number(input.trim());
      if (!Number.isFinite(value) && !Number.isNaN(value)) throw new LocalToolError(`${input.trim()} is not a number.`);
      const out: string[] = [];
      for (const [label, bytes] of [['Single (32-bit)', 4], ['Double (64-bit)', 8]] as const) {
        const buf = new DataView(new ArrayBuffer(bytes));
        if (bytes === 4) buf.setFloat32(0, value); else buf.setFloat64(0, value);
        const bits = [...Array(bytes).keys()].map((i) => buf.getUint8(i).toString(2).padStart(8, '0')).join('');
        const stored = bytes === 4 ? buf.getFloat32(0) : buf.getFloat64(0);
        const expBits = bytes === 4 ? 8 : 11;
        out.push(
          `${label}`,
          `  Sign      ${bits[0]}`,
          `  Exponent  ${bits.slice(1, 1 + expBits)}`,
          `  Mantissa  ${bits.slice(1 + expBits)}`,
          `  Stored as ${stored}`,
          '',
        );
      }
      return out.join('\n').trimEnd();
    }
    case 'military-time': {
      const raw = input.trim().toUpperCase();
      const m24 = raw.match(/^(\d{1,2}):?(\d{2})$/);
      const m12 = raw.match(/^(\d{1,2}):?(\d{2})\s*(AM|PM)$/);
      if (m12) {
        let h = Number(m12[1]) % 12;
        if (m12[3] === 'PM') h += 12;
        return `${String(h).padStart(2, '0')}:${m12[2]}`;
      }
      if (m24) {
        const h = Number(m24[1]);
        if (h > 23 || Number(m24[2]) > 59) throw new LocalToolError('That is not a valid time.');
        const suffix = h < 12 ? 'AM' : 'PM';
        const h12 = h % 12 === 0 ? 12 : h % 12;
        return `${h12}:${m24[2]} ${suffix}`;
      }
      throw new LocalToolError('Expected 14:30 or 2:30 PM.');
    }
    case 'binary-text': {
      const raw = input.trim();
      if (/^[01\s]+$/.test(raw)) {
        // The bytes are UTF-8, as the encode branch writes them, so they are
        // decoded together: one character per byte turned é into Ã©. The
        // site's decoder, which also refuses bytes that are not UTF-8.
        const bits = raw.replace(/\s+/g, '');
        if (bits.length % 8) throw new LocalToolError('Binary needs a multiple of eight bits.');
        const decoded = binaryToText(bits);
        if (isDecodeError(decoded)) throw new LocalToolError(decoded.error);
        return decoded.text;
      }
      return textToBinary(raw);
    }
    case 'date-diff': {
      const to = String(options.to ?? '');
      if (!to) throw new LocalToolError('Enter the second date.');
      const a = new Date(input.trim());
      const b = new Date(to);
      if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) throw new LocalToolError('One of those is not a date.');
      const ms = Math.abs(b.getTime() - a.getTime());
      const days = Math.floor(ms / 86_400_000);
      return [
        `Total days:   ${days}`,
        `Total hours:  ${Math.floor(ms / 3_600_000)}`,
        `Weeks:        ${Math.floor(days / 7)} weeks, ${days % 7} days`,
        `Approx years: ${(days / 365.2425).toFixed(2)}`,
      ].join('\n');
    }
    case 'list-compare': {
      const b = String(options.b ?? '');
      if (!b) throw new LocalToolError('Paste the second list.');
      const toSet = (x: string) => new Set(x.split('\n').map((l) => l.trim()).filter(Boolean));
      const A = toSet(input);
      const B = toSet(b);
      const only = (x: Set<string>, y: Set<string>) => [...x].filter((v) => !y.has(v));
      const both = [...A].filter((v) => B.has(v));
      return [
        `Only in the first (${only(A, B).length}):`, ...only(A, B).map((v) => `  ${v}`),
        ``, `Only in the second (${only(B, A).length}):`, ...only(B, A).map((v) => `  ${v}`),
        ``, `In both (${both.length}):`, ...both.map((v) => `  ${v}`),
      ].join('\n');
    }
    case 'utm-build': {
      const base = input.trim();
      let u: URL;
      try { u = new URL(base); } catch { throw new LocalToolError('That is not a URL. It needs a scheme, such as https://.'); }
      for (const key of ['source', 'medium', 'campaign', 'term', 'content']) {
        const v = options[key];
        if (v) u.searchParams.set(`utm_${key}`, String(v));
      }
      return u.toString();
    }
    /* ------------------------------------- moved off the network, wave two */
    /*
     * Each returns exactly the text the MCP handler returns, because the two
     * answers have to be the same answer. Where the handler prints JSON, the
     * shape is reproduced field for field and in order: a local answer that
     * is nearly right is worse than none, since nothing on screen tells the
     * reader which one they got. cli/scripts/compare-local.ts diffs these
     * against the live endpoint.
     */
    case 'curl-to-code': {
      // The documented default, which is what --help promises; the server's
      // own fallback is python and the catalog pins fetch for the editor.
      const r = refuse(() => convertCurl(input, opt('target', 'fetch') as 'fetch'));
      if (!r.ok) throw new LocalToolError(`Could not parse the command: ${r.error}`);
      return r.warnings.length
        ? `${r.code}\nNotes:\n${r.warnings.map((w) => `- ${w}`).join('\n')}`
        : r.code;
    }
    case 'morse': {
      const direction = opt('direction', 'auto');
      const mode = direction === 'auto' ? (looksLikeMorse(input) ? 'decode' : 'encode') : direction;
      return refuse(() => (mode === 'decode' ? decodeMorse(input).text : encodeMorse(input).morse));
    }
    case 'nato': {
      // The schema's default is "spell", which is the same branch as encode.
      if (opt('direction', 'spell') === 'decode') return refuse(() => decodeNato(input).text);
      return refuse(() => spellNatoText(input, {
        spelling: opt('spelling', 'icao') === 'common' ? 'common' : 'icao',
        digits: opt('digits', 'icao') === 'plain' ? 'plain' : 'icao',
        markCase: Boolean(options.markCase),
      }));
    }
    case 'readability': {
      const opts = { lineBreaksEndSentences: options.lineBreaksEndSentences !== false };
      const s = refuse(() => readability(input, opts));
      if (!s) throw new LocalToolError('No words found. Pass some English text.');
      const r1 = (x: number) => Math.round(x * 10) / 10;
      const sentences = analyzeSentences(input, opts);
      const max = options.maxSentences === undefined ? 20 : Number(options.maxSentences) || 0;
      const band = fleschBand(s.fleschReadingEase);
      return JSON.stringify(
        {
          counts: { sentences: s.sentences, words: s.words, syllables: s.syllables, polysyllables: s.polysyllables, complexWords: s.complexWords },
          wordsPerSentence: r1(s.wordsPerSentence),
          syllablesPerWord: Math.round(s.syllablesPerWord * 100) / 100,
          fleschReadingEase: r1(s.fleschReadingEase),
          fleschBand: `${band.label} (${band.school})`,
          fleschKincaidGrade: r1(s.fleschKincaidGrade),
          gunningFog: r1(s.gunningFog),
          smog: r1(s.smog),
          smogShortSample: s.smogShortSample,
          colemanLiau: r1(s.colemanLiau),
          automatedReadabilityIndex: r1(s.automatedReadabilityIndex),
          averageGrade: r1(s.averageGrade),
          hardSentences: sentences.filter((x) => x.level === 'hard').length,
          veryHardSentences: sentences.filter((x) => x.level === 'very-hard').length,
          passiveVoice: sentences.flatMap((x) => x.issues.filter((i) => i.kind === 'passive').map((i) => i.text)),
          adverbs: sentences.flatMap((x) => x.issues.filter((i) => i.kind === 'adverb').map((i) => i.text)),
          plainerWords: sentences.flatMap((x) => x.issues.filter((i) => i.kind === 'plain').map((i) => ({ found: i.text, try: i.suggestion }))),
          hardest: sentences
            .filter((x) => x.level !== 'ok')
            .sort((a, b) => b.grade - a.grade)
            .slice(0, max)
            .map((x) => ({ sentence: x.text, words: x.words, grade: r1(x.grade), level: x.level })),
        },
        null,
        2,
      );
    }
    case 'gitignore': {
      const templates = list(options.templates);
      const r = refuse(() => buildGitignore(templates, String(options.extra ?? '')));
      const tests = list(options.testPaths).slice(0, 100).map((p) => ({ path: p, ...checkIgnored(r.content, p) }));
      return JSON.stringify(
        { content: r.content, unknownTemplates: r.unknown, duplicatesRemoved: r.duplicatesRemoved, tests },
        null,
        2,
      );
    }
    case 'redirect-rules': {
      const r = refuse(() => generateRedirects(input, opt('platform', 'nginx') as Platform, {
        defaultCode: Number(options.defaultCode ?? 301) as RedirectOptions['defaultCode'],
        keepQuery: options.keepQuery === undefined ? true : Boolean(options.keepQuery),
        site: {
          forceHttps: Boolean(options.forceHttps),
          host: opt('canonicalHost', 'none') as SiteRules['host'],
          domain: String(options.domain ?? ''),
        },
      }));
      return JSON.stringify(
        { platform: opt('platform', 'nginx'), config: r.output, ruleCount: r.rules.length, issues: r.issues, notes: r.notes },
        null,
        2,
      );
    }
    case 'barcode-check': {
      const r = refuse(() => analyzeGtin(input, opt('mode', 'auto') as 'auto' | 'compute' | 'validate'));
      return JSON.stringify(
        { digits: r.digits, checkDigit: r.checkDigit, fullCode: r.fullCode, valid: r.valid, gtin14: r.fullCode.padStart(14, '0'), formats: r.formats },
        null,
        2,
      );
    }
    case 'number-to-words': {
      const clean = input.replace(/,/g, '');
      const w = refuse(() => decimalToWords(clean));
      if (!w) throw new LocalToolError('Enter a number up to 999 trillion, with an optional decimal part.');
      return w;
    }
    case 'color-palette': {
      const r = refuse(() => buildPalette(input, opt('rule', 'analogous') as HarmonyRule, opt('wheel', 'rgb') as ColorWheel));
      const n = String(options.name ?? 'brand') || 'brand';
      return JSON.stringify(
        {
          base: r.base,
          rule: r.rule,
          wheel: r.wheel,
          colors: r.colors.map((c) => ({
            role: c.role,
            hex: c.hex,
            rgb: c.rgbText,
            hsl: c.hslText,
            oklch: c.oklchText,
            contrastOnWhite: formatRatio(c.contrast.onWhite),
            contrastOnBlack: formatRatio(c.contrast.onBlack),
            bestTextColor: c.contrast.bestText,
            wcagNormalText: c.contrast.level,
          })),
          scale: Object.fromEntries(r.scale.map((s) => [String(s.step), s.hex])),
          baseScaleStep: r.scale.find((s) => s.isBase)?.step ?? null,
          css: `${exportCssVariables(r.colors, `${n}-palette`)}\n\n${exportScaleCss(r.scale, n)}`,
          tailwindV3: exportTailwindConfig(r.colors, r.scale, n),
          tailwindV4: exportTailwindTheme(r.colors, r.scale, n),
        },
        null,
        2,
      );
    }

    case 'contrast-check':
      return JSON.stringify(
        refuse(() => contrastReport(input, String(options.background ?? '#ffffff'))),
        null,
        2,
      );
    case 'color-convert':
      return JSON.stringify(refuse(() => colorForms(input)), null, 2);
    case 'css-gradient': {
      const stops = list(options.stops);
      if (stops.length < 2) throw new LocalToolError('A gradient needs at least two colour stops.');
      return gradientCss(
        opt('type', 'linear') === 'radial' ? 'radial' : 'linear',
        stops,
        Number(options.angle ?? 90),
      );
    }
    // The generators refuse a count outside 1..100 (1..1000 for numbers),
    // the limits the MCP schemas publish, before allocating anything.
    case 'random-name':
      return refuse(() => randomNames(Number(options.count ?? 5), (n) => randomInt(n))).join('\n');
    case 'random-email':
      return refuse(() =>
        randomEmails(
          Number(options.count ?? 5),
          (n) => randomInt(n),
          options.domain === undefined ? undefined : String(options.domain),
        ),
      ).join('\n');
    case 'random-number':
      return refuse(() =>
        randomNumbers(
          Number(options.min ?? 1),
          Number(options.max ?? 100),
          Number(options.count ?? 1),
          opt('mode', 'integer') === 'float' ? 'float' : 'integer',
          (n) => randomInt(n),
          // The same source and the same width the server reads from, so the
          // spread of the floats is the spread the server would have given.
          () => randomBytes(4).readUInt32BE(0) / 0xffffffff,
        ),
      ).join('\n');

    case 'json-to-yaml':
      return toYaml(parseJson(input));
    case 'yaml-to-json':
      return JSON.stringify(refuse(() => yamlToValue(input)), null, 2);
    case 'yaml-beautify':
      return tidyYaml(input);
    case 'html-beautify':
      return beautifyHtml(input, Number(options.indent ?? 2));
    case 'xml-beautify':
      return beautifyXml(input, Number(options.indent ?? 2));
    case 'sql-beautify':
      return beautifySql(input);
    case 'cron': {
      const r = validateCron(input);
      if (r.valid) return JSON.stringify(r, null, 2);
      // The same two shapes the server prints, so a caller parsing the
      // output does not have to know which side answered.
      throw new LocalToolError(
        r.error
          ? JSON.stringify({ valid: false, error: r.error })
          : JSON.stringify({ valid: false, errors: r.errors }, null, 2),
      );
    }
    case 'timezone-convert': {
      const to = String(options.to ?? '');
      if (!to) throw new LocalToolError('Name the zone to convert to, such as America/New_York.');
      return JSON.stringify(refuse(() => convertZone(input, to)), null, 2);
    }
    case 'text-diff':
      // diffText refuses a comparison too large to hold rather than freezing the caller.
      return refuse(() => diffText(input, String(options.b ?? ''))).patch;

    case 'json-tree':
      return refuse(() => renderJsonTree(input));
    case 'xml-tree':
      return refuse(() => renderXmlTree(input));
    case 'avro-check': {
      const schema = refuse(() => JSON.parse(input) as unknown);
      const { errors } = checkAvroSchema(schema);
      if (errors.length) throw new LocalToolError(`Not a valid Avro schema:\n${errors.map((e) => `  ${e}`).join('\n')}`);
      return `Valid Avro schema: ${describeType(schema)}`;
    }
    case 'thread-dump':
      return refuse(() => renderThreadDumpSummary(parseThreadDump(input)));
    case 'hprof-inspect':
      throw new LocalToolError('Heap dumps are binary files: run redbison hprof-inspect --file heap.hprof.');
    case 'heap-snapshot-inspect':
      throw new LocalToolError('Heap snapshots are large files: run redbison heap-snapshot-inspect --file app.heapsnapshot.');
    case 'har-analyze':
      return refuse(() => renderHarSummary(parseHar(input)));
    case 'gc-log':
      return refuse(() => renderGcLogSummary(parseGcLog(input)));
    case 'proto-decode':
      return refuse(() => renderProtoWire(decodeProtoWire(bytesFromText(input))));
    case 'msgpack-decode': {
      const r = refuse(() => decodeMessagePack(bytesFromText(input)));
      return JSON.stringify(r.trailingBytes ? r : r.value, null, 2);
    }
    case 'cbor-decode': {
      const r = refuse(() => decodeCbor(bytesFromText(input)));
      return JSON.stringify(r.trailingBytes ? r : r.value, null, 2);
    }
    case 'sqlite-inspect':
      throw new LocalToolError('SQLite databases are binary files: run redbison sqlite-inspect --file app.db.');
    case 'zip-inspect':
      throw new LocalToolError('Archives are binary files: run redbison zip-inspect --file app.jar.');
    case 'wasm-inspect':
      throw new LocalToolError('WebAssembly modules are binary files: run redbison wasm-inspect --file app.wasm.');
    case 'pprof-inspect':
      throw new LocalToolError('pprof profiles are gzipped binary files: run redbison pprof-inspect --file cpu.pprof.');
    case 'binary-inspect':
      throw new LocalToolError('Executables are binary files: run redbison binary-inspect --file ./app.');
    case 'font-inspect':
      throw new LocalToolError('Fonts are binary files: run redbison font-inspect --file font.ttf.');
    case 'pcap-inspect':
      throw new LocalToolError('Captures are binary files: run redbison pcap-inspect --file trace.pcap.');
    case 'arrow-inspect':
      throw new LocalToolError('Arrow IPC files are binary: run redbison arrow-inspect --file data.arrow.');
    case 'parquet-inspect':
      // A Parquet file is binary; a selection cannot carry it. The CLI reads
      // the file itself and never reaches this branch.
      throw new LocalToolError('Parquet files are binary: run redbison parquet-inspect --file data.parquet.');

    default:
      return undefined;
  }
}

/** The ids answered locally, for the catalog generator and the tests. */
export const LOCAL_IDS = [
  'json-format', 'json-minify', 'json-validate',
  'base64-encode', 'base64-decode', 'url-encode', 'url-decode',
  'uuid', 'password', 'hash', 'hmac', 'jwt-decode',
  'case-convert', 'slugify', 'dedupe-lines', 'lines-to-comma', 'word-count',
  'number-base', 'epoch', 'regex-test',
  'http-status', 'mime-lookup', 'lorem', 'csv-to-json', 'json-to-csv', 'markdown-table',
  // Native: no server equivalent, and none needed.
  'sort-lines', 'reverse-lines', 'shuffle-lines', 'number-lines', 'trim-lines', 'wrap-lines',
  'reverse-text', 'rot13', 'remove-accents', 'strip-html', 'html-escape', 'html-unescape',
  'to-hex', 'from-hex', 'extract-urls', 'extract-emails', 'extract-numbers',
  'sort-json-keys', 'query-to-json', 'json-to-query', 'url-parse', 'unique-words', 'char-frequency',
  // Small pure computations that happen to have a server tool as well. There
  // is no reason to use it when the editor can do the arithmetic.
  'tsv-parse', 'find-duplicates', 'remove-extra-spaces', 'remove-empty-lines', 'comma-to-lines',
  'hash-compare', 'escape-characters', 'subnet', 'ip-convert', 'chmod', 'ieee754',
  'military-time', 'binary-text', 'date-diff', 'list-compare', 'utm-build',
  // The format viewers.
  'json-tree', 'xml-tree', 'avro-check', 'parquet-inspect',
  // The dump analyzers.
  'thread-dump', 'hprof-inspect', 'heap-snapshot-inspect',
  // The tier analyzers: text-friendly here, file-based ones in the CLI.
  'har-analyze', 'gc-log', 'proto-decode', 'msgpack-decode', 'cbor-decode',
  'sqlite-inspect', 'zip-inspect', 'wasm-inspect', 'pprof-inspect', 'binary-inspect', 'font-inspect',
  'pcap-inspect', 'arrow-inspect',
] as const;

export const isLocal = (id: string): boolean => (LOCAL_IDS as readonly string[]).includes(id);
