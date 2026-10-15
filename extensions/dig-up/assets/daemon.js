"use strict";
{
  const emitWarning = process.emitWarning;
  process.emitWarning = function (warning, ...rest) {
    const type = typeof rest[0] === "string" ? rest[0] : rest[0] && rest[0].type;
    const name = (warning && warning.name) || type;
    const text = typeof warning === "string" ? warning : warning && warning.message;
    if (name === "ExperimentalWarning" && /SQLite/i.test(String(text))) return;
    return emitWarning.call(process, warning, ...rest);
  };
}
"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// engine/daemon.ts
var daemon_exports = {};
__export(daemon_exports, {
  HttpError: () => HttpError2,
  LOG_LIMIT: () => LOG_LIMIT,
  installProcessHandlers: () => installProcessHandlers,
  main: () => main,
  portRangeFrom: () => portRangeFrom,
  rotatingLog: () => rotatingLog,
  startDaemon: () => startDaemon
});
module.exports = __toCommonJS(daemon_exports);
var import_node_fs16 = require("node:fs");
var import_node_http = require("node:http");
var import_node_net2 = require("node:net");
var import_node_path14 = require("node:path");
var import_node_util = require("node:util");

// engine/api.ts
var API_VERSION = 1;
var DAEMON_INFO_FILE = "daemon.json";

// engine/config.ts
var import_node_fs2 = require("node:fs");
var import_node_os = require("node:os");
var import_node_path = require("node:path");

// engine/rules.ts
var import_node_fs = require("node:fs");

// engine/searchtext.ts
function isWhiteSpace(codePoint) {
  return codePoint >= 9 && codePoint <= 13 || codePoint === 32 || codePoint === 133 || codePoint === 160 || codePoint === 5760 || codePoint >= 8192 && codePoint <= 8202 || codePoint === 8232 || codePoint === 8233 || codePoint === 8239 || codePoint === 8287 || codePoint === 12288;
}
function isSpaceOrTab(unit) {
  return unit === 32 || unit === 9 || unit === 160 || unit === 5760 || unit >= 8192 && unit <= 8203 || unit === 8239 || unit === 8287 || unit === 12288;
}
function isSpaceOrNewline(unit) {
  return isSpaceOrTab(unit) || unit >= 10 && unit <= 13 || unit === 133 || unit === 8232 || unit === 8233;
}
function trimBy(text, inSet) {
  let start = 0;
  let end = text.length;
  while (start < end && inSet(text.charCodeAt(start))) start++;
  while (end > start && inSet(text.charCodeAt(end - 1))) end--;
  return start === 0 && end === text.length ? text : text.slice(start, end);
}
function trimWhitespaceAndNewlines(text) {
  return trimBy(text, isSpaceOrNewline);
}
function trimWhitespace(text) {
  return trimBy(text, isSpaceOrTab);
}
var WHITE_SPACE = String.raw`\p{White_Space}`;
var LETTER = /[\p{Alphabetic}---]/u;
var NUMBER = new RegExp(
  String.raw`[\p{N}㐅㒃㠪㭍一七万三两九二五亖京亿什` + String.raw`仟仨伍佰俩倆億兆兩八六十千-卅卌叁-叄` + String.raw`四壱壹幺廾廿弌-弎弐拐拾捌柒洞漆玖百` + String.raw`皕秭肆萬貮貳贰鈎钩阡陆陌陸零參拾兩` + String.raw`零六陸什\u{12038}\u{12039}\u{12079}\u{12226}\u{1222b}\u{1230b}\u{1230d}\u{12399}` + String.raw`\u{20001}\u{20064}\u{200e2}\u{20121}\u{2092a}\u{20983}\u{2098c}\u{2099c}\u{20aea}\u{20afd}\u{20b19}` + String.raw`\u{22390}\u{22998}\u{23b1b}\u{2626d}\u{2f890}]`,
  "u"
);
var ALPHANUMERIC = /[\p{L}\p{M}\p{N}]/u;
var LETTER_OR_MARK = /[\p{L}\p{M}]/u;
var NON_ASCII = /[\u0080-\uffff]/;
function lowercased(text) {
  if (!NON_ASCII.test(text)) return text.toLowerCase();
  let out = "";
  for (const scalar of text) out += scalar.toLowerCase();
  return out;
}
var JOINS_SOURCE = String.raw`[\p{M}\u0600-\u0605\u06dd\u070f\u0890\u0891\u08e2\u0d4e\u0e33\u0eb3\u1100-\u11ff\ua960-\ua97f` + String.raw`\ud7b0-\ud7ff\uff9e\uff9f\ud800-\udfff\u{10000}-\u{10ffff}]|\u200c|\u200d`;
var JOINS = new RegExp(JOINS_SOURCE, "u");
var segmenter = new Intl.Segmenter("en", { granularity: "grapheme" });
var STACKER = /[\u1039\u17d2\u1a60\u1b44\u1bab\ua9c0\uaaf6\u{10a3f}\u{11133}\u{113d0}\u{1193e}\u{11a47}\u{11a99}\u{11f42}]/u;
var STACKED = new RegExp(
  String.raw`${STACKER.source}[\p{M}\u200c\u200d]*(?=(?![\u0e33\u0eb3\uff9e\uff9f])\p{L})`,
  "gu"
);
var CR = 13;
var LF = 10;
function isPlainUnit(text, at) {
  const unit = text.charCodeAt(at);
  return !(unit >= 55296 && unit <= 57343) && !JOINS.test(text[at]);
}
function isCut(text, at) {
  if (at <= 0 || at >= text.length) return true;
  const crlf = text.charCodeAt(at - 1) === CR && text.charCodeAt(at) === LF;
  return !crlf && isPlainUnit(text, at - 1) && isPlainUnit(text, at);
}
function* stretches(text) {
  const joins = new RegExp(JOINS_SOURCE, "gu");
  let from = 0;
  let hit = joins.exec(text);
  while (hit) {
    let start = Math.max(from, hit.index - 1);
    if (!isCut(text, start)) start--;
    let end = hit.index + hit[0].length;
    for (; ; ) {
      while (!isCut(text, end)) end++;
      joins.lastIndex = end;
      hit = joins.exec(text);
      if (!hit || hit.index - end > 32 || end - start > 4096) break;
      end = hit.index + hit[0].length;
    }
    if (start > from) yield [from, start, true];
    yield [start, end, false];
    from = end;
  }
  if (from < text.length) yield [from, text.length, true];
}
function windowStarts(text, from, to) {
  const starts = [];
  for (const { segment, index: index2 } of segmenter.segment(text.slice(from, to))) {
    starts.push(from + index2);
    if (!STACKER.test(segment)) continue;
    for (const stack of segment.matchAll(STACKED)) starts.push(from + index2 + stack.index + stack[0].length);
  }
  return starts;
}
var startsPlain = (text, at) => text.charCodeAt(at) !== LF || text.charCodeAt(at - 1) !== CR;
var Graphemes = class {
  constructor(text) {
    this.text = text;
    if (!JOINS.test(text) && !text.includes("\r\n")) {
      this.starts = null;
      this.count = text.length;
      return;
    }
    const starts = new Uint32Array(text.length + 1);
    let count = 0;
    for (const [from, to, plain] of stretches(text)) {
      if (plain) {
        for (let at = from; at < to; at++) if (startsPlain(text, at)) starts[count++] = at;
      } else {
        for (const start of windowStarts(text, from, to)) starts[count++] = start;
      }
    }
    starts[count] = text.length;
    this.starts = starts.subarray(0, count + 1);
    this.count = count;
  }
  text;
  count;
  starts;
  /** UTF-16 offset where grapheme `index` starts (`count` gives the text's length). */
  start(index2) {
    return this.starts ? this.starts[index2] : index2;
  }
  /** The index of the grapheme that holds UTF-16 offset `offset` (`count` at the end of the text). */
  indexAt(offset) {
    if (!this.starts) return offset;
    let low = 0;
    let high = this.count;
    while (low < high) {
      const middle = low + high + 1 >> 1;
      if (this.starts[middle] <= offset) low = middle;
      else high = middle - 1;
    }
    return low;
  }
  /** Whether a UTF-16 offset is between two graphemes (or at either end). */
  isBoundary(offset) {
    return this.start(this.indexAt(offset)) === offset;
  }
  slice(from, to) {
    return this.text.slice(this.start(from), this.start(to));
  }
  at(index2) {
    return this.slice(index2, index2 + 1);
  }
  /** `Character.isWhitespace`: the first scalar decides. */
  isWhitespace(index2) {
    return isWhiteSpace(this.text.codePointAt(this.start(index2)) ?? 0);
  }
};
function graphemeCount(text) {
  let count = 0;
  for (const [from, to, plain] of stretches(text)) {
    if (!plain) {
      count += windowStarts(text, from, to).length;
      continue;
    }
    count += to - from;
    for (let at = text.indexOf("\r\n", from); at >= 0 && at < to; at = text.indexOf("\r\n", at + 2)) count--;
  }
  return count;
}
function graphemePrefix(text, count) {
  for (let take = count + 64; ; take *= 2) {
    if (take >= text.length) {
      const all = new Graphemes(text);
      return count >= all.count ? text : text.slice(0, all.start(count));
    }
    const high = text.charCodeAt(take - 1);
    const head = new Graphemes(text.slice(0, high >= 55296 && high <= 56319 ? take + 1 : take));
    if (head.count > count) return text.slice(0, head.start(count));
  }
}
function hasPrefix(text, prefix) {
  if (!text.startsWith(prefix)) return false;
  if (prefix === "" || text.length === prefix.length) return true;
  return new Graphemes(text.slice(0, prefix.length + 2)).isBoundary(prefix.length);
}
function isLetterCharacter(character) {
  return LETTER.test(String.fromCodePoint(character.codePointAt(0) ?? 0));
}
function isNumberCharacter(character) {
  return NUMBER.test(String.fromCodePoint(character.codePointAt(0) ?? 0));
}
function isWordCharacter(character) {
  return ALPHANUMERIC.test(character);
}
function normalized(text) {
  let out = "";
  for (const scalar of compatibilityComposed(text)) {
    const value = scalar.codePointAt(0);
    if (value === 8203) {
      out += " ";
    } else if (value === 173 || value === 1564 || value >= 8204 && value <= 8207 || value >= 8234 && value <= 8238 || value >= 8288 && value <= 8292 || value >= 8294 && value <= 8297 || value === 65279) {
      continue;
    } else if (value === 1600 || value >= 1611 && value <= 1631 || value === 1648) {
      continue;
    } else if (value === 1570 || value === 1571 || value === 1573 || value === 1649) {
      out += "\u0627";
    } else {
      out += scalar;
    }
  }
  return out;
}
var NO_COMPOSITION = new RegExp(
  String.raw`(?=[\uff9e\uff9f\u3131-\u318e\uffa0-\uffdc\u3260-\u327e])|(?<=[\u3131-\u318e\uffa0-\uffdc\u3260-\u327e])` + String.raw`|(?<=[\uac00-\ud7a3])(?=[\u1160-\u11ff\ud7b0-\ud7ff])`,
  "u"
);
var COMPOSES_DIFFERENTLY = /[\uff9e\uff9f\u3131-\u318e\uffa0-\uffdc\u3260-\u327e\uac00-\ud7a3]/;
function compatibilityComposed(text) {
  if (!COMPOSES_DIFFERENTLY.test(text)) return text.normalize("NFKC");
  return text.split(NO_COMPOSITION).map((piece) => piece.normalize("NFKC")).join("");
}
var isIndic = (value) => value >= 2304 && value <= 3583;
var isArabic = (value) => value >= 1536 && value <= 1791;
function inflects(word) {
  for (const scalar of word) {
    const value = scalar.codePointAt(0);
    if (isIndic(value) || isArabic(value)) return true;
  }
  return false;
}
function hasWords(text) {
  let letters = 0;
  let others = 0;
  for (const scalar of text) {
    if (isSpaceOrNewline(scalar.codePointAt(0))) continue;
    if (LETTER_OR_MARK.test(scalar)) letters++;
    else others++;
  }
  return letters > 0 && letters * 4 >= others;
}
var KEPT_MARKS = /[\u093a\u0941-\u0948\u094d\u0955-\u0957\u0962\u0963\u09c1-\u09c4\u09cd\u09e2\u09e3\u0ac1-\u0ac5\u0ac7\u0ac8\u0acd\u0ae2\u0ae3]/u;
var IGNORED_MARKS = /[\u0b3e\u0b57\u0bbe\u0bd7\u0cc0\u0cc2\u0cc7\u0cc8\u0cca\u0ccb\u0cd5\u0cd6\u0d3e\u0d57\u0dcf\u0ddf\u1715\u1734\u1b35\u1b3b\u1b3d\u1b43\u1b44\u1baa\u1bf2\u1bf3\u302e\u302f\ua953\ua9c0\u{1e000}-\u{1e006}\u{1e008}-\u{1e018}\u{1e01b}-\u{1e021}\u{1e023}\u{1e024}\u{1e026}-\u{1e02a}\u{1e08f}]/u;
var IGNORED_IN_LONG = /[\u093a\u0941-\u0948\u094d\u0955-\u0957\u0962\u0963\u09be\u09c1-\u09c4\u09cd\u09d7\u09e2\u09e3\u0ac1-\u0ac5\u0ac7\u0ac8\u0acd\u0ae2\u0ae3]/u;
var IGNORED_IN_SHORT = /[\u0903\u0982\u0983\u0a83]/u;
var NONSPACING = /^[\p{Mn}\p{Me}]$/u;
var MARK = new RegExp("^\\p{M}$", "u");
var NUKTA_LETTERS = /* @__PURE__ */ new Set(["\u0929", "\u0931", "\u0934"]);
var NUKTA_VIRAMA = /* @__PURE__ */ new Map([
  [2364, 2381],
  [2492, 2509],
  [2748, 2765]
]);
function stopsBeforeNuktaVirama(scalars, last) {
  const point = (at) => scalars[at]?.codePointAt(0) ?? 0;
  const virama = (at) => NUKTA_VIRAMA.get(point(at));
  if (virama(last + 1) !== void 0 && virama(last + 1) === point(last + 2)) return true;
  if (virama(last) !== void 0 && virama(last) === point(last + 1)) return true;
  return NUKTA_LETTERS.has(scalars[last]) && point(last + 1) === 2381;
}
function skippedMarkSource(long) {
  const others = (long ? IGNORED_IN_LONG : IGNORED_IN_SHORT).source;
  return String.raw`(?:(?![\u{10000}-\u{10ffff}])(?!${KEPT_MARKS.source})[\p{Mn}\p{Me}]|${IGNORED_MARKS.source}|${others})`;
}
var SKIPPED = [false, true].map((long) => skippedMarkSource(long));
var IS_SKIPPED = SKIPPED.map((source) => new RegExp(`^${source}$`, "u"));
function foldScalar(scalar, long) {
  if (!NON_ASCII.test(scalar) || MARK.test(scalar)) return scalar;
  const parts = scalar.normalize("NFD");
  if (parts === scalar) return scalar === "\xDF" ? "ss" : scalar === "\u03C2" ? "\u03C3" : scalar;
  const base = parts.codePointAt(0);
  return base < 1296 || !long && NUKTA_LETTERS.has(scalar) ? String.fromCodePoint(base) : scalar;
}
function spellings(letter) {
  const all = [letter, letter.normalize("NFD")];
  const syllable = letter.charCodeAt(0) - 44032;
  if (syllable >= 0 && syllable < 11172 && syllable % 28 !== 0) {
    all.push(String.fromCharCode(letter.charCodeAt(0) - syllable % 28, 4519 + syllable % 28));
  }
  return all;
}
var escapeRegExp = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);
var FoldedText = class {
  text;
  /** `starts[i]`: where the piece of code point `i` starts (and `starts[count]` the end). */
  starts = [0];
  /** Whether code point `i` is a mark the search may skip, or match to the same mark of the word. */
  skippable = [];
  /** The code point each UTF-16 unit of `text` came from. */
  points = [];
  constructor(scalars, long) {
    let text = "";
    scalars.forEach((scalar, index2) => {
      const skippable = NON_ASCII.test(scalar) && IS_SKIPPED[long ? 1 : 0].test(scalar);
      const piece = skippable ? scalar : foldScalar(scalar, long);
      text += piece;
      for (let unit = 0; unit < piece.length; unit++) this.points.push(index2);
      this.starts.push(text.length);
      this.skippable.push(skippable);
    });
    this.text = text;
  }
  pointAt(unit) {
    return this.points[unit];
  }
};
function wordPattern(scalars, long) {
  let required = false;
  const parts = scalars.map((scalar, index2) => {
    if (IS_SKIPPED[long ? 1 : 0].test(scalar)) return `(?:${escapeRegExp(scalar)})?`;
    required = true;
    const folded = foldScalar(scalar, long);
    const isWholeLetter = folded === scalar && folded.normalize("NFD") !== folded;
    const alternatives = isWholeLetter ? spellings(folded) : [folded];
    const composed2 = (scalar + (scalars[index2 + 1] ?? "")).normalize("NFC");
    if ([...composed2].length === 1 && composed2.codePointAt(0) >= 1296) alternatives.push(...spellings(composed2));
    if (alternatives.length === 1) return escapeRegExp(folded);
    return `(?:${alternatives.map(escapeRegExp).join("|")})`;
  });
  return required ? new RegExp(parts.join(`${SKIPPED[long ? 1 : 0]}*`), "gu") : null;
}
var SearchedText = class {
  constructor(graphemes) {
    this.graphemes = graphemes;
    for (let index2 = 0; index2 < graphemes.count; index2++) {
      for (const scalar of lowercased(normalized(graphemes.at(index2)))) {
        this.scalars.push(scalar);
        this.owner.push(index2);
      }
    }
  }
  graphemes;
  scalars = [];
  /** The character each code point came from. */
  owner = [];
  views = [void 0, void 0];
  folded(long) {
    return this.views[long ? 1 : 0] ??= new FoldedText(this.scalars, long);
  }
};
function matchGraphemes(word, text) {
  const { scalars, owner, graphemes } = text;
  const wordScalars = [...lowercased(normalized(word))];
  const patterns = [false, true].map((long) => wordPattern(wordScalars, long));
  const prefix = inflects(word);
  const found = [];
  let from = 0;
  while (found.length < 500 && from < scalars.length) {
    const long = scalars.length - from >= 65;
    const pattern = patterns[long ? 1 : 0];
    if (!pattern) break;
    const folded = text.folded(long);
    const { starts, skippable } = folded;
    pattern.lastIndex = starts[from];
    const match = pattern.exec(folded.text);
    if (!match || match[0] === "") break;
    const hit = match.index;
    const after = hit + match[0].length;
    let first = folded.pointAt(hit);
    let last = folded.pointAt(after - 1);
    const afterKeptMark = first > 0 && MARK.test(scalars[first - 1]) && !skippable[first - 1];
    if (starts[first] !== hit || starts[last + 1] !== after || afterKeptMark || !long && stopsBeforeNuktaVirama(scalars, last)) {
      from = first + 1;
      continue;
    }
    while (last + 1 < scalars.length && (skippable[last + 1] || NONSPACING.test(scalars[last + 1]))) last++;
    from = last + 1;
    first = owner[first];
    let end = owner[last] + 1;
    if (first > 0 && isWordCharacter(graphemes.at(first - 1))) continue;
    if (end < graphemes.count && isWordCharacter(graphemes.at(end))) {
      if (!prefix) continue;
      while (end < graphemes.count && isWordCharacter(graphemes.at(end))) end++;
    }
    const previous = found[found.length - 1];
    if (previous && previous.start < end && first < previous.end) continue;
    found.push({ start: first, end });
  }
  return found;
}
function snippet(text, terms, words2 = 12) {
  const graphemes = new Graphemes(text);
  const searched = new SearchedText(graphemes);
  const marks = terms.flatMap((term) => matchGraphemes(term, searched)).sort((a, b) => a.start - b.start);
  const first = marks[0];
  if (!first) return null;
  let start = first.start;
  let before = 0;
  while (start > 0 && before < Math.trunc(words2 / 3)) {
    start--;
    if (graphemes.isWhitespace(start) && start < first.start && !graphemes.isWhitespace(start + 1)) before++;
  }
  if (start > 0 || graphemes.isWhitespace(start)) start++;
  let end = first.end;
  let after = 0;
  while (end < graphemes.count && after < words2 - before) {
    if (graphemes.isWhitespace(end)) after++;
    end++;
  }
  let out = start > 0 ? "\u2026" : "";
  let cursor = start;
  for (const mark of marks) {
    if (mark.start < start || mark.end > end || mark.start < cursor) continue;
    out += graphemes.slice(cursor, mark.start) + "\xAB" + graphemes.slice(mark.start, mark.end) + "\xBB";
    cursor = mark.end;
  }
  out += graphemes.slice(cursor, end) + (end < graphemes.count ? "\u2026" : "");
  return trimWhitespace(out.replace(new RegExp(`${WHITE_SPACE}+`, "gu"), " "));
}
var ALPHABETIC = new RegExp("\\p{Alphabetic}", "u");

// engine/rules.ts
var index = (kind) => ({ action: "index", kind });
var skip = (reason) => ({ action: "skip", reason });
var IGNORE = { action: "ignore" };
var SKIPPED_FOLDER_NAMES = /* @__PURE__ */ new Set([
  "node_modules",
  "bower_components",
  "venv",
  "site-packages",
  "__pycache__",
  "DerivedData",
  "Pods",
  "Carthage"
]);
var PROJECT_MARKERS = [
  ".git",
  "package.json",
  "Package.swift",
  "pyproject.toml",
  "setup.py",
  "requirements.txt",
  "Cargo.toml",
  "go.mod",
  "pom.xml",
  "build.gradle",
  "build.gradle.kts",
  "Gemfile",
  "composer.json",
  "CMakeLists.txt"
];
var PROJECT_BUNDLE_EXTENSIONS = /* @__PURE__ */ new Set(["xcodeproj", "xcworkspace"]);
var DOC_EXTENSIONS = /* @__PURE__ */ new Set([
  "txt",
  "text",
  "md",
  "markdown",
  "rtf",
  "docx",
  "doc",
  "odt",
  "html",
  "htm"
]);
var CODE_EXTENSIONS = /* @__PURE__ */ new Set([
  "py",
  "ipynb",
  "c",
  "h",
  "cc",
  "cpp",
  "cxx",
  "hpp",
  "hh",
  "m",
  "mm",
  "swift",
  "tsx",
  "cts",
  "js",
  "jsx",
  "mjs",
  "cjs",
  "go",
  "rs",
  "java",
  "kt",
  "kts",
  "scala",
  "rb",
  "php",
  "cs",
  "fs",
  "sh",
  "bash",
  "zsh",
  "fish",
  "ps1",
  "lua",
  "pl",
  "r",
  "jl",
  "dart",
  "sql",
  "vue",
  "svelte",
  "css",
  "scss",
  "sass",
  "less",
  "json",
  "jsonl",
  "yaml",
  "yml",
  "toml",
  "xml",
  "plist",
  "gradle",
  "cmake",
  "mk",
  "lock",
  "log",
  "csv",
  "tsv",
  "ini",
  "cfg",
  "conf",
  "proto",
  "graphql",
  "tf",
  "nix",
  "zig",
  "hs",
  "ex",
  "exs",
  "erl",
  "clj",
  "elm",
  "ml",
  "vim",
  "el",
  "asm",
  "metal",
  "glsl",
  "hlsl",
  "wgsl",
  "cu",
  "pyi",
  "pyc"
]);
var SCREENSHOT_PREFIXES = ["Screenshot", "Screen Shot", "CleanShot", "SCR-"];
var SOURCE_EXTENSIONS = /* @__PURE__ */ new Set([
  "py",
  "pyi",
  "pyx",
  "c",
  "h",
  "cc",
  "cpp",
  "cxx",
  "hpp",
  "hh",
  "hxx",
  "m",
  "mm",
  "swift",
  "ts",
  "tsx",
  "mts",
  "cts",
  "js",
  "jsx",
  "mjs",
  "cjs",
  "go",
  "rs",
  "java",
  "kt",
  "kts",
  "scala",
  "groovy",
  "rb",
  "php",
  "cs",
  "fs",
  "sh",
  "bash",
  "zsh",
  "fish",
  "ps1",
  "lua",
  "pl",
  "pm",
  "r",
  "jl",
  "dart",
  "sql",
  "vue",
  "svelte",
  "astro",
  "html",
  "htm",
  "css",
  "scss",
  "sass",
  "less",
  "gradle",
  "cmake",
  "mk",
  "proto",
  "graphql",
  "gql",
  "tf",
  "hcl",
  "nix",
  "zig",
  "hs",
  "ex",
  "exs",
  "erl",
  "clj",
  "cljs",
  "elm",
  "ml",
  "mli",
  "vim",
  "el",
  "lisp",
  "asm",
  "s",
  "metal",
  "glsl",
  "hlsl",
  "wgsl",
  "cu",
  "cuh",
  "ino",
  "v",
  "sv",
  "tex"
]);
var CODE_TEXT_EXTENSIONS = /* @__PURE__ */ new Set([
  "md",
  "markdown",
  "rst",
  "adoc",
  "org",
  "txt",
  "yaml",
  "yml",
  "toml"
]);
var CODE_FILE_NAMES = /* @__PURE__ */ new Set([
  "Makefile",
  "makefile",
  "GNUmakefile",
  "Dockerfile",
  "Containerfile",
  "Justfile",
  "justfile",
  "Rakefile",
  "Gemfile",
  "Podfile",
  "Brewfile",
  "Procfile",
  "Vagrantfile",
  "Jenkinsfile"
]);
var IMAGE_EXTENSIONS = /* @__PURE__ */ new Set([
  "jpg",
  "jpeg",
  "jpe",
  "jfif",
  "png",
  "gif",
  "bmp",
  "tif",
  "tiff",
  "webp",
  "heic",
  "heif",
  "avif",
  "psd",
  "tga",
  "pnm",
  "ppm",
  "pgm",
  "cr2",
  "nef",
  "arw",
  "dng",
  "raf",
  "orf",
  "rw2"
]);
var AUDIO_EXTENSIONS = /* @__PURE__ */ new Set([
  "mp3",
  "m4a",
  "m4b",
  "aac",
  "wav",
  "wave",
  "flac",
  "ogg",
  "oga",
  "opus",
  "aiff",
  "aif",
  "wma",
  "amr",
  "caf",
  "mka"
]);
var VIDEO_EXTENSIONS = /* @__PURE__ */ new Set([
  "mp4",
  "m4v",
  "mov",
  "mkv",
  "webm",
  "avi",
  "wmv",
  "flv",
  "3gp",
  "3g2",
  "mpg",
  "mpeg",
  "m2v",
  "ogv",
  "mxf"
]);
var SECRET_TYPES = /* @__PURE__ */ new Set([
  "pem",
  "key",
  "p12",
  "pfx",
  "keystore",
  "jks",
  "ppk",
  "kdbx",
  "gpg",
  "asc",
  "crt",
  "cer",
  "der",
  "p8",
  "mobileprovision"
]);
var SECRET_PREFIXES = [
  "id_rsa",
  "id_dsa",
  "id_ecdsa",
  "id_ed25519",
  ".env",
  "secret",
  "credential",
  ".netrc",
  ".npmrc",
  ".pypirc",
  "htpasswd",
  ".htpasswd"
];
var LICENSE_PREFIXES = ["license", "licence", "copying", "notice"];
var CAMERA_PREFIXES = [
  "img",
  "dsc",
  "pxl",
  "mvimg",
  "vid",
  "gopr",
  "dji",
  "photo",
  "whatsapp",
  "screenshot"
];
function tidyPath(path) {
  const single = path.includes("//") ? path.replace(/\/{2,}/g, "/") : path;
  return single.length > 1 && single.endsWith("/") ? single.slice(0, -1) : single;
}
function lastPathComponent(path) {
  const tidy = tidyPath(path);
  return tidy === "/" ? tidy : tidy.slice(tidy.lastIndexOf("/") + 1);
}
function parentPath(path) {
  const tidy = tidyPath(path);
  const slash = tidy.lastIndexOf("/");
  if (slash < 0) return "";
  return slash === 0 ? "/" : tidy.slice(0, slash);
}
var NON_ASCII2 = /[\u0080-\uffff]/;
function canonical(path) {
  return NON_ASCII2.test(path) ? path.normalize("NFC") : path;
}
function samePath(a, b) {
  return a === b || canonical(a) === canonical(b);
}
function pathExtension(name) {
  const dot = name.lastIndexOf(".");
  if (dot < 0) return "";
  const stem = name.slice(0, dot);
  const ext = name.slice(dot + 1);
  if (stem === "" || stem === "." || stem === ".." || ext === "" || ext.includes(" ")) return "";
  return ext;
}
function deletingPathExtension(name) {
  const ext = pathExtension(name);
  return ext === "" ? name : name.slice(0, name.length - ext.length - 1);
}
var FS_KEPT = /[\u2000-\u2fff\uf900-\ufaff\u{2f800}-\u{2faff}\u{105c9}\u{105e4}]/u;
var FS_BARRIER = /[\u0f73\u0f75\u0f81]/u;
function fileSystemForm(text) {
  if (!NON_ASCII2.test(text)) return text;
  if (!FS_KEPT.test(text) && !FS_BARRIER.test(text)) return text.normalize("NFD");
  let out = "";
  let run2 = "";
  for (const character of text) {
    if (FS_KEPT.test(character) && character.normalize("NFD") !== character) {
      out += run2.normalize("NFD") + character;
      run2 = "";
    } else if (FS_BARRIER.test(character)) {
      out += run2.normalize("NFD");
      run2 = character;
    } else {
      run2 += character;
    }
  }
  return out + run2.normalize("NFD");
}
function lowerExtension(path) {
  return lowercased(pathExtension(lastPathComponent(path)));
}
function parseExtensions(text) {
  const words2 = text.split(/[,\p{White_Space}]+/u).map((word) => lowercased(word.replace(/^[*.]+/, "")));
  return [...new Set(words2.filter((word) => word !== ""))];
}
function isMPEGTransportStream(path) {
  let fd;
  try {
    fd = (0, import_node_fs.openSync)(path, import_node_fs.constants.O_RDONLY | import_node_fs.constants.O_NONBLOCK);
  } catch {
    return false;
  }
  try {
    if (!(0, import_node_fs.fstatSync)(fd).isFile()) return false;
    const bytes = Buffer.alloc(600);
    const read = (0, import_node_fs.readSync)(fd, bytes, 0, 600, 0);
    if (read < 400) return false;
    return bytes[0] === 71 && bytes[188] === 71 && bytes[376] === 71 || bytes[4] === 71 && bytes[196] === 71 && bytes[388] === 71;
  } catch {
    return false;
  } finally {
    (0, import_node_fs.closeSync)(fd);
  }
}
function isScreenshot(name, marker = false) {
  return marker || SCREENSHOT_PREFIXES.some((prefix) => hasPrefix(name, prefix));
}
function isSecret(name) {
  const lower = lowercased(name);
  return SECRET_TYPES.has(pathExtension(lower)) || SECRET_PREFIXES.some((prefix) => hasPrefix(lower, prefix));
}
function holdsPrivateKey(text) {
  return text.includes("PRIVATE KEY-----");
}
var IN_THE_CLOUD = "in the cloud, not downloaded";
var isNotDownloaded = (file) => file !== void 0 && (file.dataless || file.inCloud);
function classify(path, type, options, screenshotMarker = false, file) {
  const name = lastPathComponent(path);
  const ext = lowerExtension(path);
  if (options.excludedExtensions.includes(ext)) return skip("excluded type");
  const codeOrData = options.includeCode ? index("doc") : skip("code or data file");
  if (ext === "ts" || ext === "mts" || ext === "m2ts") {
    if (isNotDownloaded(file)) return skip(IN_THE_CLOUD);
    return isMPEGTransportStream(path) ? index("video") : codeOrData;
  }
  if (DOC_EXTENSIONS.has(ext)) return index("doc");
  if (CODE_EXTENSIONS.has(ext)) return codeOrData;
  const image = () => index(isScreenshot(name, screenshotMarker) ? "screenshot" : "image");
  if (type == null) {
    if (SOURCE_EXTENSIONS.has(ext)) return codeOrData;
    if (ext === "pdf") return index("pdf");
    if (IMAGE_EXTENSIONS.has(ext)) return image();
    if (VIDEO_EXTENSIONS.has(ext)) return index("video");
    if (AUDIO_EXTENSIONS.has(ext)) return index("audio");
    return IGNORE;
  }
  switch (type) {
    case "sourceCode":
      return codeOrData;
    case "pdf":
      return index("pdf");
    case "image":
      return image();
    case "movie":
      return index("video");
    case "audio":
      return index("audio");
  }
}
function classifyCode(path, options, file) {
  const name = lastPathComponent(path);
  const ext = lowerExtension(path);
  if (options.excludedExtensions.includes(ext)) return skip("excluded type");
  if (isSecret(name)) return skip("key or password file");
  const lower = lowercased(name);
  if (lower.endsWith(".min.js") || lower.endsWith(".min.mjs") || lower.endsWith(".min.css")) return skip("minified");
  if (LICENSE_PREFIXES.some((prefix) => hasPrefix(lower, prefix))) return skip("license");
  if (ext === "ts" || ext === "mts") {
    if (isNotDownloaded(file)) return skip(IN_THE_CLOUD);
    if (isMPEGTransportStream(path)) return IGNORE;
  }
  if (SOURCE_EXTENSIONS.has(ext) || CODE_TEXT_EXTENSIONS.has(ext) || ext === "ipynb" || CODE_FILE_NAMES.has(name) || hasPrefix(name, "Dockerfile")) {
    return index("code");
  }
  if (CODE_EXTENSIONS.has(ext)) return skip("data file");
  return IGNORE;
}
function skipReason(folder, home, excluded) {
  const name = lastPathComponent(folder);
  if (SKIPPED_FOLDER_NAMES.has(name)) return "developer folder";
  if (name.endsWith(".noindex")) return ".noindex folder";
  if (samePath(folder, home + "/Library")) return "~/Library";
  const path = canonical(folder);
  if (excluded.some((skipped) => samePath(path, skipped) || hasPrefix(path, canonical(skipped) + "/"))) {
    return "excluded folder";
  }
  return null;
}
function isWalked(path, root, home, excluded) {
  const [inner, outer] = [canonical(path), canonical(root)];
  if (inner !== outer && !FolderSelection.isInside(inner, outer)) return false;
  let folder = outer;
  for (const part of inner.slice(outer.length).split("/")) {
    if (part === "") continue;
    folder += "/" + part;
    if (hasPrefix(part, ".") || skipReason(folder, home, excluded) !== null) return false;
  }
  return true;
}
function isProjectRoot(names) {
  const set = new Set(names);
  return PROJECT_MARKERS.some((marker) => set.has(marker)) || [...set].some((name) => PROJECT_BUNDLE_EXTENSIONS.has(pathExtension(name)));
}
function isProjectRootFolder(folder) {
  try {
    return isProjectRoot((0, import_node_fs.readdirSync)(folder));
  } catch {
    return false;
  }
}
function looksMachineNamed(stem) {
  const name = lowercased(stem);
  if (CAMERA_PREFIXES.some((prefix) => hasPrefix(name, prefix))) return false;
  if (/^[0-9a-f]{8,}([-_][0-9a-f]{4,})*$/.test(name)) return true;
  return new RegExp("^[a-z]{0,16}[-_. ]?\\p{Nd}{3,}([-_.]\\p{Nd}+)*$", "u").test(name);
}
function datasetFolders(files, roots, minimum = 300) {
  const rootSet = new Set([...roots].map(canonical));
  const groups = /* @__PURE__ */ new Map();
  for (const file of files) {
    const key = canonical(file.folder);
    if (!(file.kind === "image" || file.kind === "audio" || file.kind === "video") || rootSet.has(key)) continue;
    let group = groups.get(key);
    if (!group) groups.set(key, group = { folder: file.folder, kinds: /* @__PURE__ */ new Map() });
    const stems = group.kinds.get(file.kind);
    if (stems) stems.push(file.stem);
    else group.kinds.set(file.kind, [file.stem]);
  }
  const datasets = {};
  for (const { folder, kinds } of groups.values()) {
    for (const stems of kinds.values()) {
      if (stems.length < minimum) continue;
      const machine = stems.filter(looksMachineNamed).length;
      if (machine / stems.length >= 0.7) datasets[folder] = (datasets[folder] ?? 0) + stems.length;
    }
  }
  return datasets;
}
function keepCandidates(found, o) {
  const skipped = {};
  if (o.code) return { kept: [...found], skipped, datasets: {} };
  const projectRoots = new Set([...o.projectRoots].map(canonical));
  const known = /* @__PURE__ */ new Map();
  const inProject = (folder) => {
    let answer = known.get(folder);
    if (answer === void 0) {
      const parent = parentPath(folder);
      answer = projectRoots.has(folder) || parent !== folder && parent.length > 1 && inProject(parent);
      known.set(folder, answer);
    }
    return answer;
  };
  let kept = found.filter((file) => {
    if (file.kind === "screenshot" || !inProject(canonical(parentPath(file.path)))) return true;
    skipped["inside a code project"] = (skipped["inside a code project"] ?? 0) + 1;
    return false;
  });
  let datasets = {};
  if (!o.includeDatasets) {
    const media = (kind) => kind === "image" || kind === "audio" || kind === "video";
    datasets = datasetFolders(
      kept.map((file) => ({
        folder: parentPath(file.path),
        stem: deletingPathExtension(lastPathComponent(file.path)),
        kind: file.kind
      })),
      new Set(o.roots)
    );
    const datasetKeys = new Set(Object.keys(datasets).map(canonical));
    if (datasetKeys.size > 0) {
      kept = kept.filter((file) => {
        if (!(media(file.kind) && datasetKeys.has(canonical(parentPath(file.path))))) return true;
        skipped["dataset"] = (skipped["dataset"] ?? 0) + 1;
        return false;
      });
    }
  }
  return { kept, skipped, datasets };
}
function unique(paths) {
  const seen = /* @__PURE__ */ new Set();
  const once = paths.filter((path) => {
    const key = canonical(path);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  return Object.freeze(once);
}
var sameList = (a, b) => a.length === b.length && a.every((path, at) => samePath(path, b[at]));
var FolderSelection = class _FolderSelection {
  _chosen;
  _skipped;
  /** Folders already searched (when settings add more): whatever is clicked, they stay. */
  kept;
  constructor(o = {}) {
    this._chosen = unique(o.chosen ?? []);
    this._skipped = unique(o.skipped ?? []);
    this.kept = unique(o.kept ?? []);
  }
  get chosen() {
    return this._chosen;
  }
  get skipped() {
    return this._skipped;
  }
  /** The same choices (DigUp's `Equatable`). */
  equals(other) {
    return sameList(this.chosen, other.chosen) && sameList(this.skipped, other.skipped) && sameList(this.kept, other.kept);
  }
  static isInside(path, folder) {
    const inside = canonical(folder);
    return hasPrefix(canonical(path), inside.endsWith("/") ? inside : inside + "/");
  }
  static parent(path) {
    return parentPath(path);
  }
  static isSearched(path, folders, skipped) {
    return folders.some(
      (folder) => (samePath(path, folder) || _FolderSelection.isInside(path, folder)) && !skipped.some(
        (skip2) => _FolderSelection.isInside(skip2, folder) && (samePath(path, skip2) || _FolderSelection.isInside(path, skip2))
      )
    );
  }
  /** The path as a walk of the folder reports it (/private/var where the folder was given as /var). */
  static realPath(path) {
    try {
      return import_node_fs.realpathSync.native(path);
    } catch {
      return path;
    }
  }
  /** Whether `path` (a folder or a file) is searched. */
  isSearched(path) {
    return _FolderSelection.isSearched(path, [...this.kept, ...this.chosen], this.skipped);
  }
  /** The closest chosen (or kept) folder that searches `path`. */
  searchedAs(path) {
    let best = null;
    for (const folder of [...this.kept, ...this.chosen]) {
      if (!samePath(path, folder) && !_FolderSelection.isInside(path, folder)) continue;
      if (!_FolderSelection.isSearched(path, [folder], this.skipped)) continue;
      if (best === null || canonical(folder).length > canonical(best).length) best = folder;
    }
    return best;
  }
  /** What the indexer gets: kept and chosen folders, without those another one already searches whole. */
  get folders() {
    const all = unique([...this.kept, ...this.chosen]);
    return all.filter(
      (folder) => !all.some(
        (other) => !samePath(other, folder) && _FolderSelection.isInside(folder, other) && _FolderSelection.isSearched(folder, [other], this.skipped)
      )
    );
  }
  /** The skips that leave something out (inside a folder that's searched). */
  get effectiveSkips() {
    const folders = this.folders;
    return this.skipped.filter((skip2) => folders.some((folder) => _FolderSelection.isInside(skip2, folder)));
  }
  /** Mixed when some of its subfolders are skipped (it's searched) or chosen (it isn't). */
  mark(folder) {
    const isChild = (path) => samePath(parentPath(path), folder);
    if (this.isSearched(folder)) {
      return this.skipped.some((skip2) => isChild(skip2) && !this.isSearched(skip2)) ? "mixed" : "on";
    }
    return [...this.kept, ...this.chosen].some(isChild) ? "mixed" : "off";
  }
  /** Checks or unchecks a folder and its subfolders: all of it, or none of it. */
  setFolder(folder, on) {
    const isChild = (path) => samePath(parentPath(path), folder);
    this._skipped = Object.freeze(this._skipped.filter((path) => !isChild(path)));
    this._chosen = Object.freeze(this._chosen.filter((path) => !isChild(path)));
    this.setSubfolder(folder, on);
  }
  /** Checks or unchecks one folder, leaving the choices inside it as they are. */
  setSubfolder(folder, on) {
    if (on) {
      this.unskip(folder);
      if (!this.isSearched(folder)) this._chosen = Object.freeze([...this._chosen, folder]);
    } else {
      this._chosen = Object.freeze(this._chosen.filter((path) => !samePath(path, folder)));
      if (this.isSearched(folder)) this._skipped = Object.freeze([...this._skipped, folder]);
    }
  }
  /** Stops skipping `folder` (without choosing it). */
  unskip(folder) {
    this._skipped = Object.freeze(this._skipped.filter((path) => !samePath(path, folder)));
  }
};

// engine/config.ts
var DEFAULT_CONFIG = Object.freeze({
  folders: [],
  skipped: [],
  codeFolders: [],
  codeSkipped: [],
  excludedExtensions: [],
  indexOnBattery: true,
  indexHours: null,
  paused: false,
  codeQuietSeconds: 60,
  llamaServerPath: null,
  modelFolder: null
});
function defaultConfig() {
  return structuredClone(DEFAULT_CONFIG);
}
var ConfigError = class extends Error {
  status = 400;
  constructor(message2) {
    super(message2);
    this.name = "ConfigError";
  }
};
function realPath(path) {
  try {
    return import_node_fs2.realpathSync.native(path);
  } catch {
    return path;
  }
}
function expandTilde(path, home = (0, import_node_os.homedir)()) {
  const trimmed = path.trim();
  const expanded = trimmed === "~" ? home : trimmed.startsWith("~/") ? home + trimmed.slice(1) : trimmed;
  return expanded.length > 1 ? expanded.replace(/\/+$/, "") : expanded;
}
function folderPaths(paths, n, onRelative) {
  const home = n.home ?? (0, import_node_os.homedir)();
  const resolve3 = n.resolve ?? realPath;
  const out = [];
  for (const raw of paths) {
    const expanded = expandTilde(raw, home);
    if (expanded === "") continue;
    if (!(0, import_node_path.isAbsolute)(expanded)) {
      if (!onRelative) throw new ConfigError(`\u201C${raw}\u201D isn't a full path`);
      onRelative(raw);
      continue;
    }
    const resolved = resolve3(expanded);
    if (!out.includes(resolved)) out.push(resolved);
  }
  return out;
}
function selection(chosen, skipped, n, onRelative) {
  const s = new FolderSelection({
    chosen: folderPaths(chosen, n, onRelative),
    skipped: folderPaths(skipped, n, onRelative)
  });
  return { folders: s.folders, skipped: s.effectiveSkips };
}
function optionalPath(path, n) {
  if (path === null) return null;
  const expanded = expandTilde(path, n.home ?? (0, import_node_os.homedir)());
  return expanded === "" ? null : expanded;
}
function normalizeConfig(config, n = {}, onRelative) {
  const main2 = selection(config.folders, config.skipped, n, onRelative);
  const code = selection(config.codeFolders, config.codeSkipped, n, onRelative);
  return {
    ...config,
    folders: main2.folders,
    skipped: main2.skipped,
    codeFolders: code.folders,
    codeSkipped: code.skipped,
    excludedExtensions: parseExtensions(config.excludedExtensions.join(" ")).sort(),
    // DigUp: max(1, codeQuietSeconds).
    codeQuietSeconds: Math.max(1, config.codeQuietSeconds),
    // Start = end means all day (DigUp IndexHours): the same as none.
    indexHours: config.indexHours && config.indexHours.start !== config.indexHours.end ? config.indexHours : null,
    llamaServerPath: optionalPath(config.llamaServerPath, n),
    modelFolder: optionalPath(config.modelFolder, n)
  };
}
var isStringList = (value) => Array.isArray(value) && value.every((item) => typeof item === "string");
var isHour = (value) => Number.isInteger(value) && value >= 0 && value <= 24;
function problem(key, value) {
  switch (key) {
    case "folders":
    case "skipped":
    case "codeFolders":
    case "codeSkipped":
    case "excludedExtensions":
      return isStringList(value) ? null : `${key} must be a list of strings`;
    case "indexOnBattery":
    case "paused":
      return typeof value === "boolean" ? null : `${key} must be true or false`;
    case "indexHours": {
      if (value === null) return null;
      const hours = value;
      return typeof hours === "object" && isHour(hours.start) && isHour(hours.end) ? null : "indexHours must be null or {start, end} in whole hours (0-24)";
    }
    case "codeQuietSeconds":
      return typeof value === "number" && Number.isFinite(value) ? null : "codeQuietSeconds must be a number";
    case "llamaServerPath":
    case "modelFolder":
      return value === null || typeof value === "string" ? null : `${key} must be a path or null`;
    default:
      return null;
  }
}
function hoursOf(value) {
  return value === null ? null : { start: value.start % 24, end: value.end % 24 };
}
function parsePatch(body) {
  if (body === null || typeof body !== "object" || Array.isArray(body)) {
    throw new ConfigError("the settings must be a JSON object");
  }
  const patch = {};
  for (const [key, value] of Object.entries(body)) {
    if (value === void 0) continue;
    const why = problem(key, value);
    if (why) throw new ConfigError(why);
    patch[key] = key === "indexHours" ? hoursOf(value) : value;
  }
  return patch;
}
function fromFile(parsed, log) {
  const config = defaultConfig();
  for (const [key, value] of Object.entries(parsed)) {
    const why = problem(key, value);
    if (why) {
      log.warn(`config: ${why}; using the default`);
      continue;
    }
    config[key] = key === "indexHours" ? hoursOf(value) : value;
  }
  return config;
}
function loadConfig(file, log, n = {}) {
  let text;
  try {
    text = (0, import_node_fs2.readFileSync)(file, "utf8");
  } catch (error) {
    if (error.code !== "ENOENT") log.warn(`config: can't read ${file}: ${error}`);
    return normalizeConfig(defaultConfig(), n);
  }
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch (error) {
    parsed = error;
  }
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed) || parsed instanceof Error) {
    log.warn(
      `config: ${file} isn't settings (${parsed instanceof Error ? parsed.message : typeof parsed}); kept as config.json.broken, starting from the defaults`
    );
    const config = normalizeConfig(defaultConfig(), n);
    try {
      (0, import_node_fs2.renameSync)(file, `${file}.broken`);
      saveConfig(file, config);
    } catch (error) {
      log.error(`config: can't replace the broken settings: ${error}`);
    }
    return config;
  }
  return normalizeConfig(
    fromFile(parsed, log),
    n,
    (path) => log.warn(`config: \u201C${path}\u201D isn't a full path; left out`)
  );
}
function saveConfig(file, config) {
  (0, import_node_fs2.mkdirSync)((0, import_node_path.dirname)(file), { recursive: true });
  const temporary = `${file}.${process.pid}.tmp`;
  const fd = (0, import_node_fs2.openSync)(temporary, "w", 420);
  try {
    (0, import_node_fs2.writeSync)(fd, JSON.stringify(config, null, 2) + "\n");
    (0, import_node_fs2.fsyncSync)(fd);
  } finally {
    (0, import_node_fs2.closeSync)(fd);
  }
  try {
    (0, import_node_fs2.renameSync)(temporary, file);
  } catch (error) {
    try {
      (0, import_node_fs2.unlinkSync)(temporary);
    } catch {
    }
    throw error;
  }
}
function same(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}
var ConfigStore = class {
  constructor(file, log, normalizer = {}) {
    this.file = file;
    this.log = log;
    this.normalizer = normalizer;
    this.current = loadConfig(file, log, normalizer);
  }
  file;
  log;
  normalizer;
  current;
  listeners = /* @__PURE__ */ new Set();
  get() {
    return structuredClone(this.current);
  }
  /** Listens for changes; returns the unsubscribe. */
  onChange(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
  /**
   * Merges a partial body (checked with parsePatch) over the current settings, normalizes, and saves, on every call:
   * the file exists from the first POST /config. Throws ConfigError on a wrong type, and the save's error when the
   * file can't be written (then nothing changes).
   */
  update(body) {
    const patch = parsePatch(body);
    const previous = this.current;
    const next2 = normalizeConfig({ ...previous, ...patch }, this.normalizer);
    saveConfig(this.file, next2);
    const changed = /* @__PURE__ */ new Set();
    for (const key of /* @__PURE__ */ new Set([...Object.keys(previous), ...Object.keys(next2)])) {
      if (!same(previous[key], next2[key])) changed.add(key);
    }
    this.current = next2;
    if (changed.size > 0) {
      this.log.info(`config: ${[...changed].join(", ")} changed`);
      for (const listener of this.listeners) {
        try {
          listener(this.get(), structuredClone(previous), changed);
        } catch (error) {
          this.log.error(`config: a listener failed: ${error?.stack ?? error}`);
        }
      }
    }
    return { config: this.get(), changed };
  }
};

// engine/paths.ts
var import_node_crypto = require("node:crypto");
var import_node_os2 = require("node:os");
var import_node_path2 = require("node:path");
function makePaths(support, assets) {
  const indexDir = (0, import_node_path2.join)(support, "index.noindex");
  const uid = process.getuid?.() ?? 0;
  const hash = (0, import_node_crypto.createHash)("sha1").update(support).digest("hex").slice(0, 8);
  return {
    support,
    assets,
    indexDir,
    mainDb: (0, import_node_path2.join)(indexDir, "index.sqlite"),
    codeDb: (0, import_node_path2.join)(indexDir, "code.sqlite"),
    scratch: (0, import_node_path2.join)((0, import_node_os2.tmpdir)(), `DigUpRaycast-${process.pid}`),
    logs: (0, import_node_path2.join)(support, "logs"),
    llamaDir: (0, import_node_path2.join)(support, "llama"),
    modelsDir: (0, import_node_path2.join)(support, "models"),
    thumbs: (0, import_node_path2.join)(support, "thumbs"),
    costs: (0, import_node_path2.join)(indexDir, "costs.json"),
    socket: (0, import_node_path2.join)("/tmp", `digup-${uid}-${hash}`, "d.sock"),
    pidFile: (0, import_node_path2.join)(support, "daemon.pid"),
    configFile: (0, import_node_path2.join)(support, "config.json"),
    helperBin: (0, import_node_path2.join)(assets, "digup-helper"),
    daemonJs: (0, import_node_path2.join)(assets, "daemon.js")
  };
}

// engine/helper.ts
var import_node_buffer = require("node:buffer");
var import_node_child_process = require("node:child_process");
var import_node_fs3 = require("node:fs");
var import_node_os3 = require("node:os");
var import_node_path3 = require("node:path");
var GiB = 1024 ** 3;
var HARD_TIMEOUT_MS = 15 * 6e4;
var DEFAULT_OP_TIMEOUT_MS = HARD_TIMEOUT_MS;
var QUICK_OP_TIMEOUT_MS = 6e4;
var MEMORY_EXIT_CODE = 75;
function defaultMemoryLimit() {
  return Math.min(8 * GiB, Math.max(4 * GiB, (0, import_node_os3.totalmem)() / 2));
}
function describeTime(ms) {
  return ms >= 12e4 ? `${Math.floor(ms / 6e4)} minutes` : `${Math.floor(ms / 1e3)} seconds`;
}
function describeSize(bytes) {
  return bytes >= GiB ? `${(bytes / GiB).toFixed(0)} GB` : `${Math.floor(bytes / 1024 ** 2)} MB`;
}
function mtmdBeside(llamaServer) {
  const folder = (0, import_node_path3.dirname)(llamaServer);
  return [(0, import_node_path3.join)(folder, "libmtmd.dylib"), (0, import_node_path3.join)(folder, "../lib/libmtmd.dylib")].find((path) => (0, import_node_fs3.existsSync)(path)) ?? null;
}
var HelperError = class extends Error {
  constructor(message2, kind, op) {
    super(message2);
    this.kind = kind;
    this.op = op;
    this.name = "HelperError";
  }
  kind;
  op;
};
var Helper = class {
  constructor(bin, log, options = {}) {
    this.bin = bin;
    this.log = log;
    this.timeoutMs = Math.min(options.timeoutMs ?? DEFAULT_OP_TIMEOUT_MS, HARD_TIMEOUT_MS);
    this.memoryLimit = Math.max(1, Math.floor(options.memoryLimit ?? defaultMemoryLimit()));
    this.mtmdLibrary = options.mtmdLibrary ?? null;
    this.maxReplyBytes = options.maxReplyBytes ?? import_node_buffer.constants.MAX_STRING_LENGTH;
  }
  bin;
  log;
  timeoutMs;
  memoryLimit;
  mtmdLibrary;
  maxReplyBytes;
  queue = [];
  current = null;
  child = null;
  partial = [];
  partialBytes = 0;
  stderrTail = [];
  stderrPartial = "";
  opTimer = null;
  nextId = 1;
  closed = false;
  /** Sends one request; resolves with the reply's fields (without `id` and `ok`). */
  call(op, args = {}, options = {}) {
    if (this.closed) return Promise.reject(new HelperError("the helper is closed", "closed", op));
    const signal = options.signal;
    if (signal?.aborted) return Promise.reject(signal.reason);
    return new Promise((resolve3, reject) => {
      const id = this.nextId++;
      const timeoutMs = Math.min(options.timeoutMs ?? this.timeoutMs, HARD_TIMEOUT_MS);
      const pending = { id, op, line: JSON.stringify({ ...args, id, op }) + "\n", timeoutMs, resolve: resolve3, reject };
      if (signal) {
        const forget = () => {
          const at = this.queue.indexOf(pending);
          if (at >= 0) {
            this.queue.splice(at, 1);
            reject(signal.reason);
          }
        };
        signal.addEventListener("abort", forget, { once: true });
        pending.forget = () => signal.removeEventListener("abort", forget);
        const settle = (done) => (value) => {
          pending.forget?.();
          done(value);
        };
        pending.resolve = settle(resolve3);
        pending.reject = settle(reject);
      }
      this.queue.push(pending);
      this.pump();
    });
  }
  walk(args, options) {
    return this.call("walk", args, options);
  }
  image(args, options) {
    return this.call("image", { ocr: false, minSide: 256, ...args }, options);
  }
  size(args, options) {
    return this.call("size", args, options);
  }
  pdf(args, options) {
    return this.call("pdf", { minText: 200, renderPixels: 1400, budget: 280, ...args }, options);
  }
  rich(path, type, options) {
    return this.call("rich", { path, type }, options);
  }
  audio(args, options) {
    return this.call("audio", { window: 30, hop: 25, minimum: 2, ...args }, options);
  }
  video(args, options) {
    const defaults = { interval: 3, maxPixel: 1024, maxFrames: 1200, budget: 70, window: 30, hop: 25, minimum: 2 };
    return this.call("video", { ...defaults, ...args }, options);
  }
  /** Falls back to the file's own picture (Quick Look) when the frame, page or waveform can't be drawn, as DigUp does. */
  thumb(args, options) {
    return this.call("thumb", args, { timeoutMs: QUICK_OP_TIMEOUT_MS, ...options });
  }
  /**
   * For the folder estimate (DigUp: Estimator.pages): each PDF's page count from Spotlight, else from the file, else 1.
   */
  async pages(paths, options) {
    return (await this.call("pages", { paths }, options)).pages;
  }
  /**
   * For the folder estimate (DigUp: Estimator.duration): each recording's seconds from Spotlight, else AVFoundation,
   * else ffprobe, else 0. Pass only files that are on the Mac: reading an iCloud placeholder downloads it.
   */
  async durations(paths, options) {
    return (await this.call("duration", { paths }, options)).seconds;
  }
  /** Opens a PDF with the landmark word searched in its app (page > 1); plainly otherwise. */
  openPdf(path, page, words2, options) {
    return this.call("openPdf", { path, page, words: words2 }, { timeoutMs: QUICK_OP_TIMEOUT_MS, ...options });
  }
  /** `player`: a bundle id, or null for the file's default app. */
  openMedia(path, seconds, player, options) {
    return this.call(
      "openMedia",
      { path, seconds, player },
      { timeoutMs: QUICK_OP_TIMEOUT_MS, ...options }
    );
  }
  power() {
    return this.call("power", {}, { timeoutMs: QUICK_OP_TIMEOUT_MS });
  }
  ping() {
    return this.call("ping", {}, { timeoutMs: QUICK_OP_TIMEOUT_MS });
  }
  /** Ends the child and fails what is queued. Later calls fail. */
  async close() {
    if (this.closed) return;
    this.closed = true;
    const closed = (op) => new HelperError("the helper is closed", "closed", op);
    for (const pending of this.queue.splice(0)) pending.reject(closed(pending.op));
    const child = this.child;
    if (this.current) this.finish(this.current, closed(this.current.op));
    this.child = null;
    if (!child || child.exitCode !== null || child.signalCode !== null) return;
    await new Promise((done) => {
      const killer = setTimeout(() => killTree(child), 2e3);
      child.once("exit", () => {
        clearTimeout(killer);
        done();
      });
      child.stdin.end();
    });
  }
  // ------------------------------------------------------------------------------------------------------------------
  pump() {
    if (this.current || this.closed) return;
    const next2 = this.queue.shift();
    if (!next2) return;
    const child = this.child ?? this.start();
    this.current = next2;
    this.opTimer = setTimeout(() => this.timedOut(next2), next2.timeoutMs);
    child.stdin.write(next2.line);
  }
  start() {
    const args = ["serve", "--memory-limit", String(this.memoryLimit)];
    if (this.mtmdLibrary) args.push("--mtmd", this.mtmdLibrary);
    const child = (0, import_node_child_process.spawn)(this.bin, args, { stdio: ["pipe", "pipe", "pipe"] });
    this.child = child;
    this.partial = [];
    this.partialBytes = 0;
    this.stderrTail = [];
    this.stderrPartial = "";
    child.stdin.on("error", () => {
    });
    child.stdout.on("data", (chunk) => {
      if (this.child === child) this.onData(chunk);
    });
    child.stderr.on("data", (chunk) => this.onStderr(chunk));
    child.on("error", (error) => {
      const missing = error.code === "ENOENT";
      const message2 = missing ? `helper binary missing at ${this.bin} (build it with scripts/build-helper.sh)` : `can't start the helper: ${error.message}`;
      this.lost(child, new HelperError(message2, "spawn", this.current?.op ?? "spawn"));
    });
    child.on("exit", (code, signal) => {
      const op = this.current?.op ?? "helper";
      if (code === MEMORY_EXIT_CODE) {
        const limit = describeSize(this.memoryLimit);
        if (this.child === child)
          this.log.warn(`helper: ${op} needed more than ${limit} of memory; restarting the helper`);
        this.lost(child, new HelperError(`needed more than ${limit} of memory to read`, "memory", op));
        return;
      }
      const tail = this.stderrTail.length > 0 ? `: ${this.stderrTail[this.stderrTail.length - 1]}` : "";
      const how = signal ? `was killed (${signal})` : `exited with code ${code}`;
      this.lost(child, new HelperError(`the helper ${how}${tail}`, "crashed", op));
    });
    return child;
  }
  /** The child is gone: fail what it was doing and let the next call start a new one. */
  lost(child, error) {
    if (this.child !== child) return;
    this.child = null;
    if (this.current) this.finish(this.current, error);
    else this.log.warn(`helper: ${error.message}`);
    this.pump();
  }
  finish(pending, error, value) {
    if (this.current !== pending) return;
    this.current = null;
    if (this.opTimer) clearTimeout(this.opTimer);
    this.opTimer = null;
    if (error) pending.reject(error);
    else pending.resolve(value);
  }
  timedOut(pending) {
    if (this.current !== pending) return;
    const limit = describeTime(pending.timeoutMs);
    this.log.warn(`helper: ${pending.op} took more than ${limit}; restarting the helper`);
    this.kill(new HelperError(`took more than ${limit} to read`, "timeout", pending.op));
  }
  /** Kills the child now, fails the request in flight with `error`, and starts clean on the next call. */
  kill(error) {
    const child = this.child;
    this.child = null;
    if (this.current) this.finish(this.current, error);
    if (child) killTree(child);
    this.pump();
  }
  onData(chunk) {
    let start = 0;
    for (; ; ) {
      const newline = chunk.indexOf(10, start);
      const end = newline < 0 ? chunk.length : newline;
      this.partialBytes += end - start;
      if (this.partialBytes > this.maxReplyBytes) return this.tooLarge();
      if (newline < 0) {
        if (start < chunk.length) this.partial.push(chunk.subarray(start));
        return;
      }
      this.partial.push(chunk.subarray(start, newline));
      const bytes = this.partial.length === 1 ? this.partial[0] : Buffer.concat(this.partial);
      this.partial = [];
      this.partialBytes = 0;
      start = newline + 1;
      if (bytes.length > 0 && !this.onLine(bytes)) return;
    }
  }
  /** A reply past V8's string limit would throw where nothing catches it and end the process: fail it first. */
  tooLarge() {
    this.partial = [];
    this.partialBytes = 0;
    const op = this.current?.op ?? "helper";
    const limit = describeSize(this.maxReplyBytes);
    this.log.warn(`helper: the reply to ${op} passed ${limit}; restarting the helper`);
    this.kill(new HelperError(`the reply was too large to read (more than ${limit})`, "op", op));
  }
  /** False when the line broke the protocol and the child was killed. */
  onLine(bytes) {
    let reply;
    try {
      reply = JSON.parse(bytes.toString("utf8"));
    } catch (error) {
      const op = this.current?.op ?? "helper";
      this.log.warn(`helper: unreadable reply to ${op}: ${bytes.subarray(0, 200).toString("utf8")}`);
      this.kill(new HelperError(`the helper's reply could not be read (${error.message})`, "op", op));
      return false;
    }
    const pending = this.current;
    const unparsed = reply.ok === false && (reply.id === 0 || reply.id === void 0);
    if (!pending || reply.id !== pending.id && !unparsed) {
      this.log.warn(`helper: reply ${String(reply.id)} matches no request`);
      return true;
    }
    if (reply.ok) {
      const { id: _id, ok: _ok, ...fields } = reply;
      this.finish(pending, null, fields);
    } else {
      this.finish(pending, new HelperError(reply.error ?? "the helper failed", "op", pending.op));
    }
    this.pump();
    return true;
  }
  onStderr(chunk) {
    const lines2 = (this.stderrPartial + chunk.toString("utf8")).split("\n");
    this.stderrPartial = lines2.pop() ?? "";
    for (const line of lines2) {
      if (!line) continue;
      this.stderrTail.push(line);
      if (this.stderrTail.length > 5) this.stderrTail.shift();
      this.log.info(`helper: ${line}`);
    }
  }
};
function killTree(child) {
  const pid = child.pid;
  if (pid === void 0 || child.exitCode !== null || child.signalCode !== null) return;
  try {
    process.kill(pid, "SIGSTOP");
  } catch {
    return;
  }
  (0, import_node_child_process.execFile)("/usr/bin/pgrep", ["-P", String(pid)], (_error, stdout) => {
    for (const line of String(stdout).split("\n")) {
      const childPid = Number.parseInt(line, 10);
      if (childPid > 0) {
        try {
          process.kill(childPid, "SIGKILL");
        } catch {
        }
      }
    }
    child.kill("SIGKILL");
  });
}

// engine/policy.ts
var IndexHours = class _IndexHours {
  start;
  end;
  constructor(start, end) {
    this.start = (start % 1440 + 1440) % 1440;
    this.end = (end % 1440 + 1440) % 1440;
  }
  /** api.ts keeps whole hours (start inclusive, end exclusive); null = any time. */
  static fromConfig(hours) {
    return hours ? new _IndexHours(hours.start * 60, hours.end * 60) : null;
  }
  contains(date) {
    if (this.start === this.end) return true;
    const minute = date.getHours() * 60 + date.getMinutes();
    return this.start < this.end ? minute >= this.start && minute < this.end : minute >= this.start || minute < this.end;
  }
  /** When `contains` changes next after `date`: the next end inside the hours, the next start outside them. A time the
   *  clock skips (02:30 the night clocks go forward) counts as the next one that exists. Null: all day. */
  nextChange(date) {
    if (this.start === this.end) return null;
    const minute = this.contains(date) ? this.end : this.start;
    const next2 = new Date(date);
    next2.setHours(Math.floor(minute / 60), minute % 60, 0, 0);
    if (next2.getTime() <= date.getTime()) {
      next2.setDate(next2.getDate() + 1);
      next2.setHours(Math.floor(minute / 60), minute % 60, 0, 0);
    }
    return next2;
  }
};
function decide(o) {
  if (o.paused) return { held: "paused", until: null };
  if (o.hours && !o.hours.contains(o.now)) {
    return { held: "outside index hours", until: o.hours.nextChange(o.now)?.getTime() ?? null };
  }
  if (o.power?.lowPower) return { held: "Low Power Mode", until: null };
  if (o.power?.thermal === "serious" || o.power?.thermal === "critical") return { held: "Mac is warm", until: null };
  if (!o.indexOnBattery && o.power?.onBattery) return { held: "on battery", until: null };
  return { held: null, until: null };
}
function powerFromHelper(bin, log) {
  return async () => {
    const helper = new Helper(bin, log);
    try {
      return await helper.power();
    } finally {
      await helper.close();
    }
  };
}
var Policy = class {
  constructor(config, o) {
    this.o = o;
    this.config = { paused: config.paused, indexHours: config.indexHours, indexOnBattery: config.indexOnBattery };
    this.hours = IndexHours.fromConfig(config.indexHours);
    this.now = o.now ?? Date.now;
  }
  o;
  config;
  hours;
  power = null;
  last = null;
  interval = null;
  heartbeat = null;
  boundary = null;
  lastBeat = 0;
  reading = null;
  powerFailed = false;
  stopped = false;
  now;
  /** The decision so far. */
  get current() {
    return this.last;
  }
  /** Reads the power state (waiting `firstReadMs` at most), decides, and starts the timers. */
  async start() {
    const first = this.refresh();
    const limit = this.o.firstReadMs ?? 3e3;
    let timer;
    await Promise.race([first, new Promise((done) => timer = setTimeout(done, limit))]);
    clearTimeout(timer);
    if (!this.last) this.evaluate();
    if (this.stopped) return;
    const interval = this.o.intervalMs ?? 6e4;
    const beat = this.o.heartbeatMs ?? 5e3;
    this.interval = setInterval(() => void this.refresh(), interval);
    this.interval.unref();
    this.lastBeat = this.now();
    this.heartbeat = setInterval(() => this.beat(beat), beat);
    this.heartbeat.unref();
  }
  /** New settings: the pause and the hours take effect at once; the power state is read again for the battery switch. */
  update(config) {
    const before = this.config;
    this.config = { paused: config.paused, indexHours: config.indexHours, indexOnBattery: config.indexOnBattery };
    this.hours = IndexHours.fromConfig(config.indexHours);
    this.evaluate();
    if (before.indexOnBattery !== config.indexOnBattery || before.paused && !config.paused) void this.refresh();
  }
  /** Reads the power state and decides. One read at a time. */
  refresh() {
    if (this.stopped) return Promise.resolve();
    this.reading ??= this.read().finally(() => this.reading = null);
    return this.reading;
  }
  stop() {
    this.stopped = true;
    for (const timer of [this.interval, this.heartbeat]) if (timer) clearInterval(timer);
    if (this.boundary) clearTimeout(this.boundary);
    this.interval = this.heartbeat = this.boundary = null;
  }
  async read() {
    try {
      this.power = await this.o.power();
      if (this.powerFailed) this.o.log.info("policy: the power state can be read again");
      this.powerFailed = false;
    } catch (error) {
      if (!this.powerFailed)
        this.o.log.warn(`policy: can't read the power state: ${error?.message ?? error}`);
      this.powerFailed = true;
      this.power = null;
    }
    this.evaluate();
  }
  beat(beatMs) {
    const now = this.now();
    const late = now - this.lastBeat - beatMs;
    this.lastBeat = now;
    if (late < (this.o.wakeGapMs ?? 15e3)) return;
    this.o.log.info(`policy: the Mac woke (${Math.round(late / 1e3)} s gap)`);
    this.evaluate();
    void this.refresh();
  }
  evaluate() {
    if (this.stopped) return;
    const now = new Date(this.now());
    const next2 = decide({
      paused: this.config.paused,
      hours: this.hours,
      indexOnBattery: this.config.indexOnBattery,
      power: this.power,
      now
    });
    this.schedule(now);
    if (this.last && this.last.held === next2.held && this.last.until === next2.until) return;
    this.last = next2;
    const when = next2.until ? ` until ${new Date(next2.until).toLocaleTimeString()}` : "";
    this.o.log.info(`policy: ${next2.held ? `indexing waits (${next2.held}${when})` : "indexing may run"}`);
    this.o.onHeld(next2.held, next2.until);
  }
  /** One timer for the next start or end of the hours, a second after it so the hour has turned (DigUp). */
  schedule(now) {
    if (this.boundary) clearTimeout(this.boundary);
    this.boundary = null;
    const next2 = this.hours?.nextChange(now);
    if (!next2) return;
    this.boundary = setTimeout(() => this.evaluate(), Math.max(0, next2.getTime() - now.getTime()) + 1e3);
    this.boundary.unref();
  }
};

// engine/service.ts
var import_node_crypto4 = require("node:crypto");
var import_node_fs14 = require("node:fs");
var import_node_os10 = require("node:os");
var import_node_path12 = require("node:path");

// engine/embedder.ts
var import_node_child_process2 = require("node:child_process");
var import_node_fs4 = require("node:fs");
var import_promises = require("node:fs/promises");
var import_node_net = __toESM(require("node:net"));
var import_node_path4 = require("node:path");

// engine/types.ts
var FILE_KINDS = ["screenshot", "image", "pdf", "doc", "audio", "video", "code"];
var MODALITIES = ["none", "text", "image", "audio"];
var INDEXING_ORDER_SQL = "CASE kind WHEN 'screenshot' THEN 0 WHEN 'image' THEN 1 WHEN 'pdf' THEN 2 WHEN 'doc' THEN 3 WHEN 'audio' THEN 4 WHEN 'video' THEN 5 ELSE 6 END";
var DEFAULT_OPTIONS = {
  code: false,
  includeCode: false,
  includeDatasets: false,
  excludedFolders: [],
  excludedExtensions: [],
  minImageSide: 256,
  bigPDFPages: 50,
  pdfStep: 30,
  docStep: 40,
  maxPages: 5e3,
  maxChunks: 5e3,
  minPageText: 200,
  photoBudget: 140,
  screenshotBudget: 280,
  pageBudget: 280,
  frameBudget: 70,
  frameInterval: 3,
  audioWindow: 30,
  audioHop: 25,
  codeStretch: 1800,
  maxCodeBytes: 1 << 20,
  maxNotebookBytes: 20 << 20
};
function swiftDouble(value) {
  return Number.isInteger(value) ? `${value}.0` : `${value}`;
}
function optionsFingerprint(options) {
  if (options.code) return `code1 lines${options.codeStretch}`;
  return `photo${options.photoBudget} shot${options.screenshotBudget} page${options.pageBudget} frame${options.frameBudget}/${swiftDouble(options.frameInterval)}s audio${swiftDouble(options.audioWindow)}/${swiftDouble(options.audioHop)}s`;
}
var VECTOR_SOURCE = "google/embeddinggemma-2@bfcd298 llama.cpp-vectors1 text-q8_0+mmproj-q8_0";
var DIMENSION = 768;
var Prompts = {
  query: (text) => `task: search result | query: ${text}`,
  codeQuery: (text) => `task: code retrieval | query: ${text}`,
  document: (title, text) => `title: ${title ? title : "none"} | text: ${text}`
};
function codeQueryText(query) {
  const trimmed = query.replace(/^\s+/u, "");
  if (trimmed.length < 5 || trimmed.slice(0, 5).toLowerCase() !== "code:") return null;
  return trimmed.slice(5).trim();
}
function strongCount(scores, ratio = 0.5) {
  if (scores.length === 0) return 0;
  const top = scores[0];
  if (top <= 0) return scores.length;
  let n = 0;
  while (n < scores.length && scores[n] >= top * ratio) n++;
  return n;
}

// engine/embedder.ts
var TEXT_BATCH = 16;
var QUERY_TOKENS = 512;
var INDEX_TOKENS = 2048;
var AUDIO_SECONDS = 30;
var IMAGE_MAX_TOKENS = 1120;
var INDEX_BATCH = 2304;
var MEDIA_IN_FLIGHT = 2;
var FAILED_RETRY_MS = 15e3;
function serverArgs(profile, files, port) {
  const args = ["-m", files.textModel];
  if (profile.media) {
    args.push("--mmproj", files.mediaModel, "--image-min-tokens", "1", "--image-max-tokens", String(IMAGE_MAX_TOKENS));
  }
  args.push(
    "--embeddings",
    "--pooling",
    "mean",
    "--host",
    "127.0.0.1",
    "--port",
    String(port),
    // One input must fit one micro-batch; every slot needs the full input length of context.
    "-c",
    String(profile.batch * profile.slots),
    "-b",
    String(profile.batch),
    "-ub",
    String(profile.batch),
    "-np",
    String(profile.slots),
    // Every build that can load the model (>= b11452) has this flag; b11461 and b11624 checked.
    "--no-webui"
  );
  return args;
}
var VectorError = class extends Error {
};
function unitVector(raw) {
  if (!Array.isArray(raw) || raw.length !== DIMENSION) {
    throw new VectorError(`expected a ${DIMENSION}-number vector, got ${Array.isArray(raw) ? raw.length : typeof raw}`);
  }
  let sum = 0;
  for (const value of raw) sum += value * value;
  if (!Number.isFinite(sum)) throw new VectorError("the model returned a vector with NaN or infinity");
  const scale = sum > 0 ? 1 / Math.sqrt(sum) : 0;
  const vector = new Float32Array(DIMENSION);
  for (let i = 0; i < DIMENSION; i++) vector[i] = raw[i] * scale;
  return vector;
}
function vectorsOf(answer, count) {
  const data = answer.data;
  if (!Array.isArray(data) || data.length !== count) {
    throw new VectorError(`expected ${count} embeddings, got ${Array.isArray(data) ? data.length : typeof data}`);
  }
  const sorted = [...data].sort((a, b) => a.index - b.index);
  return sorted.map((item) => unitVector(item.embedding));
}
function cutWav(wav, seconds) {
  if (wav.length < 12 || wav.toString("latin1", 0, 4) !== "RIFF" || wav.toString("latin1", 8, 12) !== "WAVE")
    return wav;
  let byteRate = 0;
  let blockAlign = 0;
  for (let offset = 12; offset + 8 <= wav.length; ) {
    const id = wav.toString("latin1", offset, offset + 4);
    const size = wav.readUInt32LE(offset + 4);
    if (id === "fmt " && offset + 8 + 16 <= wav.length) {
      byteRate = wav.readUInt32LE(offset + 16);
      blockAlign = wav.readUInt16LE(offset + 20);
    } else if (id === "data") {
      const start = offset + 8;
      const length = size === 0 || size === 4294967295 ? wav.length - start : Math.min(size, wav.length - start);
      const limit = byteRate > 0 && blockAlign > 0 ? Math.floor(seconds * byteRate / blockAlign) * blockAlign : length;
      if (length <= limit) return wav;
      const cut = Buffer.concat([wav.subarray(0, start), wav.subarray(start, start + limit)]);
      cut.writeUInt32LE(cut.length - 8, 4);
      cut.writeUInt32LE(limit, offset + 4);
      return cut;
    }
    offset += 8 + size + (size & 1);
  }
  return wav;
}
var HttpError = class extends Error {
  constructor(status, message2) {
    super(message2);
    this.status = status;
  }
  status;
};
var liveChildren = /* @__PURE__ */ new Set();
var exitHookInstalled = false;
function trackChild(child) {
  liveChildren.add(child);
  if (exitHookInstalled) return;
  exitHookInstalled = true;
  process.once("exit", () => {
    for (const live of liveChildren) live.kill("SIGKILL");
  });
}
var sleep = (ms) => new Promise((resolve3) => setTimeout(resolve3, ms));
async function freePort(range) {
  const tryPort = (port) => new Promise((resolve3) => {
    const probe = import_node_net.default.createServer();
    probe.once("error", () => resolve3(null));
    probe.listen(port, "127.0.0.1", () => {
      const { port: bound } = probe.address();
      probe.close(() => resolve3(bound));
    });
  });
  if (!range) {
    const port = await tryPort(0);
    if (port) return port;
    throw new Error("no free port on 127.0.0.1");
  }
  const [low, high] = range;
  const span = high - low + 1;
  const first = Math.floor(Math.random() * span);
  for (let i = 0; i < span; i++) {
    const port = await tryPort(low + (first + i) % span);
    if (port) return port;
  }
  throw new Error(`no free port in ${low}-${high}`);
}
function logSince(file, offset) {
  try {
    return (0, import_node_fs4.readFileSync)(file).subarray(offset).toString("utf8");
  } catch {
    return "";
  }
}
function logTail(file, offset) {
  return logSince(file, offset).trim().split("\n").slice(-12).join("\n");
}
var LOG_ROTATE_BYTES = 16 << 20;
function rotateLog(file) {
  try {
    if ((0, import_node_fs4.statSync)(file).size > LOG_ROTATE_BYTES) (0, import_node_fs4.renameSync)(file, `${file}.1`);
  } catch {
  }
}
var Server = class {
  constructor(profile, ctx) {
    this.profile = profile;
    this.ctx = ctx;
  }
  profile;
  ctx;
  state = "off";
  child = null;
  port = null;
  inflight = 0;
  starting = null;
  failure = null;
  crashes = 0;
  timer = null;
  stopped = /* @__PURE__ */ new WeakSet();
  exit = Promise.resolve("");
  reaped = false;
  /** Bumped by stop(), so a start that has not spawned yet knows it was cancelled. */
  generation = 0;
  get logFile() {
    return (0, import_node_path4.join)(this.ctx.logs, `llama-${this.profile.name}.log`);
  }
  get pidFile() {
    return (0, import_node_path4.join)(this.ctx.logs, `llama-${this.profile.name}.pid`);
  }
  get label() {
    return `llama-server (${this.profile.name})`;
  }
  info() {
    return { state: this.state, pid: this.child?.pid ?? null, port: this.child ? this.port : null };
  }
  /** Resolves when the server answers /health. Starts it if it is off. */
  ensure() {
    if (this.state === "ready") return Promise.resolve();
    if (this.starting) return this.starting;
    if (this.state === "failed" && this.failure && Date.now() - this.failure.at < FAILED_RETRY_MS) {
      return Promise.reject(this.failure.error);
    }
    const starting = this.start().finally(() => {
      if (this.starting === starting) this.starting = null;
    });
    this.starting = starting;
    return starting;
  }
  fail(error) {
    this.state = "failed";
    this.failure = { error, at: Date.now() };
  }
  async start() {
    const { ctx, profile } = this;
    this.state = "starting";
    this.failure = null;
    const generation = this.generation;
    let child = null;
    let offset = 0;
    try {
      (0, import_node_fs4.mkdirSync)(ctx.logs, { recursive: true });
      this.reapStale();
      this.port = await freePort(ctx.portRange);
      if (generation !== this.generation) throw new Error("stopped");
      const args = serverArgs(profile, ctx, this.port);
      rotateLog(this.logFile);
      try {
        offset = (0, import_node_fs4.statSync)(this.logFile).size;
      } catch {
      }
      const fd = (0, import_node_fs4.openSync)(this.logFile, "a");
      try {
        (0, import_node_fs4.writeSync)(fd, `--- ${(/* @__PURE__ */ new Date()).toISOString()} ${ctx.serverBin} ${args.join(" ")}
`);
        child = (0, import_node_child_process2.spawn)(ctx.serverBin, args, { stdio: ["ignore", fd, fd] });
      } finally {
        (0, import_node_fs4.closeSync)(fd);
      }
      const started = child;
      this.child = started;
      trackChild(started);
      if (started.pid) (0, import_node_fs4.writeFileSync)(this.pidFile, String(started.pid));
      this.exit = new Promise((resolve3) => {
        started.once("error", (error) => resolve3(`could not start: ${error.message}`));
        started.once("exit", (code, signal) => {
          const how = signal ? `was killed by ${signal}` : `exited with code ${code}`;
          this.onExit(started, how);
          resolve3(how);
        });
      });
      ctx.log.info(`${this.label}: starting on port ${this.port} (pid ${started.pid})`);
      const began = Date.now();
      await this.waitReady();
      this.state = "ready";
      ctx.log.info(`${this.label}: ready in ${((Date.now() - began) / 1e3).toFixed(1)} s`);
      const capped = /cap image_max_tokens[^\n]*/.exec(logSince(this.logFile, offset));
      if (capped) ctx.log.warn(`${this.label}: ${capped[0].trim()}: large images will not match DigUp's vectors`);
    } catch (error) {
      const stopped = generation !== this.generation || child !== null && this.stopped.has(child);
      if (child && !stopped && child.pid !== void 0) await this.kill(child);
      if (this.child === child) this.child = null;
      if (stopped) {
        this.state = "off";
        throw new Error(`${this.label} was stopped while starting`);
      }
      const tail = logTail(this.logFile, offset);
      const failure2 = new Error(`${error.message}${tail ? `
${tail}` : ""}`);
      this.fail(failure2);
      ctx.log.error(`${this.label}: ${failure2.message}`);
      throw failure2;
    }
  }
  async waitReady() {
    const deadline = Date.now() + this.ctx.startTimeoutMs;
    let gone = null;
    void this.exit.then((how) => gone = how);
    while (gone === null) {
      if (Date.now() > deadline) {
        throw new Error(`${this.label} did not become ready in ${Math.round(this.ctx.startTimeoutMs / 1e3)} s`);
      }
      try {
        const response = await fetch(`http://127.0.0.1:${this.port}/health`, { signal: AbortSignal.timeout(1e3) });
        await response.body?.cancel();
        if (response.status === 200) return;
      } catch {
      }
      await sleep(100);
    }
    throw new Error(`${this.label} ${gone}`);
  }
  onExit(child, how) {
    liveChildren.delete(child);
    if (this.child !== child) return;
    this.child = null;
    (0, import_node_fs4.rmSync)(this.pidFile, { force: true });
    if (this.stopped.has(child)) {
      this.state = "off";
      return;
    }
    if (this.state === "starting") return;
    this.ctx.log.error(`${this.label} ${how}`);
    this.crashes++;
    if (this.crashes > 1) this.fail(new Error(`${this.label} crashed twice (${how})`));
    else this.state = "off";
  }
  /** A server left over from a daemon that was killed outright would hold a port and a gigabyte. */
  reapStale() {
    if (this.reaped) return;
    this.reaped = true;
    try {
      const pid = Number((0, import_node_fs4.readFileSync)(this.pidFile, "utf8"));
      if (!Number.isInteger(pid) || pid <= 1) return;
      const command = (0, import_node_child_process2.spawnSync)("/bin/ps", ["-p", String(pid), "-o", "command="], { encoding: "utf8" }).stdout;
      if (command.includes(this.ctx.serverBin)) {
        process.kill(pid, "SIGKILL");
        this.ctx.log.warn(`${this.label}: stopped a leftover server (pid ${pid})`);
      }
    } catch {
    } finally {
      (0, import_node_fs4.rmSync)(this.pidFile, { force: true });
    }
  }
  async kill(child) {
    if (child.exitCode !== null || child.signalCode !== null) return;
    const exited = new Promise((resolve3) => child.once("exit", () => resolve3()));
    child.kill("SIGTERM");
    await Promise.race([exited, sleep(5e3)]);
    if (child.exitCode === null && child.signalCode === null) {
      child.kill("SIGKILL");
      await Promise.race([exited, sleep(2e3)]);
    }
  }
  async stop() {
    this.cancelTimer();
    this.generation++;
    const child = this.child;
    if (!child) {
      if (this.state !== "starting") this.state = "off";
      this.failure = null;
      this.crashes = 0;
      return;
    }
    this.stopped.add(child);
    this.ctx.log.info(`${this.label}: stopping`);
    await this.kill(child);
    this.child = null;
    liveChildren.delete(child);
    (0, import_node_fs4.rmSync)(this.pidFile, { force: true });
    this.state = "off";
    this.crashes = 0;
  }
  // Timers -----------------------------------------------------------------------------------------------------------
  /** Stop after `seconds` without a request (or at once if nothing is running by then). */
  arm(seconds) {
    this.cancelTimer();
    this.timer = setTimeout(() => {
      this.timer = null;
      if (this.inflight > 0) this.arm(seconds);
      else void this.stop();
    }, seconds * 1e3);
    this.timer.unref();
  }
  cancelTimer() {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
  }
  // Requests ---------------------------------------------------------------------------------------------------------
  /**
   * POST JSON to the server and return its JSON. A server that dies mid-request is restarted once and the request is
   * sent again; a server that answers with an error status throws HttpError.
   */
  async request(path, body, o = {}) {
    this.inflight++;
    const generation = this.generation;
    try {
      const payload = JSON.stringify(body);
      for (let attempt = 0; ; attempt++) {
        if (generation !== this.generation) throw new Error(`${this.label} was stopped`);
        await this.ensure();
        const child = this.child;
        try {
          const answer = await this.post(path, payload);
          this.crashes = 0;
          if (o.idleSeconds !== void 0) this.arm(o.idleSeconds);
          return answer;
        } catch (error) {
          if (error instanceof HttpError) throw error;
          if (child && child.exitCode === null && child.signalCode === null) {
            const hung = error.name === "TimeoutError";
            if (hung) await this.kill(child);
            else await Promise.race([this.exit, sleep(2e3)]);
          }
          if (attempt >= 1 || this.state === "failed")
            throw new Error(`${this.label} did not answer: ${error.message}`);
          this.ctx.log.warn(`${this.label}: ${error.message}; trying again`);
        }
      }
    } finally {
      this.inflight--;
    }
  }
  async post(path, payload) {
    const response = await fetch(`http://127.0.0.1:${this.port}${path}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: payload,
      signal: AbortSignal.timeout(this.ctx.requestTimeoutMs)
    });
    const text = await response.text();
    if (!response.ok) {
      let message2 = text.slice(0, 300);
      try {
        message2 = JSON.parse(text).error?.message ?? message2;
      } catch {
      }
      throw new HttpError(response.status, message2);
    }
    return JSON.parse(text);
  }
};
async function mapLimit(items, limit, work) {
  const results = new Array(items.length);
  let next2 = 0;
  const lanes = Array.from({ length: Math.max(1, Math.min(limit, items.length)) }, async () => {
    while (next2 < items.length) {
      const index2 = next2++;
      results[index2] = await work(items[index2]);
    }
  });
  await Promise.all(lanes);
  return results;
}
var LONE_SURROGATE = new RegExp("\\p{Cs}", "gu");
var Handle = class {
  constructor(manager, role, generation) {
    this.manager = manager;
    this.role = role;
    this.generation = generation;
  }
  manager;
  role;
  generation;
  get maxTokens() {
    return this.role === "query" ? QUERY_TOKENS : INDEX_TOKENS;
  }
  /** One request on this handle's server. */
  call(path, body) {
    return this.manager.send(this.role, this.generation, path, body);
  }
  /**
   * The input as the model reads it: `<bos> text <eos>`, and when that is longer than `maxTokens`, DigUp's cut: the
   * first maxTokens-1 tokens and the EOS. The cut needs the server's tokenizer, so unless `always`, it asks only when
   * the text could be long: the tokenizer makes at most one token per UTF-8 byte (unknown bytes have their own tokens,
   * merges only shorten), plus BOS and EOS.
   */
  async fit(text, always = false) {
    text = text.replace(LONE_SURROGATE, "\uFFFD");
    if (!always && Buffer.byteLength(text) + 2 <= this.maxTokens) return text;
    const answer = await this.call("/tokenize", { content: text, add_special: true, parse_special: true });
    const tokens = answer.tokens;
    if (tokens.length <= this.maxTokens) return text;
    return [...tokens.slice(0, this.maxTokens - 1), tokens[tokens.length - 1]];
  }
  async embedTexts(texts) {
    const vectors = [];
    for (let i = 0; i < texts.length; i += TEXT_BATCH) {
      const batch = texts.slice(i, i + TEXT_BATCH);
      let input = await Promise.all(batch.map((text) => this.fit(text)));
      let answer;
      try {
        answer = await this.call("/v1/embeddings", { input, encoding_format: "float" });
      } catch (error) {
        if (!(error instanceof HttpError && TOO_LONG.test(error.message))) throw error;
        input = await Promise.all(batch.map((text) => this.fit(text, true)));
        answer = await this.call("/v1/embeddings", { input, encoding_format: "float" });
      }
      vectors.push(...vectorsOf(answer, input.length));
    }
    return vectors;
  }
  embedImages(pngPaths) {
    return this.embedMedia(pngPaths, false, (bytes) => ({
      type: "image_url",
      image_url: { url: `data:image/png;base64,${bytes.toString("base64")}` }
    }));
  }
  embedAudio(wavPaths) {
    return this.embedMedia(wavPaths, true, (bytes) => ({
      type: "input_audio",
      input_audio: { data: cutWav(bytes, AUDIO_SECONDS).toString("base64"), format: "wav" }
    }));
  }
  /** One request per file: a file the server cannot read costs its own slot and nothing else. */
  async embedMedia(paths, audio, part) {
    if (this.role === "query") throw new Error("the query encoder reads text only");
    return mapLimit(paths, this.manager.mediaInFlight, async (path) => {
      let bytes;
      try {
        bytes = await (0, import_promises.readFile)(path);
      } catch (error) {
        return error instanceof Error ? error : new Error(String(error));
      }
      if (isAudio(bytes) !== audio) return new Error(`not ${audio ? "audio" : "an image"}: ${path}`);
      try {
        const answer = await this.call("/v1/embeddings", {
          input: [{ content: [part(bytes)] }],
          encoding_format: "float"
        });
        return vectorsOf(answer, 1)[0];
      } catch (error) {
        if (error instanceof HttpError || error instanceof VectorError) {
          return new Error(`${error.message}: ${path}`.slice(0, 300));
        }
        throw error;
      }
    });
  }
};
var TOO_LONG = /too large to process|larger than the max context/;
function isAudio(bytes) {
  const head = bytes.toString("latin1", 0, 12);
  return head.startsWith("RIFF") && head.slice(8, 12) === "WAVE" || head.startsWith("ID3") || head.startsWith("fLaC") || bytes.length >= 3 && bytes[0] === 255 && (bytes[1] & 224) === 224;
}
var EmbedderManager = class {
  query_;
  index_;
  queryIdle;
  lingerSeconds;
  /** Between index() and doneIndexing(): the index server stays up. */
  indexing = false;
  /** Bumped by stop(): handles from before it refuse work instead of starting a server again. */
  generation = 0;
  constructor(o) {
    const ctx = {
      serverBin: o.serverBin,
      textModel: o.textModel,
      mediaModel: o.mediaModel,
      logs: o.logs,
      log: o.log,
      portRange: o.portRange,
      startTimeoutMs: (o.startTimeoutSeconds ?? 120) * 1e3,
      requestTimeoutMs: o.requestTimeoutMs ?? 3e5
    };
    const slots = o.indexParallel ?? 1;
    if (!Number.isInteger(slots) || slots < 1 || (slots & slots - 1) !== 0) {
      throw new Error(`indexParallel must be a power of two, not ${slots}`);
    }
    this.queryIdle = o.queryIdleSeconds ?? 600;
    this.lingerSeconds = o.indexLingerSeconds ?? 60;
    this.query_ = new Server({ name: "query", media: false, batch: QUERY_TOKENS, slots: 1 }, ctx);
    this.index_ = new Server({ name: "index", media: true, batch: INDEX_BATCH, slots }, ctx);
    this.query_.reapStale();
    this.index_.reapStale();
  }
  get mediaInFlight() {
    return Math.max(MEDIA_IN_FLIGHT, this.index_.profile.slots);
  }
  /**
   * The text-only server, beside the index server when that runs (about 0.5 GB more while both do), so a query never
   * waits behind indexing (DigUp: Engine's query encoder). Starts it and waits until it answers.
   */
  async query() {
    const generation = this.generation;
    await this.query_.ensure();
    this.query_.arm(this.queryIdle);
    return new Handle(this, "query", generation);
  }
  /** The full server (text + images + audio). Cancels a pending stop. */
  async index() {
    const generation = this.generation;
    this.indexing = true;
    this.index_.cancelTimer();
    await this.index_.ensure();
    return new Handle(this, "index", generation);
  }
  /** Indexing is over: stop the index server after the linger, unless indexing starts again. */
  doneIndexing() {
    this.indexing = false;
    if (this.index_.state === "off") return;
    this.index_.arm(this.lingerSeconds);
  }
  /** Of the query server: what meaning search can do right now. */
  state() {
    return this.query_.state;
  }
  /** Both servers, for status pages and tests. */
  servers() {
    return { query: this.query_.info(), index: this.index_.info() };
  }
  /** Stops the index server now (a job cut short): a request in flight on it fails; the next index() starts it again.
   *  The query server stays. */
  async stopIndexing() {
    this.indexing = false;
    await this.index_.stop();
  }
  /** Stops both servers. Handles from before refuse work; query() and index() hand out new ones. */
  async stop() {
    this.generation++;
    this.indexing = false;
    await Promise.all([this.query_.stop(), this.index_.stop()]);
  }
  /** Used by Handle: one request, on the right server, with the right timers. */
  send(role, generation, path, body) {
    if (generation !== this.generation) return Promise.reject(new Error("the embedder was stopped: ask for it again"));
    if (role === "query") return this.query_.request(path, body, { idleSeconds: this.queryIdle });
    if (!this.indexing) return this.index_.request(path, body, { idleSeconds: this.lingerSeconds });
    this.index_.cancelTimer();
    return this.index_.request(path, body);
  }
};

// engine/estimator.ts
var import_node_fs5 = require("node:fs");
var import_node_path5 = require("node:path");
var FIXED_COSTS = Object.freeze({
  image: 0.12,
  // 140 tokens, decode included
  screenshot: 0.32,
  // 280 tokens; its OCR (0.24 s) runs alongside and sets the pace
  pdfPage: 0.09,
  // text pages are cheap, rendered scans cost an image
  docChunk: 0.045,
  // 40 at a time (a data dump's go to keyword search only, nearly free)
  audioSecond: 89e-4,
  // a 30 s window every 25 s
  videoSecond: 0.019,
  // a 70-token keyframe per shot (at most one per 3 s) + the soundtrack
  codeStretch: 0.037
});
var COST_NAMES = Object.keys(FIXED_COSTS);
var CodeIndexSize = { perCharacter: 2.4, perStretch: 1600, charactersPerStretch: 1400 };
function emptyEstimate() {
  return {
    files: {},
    pdfPages: 0,
    pdfPagesTotal: 0,
    audioSeconds: 0,
    videoSeconds: 0,
    docChunks: 0,
    seconds: 0,
    longFiles: 0,
    laterSeconds: 0,
    codeStretches: 0,
    bytes: 0,
    kindSeconds: {}
  };
}
function addEstimates(a, b) {
  const merge = (x, y) => {
    const out = { ...x };
    for (const [kind, value] of Object.entries(y)) out[kind] = (out[kind] ?? 0) + value;
    return out;
  };
  return {
    files: merge(a.files, b.files),
    pdfPages: a.pdfPages + b.pdfPages,
    pdfPagesTotal: a.pdfPagesTotal + b.pdfPagesTotal,
    audioSeconds: a.audioSeconds + b.audioSeconds,
    videoSeconds: a.videoSeconds + b.videoSeconds,
    docChunks: a.docChunks + b.docChunks,
    seconds: a.seconds + b.seconds,
    longFiles: a.longFiles + b.longFiles,
    laterSeconds: a.laterSeconds + b.laterSeconds,
    codeStretches: a.codeStretches + b.codeStretches,
    bytes: a.bytes + b.bytes,
    kindSeconds: merge(a.kindSeconds, b.kindSeconds)
  };
}
async function lookUpFacts(candidates, helper, signal) {
  const pdfs = candidates.filter((file) => file.kind === "pdf").map((file) => file.path);
  const media = candidates.filter((file) => file.kind === "audio" || file.kind === "video").map((file) => file.path);
  const pages = /* @__PURE__ */ new Map();
  const durations = /* @__PURE__ */ new Map();
  const BATCH = 500;
  for (let at = 0; at < pdfs.length; at += BATCH) {
    signal?.throwIfAborted();
    const part = pdfs.slice(at, at + BATCH);
    (await helper.pages(part)).forEach((count, index2) => pages.set(part[index2], count));
  }
  for (let at = 0; at < media.length; at += BATCH) {
    signal?.throwIfAborted();
    const part = media.slice(at, at + BATCH);
    (await helper.durations(part)).forEach((seconds, index2) => durations.set(part[index2], seconds));
  }
  return { pages, durations };
}
function estimate(candidates, options, costs, facts) {
  const out = emptyEstimate();
  for (const file of candidates) {
    out.files[file.kind] = (out.files[file.kind] ?? 0) + 1;
    const before = out.seconds;
    switch (file.kind) {
      case "image":
        out.seconds += costs.image;
        break;
      case "screenshot":
        out.seconds += costs.screenshot;
        break;
      case "pdf": {
        const total = facts.pages.get(file.path) ?? 1;
        const all = Math.min(total, options.maxPages);
        const first = total > options.bigPDFPages ? Math.min(options.pdfStep, all) : all;
        out.pdfPagesTotal += total;
        out.pdfPages += first;
        out.seconds += first * costs.pdfPage;
        if (all > first) {
          out.longFiles++;
          out.laterSeconds += (all - first) * costs.pdfPage;
        }
        break;
      }
      case "doc": {
        const all = Math.max(1, Math.min(options.maxChunks, Math.trunc(file.size / 2e3)));
        const first = Math.min(all, options.docStep);
        out.docChunks += first;
        out.seconds += first * costs.docChunk;
        if (all > first) {
          out.longFiles++;
          out.laterSeconds += (all - first) * costs.docChunk;
        }
        break;
      }
      case "audio": {
        const seconds = facts.durations.get(file.path) ?? 0;
        out.audioSeconds += seconds;
        out.seconds += seconds * costs.audioSecond;
        break;
      }
      case "video": {
        const seconds = facts.durations.get(file.path) ?? 0;
        out.videoSeconds += seconds;
        out.seconds += seconds * costs.videoSecond;
        break;
      }
      case "code": {
        const characters = file.path.toLowerCase().endsWith(".ipynb") ? Math.trunc(file.size / 8) : file.size;
        const per = CodeIndexSize.charactersPerStretch;
        const stretches2 = Math.max(1, Math.trunc((characters + per - 1) / per));
        out.codeStretches += stretches2;
        out.seconds += stretches2 * costs.codeStretch;
        out.bytes += characters * CodeIndexSize.perCharacter + stretches2 * CodeIndexSize.perStretch;
        break;
      }
    }
    out.kindSeconds[file.kind] = (out.kindSeconds[file.kind] ?? 0) + out.seconds - before;
  }
  return out;
}
function estimatesBySubfolder(candidates, folder, options, costs, facts) {
  const prefix = folder.endsWith("/") ? folder : folder + "/";
  const real = FolderSelection.realPath(folder) + "/";
  const groups = /* @__PURE__ */ new Map();
  for (const file of candidates) {
    const rest = file.path.startsWith(prefix) ? file.path.slice(prefix.length) : file.path.startsWith(real) ? file.path.slice(real.length) : null;
    const slash = rest === null ? -1 : rest.indexOf("/");
    const key = rest !== null && slash >= 0 ? prefix + rest.slice(0, slash) : folder;
    const group = groups.get(key);
    if (group) group.push(file);
    else groups.set(key, [file]);
  }
  return new Map([...groups].map(([key, files]) => [key, estimate(files, options, costs, facts)]));
}
var ENOUGH = {
  image: 20,
  screenshot: 20,
  pdfPage: 30,
  docChunk: 30,
  audioSecond: 600,
  videoSecond: 600,
  codeStretch: 100
};
var clamp = (value, low, high) => Math.min(high, Math.max(low, value));
var MeasuredCosts = class _MeasuredCosts {
  tallies = {};
  speed = null;
  get hasTallies() {
    return Object.keys(this.tallies).length > 0;
  }
  /** A job that took `seconds` for `units` of `name`. Recent work counts most: past ten times what's enough, what came
   *  before is halved. */
  add(name, units, seconds) {
    if (!(units > 0) || !(seconds > 0)) return;
    const tally = this.tallies[name] ?? { seconds: 0, units: 0 };
    if (tally.units > 10 * (ENOUGH[name] ?? 20)) {
      tally.seconds /= 2;
      tally.units /= 2;
    }
    tally.seconds += seconds;
    tally.units += units;
    this.tallies[name] = tally;
  }
  /** The fixed costs as fast as `speed` says. */
  get expected() {
    const costs = { ...FIXED_COSTS };
    const speed = this.speed;
    if (speed?.kinds) {
      for (const name of COST_NAMES) costs[name] *= clamp(speed.kinds[name] ?? 1, 0.1, 500);
    } else if (speed) {
      const embedding = clamp(speed.embedding, 0.25, 10);
      const ocr = clamp(speed.ocr, 0.25, 10);
      for (const name of COST_NAMES) costs[name] *= embedding;
      costs.screenshot = FIXED_COSTS.screenshot * Math.max(embedding, ocr);
    }
    return costs;
  }
  /** How indexing here compares with what was expected: the seconds-weighted geometric mean of measured over expected,
   *  over the kinds with enough measured. Null before any has enough. */
  get pace() {
    const expected = this.expected;
    let sum = 0;
    let weights = 0;
    for (const name of COST_NAMES) {
      const tally = this.tallies[name];
      if (!tally || tally.units < (ENOUGH[name] ?? Infinity) || !(tally.seconds > 0) || !(expected[name] > 0)) continue;
      sum += tally.seconds * Math.log(tally.seconds / tally.units / expected[name]);
      weights += tally.seconds;
    }
    return weights > 0 ? Math.exp(sum / weights) : null;
  }
  /** The costs to estimate with: measured ones where there are enough; else the expected ones at the pace indexing has
   *  kept here. */
  get costs() {
    const costs = this.expected;
    const pace = clamp(this.pace ?? 1, 0.02, 50);
    for (const name of COST_NAMES) {
      const tally = this.tallies[name];
      if (tally && tally.units >= (ENOUGH[name] ?? Infinity)) costs[name] = tally.seconds / tally.units;
      else costs[name] *= pace;
    }
    return costs;
  }
  static file(folder) {
    return (0, import_node_path5.join)(folder, "costs.json");
  }
  /** What's saved in `folder`, or nothing measured yet. */
  static load(folder) {
    const measured = new _MeasuredCosts();
    try {
      const saved = JSON.parse((0, import_node_fs5.readFileSync)(_MeasuredCosts.file(folder), "utf8"));
      for (const [name, tally] of Object.entries(saved.tallies ?? {})) {
        if (Number.isFinite(tally?.seconds) && Number.isFinite(tally?.units)) {
          measured.tallies[name] = { seconds: tally.seconds, units: tally.units };
        }
      }
      if (saved.speed && Number.isFinite(saved.speed.embedding) && Number.isFinite(saved.speed.ocr)) {
        measured.speed = saved.speed;
      }
    } catch {
    }
    return measured;
  }
  /** Writes it whole (a file renamed into place, so a reader never sees half of it). */
  save(folder) {
    const file = _MeasuredCosts.file(folder);
    const sorted = (object) => Object.fromEntries(
      Object.keys(object).sort().map((key) => [key, object[key]])
    );
    const body = { tallies: sorted(this.tallies) };
    if (this.speed) body.speed = sorted(this.speed);
    try {
      (0, import_node_fs5.mkdirSync)((0, import_node_path5.dirname)(file), { recursive: true });
      const temporary = `${file}.${process.pid}.tmp`;
      (0, import_node_fs5.writeFileSync)(temporary, JSON.stringify(sorted(body), null, 2) + "\n");
      (0, import_node_fs5.renameSync)(temporary, file);
    } catch {
    }
  }
  /** Adds `measured` to what's saved in `folder` (the main index and the code index each add their own kinds). */
  static merge(measured, folder) {
    const saved = _MeasuredCosts.load(folder);
    for (const [name, tally] of Object.entries(measured.tallies)) saved.add(name, tally.units, tally.seconds);
    saved.save(folder);
  }
};

// engine/indexer.ts
var import_node_fs9 = require("node:fs");
var import_node_os6 = require("node:os");
var import_node_path7 = require("node:path");

// engine/code.ts
var import_node_buffer3 = require("node:buffer");
var import_node_fs7 = require("node:fs");
var import_node_os4 = require("node:os");

// engine/text.ts
var import_node_buffer2 = require("node:buffer");
var import_node_fs6 = require("node:fs");
var import_promises2 = require("node:fs/promises");
var import_node_zlib = require("node:zlib");
var ExtractError = class _ExtractError extends Error {
  constructor(kind, message2) {
    super(message2);
    this.kind = kind;
    this.name = "ExtractError";
  }
  kind;
  static unreadable(why) {
    return new _ExtractError("unreadable", `unreadable: ${why}`);
  }
  static tooSmall(width, height) {
    return new _ExtractError("tooSmall", `small image ${width}\xD7${height}`);
  }
  static locked() {
    return new _ExtractError("locked", "password-protected");
  }
  static empty(why) {
    return new _ExtractError("empty", why);
  }
  static leftOut(why) {
    return new _ExtractError("leftOut", why);
  }
};
var LONE_SURROGATE2 = /[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/;
function utf16(bytes, bigEndian) {
  if (bytes.length % 2 !== 0) return null;
  const text = (bigEndian ? Buffer.from(bytes).swap16() : bytes).toString("utf16le");
  return LONE_SURROGATE2.test(text) ? null : text;
}
function utf32le(bytes) {
  let text = "";
  for (let at = 0; at + 4 <= bytes.length; at += 4) {
    const value = bytes.readUInt32LE(at);
    if (value > 1114111 || value >= 55296 && value <= 57343) return null;
    text += String.fromCodePoint(value);
  }
  return text;
}
function isTooBig(error) {
  const code = error?.code;
  return code === "ERR_STRING_TOO_LONG" || code === "ERR_FS_FILE_TOO_LARGE" || error instanceof RangeError;
}
function decodeText(bytes) {
  try {
    const buffer = Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const [b0, b1, b2, b3] = buffer;
    let text = null;
    if (b0 === 255 && b1 === 254 && b2 === 0 && b3 === 0) text = utf32le(buffer.subarray(4));
    else if (b0 === 255 && b1 === 254) text = utf16(buffer.subarray(2), false);
    else if (b0 === 254 && b1 === 255) text = utf16(buffer.subarray(2), true);
    else {
      const body = b0 === 239 && b1 === 187 && b2 === 191 ? buffer.subarray(3) : buffer;
      if ((0, import_node_buffer2.isUtf8)(body)) text = body.toString("utf8");
    }
    return text ?? buffer.toString("latin1");
  } catch (error) {
    if (isTooBig(error)) throw ExtractError.unreadable("too big to read as text");
    throw error;
  }
}
async function readTextFile(file) {
  let bytes;
  try {
    bytes = await (0, import_promises2.readFile)(file);
  } catch (error) {
    if (isTooBig(error)) throw ExtractError.unreadable("too big to read as text");
    throw error;
  }
  return decodeText(bytes);
}
var WORD_END = String.raw`(?![\p{Alphabetic}\p{M}\p{Nd}\p{Pc}\u200c\u200d])`;
var DROPPED_BLOCKS = [
  {
    opener: new RegExp(String.raw`<script${WORD_END}`, "giu"),
    closer: new RegExp(String.raw`</script${WHITE_SPACE}*>`, "giu")
  },
  {
    opener: new RegExp(String.raw`<style${WORD_END}`, "giu"),
    closer: new RegExp(String.raw`</style${WHITE_SPACE}*>`, "giu")
  },
  { opener: /<!--/gu, closer: /-->/gu },
  {
    opener: new RegExp(String.raw`<head${WORD_END}`, "giu"),
    closer: new RegExp(String.raw`</head${WHITE_SPACE}*>`, "giu")
  }
];
function replaceSpans(text, opener, closeAfter, by) {
  let out = "";
  let kept = 0;
  let from = 0;
  for (; ; ) {
    opener.lastIndex = from;
    const open = opener.exec(text);
    if (!open) break;
    const close = closeAfter(open.index + open[0].length);
    if (!close) break;
    if (close.at < 0) {
      from = open.index + 1;
      continue;
    }
    out += text.slice(kept, open.index) + by;
    kept = from = close.end;
  }
  return kept === 0 ? text : out + text.slice(kept);
}
function next(text, closer, from) {
  closer.lastIndex = from;
  const found = closer.exec(text);
  return found ? { at: found.index, end: found.index + found[0].length } : null;
}
function nextAngle(text, from, nonEmpty) {
  const at = text.indexOf(">", from);
  if (at < 0) return null;
  return nonEmpty && at === from ? { at: -1, end: -1 } : { at, end: at + 1 };
}
var BLOCK_ENDS = new RegExp(String.raw`<(?:br|/p|/div|/li|/h[1-6]|/tr|/section|/article)${WORD_END}`, "giu");
var TAG_START = /</g;
var ENTITIES = {
  nbsp: " ",
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  mdash: "\u2014",
  ndash: "\u2013",
  hellip: "\u2026"
};
var ENTITY = new RegExp("&(?:(nbsp|amp|lt|gt|quot|apos|mdash|ndash|hellip);(?!\\p{Grapheme_Extend})|#(x[0-9a-fA-F]+|[0-9]+);)", "gu");
var WHITE_SPACE_RUN = new RegExp(`${WHITE_SPACE}+`, "gu");
function decodeEntity(whole, named, numeric) {
  if (named) return ENTITIES[named];
  const value = numeric.startsWith("x") ? parseInt(numeric.slice(1), 16) : parseInt(numeric, 10);
  const valid = value <= 1114111 && !(value >= 55296 && value <= 57343);
  return valid ? String.fromCodePoint(value) : " ";
}
function mergeLineBreaks(text) {
  return text.replace(WHITE_SPACE_RUN, (run2) => run2.includes("\n") ? "\n" : run2);
}
function stripMarkup(html) {
  let text = html;
  for (const { opener, closer } of DROPPED_BLOCKS)
    text = replaceSpans(text, opener, (from) => next(text, closer, from), " ");
  text = replaceSpans(text, BLOCK_ENDS, (from) => nextAngle(text, from, false), "\n");
  return replaceSpans(text, TAG_START, (from) => nextAngle(text, from, true), " ");
}
function plainTextFromHTML(html) {
  let text = stripMarkup(html);
  text = text.replace(ENTITY, decodeEntity);
  return trimWhitespaceAndNewlines(mergeLineBreaks(text.replace(/[ \t]+/gu, " ")));
}
function collapseSpaces(text) {
  return text.replace(/[ \t\u00a0]{2,}|[\t\u00a0]/gu, " ");
}
var LINE_BREAK_RUN = new RegExp(`
${WHITE_SPACE}*`, "gu");
function squeezeBlankLines(text) {
  return text.replace(LINE_BREAK_RUN, (run2) => {
    const last = run2.lastIndexOf("\n");
    if (last === 0 || run2.indexOf("\n", 1) === last) return run2;
    return "\n\n" + run2.slice(last + 1);
  });
}
function endsCleanly(unit) {
  return !isWhiteSpace(unit) && unit !== 8203 && !(unit >= 55296 && unit <= 56319);
}
function chunks(text, limit, size = 1800, overlap = 200) {
  for (let take = (limit + 1) * size * 2; ; take *= 2) {
    let cut = Math.min(take, text.length);
    while (cut < text.length && !endsCleanly(text.charCodeAt(cut - 1))) cut++;
    const found = chunksOf(text.slice(0, cut), cut === text.length, limit, size, overlap);
    if (found) return found;
  }
}
function chunksOf(source, whole, limit, size, overlap) {
  const clean = new Graphemes(trimWhitespaceAndNewlines(squeezeBlankLines(collapseSpaces(source))));
  const out = [];
  let start = 0;
  while (start < clean.count && out.length < limit) {
    if (!whole && start + size + 2 > clean.count) return null;
    let end = Math.min(start + size, clean.count);
    if (end < clean.count) {
      let space = end - 1;
      while (space >= start && !clean.isWhitespace(space)) space--;
      if (space >= start && space - start > Math.trunc(size / 2)) end = space;
    }
    const chunk = trimWhitespaceAndNewlines(clean.slice(start, end));
    if (chunk !== "") out.push(chunk);
    if (end >= clean.count) break;
    let next2 = end - overlap < start ? end : end - overlap;
    if (next2 <= start) next2 = end;
    while (next2 < end && !clean.isWhitespace(next2)) next2++;
    start = next2 < end ? next2 : end;
  }
  return out;
}
function excerpt(text, limit = 240) {
  const head = graphemePrefix(text, limit * 8);
  const line = trimWhitespace(head.replace(WHITE_SPACE_RUN, " "));
  return graphemeCount(line) > limit || head.length < text.length ? graphemePrefix(line, limit) + "\u2026" : line;
}
var MAX_ENTRY_BYTES = 256 << 20;

// engine/code.ts
var LONGEST_PIECE = 4e3;
function splitLines(text) {
  return text.split(/\r?\n/);
}
function isBlank(line) {
  if (new RegExp("^\\p{White_Space}*$", "u").test(line)) return true;
  if (!isWhiteSpace(line.codePointAt(0) ?? 0)) return false;
  const characters = new Graphemes(line);
  for (let index2 = 0; index2 < characters.count; index2++) if (!characters.isWhitespace(index2)) return false;
  return true;
}
function words(line) {
  return line.split(new RegExp("\\p{White_Space}+", "u")).filter((word) => word !== "");
}
var LETTER_OR_NUMBER = /^[\p{Alphabetic}\p{N}]/u;
function isUppercase(character) {
  const first = String.fromCodePoint(character.codePointAt(0) ?? 0);
  if (first.length === character.length) {
    return new RegExp("\\p{Uppercase}", "u").test(first) || new RegExp("\\p{Cased}", "u").test(first) && first.toUpperCase() === first;
  }
  return character.toUpperCase() === character && character.toLowerCase() !== character;
}
var NON_ASCII3 = /[\u0080-\uffff]/;
function foldWide(text) {
  let out = "";
  for (const scalar of text) {
    const upper = scalar.toUpperCase();
    const lower = scalar.toLowerCase();
    if ([...upper].length > 1) out += upper.toLowerCase();
    else if ([...lower].length > 1) out += lower;
    else out += scalar === "\u1E9E" ? "ss" : scalar;
  }
  return out;
}
function composed(characters, foldCase = false) {
  if (!NON_ASCII3.test(characters.text)) return { text: characters.text, owner: (unit) => characters.indexAt(unit) };
  let text = "";
  const owners = [];
  for (let index2 = 0; index2 < characters.count; index2++) {
    const nfc = characters.at(index2).normalize("NFC");
    const piece = foldCase ? foldWide(nfc) : nfc;
    text += piece;
    for (let unit = 0; unit < piece.length; unit++) owners.push(index2);
  }
  return { text, owner: (unit) => owners[unit] };
}
function isWhole(text, owner, at, after) {
  return (at === 0 || owner(at - 1) !== owner(at)) && (after === text.length || owner(after - 1) !== owner(after));
}
function isNameCharacter(character) {
  return LETTER_OR_NUMBER.test(character) || character === "_" || character === "$";
}
function decodeCode(bytes) {
  const body = bytes[0] === 239 && bytes[1] === 187 && bytes[2] === 191 ? bytes.subarray(3) : bytes;
  return (0, import_node_buffer3.isUtf8)(body) ? body.toString("utf8") : bytes.toString("latin1");
}
function readCode(path, options = { codeStretch: 1800, maxCodeBytes: 1 << 20 }, home = (0, import_node_os4.homedir)(), repos) {
  return codeFromBytes((0, import_node_fs7.readFileSync)(path), path, options, home, repos);
}
function codeFromBytes(bytes, path, options, home = (0, import_node_os4.homedir)(), repos) {
  const { repo, title } = place(path, home, repos);
  const ext = lowercased(pathExtension(lastPathComponent(path)));
  if (ext === "ipynb") {
    const cellTexts = notebookCells(bytes);
    const text2 = cellTexts.join("\n");
    if (Buffer.byteLength(text2, "utf8") > options.maxCodeBytes) {
      throw ExtractError.leftOut(`cells over ${options.maxCodeBytes >> 20} MB`);
    }
    check(text2, true);
    return {
      pieces: cells(cellTexts, options.codeStretch),
      title,
      repo,
      lines: lineCount(text2),
      cells: cellTexts.length
    };
  }
  if (bytes.subarray(0, 8e3).includes(0)) throw ExtractError.leftOut("not text");
  const text = decodeCode(bytes);
  check(text, SOURCE_EXTENSIONS.has(ext));
  return { pieces: lines(text, options.codeStretch), title, repo, lines: lineCount(text), cells: null };
}
var GENERATED_MARKS = [
  "DO NOT EDIT",
  "@generated",
  "Code generated by",
  "Autogenerated by",
  "Generated by the protocol"
];
function check(text, source) {
  if (holdsPrivateKey(text)) throw ExtractError.leftOut("holds a private key");
  if (!source) return;
  const top = graphemePrefix(text, 1e3);
  for (const mark of GENERATED_MARKS) {
    if (top.includes(mark)) throw ExtractError.leftOut(`made by a program (\u201C${mark}\u201D)`);
  }
  const perLine = Math.trunc(graphemeCount(text) / Math.max(1, lineCount(text)));
  if (perLine > 300 && text.split(/(?<!\r)\n/).some((piece) => graphemeCount(piece) > 3e3)) {
    throw ExtractError.leftOut(`minified (${perLine} characters a line)`);
  }
}
function lineCount(text) {
  let count = 0;
  for (let at = text.indexOf("\n"); at >= 0; at = text.indexOf("\n", at + 1)) count++;
  const endsWithNewline = text.endsWith("\n") && !text.endsWith("\r\n");
  return endsWithNewline || text === "" ? count : count + 1;
}
var CLOSERS = /* @__PURE__ */ new Set(["end", "fi", "done", "esac", "@end", "#endif", "end;", "end)"]);
function lines(text, size = 1800) {
  const all = splitLines(text);
  if (all[all.length - 1] === "") all.pop();
  const count = all.length;
  const offsets = [0];
  for (const line of all) offsets.push(offsets[offsets.length - 1] + graphemeCount(line) + 1);
  const blank = (line) => isBlank(all[line]);
  const startsBlock = (line) => {
    const text2 = all[line];
    if (text2 === "" || isWhiteSpace(text2.codePointAt(0))) return false;
    const first = new Graphemes(text2).at(0);
    return !(first === "}" || first === ")" || first === "]") && !CLOSERS.has(trimWhitespace(text2));
  };
  const pieces = [];
  let start = 0;
  while (start < count) {
    while (start < count && blank(start)) start++;
    if (start >= count) break;
    let end = start + 1;
    while (end < count && offsets[end + 1] - offsets[start] <= size) end++;
    let natural = end >= count;
    if (!natural) {
      const floor = offsets[start] + Math.trunc(size * 2 / 5);
      const lastBreak = (isBreak) => {
        for (let line = end; line > start + 1 && offsets[line] >= floor; line--) if (isBreak(line)) return line;
        return null;
      };
      const cut = lastBreak((line) => startsBlock(line) && blank(line - 1)) ?? lastBreak((line) => blank(line - 1) || startsBlock(line));
      if (cut !== null) {
        end = cut;
        natural = true;
      }
    }
    let last = end;
    while (last > start + 1 && blank(last - 1)) last--;
    let body = all.slice(start, last).join("\n");
    if (graphemeCount(body) > LONGEST_PIECE) body = graphemePrefix(body, LONGEST_PIECE);
    pieces.push({ text: body, first: start + 1, last });
    start = natural ? end : Math.max(end - 2, start + 1);
  }
  return pieces;
}
var DEFINITION_SKIPPED_STARTS = [
  "//",
  "#",
  "/*",
  "*",
  "--",
  '"""',
  "import ",
  "from ",
  "#include",
  "using ",
  "package ",
  "}",
  ")",
  "@"
];
function summary(text) {
  const shown = text.split(/\r?\n/).map(trimWhitespace).filter((line2) => line2 !== "");
  const definition2 = shown.find((line2) => words(line2).slice(0, 4).some(definesSomething));
  const code = shown.find((line2) => !DEFINITION_SKIPPED_STARTS.some((start) => hasPrefix(line2, start)));
  const line = definition2 ?? code ?? shown[0] ?? "";
  return graphemeCount(line) > 160 ? graphemePrefix(line, 160) + "\u2026" : line;
}
var isObject = (value) => typeof value === "object" && value !== null && !Array.isArray(value);
var cellList = (value) => Array.isArray(value) && value.every(isObject) ? value : null;
function notebookCells(bytes) {
  let notebook;
  try {
    const text = Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength).toString("utf8");
    notebook = JSON.parse(text.replace(/^\uFEFF/, ""));
  } catch {
    notebook = null;
  }
  if (!isObject(notebook)) throw ExtractError.unreadable("not a notebook");
  const list = cellList(notebook.cells) ?? cellList(cellList(notebook.worksheets)?.[0]?.cells) ?? [];
  return list.map((cell) => {
    const source = cell.source !== void 0 ? cell.source : cell.input;
    if (Array.isArray(source) && source.every((line) => typeof line === "string")) return source.join("");
    return typeof source === "string" ? source : "";
  });
}
function cells(cellTexts, size = 1800) {
  const pieces = [];
  let text = "";
  let first = 0;
  let last = 0;
  const flush = () => {
    if (text === "") return;
    pieces.push({ text, first, last });
    text = "";
  };
  cellTexts.forEach((cell, index2) => {
    const body = trimWhitespaceAndNewlines(cell);
    if (body === "") return;
    const number = index2 + 1;
    const length = graphemeCount(body);
    if (length > size) {
      flush();
      for (const piece of lines(body, size)) pieces.push({ text: piece.text, first: number, last: number });
      return;
    }
    if (text !== "" && graphemeCount(text) + 2 + length > size) flush();
    if (text === "") {
      first = number;
      text = body;
    } else {
      text += "\n\n" + body;
    }
    last = number;
  });
  flush();
  return pieces;
}
function isRepo(folder, repos) {
  let answer = repos?.get(folder);
  if (answer === void 0) {
    answer = (0, import_node_fs7.existsSync)(folder + "/.git") || isProjectRootFolder(folder);
    repos?.set(folder, answer);
  }
  return answer;
}
function place(path, home = (0, import_node_os4.homedir)(), repos) {
  const homeForm = fileSystemForm(home);
  const isHome = (folder) => folder === home || fileSystemForm(folder) === homeForm;
  for (let folder = parentPath(path); folder.length > 1 && !isHome(folder); folder = parentPath(folder)) {
    if (isRepo(folder, repos)) {
      return { repo: folder, title: fileSystemForm(path.slice(parentPath(folder).length + 1)) };
    }
  }
  const components = path.startsWith("/") ? ["/", ...path.split("/").filter((part) => part !== "")] : path.split("/");
  return { repo: null, title: fileSystemForm(components.slice(-2).join("/")) };
}
var IDENTIFIER = /^[A-Za-z_$][A-Za-z0-9_$]*(?:(?:\.|::|->|#)[A-Za-z_$][A-Za-z0-9_$]*)*$/;
function identifier(query) {
  let name = trimWhitespaceAndNewlines(query);
  if (name.endsWith("()")) name = name.slice(0, -2);
  if (!IDENTIFIER.test(name)) return null;
  const camel = /[A-Z]/.test(name.slice(1)) && /[a-z]/.test(name);
  if (!camel && !/[_.:#$0-9]/.test(name)) return null;
  return name.toLowerCase().split(/[^\p{L}\p{M}\p{N}]+/u).filter((word) => word !== "");
}
function phrase(words2) {
  return `"${words2.join(" ")}"`;
}
var DEFINERS = /* @__PURE__ */ new Set([
  "def",
  "func",
  "fn",
  "fun",
  "function",
  "class",
  "struct",
  "enum",
  "protocol",
  "interface",
  "trait",
  "type",
  "typealias",
  "actor",
  "extension",
  "impl",
  "module",
  "namespace",
  "object",
  "record",
  "macro",
  "const",
  "let",
  "var",
  "val",
  "union",
  "mod",
  "sub",
  "@interface",
  "@implementation",
  "@protocol",
  "#define",
  "function*"
]);
var USERS = /* @__PURE__ */ new Set([
  "return",
  "await",
  "yield",
  "throw",
  "new",
  "else",
  "case",
  "print",
  "echo",
  "assert",
  "not",
  "and",
  "or",
  "in",
  "is",
  "do",
  "go",
  "defer",
  "try",
  "catch",
  "if",
  "while",
  "for",
  "typeof",
  "delete",
  "raise",
  "import",
  "from"
]);
function definesSomething(word) {
  return DEFINERS.has(word) && word !== "let" && word !== "var" && word !== "const" && word !== "val";
}
function definitionStrength(before, after, line) {
  const previous = words(before).at(-1) ?? "";
  if (DEFINERS.has(previous)) return 2;
  if (hasPrefix(before, "func (") && before.endsWith(")")) return 2;
  if (hasPrefix(before, "- (") || hasPrefix(before, "+ (")) {
    return after === "" || [":", "{", ";"].some((start) => hasPrefix(after, start)) ? 2 : 0;
  }
  if (!hasPrefix(after, "(") || before === "" || USERS.has(previous)) return 0;
  if (/[=(,.!?]/.test(before) || before.includes("->")) return 0;
  const characters = new Graphemes(before);
  const last = characters.at(characters.count - 1);
  if (!(LETTER_OR_NUMBER.test(last) || ["*", "&", ">", "_", "]"].includes(last))) return 0;
  return trimWhitespace(line).endsWith(";") ? 1 : 2;
}
function occurrences(name, line) {
  if (name === "") return [];
  const found = [];
  const characters = new Graphemes(line);
  const { text, owner } = composed(characters, true);
  const pattern = new RegExp(foldWide(name.normalize("NFC")).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "giu");
  for (const match of text.matchAll(pattern)) {
    const after = match.index + match[0].length;
    if (!isWhole(text, owner, match.index, after)) continue;
    const first = owner(match.index);
    const next2 = owner(after - 1) + 1;
    const clearBefore = first === 0 || !isNameCharacter(characters.at(first - 1));
    const clearAfter = next2 === characters.count || !isNameCharacter(characters.at(next2));
    if (clearBefore && clearAfter) found.push({ start: characters.start(first), end: characters.start(next2) });
  }
  return found;
}
function definition(name, text, first) {
  let best = null;
  const all = splitLines(text);
  for (let offset = 0; offset < all.length; offset++) {
    const line = all[offset];
    for (const range of occurrences(name, line)) {
      const before = trimWhitespace(line.slice(0, range.start));
      const after = trimWhitespace(line.slice(range.end));
      const strength = definitionStrength(before, after, line);
      if (strength > (best?.strength ?? 0)) best = { line: first + offset, strength };
      if (strength === 2) return best;
    }
  }
  return best;
}
var COMMENT_STARTS = ["//", "#", "/*", "*", "--", '"""', "'''", "<!--", ";"];
function has(word, line) {
  const lowerCharacters = new Graphemes(lowercased(line));
  const lineCharacters = new Graphemes(line);
  const { text, owner } = composed(lowerCharacters);
  const needle = word.normalize("NFC");
  for (let at = text.indexOf(needle); at >= 0; at = text.indexOf(needle, at + needle.length)) {
    if (!isWhole(text, owner, at, at + needle.length)) continue;
    const index2 = owner(at);
    if (index2 === 0 || !LETTER_OR_NUMBER.test(lowerCharacters.at(index2 - 1))) return true;
    if (index2 < lineCharacters.count && isUppercase(lineCharacters.at(index2))) return true;
  }
  return false;
}
function firstLine(wordList, text, first) {
  const wanted = wordList.filter((word) => graphemeCount(word) >= 2).map(lowercased);
  if (wanted.length === 0) return null;
  let firstCode = null;
  let firstAny = null;
  const all = splitLines(text);
  for (let offset = 0; offset < all.length; offset++) {
    const line = all[offset];
    if (!wanted.some((word) => has(word, line))) continue;
    const trimmed = trimWhitespace(line);
    if (words(trimmed).slice(0, 4).some(definesSomething)) return first + offset;
    if (firstCode === null && !COMMENT_STARTS.some((start) => hasPrefix(trimmed, start))) firstCode = offset;
    if (firstAny === null) firstAny = offset;
  }
  const found = firstCode ?? firstAny;
  return found === null ? null : first + found;
}
var CodeLookup = { identifier, phrase, definition, definesSomething, firstLine, occurrences };

// engine/crawler.ts
var import_node_child_process3 = require("node:child_process");
var import_node_fs8 = require("node:fs");
var import_node_os5 = require("node:os");
var import_node_path6 = require("node:path");
var FILE_REASONS = /* @__PURE__ */ new Set(["app or bundle"]);
var add = (counts, reason, n = 1) => {
  counts[reason] = (counts[reason] ?? 0) + n;
};
function standardized(path) {
  return (0, import_node_path6.resolve)(path);
}
async function crawl(roots, options, deps) {
  const home = deps.home ?? (0, import_node_os5.homedir)();
  const rootPaths = roots.map(standardized);
  const report = { candidates: [], skipped: {}, skippedFolders: {}, datasets: {} };
  if (rootPaths.length === 0) return report;
  const walk = await deps.helper.walk({
    roots: rootPaths,
    skipNames: [...SKIPPED_FOLDER_NAMES],
    skipSuffixes: [".noindex"],
    excluded: options.excludedFolders,
    home,
    code: options.code
  });
  for (const [reason, count] of Object.entries(walk.skipped)) {
    add(FILE_REASONS.has(reason) ? report.skipped : report.skippedFolders, reason, count);
  }
  const projectRoots = [];
  const repos = options.code ? new GitRepos(deps.git === void 0 ? findGit() : deps.git) : null;
  if (repos) {
    for (const root of rootPaths) await repos.enterRoot(root);
    for (const dir of walk.dirs) if (dir.gitDir === "dir") await repos.enter(dir.path);
  } else {
    for (const dir of walk.dirs) if (dir.projectRoot) projectRoots.push(dir.path);
  }
  const found = [];
  const seen = /* @__PURE__ */ new Set();
  for (const file of walk.files) {
    const kind = indexedKind(file, options, report);
    if (kind === null) continue;
    if (!file.regular) {
      add(report.skipped, "link or special file");
      continue;
    }
    if (file.dataless || file.inCloud) {
      add(report.skipped, "in the cloud, not downloaded");
      continue;
    }
    if (repos) {
      const limit = lowercased(pathExtension(lastPathComponent(file.path))) === "ipynb" ? options.maxNotebookBytes : options.maxCodeBytes;
      if (file.size > limit) {
        add(report.skipped, "too big to be written by hand");
        continue;
      }
      if (repos.ignores(file.path)) {
        add(report.skipped, "ignored by git");
        continue;
      }
    }
    if (seen.has(file.path)) continue;
    seen.add(file.path);
    found.push({
      path: file.path,
      kind,
      size: file.size,
      mtime: file.mtime,
      inode: file.inode,
      device: file.device
    });
  }
  const kept = keepCandidates(found, {
    projectRoots,
    roots: rootPaths,
    code: options.code,
    includeDatasets: options.includeDatasets
  });
  for (const [reason, count] of Object.entries(kept.skipped)) add(report.skipped, reason, count);
  report.datasets = kept.datasets;
  report.candidates = kept.kept;
  return report;
}
function indexedKind(file, options, report) {
  const facts = { dataless: file.dataless, inCloud: file.inCloud };
  const classification = options.code ? classifyCode(file.path, options, facts) : classify(file.path, file.type, options, file.screenshotMarker, facts);
  switch (classification.action) {
    case "ignore":
      add(report.skipped, "other type");
      return null;
    case "skip":
      add(report.skipped, classification.reason);
      return null;
    case "index":
      return classification.kind;
  }
}
function findGit() {
  const candidates = [];
  try {
    candidates.push((0, import_node_fs8.readlinkSync)("/var/db/xcode_select_link") + "/usr/bin/git");
  } catch {
  }
  candidates.push(
    "/Library/Developer/CommandLineTools/usr/bin/git",
    "/Applications/Xcode.app/Contents/Developer/usr/bin/git",
    "/opt/homebrew/bin/git",
    "/usr/local/bin/git"
  );
  return candidates.find(isExecutableFile) ?? null;
}
function isExecutableFile(path) {
  try {
    const info = (0, import_node_fs8.statSync)(path);
    return info.isFile() && (info.mode & 73) !== 0;
  } catch {
    return false;
  }
}
var NON_ASCII4 = /[\u0080-￿]/;
var canonical2 = (path) => NON_ASCII4.test(path) ? path.normalize("NFC") : path;
function gitFiles(git, repo) {
  if (!git) return Promise.resolve(null);
  return new Promise((done) => {
    (0, import_node_child_process3.execFile)(
      git,
      ["-C", repo, "ls-files", "-z", "--cached", "--others", "--exclude-standard"],
      {
        // Reading only: never wait for, or take, the repo's lock (an editor's git may be busy in it).
        env: { GIT_OPTIONAL_LOCKS: "0", PATH: "/usr/bin:/bin", HOME: (0, import_node_os5.homedir)() },
        encoding: "buffer",
        maxBuffer: 1 << 30
      },
      (error, stdout) => {
        if (error) return done(null);
        const decoder = new TextDecoder("utf-8", { fatal: true });
        const kept = /* @__PURE__ */ new Set();
        let start = 0;
        for (let at = stdout.indexOf(0); at >= 0; start = at + 1, at = stdout.indexOf(0, start)) {
          if (at === start) continue;
          try {
            kept.add(canonical2(decoder.decode(stdout.subarray(start, at))));
          } catch {
          }
        }
        if (start < stdout.length) {
          try {
            kept.add(canonical2(decoder.decode(stdout.subarray(start))));
          } catch {
          }
        }
        done(kept);
      }
    );
  });
}
var GitRepos = class {
  constructor(git) {
    this.git = git;
  }
  git;
  /** Repo folder → the files git keeps in it, or null when git couldn't say. */
  files = /* @__PURE__ */ new Map();
  /** Folder → the repo it's in (null: none), as the walk found them. */
  repoOf = /* @__PURE__ */ new Map();
  /** A chosen folder: a repo itself, or inside one (a repo's subfolder chosen on its own). */
  async enterRoot(path) {
    for (let folder = path; ; ) {
      if ((0, import_node_fs8.existsSync)(folder + "/.git")) {
        if (!this.files.has(folder)) this.files.set(folder, await gitFiles(this.git, folder));
        this.repoOf.set(path, folder);
        return;
      }
      const parent = parentPath(folder);
      if (parent === folder || parent.length <= 1) break;
      folder = parent;
    }
    this.repoOf.set(path, null);
  }
  /** A folder the walk went into that has a .git folder: a repo of its own. */
  async enter(path) {
    if (!this.files.has(path)) this.files.set(path, await gitFiles(this.git, path));
    this.repoOf.set(path, path);
  }
  /** The repo `folder` is in, from the closest folder the walk has seen. */
  repo(folder) {
    const known = this.repoOf.get(folder);
    if (known !== void 0) return known;
    const parent = parentPath(folder);
    const answer = parent !== folder && parent.length > 1 ? this.repo(parent) : null;
    this.repoOf.set(folder, answer);
    return answer;
  }
  /** Whether git leaves out the file at `path` (in a repo whose files git listed). */
  ignores(path) {
    const repo = this.repo(parentPath(path));
    if (repo === null) return false;
    const kept = this.files.get(repo);
    if (!kept) return false;
    return !kept.has(canonical2(path.slice(repo.length + 1)));
  }
};

// engine/indexer.ts
var IndexerError = class extends Error {
  constructor(indexed, now) {
    super(
      `this index was built with different settings or model:
  index: ${indexed}
  now:   ${now}
re-run with --reindex (vectors from different settings can't be compared)`
    );
    this.indexed = indexed;
    this.now = now;
    this.name = "IndexerError";
  }
  indexed;
  now;
};
var FATAL_HELPER = /* @__PURE__ */ new Set(["spawn", "closed"]);
function characterCount(text) {
  if (text.length <= 1e6) return graphemeCount(text);
  let count = 0;
  for (let at = 0; at < text.length; at++) {
    const unit = text.charCodeAt(at);
    if (unit >= 56320 && unit <= 57343) continue;
    if (unit === 10 && at > 0 && text.charCodeAt(at - 1) === 13) continue;
    count++;
  }
  return count;
}
var messageOf = (error) => error instanceof Error ? error.message : String(error);
var yieldToLoop = () => new Promise((done) => setImmediate(done));
var SYNC_SLICE = 2e3;
var detached = (text) => (" " + text).slice(1);
var Indexer = class _Indexer {
  store;
  options;
  helper;
  makeEmbedder;
  scratch;
  costsFolder;
  vectorSource;
  onReset;
  home;
  git;
  log;
  worker = null;
  measured = new MeasuredCosts();
  jobsPrepared = 0;
  /** Folder → whether it's a repo or code project, for the code titles of one sync's files. */
  repos = /* @__PURE__ */ new Map();
  /** The chunks of the last long document read: its later steps (40 chunks each) don't read and cut it again. */
  lastDoc = null;
  constructor(o) {
    this.store = o.store;
    this.options = o.options;
    this.helper = o.helper;
    this.makeEmbedder = o.embedder;
    this.scratch = o.scratch;
    this.costsFolder = o.costsFolder ?? null;
    this.vectorSource = o.vectorSource ?? VECTOR_SOURCE;
    this.onReset = o.onReset ?? null;
    this.home = o.home ?? (0, import_node_os6.homedir)();
    this.git = o.git;
    this.log = o.log ?? null;
  }
  /** "<vector source> | <settings>": what the vectors of this index depend on. */
  get fingerprint() {
    return `${this.vectorSource} | ${optionsFingerprint(this.options)}`;
  }
  /** Whether the model was started for this indexer (since the last `closeWorker`). */
  get workerIsRunning() {
    return this.worker !== null;
  }
  /** Lets go of the embedder; the next file that needs it asks again. */
  closeWorker() {
    this.worker = null;
  }
  /** Lets go of the embedder and removes the scratch folder. */
  finish() {
    this.closeWorker();
    this.lastDoc = null;
    (0, import_node_fs9.rmSync)(this.scratch, { recursive: true, force: true });
  }
  // MARK: Sync
  /**
   * Crawls `roots` and reconciles the index: new files are queued, changed ones queued again, moved ones re-pathed (no
   * re-embedding), and files that are gone or newly excluded removed. A root that isn't there keeps its rows.
   */
  async sync(roots, crawled) {
    const report = crawled ?? await crawl(roots, this.options, { helper: this.helper, home: this.home, git: this.git });
    this.repos = /* @__PURE__ */ new Map();
    const rootPaths = roots.map(standardized);
    const existing = this.store.files(rootPaths);
    const byPath = /* @__PURE__ */ new Map();
    const byInode = /* @__PURE__ */ new Map();
    for (const file of existing) {
      byPath.set(file.path, file);
      byInode.set(`${file.device}:${file.inode}`, file);
    }
    const seen = new Set(report.candidates.map((file) => file.path));
    const movedFrom = /* @__PURE__ */ new Set();
    const summary2 = {
      added: 0,
      changed: 0,
      moved: 0,
      removed: 0,
      unchanged: 0,
      crawl: report,
      queued: []
    };
    for (let start = 0; start < report.candidates.length; start += SYNC_SLICE) {
      if (start > 0) await yieldToLoop();
      const slice = report.candidates.slice(start, start + SYNC_SLICE);
      this.store.transaction(() => this.syncSlice(slice, byPath, byInode, seen, movedFrom, summary2));
    }
    const vanished = rootPaths.filter((root) => !(0, import_node_fs9.existsSync)(root)).map((root) => root.endsWith("/") ? root : root + "/");
    const gone = existing.filter(
      (row) => !seen.has(row.path) && !movedFrom.has(row.path) && !vanished.some((prefix) => row.path.startsWith(prefix))
    );
    for (let start = 0; start < gone.length; start += SYNC_SLICE) {
      if (start > 0 || report.candidates.length > 0) await yieldToLoop();
      this.store.transaction(() => {
        for (const row of gone.slice(start, start + SYNC_SLICE)) this.store.delete(row.id);
      });
      summary2.removed += Math.min(SYNC_SLICE, gone.length - start);
    }
    return summary2;
  }
  /** One slice of a sync's files: new ones queued, changed ones queued again, moved ones re-pathed. */
  syncSlice(files, byPath, byInode, seen, movedFrom, summary2) {
    for (const file of files) {
      const row = byPath.get(file.path);
      if (row) {
        if (row.size !== file.size || Math.abs(row.mtime - file.mtime) > 1e-3 || row.kind !== file.kind) {
          this.store.requeue(row.id, file);
          summary2.changed++;
          summary2.queued.push(row.id);
        } else {
          summary2.unchanged++;
        }
        continue;
      }
      const moved = byInode.get(`${file.device}:${file.inode}`);
      if (moved && !seen.has(moved.path) && !movedFrom.has(moved.path) && moved.size === file.size && Math.abs(moved.mtime - file.mtime) < 1e-3) {
        this.store.move(moved.id, file.path);
        movedFrom.add(moved.path);
        summary2.moved++;
      } else {
        summary2.queued.push(this.store.insert(file));
        summary2.added++;
      }
    }
  }
  // MARK: Run
  /**
   * Reads and embeds pending files (`only`: just these), screenshots first, newest first. Long PDFs and documents get
   * their first step and stay `partial` for `finishLongFiles`. A file's own problem is recorded on it; a dead embedder,
   * a helper that can't run or a settings mismatch ends the run (pending files stay pending). `shouldStop` is asked
   * between jobs.
   */
  async run(o = {}) {
    const queue = this.store.pending(o.limit ?? null, o.only ?? null);
    const states = {};
    let done = 0;
    const jobs = _Indexer.batches(queue).map((files) => ({ files, step: null }));
    await this.process(
      jobs,
      o.shouldStop ?? (() => false),
      (_index, job, results, seconds) => {
        job.files.forEach((file, offset) => {
          const [state, note] = results[offset];
          states[state] = (states[state] ?? 0) + 1;
          o.onEvent?.({
            done: done + offset + 1,
            total: queue.length,
            path: file.path,
            kind: file.kind,
            state,
            seconds,
            note
          });
        });
        done += job.files.length;
      },
      void 0,
      o.onStart
    );
    return states;
  }
  /**
   * The later pass: the rest of long PDFs and documents, in indexing order, a step at a time (30 pages, 40 chunks). Each
   * step is one transaction, so stopping between steps loses nothing.
   */
  async finishLongFiles(o = {}) {
    const jobs = [];
    for (const file of this.store.unfinished()) {
      const info = this.store.info(file.id);
      const size = file.kind === "pdf" ? this.options.pdfStep : this.options.docStep;
      let start = intOf(info.read_to) ?? this.store.lastPlace(file.id) ?? 0;
      const end = Math.max(intOf(info.read_end) ?? 0, start + 1);
      for (; start < end; start += size)
        jobs.push({ files: [file], step: { from: start, to: Math.min(start + size, end) } });
    }
    const through = [];
    for (const job of jobs) through.push((through[through.length - 1] ?? 0) + (job.step.to - job.step.from));
    let files = new Set(jobs.map((job) => job.files[0].id)).size;
    const states = {};
    const finished = /* @__PURE__ */ new Set();
    await this.process(
      jobs,
      o.shouldStop ?? (() => false),
      (index2, job, results, seconds) => {
        const file = job.files[0];
        const [state, note] = results[0];
        if (state !== "partial" && !finished.has(file.id)) {
          finished.add(file.id);
          states[state] = (states[state] ?? 0) + 1;
          files--;
        }
        o.onStep?.({
          done: through[index2],
          total: through[through.length - 1] ?? 0,
          files,
          path: file.path,
          kind: file.kind,
          state,
          seconds,
          note
        });
      },
      // Finished sooner than its steps said: a document whose length was guessed, or a file that went unreadable.
      (job) => finished.has(job.files[0].id),
      o.onStart
    );
    return states;
  }
  /** Images and screenshots go to the model 8 at a time (consecutive files of one kind); other files one by one. */
  static batches(queue) {
    const batches = [];
    for (let index2 = 0; index2 < queue.length; ) {
      const batch = [queue[index2]];
      if (batch[0].kind === "image" || batch[0].kind === "screenshot") {
        while (index2 + batch.length < queue.length && batch.length < 8 && queue[index2 + batch.length].kind === batch[0].kind) {
          batch.push(queue[index2 + batch.length]);
        }
      }
      batches.push(batch);
      index2 += batch.length;
    }
    return batches;
  }
  /**
   * Runs `jobs` in order until `shouldStop` (asked between jobs). While the model embeds one job, the next is read: the
   * helper and llama-server are separate processes. Each job's scratch folder goes when it's through, and a job read
   * for a run that stopped early is thrown away.
   */
  async process(jobs, shouldStop, committed, skip2 = () => false, onStart) {
    let ahead = null;
    let yielded = performance.now();
    try {
      for (let index2 = 0; index2 < jobs.length; index2++) {
        if (performance.now() - yielded > 50) {
          await yieldToLoop();
          yielded = performance.now();
        }
        if (shouldStop()) break;
        const job = jobs[index2];
        const started = performance.now();
        const prepared = await (ahead ?? this.prepare(job));
        ahead = index2 + 1 < jobs.length ? this.prepare(jobs[index2 + 1]) : null;
        try {
          if (prepared.fatal) throw prepared.fatal;
          if (skip2(job)) continue;
          onStart?.(job.files[0]);
          const modelWasRunning = this.worker !== null;
          const results = await this.commit(prepared);
          const seconds = (performance.now() - started) / 1e3;
          if (modelWasRunning) this.measure(prepared, seconds);
          committed(index2, job, results, seconds / job.files.length);
        } finally {
          (0, import_node_fs9.rmSync)(prepared.folder, { recursive: true, force: true });
        }
      }
    } finally {
      if (ahead) {
        const left = await ahead;
        (0, import_node_fs9.rmSync)(left.folder, { recursive: true, force: true });
      }
      if (this.costsFolder && this.measured.hasTallies) {
        MeasuredCosts.merge(this.measured, this.costsFolder);
        this.measured = new MeasuredCosts();
      }
    }
  }
  /** What a job read and how long it took (reading and embedding overlap), for estimates. */
  measure(prepared, seconds) {
    const payload = prepared.payload;
    switch (payload.kind) {
      case "images":
        this.measured.add(payload.screenshot ? "screenshot" : "image", payload.ready.length, seconds);
        break;
      case "pdf":
        this.measured.add("pdfPage", payload.pages.length, seconds);
        break;
      case "doc": {
        const worded = payload.chunks.filter(hasWords).length;
        if (worded > 0) this.measured.add("docChunk", worded, seconds);
        break;
      }
      case "audio":
        this.measured.add("audioSecond", payload.duration, seconds);
        break;
      case "video":
        this.measured.add("videoSecond", payload.duration, seconds);
        break;
      case "code":
        this.measured.add("codeStretch", payload.file.pieces.length, seconds);
        break;
    }
  }
  // MARK: Model
  /** Compares the index with the current model and settings, without starting the model; a change empties the index
   *  (`onReset`) or throws `IndexerError`. */
  checkModel() {
    this.adopt(this.fingerprint);
  }
  adopt(fingerprint) {
    const indexed = this.store.meta("fingerprint");
    if (indexed === null || indexed === fingerprint) return;
    if (!this.onReset) throw new IndexerError(indexed, fingerprint);
    this.store.resetAll();
    this.onReset(indexed, fingerprint);
  }
  async fullWorker() {
    if (this.worker) return this.worker;
    const started = await this.makeEmbedder();
    this.adopt(this.fingerprint);
    this.store.setModel(this.fingerprint, this.vectorSource);
    this.worker = started;
    return started;
  }
  // MARK: Prepare (files only: no database, no model)
  prepare(job) {
    const folder = (0, import_node_path7.join)(this.scratch, `batch-${++this.jobsPrepared}`);
    return this.read(job, folder);
  }
  async read(job, folder) {
    const batch = job.files;
    const prepared = {
      batch,
      step: job.step,
      folder,
      outcomes: /* @__PURE__ */ new Map(),
      payload: { kind: "nothing" },
      fatal: null
    };
    const settle = (error) => {
      if (error instanceof HelperError && FATAL_HELPER.has(error.kind)) {
        prepared.fatal = error;
        return;
      }
      if (error instanceof ExtractError && error.kind === "leftOut") {
        prepared.outcomes.set(0, { state: "skipped", detail: error.message });
        return;
      }
      for (let slot = 0; slot < batch.length; slot++) {
        if (!prepared.outcomes.has(slot)) prepared.outcomes.set(slot, failure(error));
      }
    };
    try {
      (0, import_node_fs9.mkdirSync)(folder, { recursive: true });
      const file = batch[0];
      const options = this.options;
      switch (file.kind) {
        case "image":
        case "screenshot": {
          const screenshot = file.kind === "screenshot";
          const ready = [];
          for (const [slot, item] of batch.entries()) {
            try {
              const image = await this.helper.image({
                path: item.path,
                screenshot,
                budget: screenshot ? options.screenshotBudget : options.photoBudget,
                out: (0, import_node_path7.join)(folder, `${slot}.png`),
                ocr: screenshot,
                minSide: options.minImageSide
              });
              if (image.tooSmall) {
                prepared.outcomes.set(slot, { state: "skipped", detail: `small image ${image.width}\xD7${image.height}` });
                continue;
              }
              ready.push({
                slot,
                path: (0, import_node_path7.join)(folder, `${slot}.png`),
                width: image.width,
                height: image.height,
                taken: image.taken,
                ocr: image.ocr ?? ""
              });
            } catch (error) {
              if (error instanceof HelperError && FATAL_HELPER.has(error.kind)) throw error;
              prepared.outcomes.set(slot, failure(error));
            }
          }
          prepared.payload = { kind: "images", screenshot, ready };
          break;
        }
        case "pdf":
          prepared.payload = await this.readPdf(file, job.step, folder);
          break;
        case "doc": {
          const { all, characters } = await this.docChunks(file);
          const want = job.step ?? { from: 0, to: options.docStep };
          const end = Math.min(all.length, options.maxChunks);
          const read = { from: Math.min(want.from, end), to: Math.min(Math.max(want.to, want.from), end) };
          prepared.payload = {
            kind: "doc",
            chunks: all.slice(read.from, read.to),
            read,
            total: all.length,
            characters
          };
          break;
        }
        case "audio": {
          const audio = await this.helper.audio({
            path: file.path,
            outDir: folder,
            window: options.audioWindow,
            hop: options.audioHop,
            minimum: 2
          });
          prepared.payload = { kind: "audio", pieces: audio.pieces, duration: audio.duration };
          break;
        }
        case "video": {
          const video = await this.helper.video({
            path: file.path,
            outDir: folder,
            interval: options.frameInterval,
            maxPixel: 1024,
            budget: options.frameBudget,
            window: options.audioWindow,
            hop: options.audioHop,
            minimum: 2
          });
          prepared.payload = { kind: "video", frames: video.frames, sound: video.pieces, duration: video.duration };
          break;
        }
        case "code":
          prepared.payload = { kind: "code", file: readCode(file.path, options, this.home, this.repos) };
          break;
      }
    } catch (error) {
      settle(error);
      prepared.payload = { kind: "nothing" };
    }
    return prepared;
  }
  /**
   * The pages a job reads: a long PDF's first 30 (or a step of the later pass), a short one's all. The page count comes
   * with the first read, so a PDF of 31-50 pages takes a second call for the rest.
   */
  async readPdf(file, step, folder) {
    const options = this.options;
    const ask = (from, to) => this.helper.pdf({
      path: file.path,
      from,
      to,
      minText: options.minPageText,
      renderPixels: 1400,
      budget: options.pageBudget,
      outDir: folder
    });
    const first = step ? await ask(step.from, Math.min(step.to, options.maxPages)) : await ask(0, Math.min(options.pdfStep, options.maxPages));
    if (first.locked) throw ExtractError.locked();
    const total = first.pages;
    const limit = Math.min(total, options.maxPages);
    let wanted = step ?? (total > options.bigPDFPages ? { from: 0, to: options.pdfStep } : { from: 0, to: options.maxPages });
    wanted = { from: Math.min(wanted.from, limit), to: Math.min(Math.max(wanted.to, wanted.from), limit) };
    let pages = first.items;
    const readTo = step ? Math.min(step.to, options.maxPages) : Math.min(options.pdfStep, options.maxPages);
    if (wanted.to > readTo) {
      const rest = await ask(readTo, wanted.to);
      pages = pages.concat(rest.items);
    }
    pages = pages.filter((page) => page.number - 1 >= wanted.from && page.number - 1 < wanted.to);
    return { kind: "pdf", pages, read: wanted, total, title: first.title ?? null };
  }
  /** DigUp: DocExtractor.text. Word processor files through the Cocoa text system (the helper), HTML stripped here. */
  async docText(path) {
    const ext = lowercased(pathExtension(lastPathComponent(path)));
    switch (ext) {
      case "docx":
      case "doc":
      case "odt":
      case "rtf":
        return (await this.helper.rich(path, ext)).text;
      case "html":
      case "htm": {
        const html = await readTextFile(path);
        await yieldToLoop();
        return plainTextFromHTML(html);
      }
      default:
        return readTextFile(path);
    }
  }
  /**
   * A document's chunks (up to maxChunks + 1) and its length in Characters, with turns of the event loop between the
   * read, the cut and the count. A long document's are kept for its later steps, which would otherwise read and cut a
   * file of hundreds of megabytes once per 40 chunks. Keyed by what the sync saw, so a later step reads what the first
   * one did.
   */
  async docChunks(file) {
    const key = `${file.id}|${file.size}|${file.mtime}`;
    if (this.lastDoc?.key === key) return this.lastDoc;
    const text = await this.docText(file.path);
    await yieldToLoop();
    const all = chunks(text, this.options.maxChunks + 1);
    await yieldToLoop();
    const characters = characterCount(text);
    if (all.length <= this.options.docStep) return { all, characters };
    this.lastDoc = { key, all: all.map(detached), characters };
    return this.lastDoc;
  }
  // MARK: Commit (the model and the database)
  async commit(prepared) {
    const batch = prepared.batch;
    const later = prepared.step !== null;
    const step = prepared.step;
    if (step && prepared.outcomes.has(0)) {
      const outcome = prepared.outcomes.get(0);
      return [this.stopReading(batch[0], step.from, outcome.detail ?? outcome.state, outcome)];
    }
    const results = batch.map(() => ["failed", null]);
    for (const [slot, outcome] of prepared.outcomes) {
      this.store.finish(batch[slot].id, outcome.state, outcome.detail);
      results[slot] = [outcome.state, outcome.detail];
    }
    const payload = prepared.payload;
    try {
      switch (payload.kind) {
        case "nothing":
          break;
        case "images":
          await this.images(batch, payload.screenshot, payload.ready, results);
          break;
        case "pdf":
          results[0] = await this.pdf(batch[0], payload, later);
          break;
        case "doc":
          results[0] = await this.doc(batch[0], payload, later);
          break;
        case "audio":
          results[0] = await this.audio(batch[0], payload.pieces, payload.duration);
          break;
        case "video":
          results[0] = await this.video(batch[0], payload.frames, payload.sound, payload.duration);
          break;
        case "code":
          results[0] = await this.code(batch[0], payload.file);
          break;
      }
    } catch (error) {
      if (error instanceof IndexerError || error instanceof EmbedderFailure) throw error;
      if (step) return [this.stopReading(batch[0], step.from, messageOf(error))];
      batch.forEach((file, slot) => {
        if (prepared.outcomes.has(slot)) return;
        this.store.finish(file.id, "failed", messageOf(error));
        results[slot] = ["failed", messageOf(error)];
      });
    }
    return results;
  }
  /** Vectors from the model; a failure there ends the run (the server is gone or broken), not just this file. */
  async embed(work) {
    const worker = await this.fullWorker();
    try {
      return await work(worker);
    } catch (error) {
      this.closeWorker();
      this.log?.warn(`indexer: the embedder failed: ${messageOf(error)}`);
      throw new EmbedderFailure(messageOf(error));
    }
  }
  /**
   * A long file that can't be read any further keeps the pages or chunks read so far (they stay searchable) and counts
   * as done, rather than failed or tried again and again. A watchdog stop says so as DigUp's does.
   */
  stopReading(file, place2, problem2, outcome) {
    const info = this.store.info(file.id);
    delete info.read_to;
    delete info.read_end;
    const unit = file.kind === "pdf" ? "page" : "chunk";
    if (outcome?.detail?.startsWith("It ")) {
      const why = outcome.detail.slice(3);
      this.store.finish(file.id, "done", `The rest couldn't be read: it ${why}`, info);
      return ["done", `stopped before ${unit} ${place2 + 1}: it ${why}`];
    }
    this.store.finish(file.id, "done", `read to ${unit} ${place2}, not after: ${problem2}`, info);
    return ["done", `stopped before ${unit} ${place2 + 1}: ${problem2}`];
  }
  async images(batch, screenshot, ready, results) {
    if (ready.length === 0) return;
    const vectors = await this.embed((worker) => worker.embedImages(ready.map((item) => item.path)));
    this.store.transaction(() => {
      ready.forEach((item, position) => {
        const file = batch[item.slot];
        const vector = vectors[position];
        if (vector instanceof Error) {
          this.store.finish(file.id, "failed", vector.message);
          results[item.slot] = ["failed", vector.message];
          return;
        }
        this.store.addSegment({ file: file.id, kind: "image", modality: "image", vector });
        if (item.ocr !== "") {
          this.store.addSegment({
            file: file.id,
            kind: "ocr",
            modality: "text",
            excerpt: excerpt(item.ocr),
            text: item.ocr
          });
        }
        const info = { width: `${item.width}`, height: `${item.height}` };
        if (item.taken) info.taken = item.taken;
        const characters = graphemeCount(item.ocr);
        if (screenshot) info.ocr_chars = `${characters}`;
        this.store.finish(file.id, "done", null, info);
        results[item.slot] = ["done", screenshot ? `ocr ${characters} chars` : null];
      });
    });
  }
  /** Pages `read` of a PDF (all of a short one, a step of a long one). A long one stays `partial` with `read_to` and
   *  `read_end` (pages, from 0) in its info until its last step. */
  async pdf(file, payload, later) {
    const { pages, read, total } = payload;
    const end = Math.min(total, this.options.maxPages);
    const unread = read.to < end;
    if (pages.length === 0 && !later && !unread) {
      this.store.finish(file.id, "skipped", "no pages");
      return ["skipped", "no pages"];
    }
    const title = payload.title ?? titleOf(file.path);
    const textPages = pages.filter((page) => !page.image);
    const wordPages = textPages.filter((page) => hasWords(page.text));
    const imagePages = pages.filter((page) => page.image);
    const garbledPages = pages.filter((page) => page.garbled !== void 0 && page.garbled !== null);
    let textVectors = /* @__PURE__ */ new Map();
    let imageVectors = [];
    let garbledVectors = [];
    if (wordPages.length > 0 || imagePages.length > 0) {
      await this.embed(async (worker) => {
        const vectors = await worker.embedTexts(
          wordPages.map((page) => Prompts.document(title, graphemePrefix(page.text, 4e3)))
        );
        textVectors = new Map(wordPages.map((page, at) => [page.number, vectors[at]]));
        imageVectors = await worker.embedImages(imagePages.map((page) => page.image));
        garbledVectors = await worker.embedTexts(
          garbledPages.map((page) => Prompts.document(title, graphemePrefix(page.garbled, 4e3)))
        );
      });
    }
    this.store.transaction(() => {
      garbledPages.forEach((page, at) => {
        this.store.addSegment({
          file: file.id,
          kind: "page",
          modality: "text",
          loc: page.number,
          vector: garbledVectors[at]
        });
      });
      for (const page of textPages) {
        this.store.addSegment({
          file: file.id,
          kind: "page",
          modality: "text",
          loc: page.number,
          excerpt: excerpt(page.text),
          text: page.text,
          vector: textVectors.get(page.number) ?? null
        });
      }
      imagePages.forEach((page, at) => {
        const vector = imageVectors[at];
        this.store.addSegment({
          file: file.id,
          kind: "page_image",
          modality: "image",
          loc: page.number,
          excerpt: page.text === "" ? null : excerpt(page.text),
          text: page.text,
          vector: vector instanceof Error ? null : vector
        });
      });
      const info = later ? this.store.info(file.id) : {};
      info.pages = `${total}`;
      info.scanned_pages = `${(intOf(info.scanned_pages) ?? 0) + imagePages.length}`;
      if (unread) {
        info.read_to = `${read.to}`;
        info.read_end = `${end}`;
      } else {
        delete info.read_to;
        delete info.read_end;
      }
      const detail = unread ? `read to page ${read.to} of ${total}` : end < total ? `the first ${end} of ${total} pages` : null;
      this.store.finish(file.id, unread ? "partial" : "done", detail, info);
    });
    const ocr = pages.filter((page) => page.ocr).length;
    const span = later ? `pages ${read.from + 1}\u2013${read.to} of ${total}` : `${pages.length}/${total} pages`;
    return [
      unread ? "partial" : "done",
      `${span}, ${imagePages.length} as images` + (ocr > 0 ? `, ${ocr} read by OCR` : "")
    ];
  }
  /** Chunks `read` of a document (all of a short one, a step of a long one), the way `pdf` reads pages. */
  async doc(file, payload, later) {
    const { chunks: chunks2, read, total, characters } = payload;
    if (total === 0) {
      this.store.finish(file.id, "skipped", "no text");
      return ["skipped", "no text"];
    }
    const title = titleOf(file.path);
    const worded = chunks2.flatMap((chunk, at) => hasWords(chunk) ? [at] : []);
    const vectors = worded.length === 0 ? [] : await this.embed((worker) => worker.embedTexts(worded.map((at) => Prompts.document(title, chunks2[at]))));
    const vector = new Map(worded.map((at, position) => [at, vectors[position]]));
    const end = Math.min(total, this.options.maxChunks);
    const unread = read.to < end;
    this.store.transaction(() => {
      chunks2.forEach((chunk, offset) => {
        this.store.addSegment({
          file: file.id,
          kind: "chunk",
          modality: "text",
          loc: read.from + offset + 1,
          excerpt: excerpt(chunk),
          text: chunk,
          vector: vector.get(offset) ?? null
        });
      });
      const info = { chunks: `${end}`, chars: `${characters}` };
      if (unread) {
        info.read_to = `${read.to}`;
        info.read_end = `${end}`;
      }
      const detail = unread ? `read to chunk ${read.to} of ${end}` : end < total ? `the first ${end} chunks` : null;
      this.store.finish(file.id, unread ? "partial" : "done", detail, info);
    });
    const span = later ? `chunks ${read.from + 1}\u2013${read.to} of ${end}` : unread ? `${chunks2.length} of ${end} chunks` : `${chunks2.length} chunks`;
    return [
      unread ? "partial" : "done",
      span + (worded.length < chunks2.length ? `, ${chunks2.length - worded.length} for keywords only` : "")
    ];
  }
  /** A code file's stretches of lines (a notebook's of cells), each embedded with the file's path in its repo as its
   *  title, and kept with its lines for keyword search and for opening at the place. */
  async code(file, code) {
    if (code.pieces.length === 0) {
      this.store.finish(file.id, "skipped", "no code");
      return ["skipped", "no code"];
    }
    const worded = code.pieces.flatMap((piece, at) => hasWords(piece.text) ? [at] : []);
    const vectors = worded.length === 0 ? [] : await this.embed(
      (worker) => worker.embedTexts(worded.map((at) => Prompts.document(code.title, code.pieces[at].text)))
    );
    const vector = new Map(worded.map((at, position) => [at, vectors[position]]));
    this.store.transaction(() => {
      code.pieces.forEach((piece, offset) => {
        this.store.addSegment({
          file: file.id,
          kind: code.cells === null ? "lines" : "cells",
          modality: "text",
          loc: piece.first,
          locEnd: piece.last,
          excerpt: summary(piece.text),
          text: piece.text,
          vector: vector.get(offset) ?? null
        });
      });
      const info = { lines: `${code.lines}` };
      if (code.cells !== null) info.cells = `${code.cells}`;
      if (code.repo !== null) info.repo = code.repo;
      this.store.finish(file.id, "done", null, info);
    });
    const size = code.cells !== null ? `${code.cells} cells` : `${code.lines} lines`;
    return [
      "done",
      `${code.pieces.length} stretches, ${size}` + (worded.length < code.pieces.length ? `, ${code.pieces.length - worded.length} for keywords only` : "")
    ];
  }
  async audio(file, pieces, duration) {
    if (pieces.length === 0) {
      this.store.finish(file.id, "skipped", "silent or shorter than 2 s");
      return ["skipped", "silent or too short"];
    }
    const vectors = await this.embed((worker) => worker.embedAudio(pieces.map((piece) => piece.path)));
    this.store.transaction(() => {
      pieces.forEach((piece, at) => {
        const vector = vectors[at];
        if (vector instanceof Error) return;
        this.store.addSegment({
          file: file.id,
          kind: "audio",
          modality: "audio",
          loc: piece.start,
          locEnd: piece.end,
          vector
        });
      });
      this.store.finish(file.id, "done", null, { duration: duration.toFixed(1) });
    });
    return ["done", `${pieces.length} windows, ${Math.trunc(duration)} s`];
  }
  async video(file, frames, sound, duration) {
    if (frames.length === 0 && sound.length === 0) {
      this.store.finish(file.id, "skipped", "no frames or sound");
      return ["skipped", "no frames or sound"];
    }
    const [frameVectors, soundVectors] = await this.embed(async (worker) => [
      await worker.embedImages(frames.map((frame) => frame.path)),
      await worker.embedAudio(sound.map((piece) => piece.path))
    ]);
    this.store.transaction(() => {
      frames.forEach((frame, at) => {
        const vector = frameVectors[at];
        if (vector instanceof Error) return;
        this.store.addSegment({
          file: file.id,
          kind: "frame",
          modality: "image",
          loc: frame.start,
          locEnd: frame.end,
          vector
        });
      });
      sound.forEach((piece, at) => {
        const vector = soundVectors[at];
        if (vector instanceof Error) return;
        this.store.addSegment({
          file: file.id,
          kind: "audio",
          modality: "audio",
          loc: piece.start,
          locEnd: piece.end,
          vector
        });
      });
      this.store.finish(file.id, "done", null, {
        duration: duration.toFixed(1),
        frames: `${frames.length}`,
        sound_windows: `${sound.length}`
      });
    });
    return ["done", `${frames.length} frames, ${sound.length} sound windows, ${Math.trunc(duration)} s`];
  }
};
var EmbedderFailure = class extends Error {
  constructor(message2) {
    super(message2);
    this.name = "EmbedderFailure";
  }
};
function failure(error) {
  if (error instanceof HelperError) {
    if (error.kind === "timeout" || error.kind === "memory") return { state: "failed", detail: `It ${error.message}` };
    if (error.kind === "crashed")
      return { state: "failed", detail: `unreadable: the reader crashed (${error.message})` };
    return { state: "failed", detail: error.message };
  }
  if (error instanceof ExtractError)
    return { state: error.kind === "tooSmall" ? "skipped" : "failed", detail: error.message };
  const code = error?.code;
  if (code === "ENOENT") return { state: "failed", detail: "unreadable: the file is gone" };
  if (code === "EACCES" || code === "EPERM") return { state: "failed", detail: "unreadable: no permission to read it" };
  return { state: "failed", detail: messageOf(error) };
}
function titleOf(path) {
  return fileSystemForm(deletingPathExtension(lastPathComponent(path)));
}
function intOf(value) {
  if (value === void 0 || !/^-?\d+$/.test(value)) return null;
  return Number(value);
}

// engine/install.ts
var import_node_child_process4 = require("node:child_process");
var import_node_fs10 = require("node:fs");
var import_promises3 = require("node:fs/promises");
var import_node_crypto2 = require("node:crypto");
var import_node_os7 = require("node:os");
var import_node_path8 = require("node:path");
var import_node_stream = require("node:stream");
var import_promises4 = require("node:stream/promises");
var LLAMA_BUILD = 11624;
var LLAMA_MIN_BUILD = 11452;
var LLAMA_RELEASE = {
  url: `https://github.com/ggml-org/llama.cpp/releases/download/b${LLAMA_BUILD}/llama-b${LLAMA_BUILD}-bin-macos-arm64.tar.gz`,
  sha256: "5bd8555c20e5d6d45831c038f484769245e5bcc1c265c4911c6ae15e4d9a35df",
  dir: `llama-b${LLAMA_BUILD}`
};
var MODEL_REPOSITORY = "ggml-org/embeddinggemma-2-GGUF";
var MODEL_REVISION = "bfcd298762cc34d0357ece5ebdd31791a3a374d8";
function modelFile(name, bytes, sha2562) {
  return { name, bytes, sha256: sha2562, url: `https://huggingface.co/${MODEL_REPOSITORY}/resolve/${MODEL_REVISION}/${name}` };
}
var TEXT_MODEL = modelFile(
  "embeddinggemma-2-Q8_0.gguf",
  309855456,
  "2188ac1deca4b77dffefd603c2776a9d76d9d74ec01841392982ebb840b09135"
);
var MEDIA_MODEL = modelFile(
  "mmproj-embeddinggemma-2-Q8_0.gguf",
  554821024,
  "c4a8a52691ecef40618438928bdf9e68379b854e24166f292592353db0aab64f"
);
var MODEL_FILES = { text: TEXT_MODEL, media: MEDIA_MODEL };
function formatBytes(count) {
  if (count === 0) return "Zero KB";
  if (count < 1e3) return count === 1 ? "1 byte" : `${count} bytes`;
  const units = ["KB", "MB", "GB", "TB", "PB"];
  for (let unit = 0; ; unit++) {
    const decimals = Math.min(unit, 2);
    const rounded = Math.round(count / 10 ** (3 * (unit + 1) - decimals)) / 10 ** decimals;
    if (rounded < 1e3 || unit === units.length - 1) return `${rounded} ${units[unit]}`;
  }
}
function tildePath(path, home) {
  if (path === home) return "~";
  return path.startsWith(`${home}/`) ? `~${path.slice(home.length)}` : path;
}
async function makeFolder(folder, home, log) {
  try {
    await (0, import_promises3.mkdir)(folder, { recursive: true });
  } catch (error) {
    log?.error(`install: can't create ${folder}: ${error.message}`);
    throw new Error(`Can't create ${tildePath(folder, home)}`);
  }
}
var running = /* @__PURE__ */ new Map();
function oneAtATime(folder, work) {
  const current = running.get(folder);
  if (current) return current;
  const job = work().finally(() => running.delete(folder));
  running.set(folder, job);
  return job;
}
var versionCache = /* @__PURE__ */ new Map();
function checkLlama(bin) {
  let stat;
  try {
    stat = (0, import_node_fs10.statSync)(bin);
  } catch {
    return { bin: null, reason: `no llama-server at ${bin}` };
  }
  if (!stat.isFile()) return { bin: null, reason: `${bin} is not a file` };
  const key = `${bin}:${stat.mtimeMs}:${stat.size}`;
  const cached = versionCache.get(key);
  if (cached) return cached;
  const run2 = (0, import_node_child_process4.spawnSync)(bin, ["--version"], { encoding: "utf8", timeout: 2e4 });
  let result;
  if (run2.error) {
    result = { bin: null, reason: `can't run ${bin}: ${run2.error.message}` };
  } else {
    const build = /build[ :]*(\d+)/.exec(`${run2.stdout}
${run2.stderr}`)?.[1];
    if (!build) {
      const said = `${run2.stderr}`.trim().split("\n")[0];
      result = {
        bin: null,
        reason: `can't read the build number of ${bin} (exit ${run2.status})${said ? `: ${said}` : ""}`
      };
    } else if (Number(build) < LLAMA_MIN_BUILD) {
      result = {
        bin: null,
        reason: `${bin} is build ${build}; EmbeddingGemma 2 needs build ${LLAMA_MIN_BUILD} or newer`
      };
    } else {
      result = { bin, build: Number(build) };
    }
  }
  versionCache.set(key, result);
  return result;
}
function defaultLlamaBin(paths, release = LLAMA_RELEASE) {
  return (0, import_node_path8.join)(paths.llamaDir, release.dir, "llama-server");
}
function findLlama(paths, override, release = LLAMA_RELEASE) {
  const installed = defaultLlamaBin(paths, release);
  if (!override || override === installed) return checkLlama(installed);
  const chosen = checkLlama(override);
  if (chosen.bin !== null) return chosen;
  const fallback = checkLlama(installed);
  if (fallback.bin !== null) return { ...fallback, ignored: chosen.reason };
  return { bin: null, reason: `${chosen.reason}; ${fallback.reason}` };
}
function installLlama(paths, progress, o = {}) {
  return oneAtATime(paths.llamaDir, () => installLlamaNow(paths, progress, o));
}
async function installLlamaNow(paths, progress, o) {
  const release = o.release ?? LLAMA_RELEASE;
  const existing = findLlama(paths, null, release);
  if (existing.bin) return existing.bin;
  await makeFolder(paths.llamaDir, o.home ?? (0, import_node_os7.homedir)(), o.log);
  const archive = (0, import_node_path8.join)(paths.llamaDir, `${release.dir}.tar.gz`);
  const partial = `${archive}.partial`;
  const what = release.dir;
  if (sizeOf(partial) === 0 || await sha256(partial) !== release.sha256) {
    let total = 0;
    await download({
      url: release.url,
      source: "GitHub",
      saving: "llama.cpp",
      partial,
      bytes: null,
      what,
      report: (bytes, size2) => {
        total = size2;
        progress({ phase: "downloading", what, bytes, total });
      },
      waiting: (error) => progress({ phase: "retrying", what, bytes: sizeOf(partial), total, error }),
      log: o.log,
      signal: o.signal,
      retryDelaysMs: o.retryDelaysMs,
      maxFailures: o.maxFailures
    });
  }
  const size = sizeOf(partial);
  progress({ phase: "verifying", what, bytes: size, total: size });
  if (await sha256(partial) !== release.sha256) {
    (0, import_node_fs10.rmSync)(partial, { force: true });
    throw new Error("The llama.cpp download failed its checksum");
  }
  (0, import_node_fs10.renameSync)(partial, archive);
  const staging = (0, import_node_path8.join)(paths.llamaDir, `.unpack-${process.pid}`);
  (0, import_node_fs10.rmSync)(staging, { recursive: true, force: true });
  (0, import_node_fs10.mkdirSync)(staging, { recursive: true });
  try {
    await unpackRelease(archive, staging, release.dir);
    await run("/usr/bin/xattr", ["-dr", "com.apple.quarantine", (0, import_node_path8.join)(staging, release.dir)]).catch(() => {
    });
    const target = (0, import_node_path8.join)(paths.llamaDir, release.dir);
    (0, import_node_fs10.rmSync)(target, { recursive: true, force: true });
    (0, import_node_fs10.renameSync)((0, import_node_path8.join)(staging, release.dir), target);
  } finally {
    (0, import_node_fs10.rmSync)(staging, { recursive: true, force: true });
  }
  (0, import_node_fs10.rmSync)(archive, { force: true });
  const installed = findLlama(paths, null, release);
  if (installed.bin === null) throw new Error(`llama.cpp is unpacked but unusable: ${installed.reason}`);
  return installed.bin;
}
async function unpackRelease(archive, into, dir) {
  const listing = await run("/usr/bin/tar", ["-tzf", archive]);
  for (const entry of listing.split("\n").filter(Boolean)) {
    const parts = entry.split("/");
    if (entry.startsWith("/") || parts.includes("..") || parts[0] !== dir) {
      throw new Error(`The llama.cpp archive holds an unexpected path: ${entry}`);
    }
  }
  await run("/usr/bin/tar", ["-xzf", archive, "-C", into]);
}
function run(file, args) {
  return new Promise((resolve3, reject) => {
    (0, import_node_child_process4.execFile)(file, args, { maxBuffer: 64 << 20 }, (error, stdout, stderr) => {
      if (error) reject(new Error(`${file} failed: ${stderr.trim() || error.message}`));
      else resolve3(stdout);
    });
  });
}
function huggingFaceSnapshot(o = {}) {
  const env = o.env ?? process.env;
  const hub = env.HF_HUB_CACHE || (env.HF_HOME ? (0, import_node_path8.join)(env.HF_HOME, "hub") : (0, import_node_path8.join)(o.home ?? (0, import_node_os7.homedir)(), ".cache/huggingface/hub"));
  return (0, import_node_path8.join)(hub, `models--${MODEL_REPOSITORY.replace("/", "--")}`, "snapshots", MODEL_REVISION);
}
function sizedFile(folder, file) {
  try {
    const path = (0, import_node_fs10.realpathSync)((0, import_node_path8.join)(folder, file.name));
    return (0, import_node_fs10.statSync)(path).size === file.bytes ? path : null;
  } catch {
    return null;
  }
}
function modelFolders(paths, override, o) {
  if (override) return [override];
  return [
    paths.modelsDir,
    (0, import_node_path8.join)(o.home ?? (0, import_node_os7.homedir)(), "Library/Application Support/DigUp/Models"),
    // DigUp.app's own copy
    huggingFaceSnapshot(o)
  ];
}
function chosenReason(folder, missing, home) {
  for (const file of missing) {
    const size = sizeOf((0, import_node_path8.join)(folder, file.name));
    if (size > 0) return `The chosen ${file.name} is ${formatBytes(size)}, not ${formatBytes(file.bytes)}`;
  }
  return missing.length === 2 ? "Those aren't the model's files" : `no ${missing[0].name} in ${tildePath(folder, home)}`;
}
function findModels(paths, override, o = {}) {
  const files = o.files ?? MODEL_FILES;
  const folders = modelFolders(paths, override, o);
  const find = (file) => {
    for (const folder of folders) {
      const found = sizedFile(folder, file);
      if (found) return found;
    }
    return null;
  };
  const text = find(files.text);
  const media = find(files.media);
  const missing = [...text ? [] : [files.text], ...media ? [] : [files.media]];
  if (missing.length === 0) return { text, media };
  const home = o.home ?? (0, import_node_os7.homedir)();
  const reason = override ? chosenReason(override, missing, home) : `no ${missing[0].name} in ${folders.map((folder) => tildePath(folder, home)).join(", ")}`;
  return text ? { text, media: null, reason } : { text: null, media: null, reason };
}
function installModels(paths, progress, o = {}) {
  return oneAtATime(paths.modelsDir, () => installModelsNow(paths, progress, o));
}
async function installModelsNow(paths, progress, o) {
  const files = o.files ?? MODEL_FILES;
  const list = [files.text, files.media];
  const folder = paths.modelsDir;
  await makeFolder(folder, o.home ?? (0, import_node_os7.homedir)(), o.log);
  if (o.excludeFromBackup !== false) await run("/usr/bin/tmutil", ["addexclusion", folder]).catch(() => {
  });
  const total = list.reduce((sum, file) => sum + file.bytes, 0);
  let base = 0;
  const result = [];
  for (const [index2, file] of list.entries()) {
    const final = (0, import_node_path8.join)(folder, file.name);
    const partial = `${final}.partial`;
    if (sizeOf(final) === file.bytes) {
      result.push(final);
      base += file.bytes;
      continue;
    }
    const missing = list.slice(index2).filter((later) => sizeOf((0, import_node_path8.join)(folder, later.name)) !== later.bytes);
    checkSpace(folder, missing, partial, o.spareBytes ?? 2e8, o.log);
    const onDisk = () => base + Math.min(sizeOf(partial), file.bytes);
    for (let attempt = 1; ; attempt++) {
      const cached = attempt === 1 ? sizedFile(huggingFaceSnapshot(o), file) : null;
      if (!cached || !await copyCached(cached, partial, file, o.log)) {
        await download({
          url: file.url,
          source: "Hugging Face",
          saving: "the model",
          partial,
          bytes: file.bytes,
          what: file.name,
          report: (written) => progress({ phase: "downloading", what: file.name, bytes: base + written, total }),
          waiting: (error) => progress({ phase: "retrying", what: file.name, bytes: onDisk(), total, error }),
          log: o.log,
          signal: o.signal,
          retryDelaysMs: o.retryDelaysMs,
          maxFailures: o.maxFailures
        });
      }
      progress({ phase: "verifying", what: file.name, bytes: base + file.bytes, total });
      if (sizeOf(partial) === file.bytes && await sha256(partial) === file.sha256) break;
      (0, import_node_fs10.rmSync)(partial, { force: true });
      o.log?.warn(`model: ${file.name} failed its check${attempt >= 2 ? " again" : ", downloading it again"}`);
      if (attempt >= 2) throw new Error("The download was damaged twice. Try again later.");
    }
    (0, import_node_fs10.renameSync)(partial, final);
    result.push(final);
    base += file.bytes;
  }
  return { text: result[0], media: result[1] };
}
async function copyCached(cached, partial, file, log) {
  try {
    (0, import_node_fs10.rmSync)(partial, { force: true });
    await (0, import_promises3.copyFile)(cached, partial, import_node_fs10.constants.COPYFILE_FICLONE);
    log?.info(`model: ${file.name} copied from the Hugging Face cache`);
    return true;
  } catch (error) {
    log?.warn(`model: ${file.name} is in the Hugging Face cache but couldn't be copied: ${error.message}`);
    return false;
  }
}
function sizeOf(path) {
  try {
    return (0, import_node_fs10.statSync)(path).size;
  } catch {
    return 0;
  }
}
function checkSpace(folder, missing, partial, spare, log) {
  let free;
  try {
    const fs = (0, import_node_fs10.statfsSync)(folder);
    free = fs.bavail * fs.bsize;
  } catch {
    return;
  }
  const needed = missing.reduce((sum, file) => sum + file.bytes, 0) - sizeOf(partial) + spare;
  if (free >= needed) return;
  log?.error(`model: needs ${formatBytes(needed)} free, ${formatBytes(free)} is free`);
  throw new Error(`Needs ${formatBytes(needed)} free on this disk`);
}
async function sha256(path) {
  const hash = (0, import_node_crypto2.createHash)("sha256");
  for await (const chunk of (0, import_node_fs10.createReadStream)(path, { highWaterMark: 8 << 20 })) hash.update(chunk);
  return hash.digest("hex");
}
var DownloadError = class extends Error {
  constructor(message2, retry) {
    super(message2);
    this.retry = retry;
  }
  retry;
};
var IDLE_MS = 6e4;
var MAX_REDIRECTS = 10;
async function download(job) {
  const delays = job.retryDelaysMs ?? [2e3, 5e3, 15e3, 3e4];
  const maxFailures = job.maxFailures ?? Number.POSITIVE_INFINITY;
  let failures = 0;
  for (; ; ) {
    const before = sizeOf(job.partial);
    try {
      return await fetchOnce(job);
    } catch (error) {
      if (job.signal?.aborted) throw error;
      if (isDiskError(error)) throw new DownloadError(`Can't save ${job.saving}: ${error.message}`, false);
      const retry = error instanceof DownloadError ? error.retry : true;
      if (!retry) throw error;
      failures = sizeOf(job.partial) > before ? 1 : failures + 1;
      if (failures > maxFailures) throw error;
      const message2 = error instanceof Error ? error.message : String(error);
      const delay2 = delays[Math.min(failures - 1, delays.length - 1)] ?? 0;
      job.log?.warn(`download: ${job.what}: ${message2}; trying again in ${Math.round(delay2 / 1e3)} s`);
      job.waiting?.(message2);
      await sleep2(delay2, job.signal);
    }
  }
}
function isDiskError(error) {
  const syscall = error?.syscall;
  return syscall !== void 0 && ["open", "write", "close", "fsync", "rm", "unlink"].includes(syscall);
}
async function fetchOnce(job) {
  const { partial } = job;
  let size = job.bytes;
  let written = sizeOf(partial);
  if (size !== null && written > size) {
    (0, import_node_fs10.rmSync)(partial, { force: true });
    written = 0;
  }
  if (size !== null && written === size) return;
  const idle = new AbortController();
  let timer;
  const touch = () => {
    clearTimeout(timer);
    timer = setTimeout(() => idle.abort(new Error("No data for a minute")), IDLE_MS);
  };
  const signal = job.signal ? AbortSignal.any([job.signal, idle.signal]) : idle.signal;
  touch();
  try {
    const response = await get(job.url, written, signal);
    const status = response.status;
    if (status === 206) {
      const range = response.headers.get("content-range") ?? "";
      if (!range.startsWith(`bytes ${written}-`)) {
        await response.body?.cancel();
        (0, import_node_fs10.rmSync)(partial, { force: true });
        throw new DownloadError("The download couldn't resume", true);
      }
      size ??= Number(/\/(\d+)$/.exec(range)?.[1]) || null;
    } else if (status === 200) {
      written = 0;
      size ??= Number(response.headers.get("content-length")) || null;
    } else if (status === 416) {
      await response.body?.cancel();
      (0, import_node_fs10.rmSync)(partial, { force: true });
      throw new DownloadError("The download couldn't resume", true);
    } else {
      await response.body?.cancel();
      throw new DownloadError(`${job.source} answered ${status}`, status === 429 || status >= 500);
    }
    if (!response.body) throw new DownloadError("The download had no body", true);
    let reported = 0;
    const report = (force) => {
      const now = Date.now();
      if (!force && now - reported < 200) return;
      reported = now;
      job.report(written, size ?? 0);
    };
    const count = new import_node_stream.Transform({
      transform(chunk, _encoding, done) {
        written += chunk.length;
        touch();
        report(false);
        done(null, chunk);
      }
    });
    const out = (0, import_node_fs10.createWriteStream)(partial, { flags: written > 0 ? "r+" : "w", start: written });
    try {
      await (0, import_promises4.pipeline)(import_node_stream.Readable.fromWeb(response.body), count, out, { signal });
    } finally {
      report(true);
    }
    if (size !== null ? written !== size : written <= 0) throw new DownloadError("The download stopped early", true);
  } catch (error) {
    if (idle.signal.aborted && !job.signal?.aborted) throw new DownloadError("The download stalled", true);
    throw error;
  } finally {
    clearTimeout(timer);
  }
}
async function get(url, from, signal) {
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const headers = { "accept-encoding": "identity" };
    if (from > 0) headers.range = `bytes=${from}-`;
    const response = await fetch(url, { headers, redirect: "manual", signal });
    if (response.status < 300 || response.status >= 400) return response;
    const location = response.headers.get("location");
    await response.body?.cancel();
    if (!location) throw new DownloadError(`The download redirected without a location (${response.status})`, false);
    url = new URL(location, url).toString();
  }
  throw new DownloadError("Too many redirects", false);
}
function sleep2(ms, signal) {
  return new Promise((resolve3, reject) => {
    if (signal?.aborted) return reject(signal.reason);
    const timer = setTimeout(resolve3, ms);
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(timer);
        reject(signal.reason);
      },
      { once: true }
    );
  });
}

// engine/f16.ts
var VECTOR_BYTES = DIMENSION * 2;
var f32 = new Float32Array(1);
var u32 = new Uint32Array(f32.buffer);
function floatToHalf(value) {
  f32[0] = value;
  const bits = u32[0];
  const sign = bits >>> 16 & 32768;
  const exponent = bits >>> 23 & 255;
  const mantissa = bits & 8388607;
  if (exponent === 255) return sign | 31744 | (mantissa === 0 ? 0 : 512 | mantissa >>> 13);
  const halfExponent = exponent - 127 + 15;
  if (halfExponent >= 31) return sign | 31744;
  if (halfExponent <= 0) {
    const shift = 126 - exponent;
    if (shift > 24) return sign;
    const full = mantissa | 8388608;
    let half2 = full >>> shift;
    const rest2 = full & (1 << shift) - 1;
    const midway = 1 << shift - 1;
    if (rest2 > midway || rest2 === midway && (half2 & 1) === 1) half2++;
    return sign | half2;
  }
  let half = halfExponent << 10 | mantissa >>> 13;
  const rest = mantissa & 8191;
  if (rest > 4096 || rest === 4096 && (half & 1) === 1) half++;
  return sign | half;
}
function halfToFloat(half) {
  const sign = half & 32768 ? -1 : 1;
  const exponent = half >>> 10 & 31;
  const mantissa = half & 1023;
  if (exponent === 0) return sign * mantissa * 2 ** -24;
  if (exponent === 31) return mantissa === 0 ? sign * Infinity : NaN;
  return sign * (1 + mantissa / 1024) * 2 ** (exponent - 15);
}
var HALF_TO_FLOAT = (() => {
  const table = new Float32Array(65536);
  for (let half = 0; half < 65536; half++) table[half] = halfToFloat(half);
  return table;
})();
function packHalves(vector) {
  const bytes = new Uint8Array(vector.length * 2);
  const view = new DataView(bytes.buffer);
  for (let i = 0; i < vector.length; i++) view.setUint16(i * 2, floatToHalf(vector[i]), true);
  return bytes;
}
function copyHalvesInto(matrix, row, blob) {
  const offset = matrix.byteOffset + row * VECTOR_BYTES;
  new Uint8Array(matrix.buffer, offset, VECTOR_BYTES).set(blob.subarray(0, VECTOR_BYTES));
}

// engine/store.ts
var import_node_fs11 = require("node:fs");
var import_node_os8 = require("node:os");
var import_node_path9 = require("node:path");
var import_node_sqlite = require("node:sqlite");
function fileNumber(value) {
  if (typeof value === "number") return value;
  const exact = Number(value);
  return BigInt(exact) === value ? exact : value;
}
var SCHEMA_VERSION = 5;
var TOKENIZER = "porter unicode61 remove_diacritics 2 categories 'L* N* Co M*'";
var FTS_COLUMNS = `name, body, original UNINDEXED, tokenize = "${TOKENIZER}"`;
var CREATE_SQL = `
CREATE TABLE meta(key TEXT PRIMARY KEY, value TEXT NOT NULL);
CREATE TABLE files(
    id INTEGER PRIMARY KEY,
    path TEXT NOT NULL UNIQUE,
    kind TEXT NOT NULL,
    size INTEGER NOT NULL,
    mtime REAL NOT NULL,
    inode INTEGER NOT NULL,
    device INTEGER NOT NULL,
    state TEXT NOT NULL DEFAULT 'pending',   -- pending | done | partial | skipped | failed
    detail TEXT,                              -- why skipped/failed, or how far a long file has been read
    info TEXT,                                -- JSON: pixels, pages, duration, date taken; read_to/read_end
    indexed_at REAL
);
CREATE INDEX files_inode ON files(device, inode);
CREATE INDEX files_state ON files(state, kind);
CREATE TABLE segments(
    id INTEGER PRIMARY KEY,
    file INTEGER NOT NULL REFERENCES files(id) ON DELETE CASCADE,
    kind TEXT NOT NULL,       -- SegmentKind
    modality TEXT NOT NULL,   -- Modality of the vector ('none' when there is no vector)
    loc REAL,                 -- PDF page number, or start second for audio/video
    loc_end REAL,
    excerpt TEXT,
    vec BLOB                  -- 768 \xD7 float16, L2-normalized
);
CREATE INDEX segments_file ON segments(file);
CREATE VIRTUAL TABLE fts USING fts5(${FTS_COLUMNS});
PRAGMA user_version = ${SCHEMA_VERSION};
`;
var FILE_COLUMNS = "id, path, kind, size, mtime, inode, device, state";
var SQLITE_BUSY = 5;
function sleepSync(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}
function isBusy(error) {
  const code = error.errcode;
  return typeof code === "number" && (code & 255) === SQLITE_BUSY;
}
var NON_ASCII5 = /[\u0080-￿]/;
var canonical3 = (path) => NON_ASCII5.test(path) ? path.normalize("NFC") : path;
function startsWith(path, prefix) {
  return hasPrefix(canonical3(path), canonical3(prefix));
}
function sameText(a, b) {
  return a === b || a.normalize("NFC") === b.normalize("NFC");
}
var num = (value) => value === null ? 0 : Number(value);
var str = (value) => value === null ? null : String(value);
function bindFileNumber(value) {
  return Number.isSafeInteger(value) ? value : BigInt.asIntN(64, BigInt(value));
}
var readFileNumber = (value) => typeof value === "bigint" ? fileNumber(value) : num(value);
function fileRecord(row) {
  return {
    id: num(row.id),
    path: str(row.path) ?? "",
    kind: str(row.kind) ?? "doc",
    size: num(row.size),
    mtime: num(row.mtime),
    inode: readFileNumber(row.inode),
    device: readFileNumber(row.device),
    state: str(row.state) ?? "pending"
  };
}
function synchronous(result) {
  if (typeof result?.then === "function") {
    throw new TypeError("a transaction's body can't be async: what it writes after an await would be outside it");
  }
  return result;
}
function parseInfo(json) {
  if (json === null) return {};
  try {
    const value = JSON.parse(json);
    if (typeof value !== "object" || value === null || Array.isArray(value)) return {};
    const entries = Object.entries(value);
    if (!entries.every(([, v]) => typeof v === "string")) return {};
    return Object.fromEntries(entries);
  } catch {
    return {};
  }
}
function infoJSON(info) {
  const keys = Object.keys(info).sort();
  if (keys.length === 0) return null;
  return JSON.stringify(Object.fromEntries(keys.map((key) => [key, info[key]])));
}
var Store = class _Store {
  constructor(file, code, home) {
    this.file = file;
    this.code = code;
    this.home = home;
    (0, import_node_fs11.mkdirSync)((0, import_node_path9.dirname)(file), { recursive: true });
    this.db = new import_node_sqlite.DatabaseSync(file);
    try {
      this.db.exec("PRAGMA busy_timeout = 5000");
      for (let tries = 0; ; tries++) {
        try {
          this.db.exec("PRAGMA journal_mode = WAL; PRAGMA synchronous = NORMAL; PRAGMA foreign_keys = ON;");
          break;
        } catch (error) {
          if (!isBusy(error) || tries >= 50) throw error;
          sleepSync(100);
        }
      }
      try {
        this.db.exec("CREATE VIRTUAL TABLE temp.fts5_probe USING fts5(a); DROP TABLE temp.fts5_probe;");
      } catch {
        throw new Error(
          `SQLite in Node ${process.version} has no full-text search (FTS5); Dig Up needs Raycast's Node 22.23 or newer`
        );
      }
      this.migrate();
    } catch (error) {
      this.db.close();
      throw error;
    }
  }
  file;
  code;
  home;
  db;
  statements = /* @__PURE__ */ new Map();
  /** Statements that read integers as bigints: the file rows, whose inode and device may pass 2^53. */
  fileStatements = /* @__PURE__ */ new Map();
  depth = 0;
  closed = false;
  scopeSQL = "";
  scopeValues = [];
  scopeFolders = null;
  /** Opens (and creates, when new) an index file; its folder is made if missing. */
  static open(file, o) {
    return new _Store(file, o.code, o.home ?? (0, import_node_os8.homedir)());
  }
  /** Bytes on disk: the database and its write-ahead log. */
  static size(file) {
    let total = 0;
    for (const path of [file, file + "-wal"]) {
      try {
        total += (0, import_node_fs11.statSync)(path).size;
      } catch {
      }
    }
    return total;
  }
  close() {
    if (this.closed) return;
    this.closed = true;
    this.statements.clear();
    this.fileStatements.clear();
    this.db.close();
  }
  // MARK: SQL
  /** A prepared statement, kept for the next call with the same SQL. */
  statement(sql) {
    return this.cached(this.statements, sql, false);
  }
  fileStatement(sql) {
    return this.cached(this.fileStatements, sql, true);
  }
  cached(cache, sql, readBigInts) {
    let statement = cache.get(sql);
    if (!statement) {
      if (cache.size >= 256) cache.clear();
      statement = this.db.prepare(sql);
      if (readBigInts) statement.setReadBigInts(true);
      cache.set(sql, statement);
    }
    return statement;
  }
  all(sql, ...values) {
    return this.statement(sql).all(...values);
  }
  get(sql, ...values) {
    return this.statement(sql).get(...values);
  }
  /** Rows one at a time, for queries that can return many. */
  iterate(sql, ...values) {
    return this.statement(sql).iterate(...values);
  }
  /** Runs a write; returns the new rowid. */
  run(sql, ...values) {
    return Number(this.statement(sql).run(...values).lastInsertRowid);
  }
  /** `BEGIN IMMEDIATE … COMMIT`, rolled back on a throw. A transaction inside another one joins it (DigUp never
   *  nests them; here `prune` and `resetAll` may run inside a caller's). The body is synchronous, as Swift's is: an
   *  async one is refused and what it wrote before its first `await` rolled back. */
  transaction(body) {
    if (this.depth > 0) {
      this.depth++;
      try {
        return synchronous(body());
      } finally {
        this.depth--;
      }
    }
    this.db.exec("BEGIN IMMEDIATE");
    this.depth = 1;
    try {
      const result = synchronous(body());
      this.db.exec("COMMIT");
      return result;
    } catch (error) {
      try {
        this.db.exec("ROLLBACK");
      } catch {
      }
      throw error;
    } finally {
      this.depth = 0;
    }
  }
  migrate() {
    const version = () => num(this.get("PRAGMA user_version")?.user_version ?? 0);
    const found = version();
    if (found > SCHEMA_VERSION) throw new Error(`this index was made by a newer Dig Up (schema ${found})`);
    if (found === SCHEMA_VERSION) return;
    this.db.exec("PRAGMA busy_timeout = 60000");
    try {
      this.transaction(() => {
        const now = version();
        if (now === 0) this.db.exec(CREATE_SQL);
        else if (now < SCHEMA_VERSION) throw new Error(`this index has an old schema (${now}) that Dig Up can't read`);
      });
    } finally {
      this.db.exec("PRAGMA busy_timeout = 5000");
    }
  }
  // MARK: Meta
  meta(key) {
    return str(this.get("SELECT value FROM meta WHERE key = ?", key)?.value ?? null);
  }
  setMeta(key, value) {
    if (value === null) {
      this.run("DELETE FROM meta WHERE key = ?", key);
    } else {
      this.run(
        "INSERT INTO meta(key, value) VALUES(?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
        key,
        value
      );
    }
  }
  /** "<vector source> | <options fingerprint>" of the model and settings the vectors came from. */
  fingerprint() {
    return this.meta("fingerprint");
  }
  /** Which model made the vectors: meaning search needs the query encoder to be the same. */
  vectorSource() {
    return this.meta("vector_source");
  }
  /** Records the model and settings of the vectors to come (when the first embedder starts). */
  setModel(fingerprint, vectorSource) {
    this.setMeta("fingerprint", fingerprint);
    this.setMeta("vector_source", vectorSource);
  }
  // MARK: Scope
  /** When set, `pending`, `pendingCount`, `unfinished` and `counts` see only files under these folders: the folders
   *  connected right now, so files on an unplugged drive neither fail nor count as waiting. */
  get scope() {
    return this.scopeFolders;
  }
  set scope(folders) {
    this.scopeFolders = folders === null ? null : [...folders];
    if (folders === null) {
      this.scopeSQL = "";
      this.scopeValues = [];
      return;
    }
    const ranges = folders.flatMap(_Store.pathRanges);
    this.scopeSQL = ranges.length === 0 ? " AND 0" : " AND (" + ranges.map(() => "(path >= ? AND path < ?)").join(" OR ") + ")";
    this.scopeValues = ranges.flatMap((range) => [range.from, range.to]);
  }
  /**
   * The ranges of the UNIQUE path index that hold the files under `folder`. Paths are stored as a walk reports them,
   * which isn't always how the folder is spelled (/var for /private/var, a decomposed name the disk keeps
   * precomposed); SQLite compares bytes. So: a range for the folder as given, and one for its real path when that's
   * spelled differently.
   */
  static pathRanges(folder) {
    const spellings3 = [folder];
    const real = FolderSelection.realPath(folder);
    if (real !== folder) spellings3.push(real);
    return spellings3.map((path) => {
      const prefix = path.endsWith("/") ? path : path + "/";
      return { from: prefix, to: prefix + "\u{10FFFF}" };
    });
  }
  // MARK: Files
  /** Every file under one of `roots`, each once. */
  files(under) {
    const out = [];
    const seen = /* @__PURE__ */ new Set();
    const inRange = this.fileStatement(`SELECT ${FILE_COLUMNS} FROM files WHERE path >= ? AND path < ?`);
    for (const root of under) {
      if (under.some((other) => FolderSelection.isInside(root, other))) continue;
      for (const range of _Store.pathRanges(root)) {
        for (const row of inRange.iterate(range.from, range.to)) {
          const record = fileRecord(row);
          if (seen.has(record.id)) continue;
          seen.add(record.id);
          out.push(record);
        }
      }
    }
    return out;
  }
  /** The file at `path`, if the index has it. */
  fileAt(path) {
    const row = this.fileStatement(`SELECT ${FILE_COLUMNS} FROM files WHERE path = ?`).get(path);
    return row ? fileRecord(row) : null;
  }
  /** Files by state and kind, by path, for lists of what was skipped or failed (`POST /files`; DigUp has no such
   *  list). Only files in `scope`, as `counts` counts them. An empty `states` or `kinds` matches nothing. */
  list(o = {}) {
    let filter = "";
    const values = [];
    for (const [column, wanted] of [
      ["state", o.states],
      ["kind", o.kinds]
    ]) {
      if (wanted == null) continue;
      filter += ` AND ${column} IN (${wanted.map(() => "?").join(", ")})`;
      values.push(...wanted);
    }
    return this.all(
      `SELECT path, kind, state, detail FROM files WHERE 1${filter}${this.scopeSQL} ORDER BY path LIMIT ?`,
      ...values,
      ...this.scopeValues,
      o.limit ?? -1
    ).map((row) => ({
      path: str(row.path) ?? "",
      kind: str(row.kind) ?? "doc",
      state: str(row.state) ?? "pending",
      detail: str(row.detail)
    }));
  }
  /** Adds a file (pending), with its name in keyword search, and returns its id. */
  insert(file) {
    const id = this.run(
      "INSERT INTO files(path, kind, size, mtime, inode, device) VALUES(?, ?, ?, ?, ?, ?)",
      file.path,
      file.kind,
      file.size,
      file.mtime,
      bindFileNumber(file.inode),
      bindFileNumber(file.device)
    );
    this.addNameRow(id, file.path);
    return id;
  }
  /** Drops what was extracted from a file and queues it again: changed on disk (`as` its new facts), or to be read
   *  again as it is. */
  requeue(id, as) {
    this.deleteSegments(id, true);
    if (as) {
      this.run(
        "UPDATE files SET kind = ?, size = ?, mtime = ?, inode = ?, device = ?, state = 'pending', detail = NULL, info = NULL, indexed_at = NULL WHERE id = ?",
        as.kind,
        as.size,
        as.mtime,
        bindFileNumber(as.inode),
        bindFileNumber(as.device),
        id
      );
    } else {
      this.run("UPDATE files SET state = 'pending', detail = NULL, info = NULL, indexed_at = NULL WHERE id = ?", id);
    }
  }
  /** Same inode, size and date at a new path: a move or rename. Only the path changes; nothing is embedded again. */
  move(id, path) {
    this.run("UPDATE files SET path = ? WHERE id = ?", path, id);
    this.run(
      "UPDATE fts SET name = ?, body = ? WHERE rowid IN (SELECT id FROM segments WHERE file = ? AND kind = 'name')",
      normalized(_Store.nameText(path)),
      normalized(_Store.folderText(path, this.home)),
      id
    );
  }
  /** Removes a file: its keyword rows first (nothing links them to segments), then the file and its segments. */
  delete(id) {
    this.run("DELETE FROM fts WHERE rowid IN (SELECT id FROM segments WHERE file = ?)", id);
    this.run("DELETE FROM files WHERE id = ?", id);
  }
  /** Removes every file that isn't under one of `roots` (folders taken out). Returns how many went. */
  prune(keepingUnder) {
    const prefixes = keepingUnder.flatMap((root) => _Store.pathRanges(root).map((range) => range.from));
    const gone = [];
    for (const row of this.iterate("SELECT id, path FROM files")) {
      const path = str(row.path) ?? "";
      if (!prefixes.some((prefix) => startsWith(path, prefix))) gone.push(num(row.id));
    }
    if (gone.length === 0) return 0;
    this.transaction(() => {
      for (const id of gone) this.delete(id);
    });
    return gone.length;
  }
  /** Queues every file again and forgets the fingerprint (the model or settings changed). Files and their names
   *  stay, so search by name keeps working. */
  resetAll() {
    this.transaction(() => {
      this.run("DELETE FROM fts WHERE rowid IN (SELECT id FROM segments WHERE kind != 'name')");
      this.run("DELETE FROM segments WHERE kind != 'name'");
      this.run("UPDATE files SET state = 'pending', detail = NULL, info = NULL, indexed_at = NULL");
      this.setMeta("fingerprint", null);
    });
  }
  /** Files waiting to be embedded, in indexing order (screenshots first, newest first); `onlyIds` narrows it to
   *  some files (just-added ones). */
  pending(limit = null, onlyIds = null) {
    let filter = "";
    if (onlyIds !== null) {
      const ids = [...onlyIds].map((id) => Math.trunc(id));
      if (ids.length === 0) return [];
      filter = ` AND id IN (${ids.join(",")})`;
    }
    const sql = `SELECT ${FILE_COLUMNS} FROM files WHERE state = 'pending'${filter}${this.scopeSQL} ORDER BY ${INDEXING_ORDER_SQL}, mtime DESC LIMIT ?`;
    const statement = filter === "" ? this.fileStatement(sql) : this.db.prepare(sql);
    if (filter !== "") statement.setReadBigInts(true);
    return statement.all(...this.scopeValues, limit ?? -1).map(fileRecord);
  }
  pendingCount() {
    return num(
      this.get(`SELECT COUNT(*) AS n FROM files WHERE state = 'pending'${this.scopeSQL}`, ...this.scopeValues)?.n ?? 0
    );
  }
  /** Long files with pages or chunks still to read after their first step, in indexing order. */
  unfinished() {
    return this.fileStatement(
      `SELECT ${FILE_COLUMNS} FROM files WHERE state = 'partial'${this.scopeSQL} ORDER BY ${INDEXING_ORDER_SQL}, mtime DESC`
    ).all(...this.scopeValues).map(fileRecord);
  }
  /** How many long files are unfinished, and how many of their pages and chunks are left to read. */
  unfinishedCount() {
    const row = this.get(
      `SELECT COUNT(*) AS files, SUM(MAX(0, CAST(json_extract(info, '$.read_end') AS INTEGER) - CAST(json_extract(info, '$.read_to') AS INTEGER))) AS left FROM files WHERE state = 'partial'${this.scopeSQL}`,
      ...this.scopeValues
    );
    return { files: num(row?.files ?? 0), left: num(row?.left ?? 0) };
  }
  /** What indexing learned about a file (all values are strings). */
  info(id) {
    return parseInfo(str(this.get("SELECT info FROM files WHERE id = ?", id)?.info ?? null));
  }
  /** Replaces a file's info only. */
  setInfo(id, info) {
    this.run("UPDATE files SET info = ? WHERE id = ?", infoJSON(info), id);
  }
  /** A file's outcome: its state, why (or how far a long file got), what was learned, and when (DigUp: finish). */
  finish(id, state, detail = null, info = {}) {
    this.run(
      "UPDATE files SET state = ?, detail = ?, info = ?, indexed_at = ? WHERE id = ?",
      state,
      detail,
      infoJSON(info),
      Date.now() / 1e3,
      id
    );
  }
  /** `finish` by another name. */
  setState(id, state, detail = null, info = {}) {
    this.finish(id, state, detail, info);
  }
  /** A file the helper had to stop on (reading it ran away): it isn't read again until it changes. A long file that
   *  was being finished keeps what was read of it. False when no file has that path. */
  markStopped(path, why) {
    const row = this.get("SELECT id, state FROM files WHERE path = ?", path);
    if (!row) return false;
    if (str(row.state) === "partial") this.finish(num(row.id), "done", `The rest couldn't be read: it ${why}`);
    else this.finish(num(row.id), "failed", `It ${why}`);
    return true;
  }
  /**
   * Files read once more because they're read better now, each kind once per index: PDFs with pages read as pictures
   * (`ocr`: their words come from OCR now; meta "scans_ocr") and pictures skipped as unreadable (`drawsVectorPictures`:
   * SVGs are drawn now; meta "pictures_drawn"). Returns how many files.
   */
  readAgainOnce(o) {
    const files = /* @__PURE__ */ new Set();
    const flags = [];
    if (o.ocr && this.meta("scans_ocr") === null) {
      for (const row of this.iterate("SELECT DISTINCT file FROM segments WHERE kind = 'page_image'"))
        files.add(num(row.file));
      flags.push("scans_ocr");
    }
    if (o.drawsVectorPictures && this.meta("pictures_drawn") === null) {
      const skipped = "SELECT id FROM files WHERE kind = 'image' AND state = 'skipped' AND detail = ?";
      for (const row of this.iterate(skipped, "small image 0\xD70")) files.add(num(row.id));
      flags.push("pictures_drawn");
    }
    if (flags.length === 0) return 0;
    this.transaction(() => {
      for (const file of files) this.requeue(file);
      for (const flag of flags) this.setMeta(flag, "1");
    });
    return files.size;
  }
  // MARK: Segments
  /** Adds a segment and returns its id: `text` goes into keyword search (normalized), `vector` into meaning search. */
  addSegment(segment) {
    const vector = segment.vector ?? null;
    const id = this.run(
      "INSERT INTO segments(file, kind, modality, loc, loc_end, excerpt, vec) VALUES(?, ?, ?, ?, ?, ?, ?)",
      segment.file,
      segment.kind,
      vector === null ? "none" : segment.modality,
      segment.loc ?? null,
      segment.locEnd ?? null,
      segment.excerpt ?? null,
      vector === null ? null : packHalves(vector)
    );
    const text = segment.text ?? "";
    if (text !== "") {
      const [body, original] = _Store.keywordText(text);
      this.run("INSERT INTO fts(rowid, name, body, original) VALUES(?, '', ?, ?)", id, body, original);
    }
    return id;
  }
  /** The last page or chunk stored for a file (where a long file's reading got to, when its info doesn't say). */
  lastPlace(id) {
    const row = this.get(
      "SELECT MAX(loc) AS last FROM segments WHERE file = ? AND kind IN ('page', 'page_image', 'chunk')",
      id
    );
    return row?.last == null ? null : Math.trunc(num(row.last));
  }
  /** `body` and `original` for keyword search: the normalized text, and the text as written if that differs (as
   *  Swift compares: decomposed text that normalizing only composed is the same text). */
  static keywordText(text) {
    const body = normalized(text);
    return [body, sameText(body, text) ? null : text];
  }
  addNameRow(file, path) {
    const id = this.run("INSERT INTO segments(file, kind, modality) VALUES(?, 'name', 'none')", file);
    this.run(
      "INSERT INTO fts(rowid, name, body) VALUES(?, ?, ?)",
      id,
      normalized(_Store.nameText(path)),
      normalized(_Store.folderText(path, this.home))
    );
  }
  deleteSegments(file, keepingName) {
    const filter = keepingName ? "AND kind != 'name'" : "";
    this.run(`DELETE FROM fts WHERE rowid IN (SELECT id FROM segments WHERE file = ? ${filter})`, file);
    this.run(`DELETE FROM segments WHERE file = ? ${filter}`, file);
  }
  /** "Screenshot 2026-10-01 at 9.41.07 PM.png" → its searchable words. */
  static nameText(path) {
    return lastPathComponent(path);
  }
  /** The folders a file sits in, relative to the home folder ("Downloads Invoices"), as low-weight keywords. */
  static folderText(path, home = (0, import_node_os8.homedir)()) {
    let folder = parentPath(path);
    if (startsWith(folder, home)) folder = folder.slice(new Graphemes(folder).start(graphemeCount(home)));
    return folder.split("/").filter((part) => part !== "").join(" ");
  }
  // MARK: Stats
  counts() {
    const byKindAndState = {};
    for (const row2 of this.all(
      `SELECT kind, state, COUNT(*) AS n FROM files WHERE 1${this.scopeSQL} GROUP BY kind, state`,
      ...this.scopeValues
    )) {
      const kind = str(row2.kind) ?? "?";
      (byKindAndState[kind] ??= {})[str(row2.state) ?? "?"] = num(row2.n);
    }
    const { files: unfinished, left } = this.unfinishedCount();
    const inScope = this.scopeFolders === null ? "" : ` AND file IN (SELECT id FROM files WHERE 1${this.scopeSQL})`;
    const row = this.get(
      `SELECT COUNT(*) AS segments, COUNT(vec) AS vectors FROM segments WHERE kind != 'name'${inScope}`,
      ...this.scopeValues
    );
    return { byKindAndState, vectors: num(row?.vectors ?? 0), segments: num(row?.segments ?? 0), unfinished, left };
  }
};

// engine/searcher.ts
var SEGMENT_KINDS = /* @__PURE__ */ new Set([
  "name",
  "image",
  "ocr",
  "page",
  "page_image",
  "chunk",
  "audio",
  "frame",
  "lines",
  "cells"
]);
var KIND_NAMES = /* @__PURE__ */ new Set(["screenshot", "image", "pdf", "doc", "audio", "video", "code"]);
var MODALITY_INDEX = new Map(MODALITIES.map((modality, index2) => [modality, index2]));
var BLOCK_ROWS = 1024;
var STOPWORDS = /* @__PURE__ */ new Set([
  "a",
  "an",
  "the",
  "of",
  "in",
  "on",
  "at",
  "to",
  "for",
  "with",
  "and",
  "or",
  "my",
  "me",
  "that",
  "this",
  "these",
  "those",
  "from",
  "about",
  "where",
  "what",
  "which",
  "who",
  "when",
  "is",
  "was",
  "are",
  "were",
  "be",
  "it",
  "its",
  "some",
  "any",
  "find",
  "show",
  "file",
  "files",
  "photo",
  "photos",
  "picture",
  "image",
  "images",
  "screenshot",
  "screenshots",
  "video",
  "videos",
  "pdf",
  "document",
  "documents",
  "recording",
  // Bengali and Arabic (normalized, as `terms` sees them)
  "\u098F\u09AC\u0982",
  "\u0993",
  "\u098F\u0987",
  "\u09B8\u09C7\u0987",
  "\u098F\u0995\u099F\u09BF",
  "\u0986\u09AE\u09BE\u09B0",
  "\u09A5\u09C7\u0995\u09C7",
  "\u099C\u09A8\u09CD\u09AF",
  "\u09B8\u09BE\u09A5\u09C7",
  "\u09AE\u09A7\u09CD\u09AF\u09C7",
  "\u0995\u09CB\u09A5\u09BE\u09AF\u09BC",
  "\u0995\u09CB\u09A8",
  "\u0995\u09C0",
  "\u0995\u09BF",
  "\u09AF\u09C7",
  "\u099B\u09AC\u09BF",
  "\u09B8\u09CD\u0995\u09CD\u09B0\u09BF\u09A8\u09B6\u099F",
  "\u09AD\u09BF\u09A1\u09BF\u0993",
  "\u09AB\u09BE\u0987\u09B2",
  "\u09AA\u09BF\u09A1\u09BF\u098F\u09AB",
  "\u0641\u064A",
  "\u0645\u0646",
  "\u0639\u0644\u0649",
  "\u0627\u0644\u0649",
  "\u0639\u0646",
  "\u0645\u0639",
  "\u0647\u0630\u0627",
  "\u0647\u0630\u0647",
  "\u0630\u0644\u0643",
  "\u0627\u0644\u062A\u064A",
  "\u0627\u0644\u0630\u064A",
  "\u0627\u064A\u0646",
  "\u0645\u0627",
  "\u0635\u0648\u0631\u0629",
  "\u0635\u0648\u0631",
  "\u0644\u0642\u0637\u0629",
  "\u0634\u0627\u0634\u0629",
  "\u0641\u064A\u062F\u064A\u0648",
  "\u0645\u0644\u0641",
  "\u0645\u0633\u062A\u0646\u062F"
]);
var KIND_WORDS = /* @__PURE__ */ new Map([
  ["screenshot", "screenshot"],
  ["screenshots", "screenshot"],
  ["photo", "image"],
  ["photos", "image"],
  ["picture", "image"],
  ["pictures", "image"],
  ["image", "image"],
  ["images", "image"],
  ["pdf", "pdf"],
  ["pdfs", "pdf"],
  ["paper", "pdf"],
  ["papers", "pdf"],
  ["document", "doc"],
  ["documents", "doc"],
  ["note", "doc"],
  ["notes", "doc"],
  ["video", "video"],
  ["videos", "video"],
  ["clip", "video"],
  ["movie", "video"],
  ["audio", "audio"],
  ["song", "audio"],
  ["podcast", "audio"],
  ["voice", "audio"],
  ["sound", "audio"],
  ["\u09B8\u09CD\u0995\u09CD\u09B0\u09BF\u09A8\u09B6\u099F", "screenshot"],
  ["\u099B\u09AC\u09BF", "image"],
  ["\u09AA\u09BF\u09A1\u09BF\u098F\u09AB", "pdf"],
  ["\u09A8\u09CB\u099F", "doc"],
  ["\u09AD\u09BF\u09A1\u09BF\u0993", "video"],
  ["\u0985\u09A1\u09BF\u0993", "audio"],
  ["\u0997\u09BE\u09A8", "audio"],
  ["\u09B0\u09C7\u0995\u09B0\u09CD\u09A1\u09BF\u0982", "audio"],
  ["\u0644\u0642\u0637\u0629", "screenshot"],
  ["\u0635\u0648\u0631\u0629", "image"],
  ["\u0635\u0648\u0631", "image"],
  ["\u0645\u0633\u062A\u0646\u062F", "doc"],
  ["\u0645\u0644\u0627\u062D\u0638\u0627\u062A", "doc"],
  ["\u0641\u064A\u062F\u064A\u0648", "video"],
  ["\u0645\u0642\u0637\u0639", "video"],
  ["\u0635\u0648\u062A", "audio"],
  ["\u062A\u0633\u062C\u064A\u0644", "audio"],
  ["\u0627\u063A\u0646\u064A\u0629", "audio"]
]);
var NOT_ALPHANUMERIC = /[^\p{L}\p{M}\p{N}]+/u;
var num2 = (value) => value == null ? 0 : Number(value);
var str2 = (value) => value == null ? null : String(value);
var Searcher = class _Searcher {
  /** With `loadVectors: false` only keyword search is ready; vectors load on the first meaning search. */
  constructor(store, o = {}) {
    this.store = store;
    this.isCode = o.code ?? store.code;
    if (o.loadVectors ?? true) this.reload();
    else this.reloadFiles();
  }
  store;
  /** How much finding the query's words counts against meaning. Code's words count for less: they're everywhere in
   *  code, and a stretch that shares a few of them beat the one that does what the query says (DigUp, 2026-10-09). */
  static wordWeight = 2;
  static codeWordWeight = 1;
  isCode;
  /** The index's `vector_source` when files were last read: meaning search needs the encoder to match it. */
  vectorSource = null;
  // The rows read so far. The vectors are kept in chunks (row-major halves, a multiple of BLOCK_ROWS rows each), so
  // rows appended later get a chunk of their own and nothing already read is copied; the per-row arrays are views of
  // `rows` length over buffers that may hold more.
  chunks = [];
  rowFile = new Float64Array(0);
  rowSegment = new Float64Array(0);
  rowModality = new Uint8Array(0);
  // index into MODALITIES
  /** False for the vectors the later pass adds: scored, but they don't set the scale. */
  rowSetsScale = new Uint8Array(0);
  rows = 0;
  capacity = 0;
  buffers = null;
  /** The highest segment id read: `appendNew` reads past it. */
  lastId = 0;
  fileKind = /* @__PURE__ */ new Map();
  loaded = false;
  /** False after `release()`: keyword search still works, and the next search with a query vector loads them. */
  get vectorsLoaded() {
    return this.loaded;
  }
  get vectorCount() {
    return this.rows;
  }
  /** Reads the files and all vectors again (after a sync removed some, or to start fresh). */
  reload() {
    this.release();
    this.reloadFiles();
    this.loaded = true;
    this.readRows();
  }
  /**
   * Reads only the vectors added since the last read: between syncs, indexing adds rows and removes none, so a pass
   * can show its new vectors without reading the hundreds of thousands it already has. Rows removed since (a sync, a
   * prune) need `reload`. Nothing happens while the vectors aren't loaded.
   */
  appendNew() {
    return this.loaded ? this.readRows() : 0;
  }
  /** Reads the vectors with ids past `lastId`. */
  readRows() {
    const after = this.lastId;
    const count = num2(this.store.get("SELECT COUNT(*) AS n FROM segments WHERE vec IS NOT NULL AND id > ?", after)?.n);
    if (count === 0) return 0;
    this.reserve(this.rows + count);
    const buffers = this.buffers;
    const end = this.rows + count;
    let rows = this.rows;
    let chunk = this.chunks.findIndex((c) => rows < c.start + c.rows);
    const sql = "SELECT s.id, s.file, s.modality, s.vec, s.kind, s.loc, f.kind AS file_kind, CAST(json_extract(f.info, '$.pages') AS INTEGER) AS pages FROM segments s JOIN files f ON f.id = s.file WHERE s.vec IS NOT NULL AND s.id > ? ORDER BY s.id";
    for (const row of this.store.iterate(sql, after)) {
      const blob = row.vec;
      this.lastId = Math.max(this.lastId, num2(row.id));
      if (!(blob instanceof Uint8Array) || blob.byteLength !== VECTOR_BYTES || rows >= end) continue;
      if (rows >= this.chunks[chunk].start + this.chunks[chunk].rows) chunk++;
      copyHalvesInto(this.chunks[chunk].halves, rows - this.chunks[chunk].start, blob);
      buffers.segment[rows] = num2(row.id);
      buffers.file[rows] = num2(row.file);
      buffers.modality[rows] = MODALITY_INDEX.get(str2(row.modality) ?? "") ?? 0;
      const kind = str2(row.kind);
      const place2 = Math.trunc(num2(row.loc));
      const later = str2(row.file_kind) === "pdf" ? kind !== "chunk" && num2(row.pages) > DEFAULT_OPTIONS.bigPDFPages && place2 > DEFAULT_OPTIONS.pdfStep : kind === "chunk" && place2 > DEFAULT_OPTIONS.docStep;
      buffers.setsScale[rows] = later ? 0 : 1;
      rows++;
    }
    const added = rows - this.rows;
    this.rows = rows;
    this.rowFile = buffers.file.subarray(0, rows);
    this.rowSegment = buffers.segment.subarray(0, rows);
    this.rowModality = buffers.modality.subarray(0, rows);
    this.rowSetsScale = buffers.setsScale.subarray(0, rows);
    return added;
  }
  /** Room for `wanted` rows: a fresh read gets what it needs; appended rows a new chunk of at least an eighth of what's
   *  there, so a pass adding a few vectors at a time doesn't allocate each time. */
  reserve(wanted) {
    if (wanted <= this.capacity) return;
    const fresh = this.rows === 0;
    const blocks = (rows) => Math.ceil(rows / BLOCK_ROWS) * BLOCK_ROWS;
    const more = blocks(fresh ? wanted - this.capacity : Math.max(wanted - this.capacity, this.capacity / 8));
    this.chunks.push({ start: this.capacity, rows: more, halves: new Uint16Array(more * DIMENSION) });
    const capacity = this.capacity + more;
    const old = this.buffers;
    const grown = {
      file: new Float64Array(capacity),
      segment: new Float64Array(capacity),
      modality: new Uint8Array(capacity),
      setsScale: new Uint8Array(capacity)
    };
    if (old) {
      grown.file.set(old.file.subarray(0, this.rows));
      grown.segment.set(old.segment.subarray(0, this.rows));
      grown.modality.set(old.modality.subarray(0, this.rows));
      grown.setsScale.set(old.setsScale.subarray(0, this.rows));
    }
    this.buffers = grown;
    this.capacity = capacity;
  }
  /** Frees the vectors' memory; keyword search keeps working. */
  release() {
    this.chunks = [];
    this.buffers = null;
    this.capacity = 0;
    this.lastId = 0;
    this.rowFile = new Float64Array(0);
    this.rowSegment = new Float64Array(0);
    this.rowModality = new Uint8Array(0);
    this.rowSetsScale = new Uint8Array(0);
    this.rows = 0;
    this.loaded = false;
  }
  /** Reads the files' kinds and the vector source again, without the vectors. */
  reloadFiles() {
    this.fileKind.clear();
    for (const row of this.store.iterate("SELECT id, kind FROM files")) {
      const kind = str2(row.kind) ?? "";
      if (KIND_NAMES.has(kind)) this.fileKind.set(num2(row.id), kind);
    }
    this.vectorSource = this.store.vectorSource();
  }
  search(text, queryVector, o = {}) {
    const limit = o.limit ?? 20;
    const zGate = o.zGate ?? 2;
    const wordWeight = o.wordWeight ?? (this.isCode ? _Searcher.codeWordWeight : _Searcher.wordWeight);
    if (queryVector !== null && !this.loaded) this.reload();
    const kinds = o.kinds ? new Set(o.kinds) : null;
    const fileKind = this.fileKind;
    const allowed = (file) => {
      if (kinds === null) return true;
      const kind = fileKind.get(file);
      return kind !== void 0 && kinds.has(kind);
    };
    const best = /* @__PURE__ */ new Map();
    if (queryVector !== null && queryVector.length === DIMENSION && this.rows > 0) {
      const scores = this.score(Float32Array.from(queryVector));
      const z = _Searcher.meaning(scores, this.modalities(), this.rowSetsScale);
      for (let row = 0; row < scores.length; row++) {
        const file = this.rowFile[row];
        if (!allowed(file)) continue;
        if (z[row] > (best.get(file)?.z ?? -Infinity)) best.set(file, { z: z[row], cosine: scores[row], row });
      }
    }
    const terms = _Searcher.terms(text);
    const identifier2 = this.isCode ? CodeLookup.identifier(text) : null;
    const words2 = [];
    const coverage = /* @__PURE__ */ new Map();
    const patterns = identifier2 ? [CodeLookup.phrase(identifier2)] : _Searcher.patterns(terms, o.prefixLast ?? false);
    if (identifier2 === null) {
      for (let index2 = 0; index2 < terms.length; index2++) {
        if (graphemeCount(terms[index2]) >= 3 && !patterns[index2].endsWith("*") && !this.isIndexed(patterns[index2])) {
          patterns[index2] += "*";
        }
      }
    }
    if (patterns.length > 0) {
      const seen = /* @__PURE__ */ new Set();
      const sql = "SELECT s.file, s.id, snippet(fts, 1, '\xAB', '\xBB', '\u2026', 12) AS snippet, fts.original FROM fts JOIN segments s ON s.id = fts.rowid WHERE fts MATCH ? ORDER BY bm25(fts, 3.0, 1.0) LIMIT 1000";
      for (const row of this.store.iterate(sql, patterns.join(" OR "))) {
        if (words2.length >= 100) break;
        const file = num2(row.file);
        if (!allowed(file) || seen.has(file)) continue;
        seen.add(file);
        const original = str2(row.original);
        const fromOriginal = original === null ? null : snippet(original, terms);
        words2.push({ file, segment: num2(row.id), snippet: fromOriginal ?? str2(row.snippet) });
      }
      if (words2.length > 0) {
        const files = words2.map((match) => match.file).join(",");
        const sql2 = `SELECT DISTINCT s.file FROM fts JOIN segments s ON s.id = fts.rowid WHERE fts MATCH ? AND s.file IN (${files})`;
        const statement = this.store.db.prepare(sql2);
        for (const pattern of patterns) {
          for (const row of statement.all(pattern)) {
            const file = num2(row.file);
            coverage.set(file, (coverage.get(file) ?? 0) + 1 / patterns.length);
          }
        }
      }
    }
    const lookup = _Searcher.isLookup(terms) || identifier2 !== null;
    const [meaningWeight, wordsWeight] = lookup ? [0.5, wordWeight * 2] : [1, wordWeight];
    const hinted = _Searcher.kindHints(text);
    const candidates = /* @__PURE__ */ new Set();
    for (const [file, meaning] of best) if (meaning.z >= zGate) candidates.add(file);
    for (const [file, share] of coverage) if (share >= 0.5) candidates.add(file);
    const scored = [];
    for (const file of candidates) {
      let score = meaningWeight * Math.max(best.get(file)?.z ?? 0, 0) + wordsWeight * (coverage.get(file) ?? 0) ** 1.5;
      const kind = fileKind.get(file);
      if (kind !== void 0 && hinted.has(kind)) score += 1;
      scored.push({ file, score });
    }
    scored.sort((a, b) => b.score - a.score || a.file - b.file);
    const wordRank = /* @__PURE__ */ new Map();
    words2.forEach((match, index2) => {
      if (!wordRank.has(match.file)) wordRank.set(match.file, { rank: index2 + 1, match });
    });
    const hits = [];
    for (const { file, score } of scored.slice(0, limit)) {
      const rank = hits.length;
      const semantic = best.get(file);
      const keyword = wordRank.get(file);
      const useMeaning = semantic !== void 0 && (semantic.z >= zGate || keyword === void 0);
      let segmentId = useMeaning ? this.rowSegment[semantic.row] : keyword?.match.segment;
      if (segmentId === void 0) continue;
      let focus = null;
      if (this.isCode) {
        [segmentId, focus] = this.codePlace(
          file,
          segmentId,
          rank < 10 ? identifier2 : null,
          text,
          terms,
          keyword?.match.segment === segmentId || identifier2 !== null
        );
      }
      const fileRow = this.store.get("SELECT path, kind, mtime, size, info FROM files WHERE id = ?", file);
      const segmentRow = this.store.get("SELECT kind, loc, loc_end, excerpt FROM segments WHERE id = ?", segmentId);
      const fileKindName = str2(fileRow?.kind) ?? "";
      const segmentKind = str2(segmentRow?.kind) ?? "";
      const loc = segmentRow?.loc == null ? null : num2(segmentRow.loc);
      const locEnd = segmentRow?.loc_end == null ? null : num2(segmentRow.loc_end);
      const storedExcerpt = str2(segmentRow?.excerpt);
      const sameSegment = keyword?.match.segment === segmentId ? keyword.match.snippet : null;
      let quoted = sameSegment?.includes("\xAB") ? excerpt(sameSegment, 400) : null;
      const borrowed = keyword?.match.snippet;
      if (quoted === null && storedExcerpt === null && loc === null && borrowed?.includes("\xAB")) {
        const matchedKind = str2(this.store.get("SELECT kind FROM segments WHERE id = ?", keyword.match.segment)?.kind);
        if (matchedKind !== "name") quoted = excerpt(borrowed, 400);
      }
      hits.push({
        path: str2(fileRow?.path) ?? "",
        kind: KIND_NAMES.has(fileKindName) ? fileKindName : "doc",
        score,
        z: semantic?.z ?? null,
        cosine: semantic?.cosine ?? null,
        keywordRank: keyword?.rank ?? null,
        segment: SEGMENT_KINDS.has(segmentKind) ? segmentKind : "name",
        segmentId,
        loc,
        locEnd,
        excerpt: quoted ?? storedExcerpt,
        modified: num2(fileRow?.mtime),
        size: num2(fileRow?.size),
        info: parseInfo(str2(fileRow?.info)),
        focus
      });
    }
    return hits;
  }
  /**
   * Code: the stretch to point at, and the line in it to open at. A name looked up points at the stretch that defines
   * it, when one does (not the ones that call it). Otherwise the line is the first with the query's words, when they
   * matched in this stretch; a match by meaning alone opens at the stretch's first line.
   */
  codePlace(file, segment, identifier2, query, terms, wordsHere) {
    const name = trimWhitespaceAndNewlines(query).replaceAll("()", "");
    if (identifier2 !== null) {
      let best = null;
      const sql = "SELECT s.id, s.loc, coalesce(fts.original, fts.body) AS text FROM fts JOIN segments s ON s.id = fts.rowid WHERE fts MATCH ? AND s.file = ? ORDER BY s.loc LIMIT 300";
      for (const row2 of this.store.iterate(sql, CodeLookup.phrase(identifier2), file)) {
        const text2 = str2(row2.text);
        if (text2 === null) continue;
        const found = CodeLookup.definition(name, text2, Math.trunc(num2(row2.loc)));
        if (found && found.strength > (best?.strength ?? 0))
          best = { segment: num2(row2.id), line: found.line, strength: found.strength };
        if (best?.strength === 2) break;
      }
      if (best) return [best.segment, best.line];
    }
    if (!wordsHere && identifier2 === null) return [segment, null];
    const text = this.segmentText(segment);
    if (text === null) return [segment, null];
    const row = this.store.get("SELECT loc FROM segments WHERE id = ?", segment);
    const first = row ? Math.trunc(num2(row.loc)) : 1;
    const wanted = identifier2 === null ? terms : [lowercased(name)];
    return [segment, CodeLookup.firstLine(wanted, text, first)];
  }
  /** The text of a page, a passage, a stretch of code or a screenshot's OCR, as it's written (for previews). */
  segmentText(id) {
    return str2(this.store.get("SELECT coalesce(original, body) AS text FROM fts WHERE rowid = ?", id)?.text);
  }
  /** Whether keyword search finds `pattern` in any file. */
  isIndexed(pattern) {
    return this.store.get("SELECT 1 AS found FROM fts WHERE fts MATCH ? LIMIT 1", pattern) !== void 0;
  }
  modalities() {
    return Array.from(this.rowModality, (index2) => MODALITIES[index2]);
  }
  /** Cosine similarity of `query` with every stored vector (all are L2-normalized): a block of rows at a time,
   *  turned into float32 first. */
  score(query) {
    const rows = this.rows;
    const scores = new Float32Array(rows);
    if (rows === 0) return scores;
    const table = HALF_TO_FLOAT;
    const dimension = DIMENSION;
    const block = new Float32Array(Math.min(BLOCK_ROWS, rows) * dimension);
    for (const chunk of this.chunks) {
      const halves = chunk.halves;
      const chunkRows = Math.min(chunk.rows, rows - chunk.start);
      for (let start = 0; start < chunkRows; start += BLOCK_ROWS) {
        const count = Math.min(BLOCK_ROWS, chunkRows - start);
        const offset = start * dimension;
        const size = count * dimension;
        for (let i = 0; i < size; i++) block[i] = table[halves[offset + i]];
        for (let row = 0; row < count; row++) {
          const base = row * dimension;
          let sum = 0;
          for (let i = 0; i < dimension; i++) sum += block[base + i] * query[i];
          scores[chunk.start + start + row] = sum;
        }
      }
    }
    return scores;
  }
  /**
   * This query's meaning scores: each vector's cosine similarity minus the average of its modality (text, image and
   * audio vectors sit at slightly different levels for the same query), in standard deviations of all of them
   * together. Per-modality deviations inflated the narrow modalities (DigUp: 91 → 94 of 105 queries right with one
   * shared deviation). The scale comes from the rows in `setsScale` (all by default): later pages of long files are
   * scored on it but don't move it.
   */
  static meaning(scores, modality, setsScale) {
    const means = _Searcher.modalityMeans(scores, modality, setsScale);
    const sets = (row) => setsScale === void 0 || Boolean(setsScale[row]);
    const centered = Array.from({ length: scores.length }, (_, row) => scores[row] - (means.get(modality[row]) ?? 0));
    let count = 0;
    let sum = 0;
    for (let row = 0; row < centered.length; row++) {
      if (!sets(row)) continue;
      count++;
      sum += centered[row];
    }
    const mean = sum / Math.max(count, 1);
    let squares = 0;
    for (let row = 0; row < centered.length; row++) {
      if (sets(row)) squares += (centered[row] - mean) * (centered[row] - mean);
    }
    const deviation = Math.max(Math.sqrt(squares / Math.max(count, 1)), 0.02);
    return centered.map((value) => (value - mean) / deviation);
  }
  /** The average score of each modality for this query. Small groups (< 20 vectors) take the average of all. */
  static modalityMeans(scores, modality, setsScale) {
    const sum = /* @__PURE__ */ new Map();
    const count = /* @__PURE__ */ new Map();
    for (let row = 0; row < scores.length; row++) {
      if (setsScale !== void 0 && !setsScale[row]) continue;
      sum.set(modality[row], (sum.get(modality[row]) ?? 0) + scores[row]);
      count.set(modality[row], (count.get(modality[row]) ?? 0) + 1);
    }
    let total = 0;
    let rows = 0;
    for (const value of sum.values()) total += value;
    for (const value of count.values()) rows += value;
    const all = total / Math.max(rows, 1);
    const out = /* @__PURE__ */ new Map();
    for (const each of MODALITIES) {
      const n = count.get(each) ?? 0;
      out.set(each, n >= 20 ? sum.get(each) / n : all);
    }
    return out;
  }
  /**
   * Codes and IDs ("K7Q2LM", "TRX50") and long numbers ("4815162342") mean nothing to an embedding but everything to
   * keyword search: a query made of them weighs words double and meaning half.
   */
  static isLookup(terms) {
    return terms.length > 0 && terms.every((term) => {
      const characters = new Graphemes(term);
      let number = false;
      let letter = false;
      for (let index2 = 0; index2 < characters.count; index2++) {
        const character = characters.at(index2);
        number ||= isNumberCharacter(character);
        letter ||= isLetterCharacter(character);
      }
      return number && (letter || characters.count >= 4);
    });
  }
  /** The content words of a query, normalized as keyword search keeps its text. Kind words ("screenshot", "video")
   *  and stopwords are dropped; words of two scalars or more count (a Bengali letter with its vowel sign is two). */
  static terms(text) {
    const seen = /* @__PURE__ */ new Set();
    return lowercased(normalized(text)).split(NOT_ALPHANUMERIC).filter((word) => {
      if (countScalars(word) < 2 || STOPWORDS.has(word) || seen.has(word)) return false;
      seen.add(word);
      return true;
    });
  }
  /** FTS5 patterns for the query's words: quoted, and as prefixes for the last word while it's being typed and for
   *  words of languages that attach endings. `search` makes a word that's in no file a prefix too. */
  static patterns(terms, prefixLast) {
    return terms.map((term, index2) => {
      const prefix = prefixLast && index2 === terms.length - 1 || inflects(term);
      return `"${term}"` + (prefix ? "*" : "");
    });
  }
  /** The query's words as an FTS5 OR-query; null when it has none. */
  static ftsQuery(text, prefixLast = false) {
    const words2 = _Searcher.terms(text);
    if (words2.length === 0) return null;
    return _Searcher.patterns(words2, prefixLast).join(" OR ");
  }
  /** Kinds the query asks for ("…in a video", "ভিডিওতে"): a soft boost, not a filter. Bengali attaches case endings,
   *  so a kind word of an inflecting script also counts at the start of a longer word. */
  static kindHints(text) {
    const hinted = /* @__PURE__ */ new Set();
    for (const word of lowercased(normalized(text)).split(NOT_ALPHANUMERIC)) {
      let kind = KIND_WORDS.get(word);
      if (kind === void 0) {
        for (const [key, value] of KIND_WORDS) {
          if (inflects(key) && countScalars(key) >= 3 && hasPrefix(word, key)) {
            kind = value;
            break;
          }
        }
      }
      if (kind !== void 0) hinted.add(kind);
    }
    return hinted;
  }
};
function countScalars(text) {
  let count = 0;
  for (const _ of text) count++;
  return count;
}

// engine/service-folders.ts
var import_node_fs12 = require("node:fs");
var import_promises5 = require("node:fs/promises");
var import_node_os9 = require("node:os");
var import_node_path10 = require("node:path");
function folderPath(path, home = (0, import_node_os9.homedir)()) {
  const expanded = path === "~" ? home : path.startsWith("~/") ? (0, import_node_path10.join)(home, path.slice(2)) : path;
  try {
    return (0, import_node_fs12.realpathSync)(expanded);
  } catch {
    return expanded;
  }
}
function isFolder(path) {
  try {
    return (0, import_node_fs12.statSync)(path).isDirectory();
  } catch {
    return false;
  }
}
function isReadable(path) {
  try {
    (0, import_node_fs12.readdirSync)(path);
    return true;
  } catch {
    return false;
  }
}
var ASKED = /* @__PURE__ */ new Set([
  "Desktop",
  "Documents",
  "Downloads",
  "Library",
  "Pictures",
  "Movies",
  "Music",
  "Public",
  "Applications",
  "Sites"
]);
var USUAL_CODE_NAMES = ["GitHub", "Code", "Projects", "Developer", "dev", "src", "repos", "Repositories"];
function holdsCode(folder) {
  if ((0, import_node_fs12.existsSync)((0, import_node_path10.join)(folder, ".git"))) return true;
  let children;
  try {
    children = (0, import_node_fs12.readdirSync)(folder);
  } catch {
    return false;
  }
  return children.slice(0, 500).some((name) => !name.startsWith(".") && (0, import_node_fs12.existsSync)((0, import_node_path10.join)(folder, name, ".git")));
}
function suggestCodeFolders(searched, home = (0, import_node_os9.homedir)()) {
  const found = [];
  let names = [];
  try {
    names = (0, import_node_fs12.readdirSync)(home);
  } catch {
  }
  for (const name of names) {
    if (name.startsWith(".") || ASKED.has(name)) continue;
    const folder = folderPath((0, import_node_path10.join)(home, name), home);
    if (isFolder(folder) && holdsCode(folder)) found.push(folder);
  }
  for (const parent of ["Documents", "Desktop"]) {
    const folder = (0, import_node_path10.join)(home, parent);
    if (!searched.some((root) => root === folder || FolderSelection.isInside(folder, root))) continue;
    for (const name of USUAL_CODE_NAMES) {
      const inner = folderPath((0, import_node_path10.join)(folder, name), home);
      if (isFolder(inner) && holdsCode(inner)) found.push(inner);
    }
  }
  return found.sort(
    (a, b) => lastPathComponent(a).localeCompare(lastPathComponent(b), "en", { numeric: true, sensitivity: "base" })
  );
}
async function access(folders, signal) {
  const out = [];
  for (const folder of folders) {
    signal?.throwIfAborted();
    try {
      const dir = await (0, import_promises5.opendir)(folder);
      await dir.close();
      out.push({ folder, readable: true });
    } catch (error) {
      const code = error.code;
      const why = code === "EPERM" || code === "EACCES" ? "macOS doesn't let Dig Up read it: give Raycast Full Disk Access, or access to this folder" : code === "ENOENT" ? "it isn't there" : code === "ENOTDIR" ? "it isn't a folder" : error.message;
      out.push({ folder, readable: false, error: why });
    }
  }
  return out;
}
function folderSummaries(store, roots, problems) {
  return roots.map((folder) => {
    const summary2 = {
      folder,
      missing: problems.missing.has(folder) || !isFolder(folder),
      unreadable: problems.unreadable.has(folder),
      files: 0,
      indexed: 0,
      pending: 0,
      failed: 0,
      skipped: 0,
      unfinished: 0,
      byKind: {}
    };
    if (!store) return summary2;
    const seen = /* @__PURE__ */ new Set();
    for (const range of Store.pathRanges(folder)) {
      if (seen.has(range.from)) continue;
      seen.add(range.from);
      for (const row of store.all(
        "SELECT kind, state, COUNT(*) AS n FROM files WHERE path >= ? AND path < ? GROUP BY kind, state",
        range.from,
        range.to
      )) {
        const n = Number(row.n);
        const kind = String(row.kind);
        summary2.files += n;
        summary2.byKind[kind] = (summary2.byKind[kind] ?? 0) + n;
        switch (String(row.state)) {
          case "done":
            summary2.indexed += n;
            break;
          case "partial":
            summary2.indexed += n;
            summary2.unfinished += n;
            break;
          case "pending":
            summary2.pending += n;
            break;
          case "failed":
            summary2.failed += n;
            break;
          default:
            summary2.skipped += n;
        }
      }
    }
    return summary2;
  });
}
function toFolderEstimate(folder, estimate2, skipped, code) {
  const files = Object.values(estimate2.files).reduce((sum, n) => sum + (n ?? 0), 0);
  const out = {
    folder,
    files,
    byKind: estimate2.files,
    skipped,
    seconds: estimate2.seconds,
    laterSeconds: estimate2.laterSeconds,
    readable: true,
    pdfPages: estimate2.pdfPages,
    longFiles: estimate2.longFiles,
    audioSeconds: estimate2.audioSeconds,
    videoSeconds: estimate2.videoSeconds
  };
  if (code) out.bytes = estimate2.bytes;
  return out;
}
async function estimateFolder(folder, options, costs, helper, signal) {
  const root = folderPath(folder);
  const empty = { folder, files: 0, byKind: {}, skipped: {}, seconds: 0, laterSeconds: 0 };
  if (!isFolder(root) || !isReadable(root)) return { ...empty, readable: false };
  signal?.throwIfAborted();
  const report = await crawl([root], options, { helper });
  signal?.throwIfAborted();
  const facts = await lookUpFacts(report.candidates, helper, signal);
  const groups = estimatesBySubfolder(report.candidates, root, options, costs, facts);
  const total = [...groups.values()].reduce(addEstimates, emptyEstimate());
  const out = toFolderEstimate(folder, total, report.skipped, options.code);
  out.subfolders = [...groups].filter(([key]) => key !== root).sort((a, b) => b[1].seconds - a[1].seconds || (a[0] < b[0] ? -1 : 1)).slice(0, 500).map(([key, part]) => toFolderEstimate(key, part, {}, options.code));
  return out;
}

// engine/service-thumbs.ts
var import_node_crypto3 = require("node:crypto");
var import_node_fs13 = require("node:fs");
var import_node_path11 = require("node:path");
var KEEP = 4e3;
var DEFAULT_PIXELS = 600;
function imageSize(file) {
  let fd;
  try {
    fd = (0, import_node_fs13.openSync)(file, "r");
  } catch {
    return null;
  }
  try {
    const head = Buffer.alloc(64 * 1024);
    const length = (0, import_node_fs13.readSync)(fd, head, 0, head.length, 0);
    const bytes = head.subarray(0, length);
    if (bytes.length >= 24 && bytes.readUInt32BE(0) === 2303741511) {
      return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
    }
    if (bytes.length < 4 || bytes[0] !== 255 || bytes[1] !== 216) return null;
    for (let at = 2; at + 9 < bytes.length; ) {
      if (bytes[at] !== 255) return null;
      const marker = bytes[at + 1];
      if (marker === 255) {
        at++;
        continue;
      }
      const size = bytes.readUInt16BE(at + 2);
      const isFrame = marker >= 192 && marker <= 207 && marker !== 196 && marker !== 200 && marker !== 204;
      if (isFrame) return { width: bytes.readUInt16BE(at + 7), height: bytes.readUInt16BE(at + 5) };
      at += 2 + size;
    }
    return null;
  } finally {
    (0, import_node_fs13.closeSync)(fd);
  }
}
function thumbArgs(r, out) {
  const args = {
    path: r.path,
    out,
    maxPixel: Math.max(16, Math.min(4096, Math.round(r.maxPixel ?? DEFAULT_PIXELS)))
  };
  const loc = r.loc ?? null;
  if (r.kind === "pdf") {
    args.page = Math.max(1, Math.trunc(loc ?? 1));
    if (r.words && r.words.length > 0) args.words = r.words;
  } else if (r.kind === "video" && loc !== null) {
    args.time = loc;
  } else if (r.kind === "audio" && loc !== null) {
    args.range = [loc, r.locEnd ?? loc + 30];
  }
  return args;
}
function refused(status, message2) {
  return Object.assign(new Error(message2), { status });
}
var ThumbCache = class {
  constructor(folder, helper, log) {
    this.folder = folder;
    this.helper = helper;
    this.log = log;
    this.trim();
  }
  folder;
  helper;
  log;
  made = 0;
  inFlight = /* @__PURE__ */ new Map();
  async thumb(r, signal) {
    signal?.throwIfAborted();
    let mtime;
    try {
      mtime = (0, import_node_fs13.statSync)(r.path).mtimeMs;
    } catch (error) {
      const code = error.code;
      if (code === "ENOENT" || code === "ENOTDIR") throw refused(404, `${r.path} isn't there any more`);
      throw error;
    }
    const png = r.kind === "screenshot" || r.kind === "pdf" || r.kind === "audio" || r.kind === "doc" || r.kind === "code";
    const key = [r.path, mtime, r.kind, r.loc ?? "", r.locEnd ?? "", (r.words ?? []).join(" "), r.maxPixel ?? ""].join(
      "|"
    );
    const out = (0, import_node_path11.join)(this.folder, (0, import_node_crypto3.createHash)("sha1").update(key).digest("hex") + (png ? ".png" : ".jpg"));
    const cached = imageSize(out);
    if (cached) return { path: out, ...cached };
    let drawing = this.inFlight.get(out);
    if (!drawing || drawing.controller.signal.aborted) {
      const controller = new AbortController();
      const made = { controller, waiters: 0, promise: this.draw(r, out, controller.signal) };
      made.promise = made.promise.finally(() => {
        if (this.inFlight.get(out) === made) this.inFlight.delete(out);
      });
      this.inFlight.set(out, made);
      drawing = made;
    }
    return this.wait(drawing, signal);
  }
  /** A request's share of a drawing. Arrowing through results leaves many behind: those still waiting for the helper
   *  are dropped, so the picture the user stops on doesn't wait behind them. */
  wait(drawing, signal) {
    drawing.waiters++;
    if (!signal) return drawing.promise;
    return new Promise((resolve3, reject) => {
      const leave = () => {
        if (--drawing.waiters === 0) drawing.controller.abort(signal.reason);
        reject(signal.reason);
      };
      signal.addEventListener("abort", leave, { once: true });
      drawing.promise.then(resolve3, reject).finally(() => signal.removeEventListener("abort", leave));
    });
  }
  async draw(r, out, signal) {
    (0, import_node_fs13.mkdirSync)(this.folder, { recursive: true });
    const made = await this.helper().thumb(thumbArgs(r, out), { signal });
    if (++this.made % 200 === 0) this.trim();
    return { path: made.path, width: made.width, height: made.height };
  }
  /** Keeps the folder from growing without end: past KEEP pictures, the oldest half goes. */
  trim() {
    try {
      const files = (0, import_node_fs13.readdirSync)(this.folder).filter((name) => name.endsWith(".png") || name.endsWith(".jpg")).map((name) => ({ name, at: (0, import_node_fs13.statSync)((0, import_node_path11.join)(this.folder, name)).mtimeMs }));
      if (files.length <= KEEP) return;
      files.sort((a, b) => a.at - b.at);
      for (const file of files.slice(0, files.length - KEEP / 2)) (0, import_node_fs13.rmSync)((0, import_node_path11.join)(this.folder, file.name), { force: true });
    } catch (error) {
      if (error.code !== "ENOENT") this.log.warn(`thumbs: ${error.message}`);
    }
  }
};

// engine/service.ts
var POWER_HOLDS = /* @__PURE__ */ new Set(["on battery", "Low Power Mode", "Mac is warm"]);
var VECTOR_CACHE = 256;
var SCRATCH_PREFIX = "DigUpRaycast-";
var sameList2 = (a, b) => a.length === b.length && a.every((x, i) => x === b[i]);
var message = (error) => error instanceof Error ? error.message : String(error);
function emptyKindCounts() {
  return { files: 0, done: 0, partial: 0, pending: 0, skipped: 0, failed: 0 };
}
function indexCounts(store) {
  const counts = store.counts();
  const byKind = {};
  const total = emptyKindCounts();
  for (const [kind, states] of Object.entries(counts.byKindAndState)) {
    const row = byKind[kind] = emptyKindCounts();
    for (const [state, n] of Object.entries(states)) {
      row.files += n;
      total.files += n;
      if (state in row && state !== "files") {
        row[state] += n;
        total[state] += n;
      }
    }
  }
  return {
    byKind,
    total,
    vectors: counts.vectors,
    segments: counts.segments,
    unfinished: { files: counts.unfinished, units: counts.left }
  };
}
function removeStaleScratch(log) {
  const temp = (0, import_node_os10.tmpdir)();
  let names = [];
  try {
    names = (0, import_node_fs14.readdirSync)(temp);
  } catch {
    return;
  }
  for (const name of names) {
    if (!name.startsWith(SCRATCH_PREFIX)) continue;
    const pid = Number(name.slice(SCRATCH_PREFIX.length));
    if (!Number.isInteger(pid) || pid === process.pid) continue;
    try {
      process.kill(pid, 0);
      continue;
    } catch (error) {
      if (error.code !== "ESRCH") continue;
    }
    (0, import_node_fs14.rmSync)((0, import_node_path12.join)(temp, name), { recursive: true, force: true });
    log.info(`engine: removed the scratch folder of a gone process (${name})`);
  }
}
var Service = class _Service {
  paths;
  config;
  log;
  deps;
  startedAt = Date.now();
  main = null;
  code = null;
  indexHelper = null;
  indexHelperMtmd = null;
  uiHelper = null;
  embedders = null;
  embedderFiles = "";
  thumbs;
  // Setup
  setupState = { state: "missing", missing: ["model-text", "model-media", "llama"] };
  llama = null;
  models = null;
  installing = null;
  installAbort = null;
  rate = null;
  // Indexing passes
  serving = null;
  syncRequested = false;
  codeSyncRequested = false;
  /** A pass ends after its current job: a pause, a stop. */
  stopRequested = false;
  /** The folders changed: the pass ends after its job and a new one starts with them. */
  restartRequested = false;
  pruneWanted;
  deleteCodeIndex = false;
  yieldAt = 0;
  stopped = false;
  started = false;
  /** A failed pass or index open is tried again later, never at once: a cause that stays (a full disk, a locked or
   *  broken index) would otherwise start pass after pass. */
  retryTimer = null;
  retryDelay = 0;
  /** The 15 s cut of a job that doesn't end when asked, and the job it was armed on. */
  cutTimer = null;
  jobSerial = 0;
  // Holds and status
  policyHeld = null;
  heldUntil = null;
  activity = { state: "starting" };
  lastError = null;
  watchMissing = /* @__PURE__ */ new Set();
  watchUnreadable = /* @__PURE__ */ new Set();
  summaries = null;
  summariesMs = 0;
  // Search
  vectorCache = /* @__PURE__ */ new Map();
  newestTyped = null;
  lastQueryAt = 0;
  warnedAboutSource = false;
  idleTimer = null;
  constructor(o) {
    this.paths = o.paths;
    this.config = o.config;
    this.log = o.log;
    const log = o.log;
    this.deps = {
      makeHelper: (_role, mtmdLibrary) => new Helper(o.paths.helperBin, log, { mtmdLibrary }),
      makeEmbedders: (files) => new EmbedderManager({
        serverBin: files.server,
        textModel: files.text,
        mediaModel: files.media ?? "",
        logs: o.paths.logs,
        log,
        portRange: this.deps.portRange
      }),
      findLlama,
      findModels,
      installLlama,
      installModels,
      home: (0, import_node_os10.homedir)(),
      newFilesLimit: 50,
      minYieldMs: 2e3,
      encoderIdleSeconds: 600,
      retryBaseMs: 5e3,
      retryMaxMs: 6e5,
      stopCutMs: 15e3,
      ...o.deps
    };
    this.pruneWanted = this.config.folders.length > 0 || this.config.codeFolders.length > 0;
    this.thumbs = new ThumbCache(o.paths.thumbs, () => this.ui(), log);
  }
  // MARK: Lifecycle
  /** Finds the model, opens the index (keyword search works at once), and starts the first pass (a sync). */
  start() {
    if (this.started) return;
    this.started = true;
    removeStaleScratch(this.log);
    this.locate();
    this.idleTimer = setInterval(() => this.releaseIdleVectors(), 15e3);
    this.idleTimer.unref();
    this.open();
  }
  /** Opens the indexes; a failure (another process holding the index's lock, a full disk) is tried again later. */
  open() {
    if (this.stopped || this.main) return;
    let main2;
    try {
      main2 = this.openPart(false);
      try {
        main2.store.readAgainOnce({ ocr: true, drawsVectorPictures: true });
      } catch (error) {
        main2.store.close();
        throw error;
      }
    } catch (error) {
      this.log.error(`engine: can't open the index at ${this.paths.indexDir}: ${message(error)}`);
      this.fail("Can't open the index", error);
      this.retryLater("opening the index", () => this.open());
      return;
    }
    this.main = main2;
    if (this.config.codeFolders.length > 0) {
      try {
        this.code = this.openPart(true);
      } catch (error) {
        this.log.error(`engine: can't open the code index: ${message(error)}`);
        this.lastError = { at: Date.now(), message: `Can't open the code index: ${message(error)}` };
      }
    }
    this.retryDelay = 0;
    this.activity = { state: "idle" };
    this.kick();
  }
  /** Runs `again` after a backoff (5 s, doubling to 10 min) unless something starts it sooner. */
  retryLater(what, again) {
    if (this.stopped || this.retryTimer) return;
    this.retryDelay = this.retryDelay === 0 ? this.deps.retryBaseMs : Math.min(this.retryDelay * 2, this.deps.retryMaxMs);
    this.log.info(`engine: trying ${what} again in ${Math.round(this.retryDelay / 1e3)} s`);
    this.retryTimer = setTimeout(() => {
      this.retryTimer = null;
      again();
    }, this.retryDelay);
    this.retryTimer.unref();
  }
  /** Stops indexing after its current job (a job still reading after a few seconds is cut short: its files stay
   *  pending), then the model servers and helpers; closes the index. */
  async stop() {
    if (this.stopped) return;
    this.stopped = true;
    this.stopRequested = true;
    this.installAbort?.abort(new Error("Dig Up is stopping"));
    if (this.idleTimer) clearInterval(this.idleTimer);
    if (this.retryTimer) clearTimeout(this.retryTimer);
    this.clearCut();
    const settle = (ms) => Promise.race([this.serving?.catch(() => {
    }), new Promise((done) => setTimeout(done, ms).unref())]);
    await settle(3e3);
    await Promise.allSettled([this.embedders?.stop(), this.indexHelper?.close(), this.uiHelper?.close()]);
    await settle(3e3);
    for (const part of [this.main, this.code]) {
      if (!part) continue;
      part.indexer?.finish();
      part.store.close();
    }
    this.main = null;
    this.code = null;
    (0, import_node_fs14.rmSync)(this.paths.scratch, { recursive: true, force: true });
  }
  openPart(code) {
    const store = Store.open(code ? this.paths.codeDb : this.paths.mainDb, { code, home: this.deps.home });
    let searcher;
    try {
      searcher = new Searcher(store, { code, loadVectors: false });
    } catch (error) {
      store.close();
      throw error;
    }
    return {
      code,
      store,
      searcher,
      indexer: null,
      missing: [],
      unreadable: [],
      counts: null,
      countsAt: 0,
      countsStale: true,
      countsMs: 0,
      lastRefresh: 0,
      refreshMs: 0,
      changed: false,
      removed: false
    };
  }
  indexOptions(code) {
    return {
      ...DEFAULT_OPTIONS,
      code,
      excludedFolders: code ? [...this.config.codeSkipped] : [...this.config.skipped],
      excludedExtensions: [...this.config.excludedExtensions]
    };
  }
  helperFor() {
    const mtmd = this.llama ? mtmdBeside(this.llama) : null;
    if (!this.indexHelper || this.indexHelperMtmd !== mtmd) {
      void this.indexHelper?.close();
      this.indexHelper = this.deps.makeHelper("index", mtmd);
      this.indexHelperMtmd = mtmd;
    }
    return this.indexHelper;
  }
  ui() {
    this.uiHelper ??= this.deps.makeHelper("ui", null);
    return this.uiHelper;
  }
  newIndexer(part) {
    return new Indexer({
      store: part.store,
      options: this.indexOptions(part.code),
      helper: this.helperFor(),
      embedder: () => {
        if (!this.embedders) return Promise.reject(new Error("the model isn't there"));
        return this.embedders.index();
      },
      scratch: (0, import_node_path12.join)(this.paths.scratch, (0, import_node_crypto4.randomUUID)()),
      costsFolder: this.paths.indexDir,
      onReset: (indexed, now) => {
        this.log.info(
          `indexer: the model or settings changed, indexing ${part.code ? "code" : "everything"} again (was: ${indexed}; now: ${now})`
        );
        part.searcher.release();
      },
      home: this.deps.home,
      git: this.deps.git,
      log: this.log
    });
  }
  // MARK: Settings and holds
  /** Every change of the settings. Folders: prune and sync after the current job; the model's place: look again. */
  setConfig(next2) {
    const before = this.config;
    this.config = next2;
    if (before.llamaServerPath !== next2.llamaServerPath || before.modelFolder !== next2.modelFolder) this.locate();
    const types = !sameList2(before.excludedExtensions, next2.excludedExtensions);
    const folders = types || !sameList2(before.folders, next2.folders) || !sameList2(before.skipped, next2.skipped);
    const code = types || !sameList2(before.codeFolders, next2.codeFolders) || !sameList2(before.codeSkipped, next2.codeSkipped);
    if (code && this.main) {
      if (next2.codeFolders.length > 0 && !this.code) {
        try {
          this.code = this.openPart(true);
        } catch (error) {
          this.log.error(`engine: can't open the code index: ${message(error)}`);
        }
        this.deleteCodeIndex = false;
      } else if (next2.codeFolders.length === 0 && this.code) {
        this.deleteCodeIndex = true;
      }
    }
    if (folders || code) {
      this.summaries = null;
      this.pruneWanted = true;
      this.log.info(`folders: ${next2.folders.join(", ") || "none"}; code: ${next2.codeFolders.join(", ") || "none"}`);
      if (this.serving) this.endPass(true);
      else this.kick();
    }
    if (before.paused !== next2.paused) this.pausedChanged();
  }
  /** From the power policy and the index hours (and pause): `until` is when the hours start again (epoch ms). */
  setHeld(reason, until = null) {
    const was = this.policyHeld;
    this.policyHeld = reason === "setup" ? null : reason;
    this.heldUntil = until;
    if (was === this.policyHeld) return;
    if (this.indexingHeld()) {
      if (this.serving) this.endPass(false);
    } else {
      this.kick();
    }
  }
  pausedChanged() {
    this.log.info(this.config.paused ? "indexing paused" : "indexing resumed");
    if (this.indexingHeld()) {
      if (this.serving) this.endPass(false);
    } else {
      this.kick();
    }
  }
  /**
   * Asks the pass to end after its job (`restart`: and a new one to start, with the new settings). A job still on the
   * same file 15 s later is cut short (DigUp: stopHelper(within: 15)): a read stuck in the helper or a long embed would
   * otherwise keep Pause or a folder change waiting. Its files stay pending.
   */
  endPass(restart) {
    if (restart) this.restartRequested = true;
    else this.stopRequested = true;
    this.armCut();
  }
  /** Watches a pass asked to end: each stretch of `stopCutMs` with no job finished ends what it waits on. */
  armCut() {
    if (!this.serving || this.cutTimer) return;
    const job = this.jobSerial;
    this.cutTimer = setTimeout(() => {
      this.cutTimer = null;
      if (!this.serving || !this.shouldEnd()) return;
      if (this.jobSerial === job) {
        this.log.info(`indexer: still on a file ${Math.round(this.deps.stopCutMs / 1e3)} s after the stop; ending it`);
        const helper = this.indexHelper;
        this.indexHelper = null;
        this.indexHelperMtmd = null;
        void helper?.close();
        void this.embedders?.stopIndexing?.().catch((error) => this.log.warn(`encoder: ${message(error)}`));
      }
      this.armCut();
    }, this.deps.stopCutMs);
    this.cutTimer.unref();
  }
  clearCut() {
    if (this.cutTimer) clearTimeout(this.cutTimer);
    this.cutTimer = null;
  }
  /** The folders the watcher can't watch: for the status. */
  watchProblems(problems) {
    this.watchMissing = new Set(problems.filter((p) => p.problem === "missing").map((p) => `${p.code}:${p.folder}`));
    this.watchUnreadable = new Set(
      problems.filter((p) => p.problem === "unreadable").map((p) => `${p.code}:${p.folder}`)
    );
  }
  paused() {
    return this.config.paused || this.policyHeld === "paused";
  }
  /** No pass runs at all: paused, or outside the index hours (search still works). */
  indexingHeld() {
    return this.paused() || this.policyHeld === "outside index hours";
  }
  /** The first full pass may run: not held by the power source or heat. */
  backfillAllowed() {
    return this.policyHeld === null || !POWER_HOLDS.has(this.policyHeld);
  }
  held() {
    if (this.paused()) return "paused";
    if (this.policyHeld === "outside index hours") return "outside index hours";
    if (this.setupState.state !== "ready") return "setup";
    return this.policyHeld;
  }
  // MARK: Setup
  /** Where llama-server and the model are; the embedders follow. New embedders restart a pass that used the old ones,
   *  and indexing starts once both are there (a model folder chosen in the settings, a finished download). */
  locate() {
    const wasReady = this.modelReady();
    const llama = this.deps.findLlama(this.paths, this.config.llamaServerPath);
    const models = this.deps.findModels(this.paths, this.config.modelFolder);
    this.llama = llama.bin;
    this.models = models.text === null ? null : { text: models.text, media: models.media };
    const missing = [];
    if (models.text === null) missing.push("model-text");
    if (models.media === null) missing.push("model-media");
    if (llama.bin === null) missing.push("llama");
    if (!this.installing) {
      this.setupState = missing.length === 0 ? { state: "ready" } : { state: "missing", missing };
    }
    const files = llama.bin && this.models ? `${llama.bin}|${this.models.text}|${this.models.media}` : "";
    if (files !== this.embedderFiles) {
      if (this.embedders && this.serving) this.endPass(true);
      void this.embedders?.stop();
      this.embedders = null;
      this.vectorCache.clear();
      this.embedderFiles = files;
      if (llama.bin && this.models) {
        this.embedders = this.deps.makeEmbedders({
          server: llama.bin,
          text: this.models.text,
          media: this.models.media
        });
      }
    }
    if (this.started && !wasReady && this.modelReady()) this.requestSync();
  }
  /** Indexing needs both model files and llama-server; queries need the text model alone. */
  modelReady() {
    return this.embedders !== null && this.models?.media != null;
  }
  /** Finds or downloads llama.cpp and the model, with progress in `Status.setup`. A chosen model folder is the only
   *  place looked in, and where the download goes. Network problems are waited out ("Waiting for the network…"). */
  setup() {
    if (this.installing) return this.installing;
    this.locate();
    if (this.setupState.state === "ready") return Promise.resolve();
    const controller = new AbortController();
    this.installAbort = controller;
    this.setupState = { state: "downloading", what: this.llama ? TEXT_MODEL.name : "llama.cpp", bytes: 0, total: 0 };
    const run2 = async () => {
      const progress = (p) => this.onProgress(p);
      try {
        if (!this.llama)
          await this.deps.installLlama(this.paths, progress, { log: this.log, signal: controller.signal });
        if (!this.models?.media) {
          const target = this.config.modelFolder ? { ...this.paths, modelsDir: this.config.modelFolder } : this.paths;
          await this.deps.installModels(target, progress, { log: this.log, signal: controller.signal });
        }
        this.installing = null;
        this.locate();
        if (this.setupState.state === "ready") {
          this.log.info("setup: llama.cpp and the model are ready");
          this.requestSync();
        }
      } catch (error) {
        if (controller.signal.aborted) return;
        this.log.error(`setup: ${message(error)}`);
        this.setupState = { state: "failed", error: message(error) };
      } finally {
        this.installing = null;
        this.installAbort = null;
        this.rate = null;
      }
    };
    this.installing = run2();
    return this.installing;
  }
  onProgress(p) {
    if (p.phase === "verifying") {
      this.setupState = { state: "verifying", what: p.what };
      return;
    }
    const now = Date.now();
    if (!this.rate || p.bytes < this.rate.bytes) this.rate = { at: now, bytes: p.bytes, perSecond: null };
    else if (now - this.rate.at >= 1e3) {
      const measured = (p.bytes - this.rate.bytes) * 1e3 / (now - this.rate.at);
      const perSecond = this.rate.perSecond === null ? measured : 0.7 * this.rate.perSecond + 0.3 * measured;
      this.rate = { at: now, bytes: p.bytes, perSecond };
    }
    const state = { state: "downloading", what: p.what, bytes: p.bytes, total: p.total };
    if (this.rate.perSecond !== null && p.phase !== "retrying") state.bytesPerSecond = Math.round(this.rate.perSecond);
    if (p.phase === "retrying") state.waiting = "Waiting for the network\u2026";
    this.setupState = state;
  }
  // MARK: Indexing passes
  /** Asks for a sync (DigUp: the watcher's requestSync). A pass that runs takes it once it may yield. */
  requestSync(index2) {
    if (index2 !== "code") this.syncRequested = true;
    if (index2 !== "main" && this.code) this.codeSyncRequested = true;
    if (!this.serving && (this.syncRequested || this.codeSyncRequested)) this.kick();
  }
  /** Starts a pass unless one runs or indexing is held (DigUp: startHelper). A pass syncs first. */
  kick() {
    if (this.stopped || !this.main || this.serving) return;
    if (this.indexingHeld()) return;
    if (this.config.folders.length === 0 && this.config.codeFolders.length === 0 && !this.pruneWanted) {
      this.removeCodeIndexIfAsked();
      return;
    }
    if (this.retryTimer) clearTimeout(this.retryTimer);
    this.retryTimer = null;
    this.syncRequested = true;
    this.codeSyncRequested = this.code !== null;
    this.stopRequested = false;
    this.restartRequested = false;
    let failed = false;
    const pass = this.serve().then((ok) => {
      failed = !ok;
    }).catch((error) => {
      failed = true;
      this.fail("Indexing stopped", error);
    }).finally(() => {
      if (this.serving === pass) this.serving = null;
      this.clearCut();
      this.removeCodeIndexIfAsked();
      if (this.stopped) return;
      if (failed && !this.restartRequested) return this.retryLater("indexing", () => this.kick());
      if (!failed) this.retryDelay = 0;
      if (this.restartRequested || this.syncRequested || this.code && this.codeSyncRequested) this.kick();
    });
    this.serving = pass;
  }
  shouldEnd() {
    return this.stopped || this.stopRequested || this.restartRequested || this.indexingHeld();
  }
  /** One pass; false when it failed (it's tried again later). */
  async serve() {
    await new Promise((done) => setImmediate(done));
    const main2 = this.main;
    if (!main2 || this.shouldEnd()) return true;
    const code = this.code;
    if (this.activity.state === "failed") this.activity = { state: "idle" };
    const passStarted = Date.now();
    let fatal = false;
    try {
      this.beginPass(main2, code);
      let newFiles = /* @__PURE__ */ new Set();
      let newCode = /* @__PURE__ */ new Set();
      let codeCounted = code === null;
      for (; ; ) {
        if (this.syncRequested) {
          this.syncRequested = false;
          await this.sync(main2, newFiles);
        }
        if (!codeCounted && code) {
          codeCounted = true;
          if (this.codeSyncRequested) {
            this.codeSyncRequested = false;
            await this.sync(code, newCode);
          }
        }
        if (this.shouldEnd()) break;
        if (!this.modelReady()) break;
        if (newFiles.size > 0) {
          if (!await this.run(main2, newFiles)) {
            fatal = true;
            break;
          }
          newFiles = this.left(main2, newFiles);
          continue;
        }
        if (main2.store.pendingCount() > 0 && this.backfillAllowed()) {
          if (!await this.run(main2, null)) {
            fatal = true;
            break;
          }
          if (this.syncRequested || this.shouldEnd()) continue;
        }
        if (code && (main2.store.pendingCount() === 0 || !this.backfillAllowed())) {
          if (this.codeSyncRequested) {
            this.codeSyncRequested = false;
            await this.sync(code, newCode);
          }
          if (newCode.size > 0) {
            if (!await this.run(code, newCode)) {
              fatal = true;
              break;
            }
            newCode = this.left(code, newCode);
            continue;
          }
          if (code.store.pendingCount() > 0 && this.backfillAllowed()) {
            if (!await this.run(code, null)) {
              fatal = true;
              break;
            }
            if (this.syncRequested || this.codeSyncRequested || this.shouldEnd()) continue;
          }
        }
        if (this.backfillAllowed() && main2.store.pendingCount() === 0 && (code?.store.pendingCount() ?? 0) === 0 && main2.store.unfinishedCount().files > 0) {
          if (!await this.finishLongFiles(main2)) {
            fatal = true;
            break;
          }
          if (this.syncRequested || this.codeSyncRequested || this.shouldEnd()) continue;
        }
        if (this.syncRequested || code && this.codeSyncRequested) continue;
        break;
      }
      if (!fatal && this.lastError && !this.lastError.path && this.lastError.at < passStarted) this.lastError = null;
      return !fatal;
    } finally {
      if (!fatal) this.activity = { state: "idle" };
      this.embedders?.doneIndexing();
      for (const part of [main2, code]) {
        if (!part) continue;
        part.indexer?.finish();
        part.indexer = null;
        this.refreshSearcher(part, true);
        part.countsStale = true;
      }
      this.summaries = null;
    }
  }
  /** A pass's first steps: prune what's no longer chosen, and empty an index whose model or settings changed. */
  beginPass(main2, code) {
    main2.indexer = this.newIndexer(main2);
    if (code) code.indexer = this.newIndexer(code);
    if (this.pruneWanted) {
      const pruned = main2.store.prune(this.config.folders);
      if (pruned > 0) {
        this.log.info(`indexer: ${pruned} files under folders no longer chosen left the index`);
        main2.removed = true;
      }
      if (code) {
        const prunedCode = code.store.prune(this.config.codeFolders);
        if (prunedCode > 0) {
          this.log.info(`indexer: ${prunedCode} files under code folders no longer chosen left the code index`);
          code.removed = true;
        }
      }
      this.pruneWanted = false;
    }
    for (const part of [main2, code]) part?.indexer?.checkModel();
  }
  /** New files a run stopped before (a sync or a stop came first): kept for the next round. */
  left(part, files) {
    const yielded = this.syncRequested || this.shouldEnd() || part.code && this.codeSyncRequested;
    return yielded ? new Set(part.store.pending(null, files).map((file) => file.id)) : /* @__PURE__ */ new Set();
  }
  /** A part's chosen folders that are there and readable right now; also what `pending` and the counts look at. */
  availableRoots(part) {
    const roots = part.code ? this.config.codeFolders : this.config.folders;
    const missing = roots.filter((root) => !isFolder(root));
    const unreadable = roots.filter((root) => !missing.includes(root) && !isReadable(root));
    if (!sameList2(missing, part.missing) || !sameList2(unreadable, part.unreadable)) {
      if (missing.length > 0) this.log.info(`indexer: not connected: ${missing.join(", ")}`);
      if (unreadable.length > 0) this.log.info(`indexer: no access: ${unreadable.join(", ")}`);
    }
    part.missing = missing;
    part.unreadable = unreadable;
    const available = roots.filter((root) => !missing.includes(root) && !unreadable.includes(root));
    part.store.scope = available;
    return available;
  }
  async sync(part, into) {
    const started = Date.now();
    this.activity = { state: "syncing", index: part.code ? "code" : "main" };
    try {
      const summary2 = await part.indexer.sync(this.availableRoots(part));
      if (summary2.queued.length <= this.deps.newFilesLimit) for (const id of summary2.queued) into.add(id);
      this.log.info(
        `${part.code ? "code sync" : "sync"}: ${summary2.added} new \xB7 ${summary2.changed} changed \xB7 ${summary2.moved} moved \xB7 ${summary2.removed} removed \xB7 ${summary2.unchanged} unchanged in ${Date.now() - started} ms`
      );
      part.searcher.reloadFiles();
      if (summary2.changed + summary2.removed > 0) part.removed = true;
      part.countsStale = true;
      this.summaries = null;
    } catch (error) {
      if (this.shouldEnd()) {
        this.log.info(`indexer: ${part.code ? "code " : ""}sync stopped: ${message(error)}`);
        return;
      }
      this.log.error(`indexer: ${part.code ? "code " : ""}sync failed: ${message(error)}`);
      this.lastError = { at: Date.now(), message: `Couldn't look through the folders: ${message(error)}` };
    } finally {
      this.jobSerial++;
      this.yieldAt = Date.now() + Math.max(Date.now() - started, this.deps.minYieldMs);
    }
  }
  /** Reads and embeds a part's pending files (`only` some). False when indexing has to stop. */
  async run(part, only) {
    const started = Date.now();
    const isNew = only !== null;
    const index2 = part.code ? "code" : "main";
    let current = null;
    let done = 0;
    let total = isNew ? only.size : part.store.pendingCount();
    const show = () => {
      this.activity = {
        state: "indexing",
        index: index2,
        pass: isNew ? "new" : "first",
        done,
        total,
        current,
        secondsLeft: done >= 3 && total > done ? Math.round((Date.now() - started) / 1e3 / done * (total - done)) : null
      };
    };
    show();
    try {
      const states = await part.indexer.run({
        only,
        shouldStop: () => this.shouldEnd() || !isNew && !this.backfillAllowed() || Date.now() >= this.yieldAt && (this.syncRequested || part.code && this.codeSyncRequested),
        onStart: (file) => {
          this.jobSerial++;
          current = { path: file.path, kind: file.kind };
          show();
        },
        onEvent: (event) => {
          this.jobSerial++;
          part.changed = true;
          done = event.done;
          total = event.total;
          show();
          this.refreshSearcher(part, false);
        }
      });
      if (Object.keys(states).length > 0) {
        const what = part.code ? "code" : isNew ? "new files" : "backfill";
        const line = Object.entries(states).sort().map(([state, n]) => `${n} ${state}`).join(" \xB7 ");
        this.log.info(`index: ${what}: ${line} in ${Date.now() - started} ms`);
      }
      return true;
    } catch (error) {
      return this.runFailed(error);
    }
  }
  /** A run that threw: cut short on purpose (a pause, new settings, the 15 s cut: its files stay pending), or failed. */
  runFailed(error) {
    if (this.shouldEnd()) {
      this.log.info(`index: stopped mid-job: ${message(error)}`);
      return true;
    }
    this.fail("Indexing stopped", error);
    return false;
  }
  /** The rest of long files, yielding as the first pass does. False when indexing has to stop. */
  async finishLongFiles(part) {
    const started = Date.now();
    let current = null;
    this.activity = { state: "indexing", index: "main", pass: "rest", done: 0, total: 0, current, secondsLeft: null };
    try {
      const states = await part.indexer.finishLongFiles({
        shouldStop: () => this.shouldEnd() || !this.backfillAllowed() || Date.now() >= this.yieldAt && (this.syncRequested || this.code !== null && this.codeSyncRequested),
        onStart: (file) => {
          this.jobSerial++;
          current = { path: file.path, kind: file.kind };
          if (this.activity.state === "indexing") this.activity = { ...this.activity, current };
        },
        onStep: (step) => {
          this.jobSerial++;
          part.changed = true;
          const elapsed = (Date.now() - started) / 1e3;
          this.activity = {
            state: "indexing",
            index: "main",
            pass: "rest",
            done: step.done,
            total: step.total,
            current,
            secondsLeft: step.done > 0 && step.total > step.done ? Math.round(elapsed / step.done * (step.total - step.done)) : null
          };
          this.refreshSearcher(part, false);
        }
      });
      if (Object.keys(states).length > 0) {
        this.log.info(`index: the rest of long files: ${JSON.stringify(states)} in ${Date.now() - started} ms`);
      }
      return true;
    } catch (error) {
      return this.runFailed(error);
    }
  }
  fail(problem2, error) {
    this.log.error(`engine: ${problem2}: ${message(error)}`);
    this.activity = { state: "failed", problem: problem2 };
    this.lastError = { at: Date.now(), message: `${problem2}: ${message(error)}` };
  }
  /** Code search was turned off: its index goes once no pass has it open. */
  removeCodeIndexIfAsked() {
    if (!this.deleteCodeIndex || this.serving) return;
    this.deleteCodeIndex = false;
    if (this.code) {
      this.code.indexer?.finish();
      this.code.store.close();
      this.code = null;
    }
    for (const suffix of ["", "-wal", "-shm"]) (0, import_node_fs14.rmSync)(this.paths.codeDb + suffix, { force: true });
    this.log.info("code search off: the code index was deleted");
  }
  /**
   * New vectors reach search (DigUp: the whole copy is read again at most every 2 s during a pass). Here a pass's new
   * vectors are appended, which costs what they cost; only rows removed by a sync or a prune make the searcher read
   * everything again (a second or more for a few hundred thousand vectors, on the daemon's one thread), and then at most
   * every 10 times the last full read took. If no search has loaded vectors lately, nothing is read during the pass;
   * at its end (`force`) the vectors' model is, and the vectors load fresh with the next search.
   */
  refreshSearcher(part, force) {
    const now = Date.now();
    part.countsStale = true;
    if (!part.changed && !part.removed) return;
    const searcher = part.searcher;
    if (!searcher.vectorsLoaded) {
      if (!force) return;
      part.changed = part.removed = false;
      this.guarded(() => searcher.reloadFiles());
      return;
    }
    if (part.removed) {
      if (!force && now - part.lastRefresh < Math.max(2e3, 10 * part.refreshMs)) return;
      part.changed = part.removed = false;
      part.lastRefresh = now;
      this.guarded(() => searcher.reload());
      part.refreshMs = Date.now() - now;
      return;
    }
    if (!force && now - part.lastRefresh < 2e3) return;
    part.changed = false;
    part.lastRefresh = now;
    this.guarded(() => searcher.appendNew());
  }
  guarded(read) {
    try {
      read();
    } catch (error) {
      this.log.warn(`engine: can't reload the searcher: ${message(error)}`);
    }
  }
  /** Drops everything embedded (names stay) and reads it all again: after a model or settings change by hand. */
  async reindex(code) {
    const which = typeof code === "boolean" ? code : code.code === true;
    const part = which ? this.code : this.main;
    if (!part) return;
    part.store.resetAll();
    part.searcher.release();
    part.searcher.reloadFiles();
    part.countsStale = true;
    this.log.info(`engine: ${which ? "the code index" : "the index"} is read again from scratch`);
    this.requestSync(which ? "code" : "main");
  }
  // MARK: Status
  countsOf(part) {
    if (!part) return null;
    const now = Date.now();
    const age = now - part.countsAt;
    const least = 20 * part.countsMs;
    if (!part.counts || part.countsStale && age >= Math.max(1e3, least) || age > Math.max(5e3, least)) {
      try {
        part.counts = indexCounts(part.store);
        part.countsAt = now;
        part.countsMs = Date.now() - now;
        part.countsStale = false;
      } catch (error) {
        this.log.warn(`engine: can't count the index: ${message(error)}`);
      }
    }
    return part.counts;
  }
  emptyCounts() {
    return { byKind: {}, total: emptyKindCounts(), vectors: 0, segments: 0, unfinished: { files: 0, units: 0 } };
  }
  encoderState() {
    if (!this.embedders) return "off";
    return this.embedders.state();
  }
  status() {
    const now = Date.now();
    if (!this.summaries || now - this.summaries.at > Math.max(3e3, 20 * this.summariesMs)) {
      const problems = (part, code) => ({
        missing: /* @__PURE__ */ new Set([
          ...part?.missing ?? [],
          ...[...this.watchMissing].filter((key) => key.startsWith(`${code}:`)).map((key) => key.slice(String(code).length + 1))
        ]),
        unreadable: /* @__PURE__ */ new Set([
          ...part?.unreadable ?? [],
          ...[...this.watchUnreadable].filter((key) => key.startsWith(`${code}:`)).map((key) => key.slice(String(code).length + 1))
        ])
      });
      try {
        this.summaries = {
          main: folderSummaries(this.main?.store ?? null, this.config.folders, problems(this.main, false)),
          code: this.config.codeFolders.length > 0 ? folderSummaries(this.code?.store ?? null, this.config.codeFolders, problems(this.code, true)) : [],
          at: now
        };
        this.summariesMs = Date.now() - now;
      } catch (error) {
        this.log.warn(`engine: can't sum up the folders: ${message(error)}`);
      }
    }
    const mainSummaries = this.summaries?.main ?? [];
    const codeSummaries = this.summaries?.code ?? [];
    return {
      apiVersion: API_VERSION,
      pid: process.pid,
      setup: this.setupState,
      activity: this.activity,
      held: this.held(),
      main: this.countsOf(this.main) ?? this.emptyCounts(),
      code: this.config.codeFolders.length > 0 ? this.countsOf(this.code) ?? this.emptyCounts() : null,
      encoder: this.encoderState(),
      lastError: this.lastError,
      folders: [...this.config.folders],
      codeFolders: [...this.config.codeFolders],
      heldUntil: this.policyHeld === "outside index hours" ? this.heldUntil : null,
      missingFolders: mainSummaries.filter((s) => s.missing).map((s) => s.folder),
      unreadableFolders: mainSummaries.filter((s) => s.unreadable && !s.missing).map((s) => s.folder),
      codeMissingFolders: codeSummaries.filter((s) => s.missing).map((s) => s.folder),
      codeUnreadableFolders: codeSummaries.filter((s) => s.unreadable && !s.missing).map((s) => s.folder),
      startedAt: this.startedAt,
      folderSummaries: mainSummaries,
      codeFolderSummaries: codeSummaries
    };
  }
  // MARK: Search
  static cacheKey(text, code) {
    return code ? `code\0${text}` : text;
  }
  remember(key, vector) {
    this.vectorCache.delete(key);
    this.vectorCache.set(key, vector);
    while (this.vectorCache.size > VECTOR_CACHE) this.vectorCache.delete(this.vectorCache.keys().next().value);
  }
  /** Starts the query encoder in the background (opening the panel, a keystroke while it's off). */
  warmEncoder() {
    const embedders = this.embedders;
    if (!embedders || embedders.state() === "ready") return;
    embedders.query().catch((error) => this.log.warn(`encoder: can't start: ${message(error)}`));
  }
  /**
   * The query's vector: cached, or embedded now when the encoder is ready. While it starts, none ("warming": it starts
   * in the background, and the views ask again); without the model or after a failed start, none ("unavailable").
   */
  async vectorFor(text, code) {
    const key = _Service.cacheKey(text, code);
    const cached = this.vectorCache.get(key);
    if (cached) return { vector: cached, note: null };
    const embedders = this.embedders;
    if (!embedders) return { vector: null, note: "unavailable" };
    const state = embedders.state();
    if (state !== "ready") {
      this.warmEncoder();
      return { vector: null, note: state === "failed" ? "unavailable" : "warming" };
    }
    try {
      const worker = await embedders.query();
      const [vector] = await worker.embedTexts([code ? Prompts.codeQuery(text) : Prompts.query(text)]);
      this.remember(key, vector);
      return { vector, note: null };
    } catch (error) {
      this.log.warn(`encoder: ${message(error)}`);
      return { vector: null, note: "unavailable" };
    }
  }
  /** Embeds what's typed so far (the keyword phase), so the vector is usually ready when typing pauses. Text that's
   *  no longer the newest typed by the time the encoder can take it is skipped. */
  embedAhead(text, code) {
    const key = _Service.cacheKey(text, code);
    this.newestTyped = key;
    const embedders = this.embedders;
    if (!embedders || this.vectorCache.has(key)) return;
    if (embedders.state() !== "ready") return this.warmEncoder();
    void (async () => {
      try {
        const worker = await embedders.query();
        if (this.newestTyped !== key) return;
        const [vector] = await worker.embedTexts([code ? Prompts.codeQuery(text) : Prompts.query(text)]);
        this.remember(key, vector);
      } catch (error) {
        this.log.warn(`encoder: ${message(error)}`);
      }
    })();
  }
  /**
   * Hybrid search (DigUp: Engine.search). Keyword results come at once (`meaning: false`, which also starts embedding
   * the text); the final search adds meaning. A "code:" query searches the code index alone. Results are only files
   * still searched (chosen and not skipped, a type not left out) that are still there; the limit (40) applies first.
   */
  async search(r, signal) {
    const began = performance.now();
    const query = r.query.trim();
    const codeText = codeQueryText(query);
    const isCode = codeText !== null;
    const text = codeText ?? query;
    const reply = (part2) => ({
      hits: [],
      strong: 0,
      code: isCode,
      meaning: false,
      note: null,
      terms: [],
      ms: { embed: 0, search: Math.round(performance.now() - began) },
      ...part2
    });
    if (isCode && this.config.codeFolders.length === 0) return reply({ note: "code-off" });
    if (isCode && text === "") return reply({ note: "code-hint" });
    if (text === "") return reply({});
    const part = isCode ? this.code : this.main;
    if (!part) return reply({ note: isCode ? "code-off" : null });
    this.lastQueryAt = Date.now();
    let vector = null;
    let note = null;
    const embedStarted = performance.now();
    if (r.meaning === false) {
      this.embedAhead(text, isCode);
    } else {
      ({ vector, note } = await this.vectorFor(text, isCode));
    }
    const embedMs = Math.round(performance.now() - embedStarted);
    signal?.throwIfAborted();
    const indexed = part.searcher.vectorSource;
    if (vector && indexed !== null && indexed !== VECTOR_SOURCE) {
      if (!this.warnedAboutSource) {
        this.log.warn(`meaning search is off: the index was built with ${indexed}, the encoder is ${VECTOR_SOURCE}`);
        this.warnedAboutSource = true;
      }
      vector = null;
      note = "unavailable";
    }
    const searchStarted = performance.now();
    const hits = part.searcher.search(text, vector, {
      kinds: isCode ? null : r.kinds ?? null,
      limit: r.limit ?? 40,
      prefixLast: r.prefixLast ?? false
    }).filter((hit) => this.stillSearched(hit.path, isCode));
    return {
      hits,
      strong: strongCount(hits.map((hit) => hit.score)),
      code: isCode,
      meaning: vector !== null,
      note,
      terms: Searcher.terms(text),
      ms: { embed: embedMs, search: Math.round(performance.now() - searchStarted) }
    };
  }
  /** A removed folder's rows (or a newly skipped type's) can outlive it until the next sync: they're not results. */
  stillSearched(path, code) {
    const folders = code ? this.config.codeFolders : this.config.folders;
    const skipped = code ? this.config.codeSkipped : this.config.skipped;
    if (!FolderSelection.isSearched(path, folders, skipped)) return false;
    if (!code && this.config.excludedExtensions.includes(lowercased(pathExtension(lastPathComponent(path)))))
      return false;
    return (0, import_node_fs14.existsSync)(path);
  }
  /** Gets meaning search ready as a search view opens: starts the query encoder and loads the vectors. */
  async prewarm(signal) {
    this.lastQueryAt = Date.now();
    this.warmEncoder();
    for (const part of [this.main, this.code]) {
      signal?.throwIfAborted();
      if (!part || part.searcher.vectorsLoaded) continue;
      const started = Date.now();
      try {
        part.searcher.reload();
        part.changed = part.removed = false;
        this.log.info(
          `engine: ${part.searcher.vectorCount} ${part.code ? "code " : ""}vectors loaded in ${Date.now() - started} ms`
        );
      } catch (error) {
        this.log.warn(`engine: can't load vectors: ${message(error)}`);
      }
    }
    return this.encoderState();
  }
  /** The vectors held for search go with the query encoder (DigUp: encoderIdleSeconds); words still match. */
  releaseIdleVectors() {
    const idle = Date.now() - this.lastQueryAt > this.deps.encoderIdleSeconds * 1e3;
    if (!idle || this.encoderState() === "ready" || this.encoderState() === "starting") return;
    let released = false;
    for (const part of [this.main, this.code]) {
      if (part?.searcher.vectorsLoaded) {
        part.searcher.release();
        released = true;
      }
    }
    if (released) {
      this.vectorCache.clear();
      this.log.info("engine: the query encoder is idle; its vectors were let go");
    }
  }
  /** A segment's full text, for the preview (DigUp: Searcher.text(ofSegment:)). */
  segmentText(segmentId, code = false) {
    const id = typeof segmentId === "number" ? segmentId : segmentId.segmentId;
    const which = typeof segmentId === "number" ? code : segmentId.code === true;
    return (which ? this.code : this.main)?.searcher.segmentText(id) ?? null;
  }
  // MARK: Folders, files, previews
  files(r) {
    const part = r.code ? this.code : this.main;
    if (!part) return [];
    return part.store.list({ states: r.states ?? null, kinds: r.kinds ?? null, limit: r.limit ?? null });
  }
  suggestCodeFolders() {
    return suggestCodeFolders(this.config.folders, this.deps.home);
  }
  access(folders, signal) {
    return access(Array.isArray(folders) ? folders : folders.folders, signal);
  }
  /** First-pass time of each folder, with its subfolders (DigUp: digup estimate). Folders come back as given. The walk
   *  of one folder can't be cut short; an abort stops between folders and between page and duration lookups. */
  async estimate(r, signal) {
    signal?.throwIfAborted();
    const costs = MeasuredCosts.load(this.paths.indexDir).costs;
    const options = this.indexOptions(r.code === true);
    const helper = this.deps.makeHelper("ui", null);
    const abort = () => void helper.close();
    signal?.addEventListener("abort", abort, { once: true });
    const out = [];
    try {
      for (const folder of r.folders) {
        signal?.throwIfAborted();
        try {
          out.push(await estimateFolder(folder, options, costs, helper, signal));
        } catch (error) {
          if (signal?.aborted) throw signal.reason ?? error;
          this.log.warn(`estimate: ${folder}: ${message(error)}`);
          out.push({ folder, files: 0, byKind: {}, skipped: {}, seconds: 0, laterSeconds: 0, failed: true });
        }
      }
      return out;
    } finally {
      signal?.removeEventListener("abort", abort);
      await helper.close();
    }
  }
  thumb(r, signal) {
    return this.thumbs.thumb(r, signal);
  }
  openPdf(r) {
    return this.ui().openPdf(r.path, r.page, r.words);
  }
  openMedia(r) {
    return this.ui().openMedia(r.path, r.seconds, r.player);
  }
};

// engine/watcher.ts
var import_node_fs15 = require("node:fs");
var import_node_os11 = require("node:os");
var import_node_path13 = require("node:path");
var CODE_NOISE = /* @__PURE__ */ new Set([
  "node_modules",
  "bower_components",
  "venv",
  "site-packages",
  "__pycache__",
  "DerivedData",
  "Pods",
  "Carthage",
  "vendor",
  "Vendor",
  "third_party",
  "build",
  "Build",
  "dist",
  "out",
  "target",
  "obj",
  "coverage",
  "wandb",
  "mlruns",
  "lightning_logs"
]);
function realPath2(path) {
  try {
    return import_node_fs15.realpathSync.native(path);
  } catch {
    return path;
  }
}
function spellings2(paths) {
  return [...new Set(paths.flatMap((path) => [path, realPath2(path)]))];
}
function errorCode(error) {
  return error?.code ?? String(error);
}
function folderProblem(folder, code) {
  try {
    if (!(0, import_node_fs15.statSync)(folder).isDirectory()) return { folder, code, problem: "missing", error: "not a folder" };
    (0, import_node_fs15.opendirSync)(folder).closeSync();
    return null;
  } catch (error) {
    const why = errorCode(error);
    const problem2 = why === "ENOENT" || why === "ENOTDIR" ? "missing" : why === "EPERM" || why === "EACCES" ? "unreadable" : "unwatchable";
    return { folder, code, problem: problem2, error: why };
  }
}
var Watcher = class {
  constructor(o) {
    this.o = o;
    this.home = o.home ?? (0, import_node_os11.homedir)();
  }
  o;
  config = { folders: [], skipped: [], codeFolders: [], codeQuietSeconds: 60 };
  watched = [];
  /** The skipped folders in both spellings, as `isWalked` compares them. */
  skips = [];
  mainTimer = null;
  codeTimer = null;
  /** When code started changing without the code index catching up (DigUp: codeChangedSince). */
  codeChangedSince = null;
  recheck = null;
  volumes = null;
  volumesTimer = null;
  reported = "[]";
  started = false;
  stopped = false;
  home;
  /** Starts watching, or follows new settings: watchers are made again only when their folders changed. */
  update(config) {
    if (this.stopped) return;
    const before = this.config;
    this.config = {
      folders: [...config.folders],
      skipped: [...config.skipped],
      codeFolders: [...config.codeFolders],
      codeQuietSeconds: config.codeQuietSeconds
    };
    const first = !this.started;
    this.started = true;
    if (first || !sameList3(before.skipped, config.skipped)) this.skips = spellings2(config.skipped);
    if (first || !sameList3(before.folders, config.folders)) this.rewatch(false);
    if (first || !sameList3(before.codeFolders, config.codeFolders)) this.rewatch(true);
    this.startVolumes();
    this.startRecheck();
    this.report();
  }
  /** The folders that can't be watched now. */
  get problems() {
    return this.watched.flatMap((w) => w.problem ? [w.problem] : []);
  }
  stop() {
    this.stopped = true;
    for (const w of this.watched) w.watcher?.close();
    this.watched = [];
    this.volumes?.close();
    this.volumes = null;
    for (const timer of [this.mainTimer, this.codeTimer, this.volumesTimer]) if (timer) clearTimeout(timer);
    if (this.recheck) clearInterval(this.recheck);
    this.mainTimer = this.codeTimer = this.volumesTimer = this.recheck = null;
  }
  // ------------------------------------------------------------------------------------------------------------------
  rewatch(code) {
    for (const w of this.watched.filter((w2) => w2.code === code)) w.watcher?.close();
    this.watched = this.watched.filter((w) => w.code !== code);
    if (code) {
      if (this.codeTimer) clearTimeout(this.codeTimer);
      this.codeTimer = null;
      this.codeChangedSince = null;
    }
    const folders = code ? this.config.codeFolders : this.config.folders;
    for (const folder of folders) this.watched.push(this.watch(folder, code));
    const count = this.watched.filter((w) => w.code === code && w.watcher).length;
    if (folders.length > 0) this.o.log.info(`watch: ${count} of ${folders.length} ${code ? "code " : ""}folders`);
  }
  watch(folder, code) {
    const problem2 = folderProblem(folder, code);
    const real = problem2 ? folder : realPath2(folder);
    const entry = { folder, real, code, watcher: null, problem: problem2 };
    if (entry.problem) {
      this.o.log.warn(`watch: can't watch ${folder} (${entry.problem.problem}: ${entry.problem.error})`);
      return entry;
    }
    try {
      const watcher = (0, import_node_fs15.watch)(
        folder,
        { recursive: true, persistent: false },
        (_event, name) => this.changed(entry, name === null ? null : String(name))
      );
      watcher.on("error", (error) => {
        this.o.log.warn(`watch: ${folder} stopped: ${errorCode(error)}`);
        watcher.close();
        if (entry.watcher !== watcher) return;
        entry.watcher = null;
        entry.problem = folderProblem(folder, code) ?? {
          folder,
          code,
          problem: "unwatchable",
          error: errorCode(error)
        };
        this.report();
      });
      entry.watcher = watcher;
    } catch (error) {
      entry.problem = { folder, code, problem: "unwatchable", error: errorCode(error) };
      this.o.log.warn(`watch: can't watch ${folder}: ${errorCode(error)}`);
    }
    return entry;
  }
  /** An event under a watched folder; `name` is relative to it (null: the folder itself). */
  changed(entry, name) {
    if (this.stopped || entry.watcher === null) return;
    const below = name ? name.split("/").filter((part) => part !== "") : [];
    if (entry.code) {
      if (below.some((part) => part.startsWith(".") || CODE_NOISE.has(part))) return;
      this.codeSoon();
      return;
    }
    const path = below.length > 0 ? (0, import_node_path13.join)(entry.real, ...below) : entry.real;
    if (!isWalked(path, entry.real, this.home, this.skips)) return;
    if (this.mainTimer) clearTimeout(this.mainTimer);
    this.mainTimer = setTimeout(() => {
      this.mainTimer = null;
      this.o.log.info(`watch: changed (${below.at(-1) ?? entry.folder})`);
      this.o.onSync("main");
    }, this.o.debounceMs ?? 750);
    this.mainTimer.unref();
  }
  /** Code catches up once it has been quiet for `codeQuietSeconds`, or `codeLongestWait` after it started changing. */
  codeSoon() {
    const now = Date.now();
    this.codeChangedSince ??= now;
    if (this.codeTimer) clearTimeout(this.codeTimer);
    const quiet = this.o.codeQuietMs ?? this.config.codeQuietSeconds * 1e3;
    const longest = this.o.codeLongestWaitMs ?? 6e5;
    const waited = now - this.codeChangedSince;
    this.codeTimer = setTimeout(
      () => {
        this.codeTimer = null;
        this.codeChangedSince = null;
        this.o.log.info("watch: code changed");
        this.o.onSync("code");
      },
      Math.max(0, Math.min(quiet, longest - waited))
    );
    this.codeTimer.unref();
  }
  /**
   * Looks at the folders again: one that came back (a drive was connected, access was given) is watched and synced; one
   * that went is reported (its files stay in the index, as in DigUp).
   */
  refresh() {
    if (this.stopped) return;
    const resync = /* @__PURE__ */ new Set();
    this.watched = this.watched.map((entry) => {
      const there = entry.watcher !== null;
      if (there && (0, import_node_fs15.existsSync)(entry.folder)) return entry;
      if (!there) {
        const again = this.watch(entry.folder, entry.code);
        if (again.watcher) {
          this.o.log.info(`watch: ${entry.folder} is back`);
          resync.add(entry.code ? "code" : "main");
        }
        return again;
      }
      entry.watcher?.close();
      this.o.log.warn(`watch: ${entry.folder} is gone`);
      resync.add(entry.code ? "code" : "main");
      return {
        ...entry,
        watcher: null,
        problem: folderProblem(entry.folder, entry.code) ?? {
          folder: entry.folder,
          code: entry.code,
          problem: "missing"
        }
      };
    });
    if (resync.size > 0) this.skips = spellings2(this.config.skipped);
    this.report();
    for (const index2 of resync) this.o.onSync(index2);
  }
  startRecheck() {
    if (this.recheck) return;
    this.recheck = setInterval(() => this.refresh(), this.o.recheckMs ?? 6e4);
    this.recheck.unref();
  }
  /** DigUp re-checks the folders when a drive is mounted or ejected; /Volumes changes then. */
  startVolumes() {
    const volumes = this.o.volumes === void 0 ? "/Volumes" : this.o.volumes;
    if (this.volumes || volumes === null || !(0, import_node_fs15.existsSync)(volumes)) return;
    try {
      this.volumes = (0, import_node_fs15.watch)(volumes, { persistent: false }, () => {
        if (this.volumesTimer) clearTimeout(this.volumesTimer);
        this.volumesTimer = setTimeout(() => {
          this.volumesTimer = null;
          this.refresh();
        }, 1e3);
        this.volumesTimer.unref();
      });
      this.volumes.on("error", () => {
        this.volumes?.close();
        this.volumes = null;
      });
    } catch (error) {
      this.o.log.warn(`watch: can't watch ${volumes}: ${errorCode(error)}`);
    }
  }
  report() {
    const problems = this.problems;
    const text = JSON.stringify(problems);
    if (text === this.reported) return;
    this.reported = text;
    this.o.onProblems?.(problems);
  }
};
function sameList3(a, b) {
  return a.length === b.length && a.every((item, at) => item === b[at]);
}

// engine/daemon.ts
var LOG_LIMIT = 5 * 1024 * 1024;
function rotatingLog(file, maxBytes = LOG_LIMIT, echo = false) {
  try {
    (0, import_node_fs16.mkdirSync)((0, import_node_path14.dirname)(file), { recursive: true });
  } catch {
  }
  const sizeNow = () => (0, import_node_fs16.statSync)(file, { throwIfNoEntry: false })?.size ?? 0;
  let size = sizeNow();
  const write = (level, message2) => {
    const line = `${(/* @__PURE__ */ new Date()).toISOString()} ${level} ${message2}
`;
    try {
      const bytes = Buffer.byteLength(line);
      if (size + bytes > maxBytes && (size = sizeNow()) + bytes > maxBytes) {
        (0, import_node_fs16.copyFileSync)(file, `${file}.1`);
        (0, import_node_fs16.truncateSync)(file, 0);
        size = 0;
      }
      (0, import_node_fs16.appendFileSync)(file, line);
      size += bytes;
    } catch {
    }
    if (echo) process.stderr.write(line);
  };
  return {
    info: (m) => write("info", m),
    warn: (m) => write("warn", m),
    error: (m) => write("error", m)
  };
}
function describe(error) {
  return error instanceof Error ? error.stack ?? error.message : String(error);
}
var O_EXLOCK = 32;
function takeLock(file) {
  (0, import_node_fs16.mkdirSync)((0, import_node_path14.dirname)(file), { recursive: true });
  const { O_RDWR, O_CREAT, O_NONBLOCK } = import_node_fs16.constants;
  for (let attempt = 0; attempt < 5; attempt++) {
    let fd;
    try {
      fd = (0, import_node_fs16.openSync)(file, O_RDWR | O_CREAT | O_NONBLOCK | O_EXLOCK, 420);
    } catch (error) {
      const code = error.code;
      if (code === "EAGAIN" || code === "EWOULDBLOCK") return "held";
      if (code === "EOPNOTSUPP" || code === "ENOTSUP") return pidLock(file);
      throw error;
    }
    const now = (0, import_node_fs16.statSync)(file, { throwIfNoEntry: false });
    const mine = (0, import_node_fs16.fstatSync)(fd);
    if (now && now.ino === mine.ino && now.dev === mine.dev) {
      (0, import_node_fs16.ftruncateSync)(fd, 0);
      (0, import_node_fs16.writeSync)(fd, `${process.pid}
`, 0);
      return { fd, file };
    }
    (0, import_node_fs16.closeSync)(fd);
  }
  return "held";
}
function pidLock(file) {
  const pid = Number.parseInt((0, import_node_fs16.readFileSync)(file, { encoding: "utf8", flag: "a+" }).trim(), 10);
  if (Number.isInteger(pid) && pid > 0 && pid !== process.pid && alive(pid)) return "held";
  (0, import_node_fs16.writeFileSync)(file, `${process.pid}
`);
  return { fd: (0, import_node_fs16.openSync)(file, "r"), file };
}
function alive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return error.code === "EPERM";
  }
}
function releaseLock(lock) {
  try {
    const now = (0, import_node_fs16.statSync)(lock.file, { throwIfNoEntry: false });
    const mine = (0, import_node_fs16.fstatSync)(lock.fd);
    if (now && now.ino === mine.ino && now.dev === mine.dev) (0, import_node_fs16.unlinkSync)(lock.file);
  } catch {
  }
  try {
    (0, import_node_fs16.closeSync)(lock.fd);
  } catch {
  }
}
function answers(socket, timeoutMs = 1e3) {
  return new Promise((done) => {
    const connection = (0, import_node_net2.connect)({ path: socket });
    const finish = (yes) => {
      connection.destroy();
      done(yes);
    };
    connection.setTimeout(timeoutMs, () => finish(false));
    connection.once("connect", () => finish(true));
    connection.once("error", () => finish(false));
  });
}
function prepareSocketFolder(socket) {
  const folder = (0, import_node_path14.dirname)(socket);
  try {
    (0, import_node_fs16.mkdirSync)(folder, { mode: 448 });
  } catch (error) {
    if (error.code !== "EEXIST") throw error;
  }
  const info = (0, import_node_fs16.lstatSync)(folder);
  if (info.isSymbolicLink() || !info.isDirectory()) throw new Error(`${folder} isn't a folder; not listening there`);
  if (info.uid !== process.getuid?.()) throw new Error(`${folder} belongs to another user; not listening there`);
  if ((info.mode & 511) !== 448) (0, import_node_fs16.chmodSync)(folder, 448);
}
function writeAtomically(file, text) {
  const temporary = `${file}.${process.pid}.tmp`;
  (0, import_node_fs16.writeFileSync)(temporary, text, { mode: 420 });
  (0, import_node_fs16.renameSync)(temporary, file);
}
var HttpError2 = class extends Error {
  constructor(status, message2) {
    super(message2);
    this.status = status;
    this.name = "HttpError";
  }
  status;
};
var MAX_BODY_BYTES = 1024 * 1024;
var ROUTINE_ABORTS = /* @__PURE__ */ new Set(["POST /search", "POST /thumb"]);
function readBody(request, limit) {
  return new Promise((done, fail) => {
    const declared = Number(request.headers["content-length"]);
    if (Number.isFinite(declared) && declared > limit) {
      fail(new HttpError2(413, `the request is over ${limit} bytes`));
      return;
    }
    const chunks2 = [];
    let total = 0;
    let over = false;
    request.on("data", (chunk) => {
      if (over) return;
      total += chunk.length;
      if (total > limit) {
        over = true;
        fail(new HttpError2(413, `the request is over ${limit} bytes`));
        return;
      }
      chunks2.push(chunk);
    });
    request.on("error", fail);
    request.on("end", () => {
      if (over) return;
      const text = Buffer.concat(chunks2).toString("utf8");
      if (text.trim() === "") return done(void 0);
      try {
        done(JSON.parse(text));
      } catch (error) {
        fail(new HttpError2(400, `the request isn't JSON: ${error.message}`));
      }
    });
  });
}
function send(response, status, value, close = false) {
  if (response.headersSent || response.destroyed) return;
  const text = JSON.stringify(value === void 0 ? {} : value);
  response.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "content-length": Buffer.byteLength(text),
    ...close ? { connection: "close" } : {}
  });
  response.end(text);
}
function statusOf(error) {
  const status = error?.status ?? error?.statusCode;
  return typeof status === "number" && Number.isInteger(status) && status >= 400 && status <= 599 ? status : 500;
}
var isString = (v) => typeof v === "string";
var isStrings = (v) => Array.isArray(v) && v.every(isString);
var isNumber = (v) => typeof v === "number" && Number.isFinite(v);
function need(body, name, test, what, optional = false) {
  const value = body[name];
  if (optional && (value === void 0 || value === null) || test(value)) return;
  throw new HttpError2(400, `${name} must be ${what}`);
}
var CHECKS = {
  "POST /search": (b) => {
    need(b, "query", isString, "text");
    need(b, "kinds", isStrings, "a list of kinds", true);
    need(b, "limit", isNumber, "a number", true);
  },
  "POST /pause": (b) => need(b, "paused", (v) => typeof v === "boolean", "true or false"),
  "POST /estimate": (b) => need(b, "folders", isStrings, "a list of paths"),
  "POST /reindex": (b) => need(b, "code", (v) => typeof v === "boolean", "true or false", true),
  "POST /thumb": (b) => {
    need(b, "path", isString, "a path");
    need(b, "kind", (v) => FILE_KINDS.includes(v), `one of ${FILE_KINDS.join(", ")}`);
  },
  "POST /files": (b) => {
    need(b, "states", isStrings, "a list of states", true);
    need(b, "kinds", isStrings, "a list of kinds", true);
  },
  "POST /segment-text": (b) => {
    need(b, "segmentId", Number.isInteger, "a whole number");
    need(b, "code", (v) => typeof v === "boolean", "true or false", true);
  },
  "POST /open-pdf": (b) => {
    need(b, "path", isString, "a path");
    need(b, "page", isNumber, "a number");
    need(b, "words", isStrings, "a list of words", true);
  },
  "POST /open-media": (b) => {
    need(b, "path", isString, "a path");
    need(b, "seconds", isNumber, "a number");
    need(b, "player", isString, "a bundle id or null", true);
  },
  "POST /access": (b) => need(b, "folders", isStrings, "a list of paths")
};
var STOP_TIMEOUT_MS = 8e3;
var LOCK_WAIT_MS = 12e3;
function delay(ms) {
  return new Promise((done) => setTimeout(done, ms));
}
async function within(promise, ms, late) {
  let timer;
  try {
    return await Promise.race([
      promise,
      new Promise((done) => {
        timer = setTimeout(() => {
          late();
          done(void 0);
        }, ms);
      })
    ]);
  } finally {
    clearTimeout(timer);
  }
}
async function startDaemon(o) {
  const { paths, log } = o;
  const startedAt = o.startedAt ?? Date.now();
  let lock = takeLock(paths.pidFile);
  for (const deadline = Date.now() + (o.lockWaitMs ?? LOCK_WAIT_MS); lock === "held"; lock = takeLock(paths.pidFile)) {
    if (await answers(paths.socket) || Date.now() >= deadline) {
      log.info("daemon: another daemon is running");
      return null;
    }
    await delay(100);
  }
  const held = lock;
  const infoFile = (0, import_node_path14.join)(paths.support, DAEMON_INFO_FILE);
  try {
    (0, import_node_fs16.unlinkSync)(infoFile);
  } catch {
  }
  let service = null;
  let policy = null;
  let watcher = null;
  let server = null;
  let parentTimer = null;
  try {
    prepareSocketFolder(paths.socket);
    if ((0, import_node_fs16.existsSync)(paths.socket)) {
      if (await answers(paths.socket)) {
        log.warn(`daemon: something already answers on ${paths.socket}`);
        releaseLock(held);
        return null;
      }
      (0, import_node_fs16.unlinkSync)(paths.socket);
    }
    const config = new ConfigStore(paths.configFile, log);
    const svc = o.makeService({ paths, config: config.get(), log });
    service = svc;
    const pol = new Policy(config.get(), {
      ...o.policy,
      log,
      power: o.power ?? powerFromHelper(paths.helperBin, log),
      onHeld: (reason, until) => svc.setHeld(reason, until)
    });
    policy = pol;
    await pol.start();
    const watch2 = new Watcher({
      ...o.watcher,
      log,
      onSync: (index2) => svc.requestSync(index2),
      onProblems: (problems) => svc.watchProblems?.(problems)
    });
    watcher = watch2;
    watch2.update(config.get());
    config.onChange((next2) => svc.setConfig(next2));
    config.onChange((next2, _previous, changed) => {
      if (changed.has("paused") || changed.has("indexHours") || changed.has("indexOnBattery")) pol.update(next2);
    });
    config.onChange((next2, _previous, changed) => {
      if (["folders", "skipped", "codeFolders", "codeQuietSeconds"].some((key) => changed.has(key))) {
        watch2.update(next2);
      }
    });
    let stopping = null;
    let resolveStopped;
    const stopped = new Promise((done) => resolveStopped = done);
    const info = { pid: process.pid, socket: paths.socket, apiVersion: API_VERSION, startedAt };
    const status = () => ({ ...svc.status(), apiVersion: API_VERSION, pid: process.pid });
    const table = {
      "GET /status": () => status(),
      "POST /search": (r, signal) => svc.search(r, signal),
      "POST /prewarm": async (_r, signal) => ({ encoder: await svc.prewarm(signal) }),
      "POST /sync": () => {
        svc.requestSync();
        return {};
      },
      "POST /pause": (r) => {
        config.update({ paused: r.paused });
        return status();
      },
      "GET /config": () => config.get(),
      "POST /config": (r) => config.update(r ?? {}).config,
      "POST /estimate": (r, signal) => svc.estimate(r, signal),
      "POST /setup": () => {
        void Promise.resolve().then(() => svc.setup()).catch((error) => log.error(`setup: ${describe(error)}`));
        return status();
      },
      "POST /reindex": async (r) => {
        await svc.reindex(r.code === true);
        return {};
      },
      "POST /thumb": (r, signal) => svc.thumb(r, signal),
      "POST /files": (r) => svc.files(r),
      "POST /suggest-code-folders": () => svc.suggestCodeFolders(),
      "POST /segment-text": async (r) => ({ text: await svc.segmentText(r.segmentId, r.code === true) }),
      "POST /open-pdf": (r) => svc.openPdf(r),
      "POST /open-media": (r) => svc.openMedia(r),
      "POST /access": (r, signal) => svc.access(r.folders, signal),
      // The stop itself starts once this reply is out (handle).
      "POST /quit": () => ({})
    };
    const maxBody = o.maxBodyBytes ?? MAX_BODY_BYTES;
    const handle = async (request, response) => {
      const path = new URL(request.url ?? "/", "http://daemon").pathname;
      const key = `${request.method} ${path}`;
      const handler = Object.hasOwn(table, key) ? table[key] : null;
      const controller = new AbortController();
      response.on("close", () => {
        if (!response.writableFinished) controller.abort(new HttpError2(499, "the client went away"));
      });
      try {
        if (!handler) {
          request.resume();
          throw new HttpError2(404, `no route ${key}`);
        }
        if (stopping) {
          request.resume();
          throw new HttpError2(503, "Dig Up is stopping");
        }
        let body = await readBody(request, maxBody);
        if (request.method === "POST") {
          body ??= {};
          if (typeof body !== "object" || body === null || Array.isArray(body)) {
            throw new HttpError2(400, "the request must be a JSON object");
          }
          CHECKS[key]?.(body);
        }
        const result = await handler(body, controller.signal);
        if (controller.signal.aborted) return;
        send(response, 200, result);
        if (key === "POST /quit") {
          if (response.writableFinished) void stop("quit");
          else response.once("finish", () => void stop("quit"));
        }
      } catch (error) {
        if (controller.signal.aborted) {
          if (!ROUTINE_ABORTS.has(key)) log.info(`daemon: ${key} cancelled by the client`);
          return;
        }
        const code = statusOf(error);
        if (code >= 500) log.error(`daemon: ${key} failed: ${describe(error)}`);
        send(response, code, { error: error instanceof Error ? error.message : String(error) }, code === 413);
        if (code === 413) response.once("finish", () => request.destroy());
      }
    };
    const srv = (0, import_node_http.createServer)((request, response) => void handle(request, response));
    server = srv;
    const stop = (reason) => {
      stopping ??= (async () => {
        log.info(`daemon: stopping (${reason})`);
        if (parentTimer) clearInterval(parentTimer);
        try {
          const recorded = JSON.parse((0, import_node_fs16.readFileSync)(infoFile, "utf8"));
          if (recorded.pid === process.pid) (0, import_node_fs16.unlinkSync)(infoFile);
        } catch {
        }
        const closed = new Promise((done) => srv.close(() => done()));
        srv.closeIdleConnections();
        watch2.stop();
        pol.stop();
        const timeout = o.stopTimeoutMs ?? STOP_TIMEOUT_MS;
        try {
          await within(svc.stop(), timeout, () => log.error(`daemon: the service didn't stop in ${timeout / 1e3} s`));
        } catch (error) {
          log.error(`daemon: the service failed to stop: ${describe(error)}`);
        }
        srv.closeAllConnections();
        await within(closed, 2e3, () => log.warn("daemon: connections didn't close"));
        try {
          if ((0, import_node_fs16.lstatSync)(paths.socket).isSocket()) (0, import_node_fs16.unlinkSync)(paths.socket);
        } catch {
        }
        releaseLock(held);
        try {
          (0, import_node_fs16.rmdirSync)((0, import_node_path14.dirname)(paths.socket));
        } catch {
        }
        log.info(`daemon: stopped (${reason})`);
        resolveStopped(reason);
      })();
      return stopping;
    };
    await new Promise((done, fail) => {
      srv.once("error", fail);
      srv.listen(paths.socket, () => {
        srv.off("error", fail);
        done();
      });
    });
    (0, import_node_fs16.chmodSync)(paths.socket, 384);
    srv.on("error", (error) => {
      log.error(`daemon: the server failed: ${describe(error)}`);
      void stop("errors");
    });
    writeAtomically(infoFile, JSON.stringify(info) + "\n");
    log.info(`daemon: listening on ${paths.socket} (pid ${process.pid}, api ${API_VERSION})`);
    svc.start();
    if (o.parentGone) {
      const gone = o.parentGone;
      parentTimer = setInterval(() => {
        if (gone()) void stop("parent exited");
      }, o.parentCheckMs ?? 5e3);
      parentTimer.unref();
    }
    return { info, service: svc, config, stopped, stop };
  } catch (error) {
    if (parentTimer) clearInterval(parentTimer);
    watcher?.stop();
    policy?.stop();
    if (service) await service.stop().catch(() => {
    });
    if (server?.listening) await new Promise((done) => server.close(() => done()));
    releaseLock(held);
    throw error;
  }
}
function installProcessHandlers(daemon, log, exit = (code) => process.exit(code)) {
  let signalled = false;
  const onSignal = (signal) => {
    if (signalled) {
      log.warn(`daemon: ${signal} again; exiting now`);
      exit(1);
      return;
    }
    signalled = true;
    void daemon.stop(signal);
  };
  process.on("SIGTERM", onSignal);
  process.on("SIGINT", onSignal);
  process.on("unhandledRejection", (reason) => log.error(`daemon: unhandled rejection: ${describe(reason)}`));
  const recent = [];
  process.on("uncaughtException", (error) => {
    log.error(`daemon: uncaught exception: ${describe(error)}`);
    const now = Date.now();
    recent.push(now);
    while (recent.length > 0 && recent[0] < now - 6e4) recent.shift();
    if (recent.length >= 5) void daemon.stop("errors");
  });
  void daemon.stopped.then((reason) => exit(reason === "errors" ? 1 : 0));
}
function portRangeFrom(text) {
  const match = text?.trim().match(/^(\d{1,5})-(\d{1,5})$/);
  if (!match) return null;
  const [low, high] = [Number(match[1]), Number(match[2])];
  return low >= 1024 && low <= high && high <= 65535 ? [low, high] : null;
}
async function main(argv) {
  const { values } = (0, import_node_util.parseArgs)({
    args: argv,
    options: { support: { type: "string" }, assets: { type: "string" } },
    strict: false
  });
  if (typeof values.support !== "string" || typeof values.assets !== "string") {
    process.stderr.write("usage: daemon.js --support <folder> --assets <folder>\n");
    process.exit(2);
  }
  process.title = "dig-up-daemon";
  const paths = makePaths((0, import_node_path14.resolve)(values.support), (0, import_node_path14.resolve)(values.assets));
  const log = rotatingLog((0, import_node_path14.join)(paths.logs, "daemon.log"), LOG_LIMIT, process.stderr.isTTY === true);
  log.info(`daemon: starting (pid ${process.pid}, node ${process.version})`);
  const portRange = portRangeFrom(process.env.DIGUP_PORT_RANGE);
  if (portRange) log.info(`daemon: llama-server ports ${portRange[0]}-${portRange[1]}`);
  let daemon;
  try {
    daemon = await startDaemon({
      paths,
      log,
      makeService: (options) => new Service({ ...options, deps: portRange ? { portRange } : void 0 }),
      parentGone: () => process.ppid === 1,
      startedAt: Math.round(performance.timeOrigin)
    });
  } catch (error) {
    log.error(`daemon: can't start: ${describe(error)}`);
    process.exit(1);
  }
  if (!daemon) process.exit(0);
  installProcessHandlers(daemon, log);
}
if (require.main === module) void main(process.argv.slice(2));
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  HttpError,
  LOG_LIMIT,
  installProcessHandlers,
  main,
  portRangeFrom,
  rotatingLog,
  startDaemon
});
//# sourceMappingURL=daemon.js.map
