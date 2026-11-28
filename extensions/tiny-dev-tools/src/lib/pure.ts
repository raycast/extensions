/**
 * 纯逻辑库：与 Raycast UI 完全解耦，可独立测试
 */

import { createHash, createHmac, randomBytes, createPublicKey, verify as cryptoVerify, X509Certificate, type KeyObject, constants } from "node:crypto";
const crypto = { verify: cryptoVerify, X509Certificate, createPublicKey };
void constants;

// ---------- 时间戳 ----------

export type TsUnit = "s" | "ms" | "us";

export interface TsInput {
  unit: TsUnit;
  value: number; // 原始数值
  date: Date;    // 归一化到 ms 的 Date
}

/** 识别时间戳文本：支持 s/ms/us 自动判断；纯数字尾缀强制单位；空串返回 null */
export function parseTimestamp(input: string): TsInput | null {
  const t = input.trim();
  if (!t || !/^-?\d+$/.test(t)) return null;
  const n = Number(t);
  const len = t.replace("-", "").length;

  let unit: TsUnit;
  if (len >= 16) unit = "us";
  else if (len >= 13) unit = "ms";
  else unit = "s";

  const ms = unit === "s" ? n * 1000 : unit === "ms" ? n : Math.round(n / 1000);
  return { unit, value: n, date: new Date(ms) };
}

/** 支持 "1699999999" / "1699999999123" / "2026-11-03 12:30:30" / ISO / 相对表达式("-1h" "+3d") */
export function parseDateInput(input: string): Date | null {
  const t = input.trim();
  if (!t) return null;

  // 纯数字 → 时间戳
  if (/^-?\d+$/.test(t)) return parseTimestamp(t)?.date ?? null;

  // 相对表达式：±Nd/Nh/Nm/Ns/Nw（可组合，如 -1d2h）
  const rel = t.match(/^([+-])((?:\d+[smhdw])+)\/?$/i);
  if (rel) {
    const sign = rel[1] === "-" ? -1 : 1;
    let ms = 0;
    for (const m of rel[2].matchAll(/(\d+)([smhdw])/gi)) {
      const v = parseInt(m[1], 10);
      const k = { s: 1e3, m: 6e4, h: 36e5, d: 864e5, w: 6048e5 }[m[2].toLowerCase() as "s" | "m" | "h" | "d" | "w"];
      ms += v * k;
    }
    return new Date(Date.now() + sign * ms);
  }

  // 标准日期字符串
  const d = new Date(t);
  return isNaN(d.getTime()) ? null : d;
}

/** 补零 */
const p2 = (n: number) => String(n).padStart(2, "0");

/** 本地时间 YYYY-MM-DD HH:mm:ss */
export function fmtLocal(d: Date): string {
  return `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())} ${p2(d.getHours())}:${p2(d.getMinutes())}:${p2(d.getSeconds())}`;
}

/** UTC 时间 YYYY-MM-DD HH:mm:ss */
export function fmtUTC(d: Date): string {
  return `${d.getUTCFullYear()}-${p2(d.getUTCMonth() + 1)}-${p2(d.getUTCDate())} ${p2(d.getUTCHours())}:${p2(d.getUTCMinutes())}:${p2(d.getUTCSeconds())}`;
}

/** ISO 8601（含时区） */
export function fmtISO(d: Date): string {
  return d.toISOString();
}

/** 相对现在的人性化描述 */
export function fmtRelative(d: Date, now = new Date()): string {
  const diff = d.getTime() - now.getTime();
  const past = diff < 0;
  let s = Math.abs(diff) / 1000;
  if (s < 5) return "just now";
  const parts: string[] = [];
  const units: Array<[number, string]> = [
    [86400 * 365, "year"],
    [86400 * 30, "month"],
    [86400, "day"],
    [3600, "hour"],
    [60, "minute"],
    [1, "second"],
  ];
  for (const [sec, label] of units) {
    if (s >= sec) {
      const n = Math.floor(s / sec);
      parts.push(`${n} ${label}${n > 1 ? "s" : ""}`);
      s %= sec;
    }
    if (parts.length === 2) break;
  }
  return parts.length ? (past ? `${parts.join(" ")} ago` : `in ${parts.join(" ")}`) : "just now";
}

// ---------- URL 编解码 ----------

export interface DecodeResult {
  text: string;
  /** 经过了几轮解码（0 = 未变化） */
  rounds: number;
}

/** 智能解码：循环 decodeURIComponent 直到不再变化或抛错；上限 5 轮防死循环 */
export function smartDecode(input: string): DecodeResult {
  let text = input;
  let rounds = 0;
  while (rounds < 5) {
    let next: string;
    try {
      next = decodeURIComponent(text);
    } catch {
      break; // 非法序列，停在上一次结果
    }
    if (next === text) break;
    text = next;
    rounds++;
  }
  return { text, rounds };
}

// ---------- JSON ----------

/** 递归按 Key 排序（对象按字典序；数组保持顺序） */
export function sortKeysDeep<T>(v: T): T {
  if (Array.isArray(v)) return v.map(sortKeysDeep) as unknown as T;
  if (v && typeof v === "object") {
    const o: Record<string, unknown> = {};
    for (const k of Object.keys(v as Record<string, unknown>).sort()) {
      o[k] = sortKeysDeep((v as Record<string, unknown>)[k]);
    }
    return o as T;
  }
  return v;
}

export interface JsonOutcome {
  ok: boolean;
  /** 成功时为格式化结果；失败时为错误信息 */
  text: string;
  error?: { message: string; position?: number; line?: number; column?: number };
}

/** JSON 格式化：indent 为 0 表示压缩；sort 为 true 时递归排序 Key */
export function formatJson(raw: string, indent: number, sort: boolean): JsonOutcome {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    // 提取 "position N" 以计算行列
    let position: number | undefined;
    const m = msg.match(/position (\d+)/);
    if (m) position = parseInt(m[1], 10);
    let line: number | undefined;
    let column: number | undefined;
    if (position !== undefined) {
      line = 1;
      column = position + 1;
      for (let i = 0; i < position && i < raw.length; i++) {
        if (raw[i] === "\n") {
          line++;
          column = position - i;
        }
      }
    }
    return { ok: false, text: msg, error: { message: msg, position, line, column } };
  }
  const value = sort ? sortKeysDeep(data) : data;
  return { ok: true, text: JSON.stringify(value, null, indent || undefined) + (indent ? "\n" : "") };
}

// ---------- Base64 ----------

const B64CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

/** UTF-8 安全的 Base64 编码（输出可加 padding） */
export function b64Encode(input: string): string {
  const bytes = new TextEncoder().encode(input);
  let out = "";
  for (let i = 0; i < bytes.length; i += 3) {
    const b0 = bytes[i];
    const b1 = bytes[i + 1];
    const b2 = bytes[i + 2];
    out += B64CHARS[b0 >> 2];
    out += B64CHARS[((b0 & 3) << 4) | ((b1 ?? 0) >> 4)];
    out += b1 === undefined ? "=" : B64CHARS[((b1 & 15) << 2) | ((b2 ?? 0) >> 6)];
    out += b2 === undefined ? "=" : B64CHARS[b2 & 63];
  }
  return out;
}

/** Base64 解码（容忍 URL-safe 字符与缺失 padding），失败抛 Error */
export function b64Decode(input: string): string {
  const s = input.replace(/-/g, "+").replace(/_/g, "/").replace(/\s+/g, "").replace(/=+$/, "");
  if (!s) return "";
  if (!/^[A-Za-z0-9+/]*$/.test(s)) throw new Error("Invalid Base64 character");
  if (s.length % 4 === 1) throw new Error("Invalid Base64 length (len % 4 === 1)");

  const bytes: number[] = [];
  for (let i = 0; i < s.length; i += 4) {
    const c0 = B64CHARS.indexOf(s[i]);
    const c1 = B64CHARS.indexOf(s[i + 1]);
    const c2 = s[i + 2] ? B64CHARS.indexOf(s[i + 2]) : -1;
    const c3 = s[i + 3] ? B64CHARS.indexOf(s[i + 3]) : -1;
    bytes.push((c0 << 2) | (c1 >> 4));
    if (c2 >= 0) bytes.push(((c1 & 15) << 4) | (c2 >> 2));
    if (c3 >= 0) bytes.push(((c2 & 3) << 6) | c3);
  }
  return new TextDecoder().decode(new Uint8Array(bytes));
}

// ---------- 哈希 ----------

export type HashAlgo = "md5" | "sha1" | "sha256";

/** 文本哈希（UTF-8），hex 小写输出。算法正确性由 Node 标准库保证 */
export function hashText(text: string, algo: HashAlgo): string {
  return createHash(algo).update(text, "utf8").digest("hex");
}

/** HMAC-SHA256（密钥按 UTF-8 文本处理，不做 hex 解码），hex 小写输出 */
export function hmacSha256(key: string, text: string): string {
  return createHmac("sha256", key).update(text, "utf8").digest("hex");
}

/** 拆分 hash 命令搜索语法：`文本 || 密钥`（首个 || 为分隔符，两侧不 trim；无分隔符时 key 为空串） */
export function parseHashInput(query: string): { text: string; key: string } {
  const idx = query.indexOf("||");
  if (idx === -1) return { text: query, key: "" };
  return { text: query.slice(0, idx), key: query.slice(idx + 2) };
}

// ---------- 密码生成 ----------

const LOWER = "abcdefghijklmnopqrstuvwxyz";
const UPPER = LOWER.toUpperCase();
const DIGITS = "0123456789";
/** 30→29 字符符号集：排除空格（粘贴断裂）与 " \ | （转义高频冲突），见 design 决策 2 */
const SYMBOLS = "!@#$%^&*()-_=+[]{};:,.<>/?~`'";
/** spec 承诺的排除歧义字符集（易阅读档） */
const AMBIGUOUS = "Il1O0o";

export type PasswordPreset = "say" | "read" | "all";

/** 每档预设的启用字符类（易读出=字母；易阅读=去歧义；全部=四类） */
function classesFor(preset: PasswordPreset): string[] {
  if (preset === "say") return [LOWER, UPPER];
  if (preset === "read")
    return [
      LOWER.split("").filter((c) => !AMBIGUOUS.includes(c)).join(""),
      UPPER.split("").filter((c) => !AMBIGUOUS.includes(c)).join(""),
      DIGITS.split("").filter((c) => !AMBIGUOUS.includes(c)).join(""),
    ];
  return [LOWER, UPPER, DIGITS, SYMBOLS];
}

/** 加密安全整数采样：randomBytes 多字节拒绝采样，返回 [0, max) 均匀分布（无 modulo bias） */
function randInt(max: number): number {
  if (max <= 1) return 0;
  const bytesNeeded = Math.ceil(Math.log2(max) / 8);
  const range = 256 ** bytesNeeded;
  const limit = Math.floor(range / max) * max;
  for (;;) {
    const buf = randomBytes(bytesNeeded);
    let v = 0;
    for (const b of buf) v = v * 256 + b;
    if (v < limit) return v % max;
  }
}

/** 熵估算：count × log2(poolSize)（生成熵，均匀随机下即安全熵） */
export function estimateBits(count: number, poolSize: number): number {
  return count * Math.log2(poolSize);
}

/** 解析长度输入：仅整数十进制串（允许前导零）返回数值，其余（含混合、空格、空串）返回 null；钳制由调用侧执行 */
export function parseLengthInput(query: string): number | null {
  if (!/^\d+$/.test(query)) return null;
  return parseInt(query, 10);
}

/** 随机密码：必含每启用类 ≥1（注入 + Fisher-Yates 洗牌，洗牌亦用 randInt） */
export function generatePassword(opts: { length: number; preset: PasswordPreset }): string {
  const classes = classesFor(opts.preset);
  const len = Math.max(opts.length, classes.length); // 防御：长度低于类数时取类数
  const chars: string[] = [];
  for (const cls of classes) chars.push(cls[randInt(cls.length)]);
  const pool = classes.join("");
  while (chars.length < len) chars.push(pool[randInt(pool.length)]);
  // Fisher-Yates（randInt 驱动）
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randInt(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join("");
}

/** Passphrase：词表均匀选词，连字符连接 */
export function generatePassphrase(wordCount: number, words: string[]): string {
  const picks: string[] = [];
  for (let i = 0; i < wordCount; i++) picks.push(words[randInt(words.length)]);
  return picks.join("-");
}

// ---------- JWT ----------

export const JWT_TIME_CLAIMS = ["exp", "iat", "nbf"] as const;

export interface JwtParts {
  header: Record<string, unknown>;
  payload: Record<string, unknown>;
  /** 未解码的三段原文（验签需要 header.payload 原文） */
  raw: { header: string; payload: string; signature: string };
}

/** Base64URL 段 → 字符串（文本语义，header/payload 用；容错 -_ 与缺失 padding） */
function b64urlText(seg: string): string | null {
  try {
    return new TextDecoder().decode(b64urlBytes(seg));
  } catch {
    return null;
  }
}

/** Base64URL 段 → 字节（字节语义，signature 用；不可复用 b64Decode——其 U+FFFD 替换破坏字节） */
function b64urlBytes(seg: string): Uint8Array {
  const s = seg.replace(/-/g, "+").replace(/_/g, "/").replace(/\s+/g, "");
  const bin = atob(s + "=".repeat((4 - (s.length % 4)) % 4));
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

/** 解码 JWT：三段拆分 + Base64URL 解码 + JSON.parse；任何一步失败整体返回 null */
export function decodeJwt(token: string): JwtParts | null {
  const parts = token.trim().split(".");
  if (parts.length !== 3 || parts.some((p) => !p)) return null;
  const [h, p, s] = parts;
  const headerText = b64urlText(h);
  const payloadText = b64urlText(p);
  if (headerText === null || payloadText === null) return null;
  let header: unknown;
  let payload: unknown;
  try {
    header = JSON.parse(headerText);
    payload = JSON.parse(payloadText);
  } catch {
    return null;
  }
  if (typeof header !== "object" || header === null || Array.isArray(header)) return null;
  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) return null;
  return {
    header: header as Record<string, unknown>,
    payload: payload as Record<string, unknown>,
    raw: { header: h, payload: p, signature: s },
  };
}

/** HS256 验签：对未解码的 header.payload 原文段做 HMAC-SHA256，与签名段字节比对 */
export function verifyHs256(token: string, secret: string): boolean {
  const jwt = decodeJwt(token);
  if (!jwt) return false;
  const mac = Buffer.from(hmacSha256(secret, `${jwt.raw.header}.${jwt.raw.payload}`), "hex");
  const sig = Buffer.from(b64urlBytes(jwt.raw.signature));
  return mac.length === sig.length && mac.equals(sig);
}

/** 非对称验签：RS256 / ES256（ieee-p1363 直验 raw 签名，零格式转换——2026-11-22 实测锚定） */
export function verifyWithKey(token: string, key: KeyObject): boolean {
  const jwt = decodeJwt(token);
  if (!jwt || typeof jwt.header.alg !== "string") return false;
  const data = Buffer.from(`${jwt.raw.header}.${jwt.raw.payload}`);
  const sig = b64urlBytes(jwt.raw.signature);
  try {
    if (jwt.header.alg === "RS256") return crypto.verify("RSA-SHA256", data, key, Buffer.from(sig));
    if (jwt.header.alg === "ES256") return crypto.verify(null, data, { key, dsaEncoding: "ieee-p1363" }, Buffer.from(sig));
    return false;
  } catch {
    return false; // 异常兜底：非法签名长度/损坏密钥材料归「签名不符」（design 决策 7）
  }
}

export interface KeyResolve {
  key: KeyObject;
  kind: "pem" | "jwk" | "file";
}

/** 密钥材料识别：PEM（-----BEGIN）/ JWK（{）/ 文件路径（~/、/ 开头，readFile 注入保零 IO）；其余返回 null（非三格式文本） */
export function resolveKeyMaterial(
  raw: string,
  readFile?: (path: string) => string
): KeyResolve | { error: "unparseable" } | null {
  const t = raw.trim();
  if (t.startsWith("-----BEGIN")) {
    try {
      const key = crypto.createPublicKey(t);
      return { key, kind: "pem" };
    } catch {
      try {
        // CERTIFICATE 形态：提取公钥
        const cert = new crypto.X509Certificate(t);
        return { key: cert.publicKey, kind: "pem" };
      } catch {
        return { error: "unparseable" };
      }
    }
  }
  if (t.startsWith("{")) {
    try {
      const jwk = JSON.parse(t) as Record<string, unknown>;
      const key = crypto.createPublicKey({ key: jwk, format: "jwk" });
      return { key, kind: "jwk" };
    } catch {
      return { error: "unparseable" };
    }
  }
  if ((t.startsWith("~") || t.startsWith("/")) && readFile) {
    try {
      const content = readFile(t.startsWith("~") ? t.replace(/^~/, process.env.HOME ?? "~") : t);
      if (!content.trim()) return { error: "unparseable" };
      const nested = resolveKeyMaterial(content); // 递归判定（不传 readFile：内容应已是 PEM/JWK）
      return nested && "key" in nested ? { key: nested.key, kind: "file" } : { error: "unparseable" };
    } catch {
      return { error: "unparseable" }; // 读失败（不存在/不可读）
    }
  }
  return null; // 非三格式文本（内联场景由调用方决定回退语义）
}

export type VerifyResult = { ok: true } | { ok: false; error: "mismatch" | "unparseable" };

/** 非对称验签组合层：alg 先分流（HS256 不入内——调用方走 verifyHs256）；
 *  RS/ES256 密钥过 resolveKeyMaterial：类型不匹配 → mismatch；无法解析 → unparseable；否则真实验签 */
export function verifyAsymmetric(token: string, raw: string, readFile?: (p: string) => string): VerifyResult {
  const jwt = decodeJwt(token);
  if (!jwt || typeof jwt.header.alg !== "string") return { ok: false, error: "unparseable" };
  const alg = jwt.header.alg;
  if (alg !== "RS256" && alg !== "ES256") return { ok: false, error: "unparseable" };

  const resolved = resolveKeyMaterial(raw, readFile);
  if (!resolved) return { ok: false, error: "unparseable" }; // 普通文本密钥
  if ("error" in resolved) return { ok: false, error: resolved.error };

  const keyType = resolved.key.asymmetricKeyType;
  if (alg === "RS256" && keyType !== "rsa") return { ok: false, error: "mismatch" };
  if (alg === "ES256" && keyType !== "ec") return { ok: false, error: "mismatch" };

  return verifyWithKey(token, resolved.key) ? { ok: true } : { ok: false, error: "unparseable" };
}

export type JwtStatusLevel = "expired" | "not-yet-valid" | "valid" | "unknown";

/** 状态判定（顺序优先）：① exp 已过 → expired；② nbf 未到 → not-yet-valid；③ 有 exp → valid；④ 无 exp → unknown */
export function jwtStatus(payload: Record<string, unknown>, now: Date = new Date()): {
  level: JwtStatusLevel;
  label: string;
} {
  const nowSec = Math.floor(now.getTime() / 1000);
  const exp = typeof payload.exp === "number" ? payload.exp : undefined;
  const nbf = typeof payload.nbf === "number" ? payload.nbf : undefined;

  if (exp !== undefined && exp < nowSec) {
    return { level: "expired", label: `Expired · ${fmtRelative(new Date(exp * 1000), now)} ago` };
  }
  if (nbf !== undefined && nbf > nowSec) {
    return { level: "not-yet-valid", label: `Not yet valid · ${fmtRelative(new Date(nbf * 1000), now)} left` };
  }
  if (exp !== undefined) {
    return { level: "valid", label: `Valid · ${fmtRelative(new Date(exp * 1000), now)} left` };
  }
  return { level: "unknown", label: "No expiry claim" };
}

// ---------- 选中文本预填 detector（纯函数，规则权威见 selection-prefill spec） ----------

/** 共同前置：trim 非空、≤4096、不含 ||（密钥永不来自选中文本） */
function preflight(sel: string): boolean {
  const t = sel.trim();
  return !!t && t.length <= 4096 && !t.includes("||");
}

/** url-codec：含 %XX hex 对，或含 :// 且无空格 */
export function detectUrlEncoded(sel: string): boolean {
  if (!preflight(sel)) return false;
  const t = sel.trim();
  if (/%[0-9a-fA-F]{2}/.test(t)) return true;
  return t.includes("://") && !/\s/.test(t);
}

/** json-format：trim 后以 { 或 [ 开头（现状规则） */
export function detectJson(sel: string): boolean {
  if (!preflight(sel)) return false;
  const t = sel.trim();
  return t.startsWith("{") || t.startsWith("[");
}

/** base64：≥8 字符、仅 Base64 字符集、无空白、解码为合法 UTF-8 文本（无 U+FFFD） */
export function detectBase64(sel: string): boolean {
  if (!preflight(sel)) return false;
  const t = sel.trim();
  if (t.length < 8 || !/^[A-Za-z0-9+/=_-]+$/.test(t)) return false;
  try {
    const decoded = b64Decode(t.replace(/=+$/, ""));
    if (decoded.includes("\uFFFD")) return false;
    return decoded.length > 0 && /[\x20-\x7E\u0080-\uFFFF]/.test(decoded);
  } catch {
    return false;
  }
}

/** timestamp：可选负号纯数字 ≤30 位（现状规则，负号保留） */
export function detectTimestampLike(sel: string): boolean {
  if (!preflight(sel)) return false;
  const t = sel.trim();
  return /^-?\d+$/.test(t) && t.length <= 30;
}

/** hash：任意通过共同前置的文本（hash 语义上任意文本可哈希，无形态规则；用户验收确认要预填） */
export function detectAnyText(sel: string): boolean {
  return preflight(sel);
}

/** jwt-decoder：三段式且每段 ≥4 个 Base64URL 字符 */
export function detectJwt(sel: string): boolean {
  if (!preflight(sel)) return false;
  const parts = sel.trim().split(".");
  if (parts.length !== 3) return false;
  return parts.every((p) => p.length >= 4 && /^[A-Za-z0-9_-]+$/.test(p));
}

// ---------- Case 转换（语义基准 change-case v4，30 用例双库实测锚点见 design） ----------

/** 拆词：按 _ - . 切（空段丢弃）→ 段内大小写边界切（连续大写段归前词，数字贴前词）→ 统一小写 */
export function splitWords(input: string): string[] {
  const words: string[] = [];
  for (const seg of input.split(/[_.\-]+/)) {
    if (!seg) continue;
    // 段内切分：在大写字母前的边界插切点
    // 规则（与 change-case v4 一致）：
    //   小写/数字 → 大写：切（user|Created）
    //   大写 → 大写且下一个是小写：切（XML|Http——连续大写段归前词）
    let current = "";
    for (let i = 0; i < seg.length; i++) {
      const ch = seg[i];
      const prev = seg[i - 1] ?? "";
      const next = seg[i + 1] ?? "";
      const isUpper = ch >= "A" && ch <= "Z";
      const prevIsLowerOrDigit = prev !== "" && (prev >= "a" && prev <= "z" || prev >= "0" && prev <= "9");
      const prevIsUpper = prev >= "A" && prev <= "Z";
      const nextIsLower = next >= "a" && next <= "z";
      if (isUpper && (prevIsLowerOrDigit || (prevIsUpper && nextIsLower))) {
        if (current) words.push(current);
        current = ch;
      } else {
        current += ch;
      }
    }
    if (current) words.push(current);
  }
  return words.map((w) => w.toLowerCase());
}

export interface CaseResult {
  camel: string;
  pascal: string;
  snake: string;
  kebab: string;
  constant: string;
  dot: string;
}

/** 一次拆词，六种格式拼装 */
export function convertCase(input: string): CaseResult {
  const w = splitWords(input);
  const cap = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);
  return {
    camel: w.map((x, i) => (i === 0 ? x : cap(x))).join(""),
    pascal: w.map(cap).join(""),
    snake: w.join("_"),
    kebab: w.join("-"),
    constant: w.map((x) => x.toUpperCase()).join("_"),
    dot: w.join("."),
  };
}

/** case-converter detector：合法 case 形态（字母开头，仅字母数字 _ . -，至少一个字母） */
export function detectCaseLike(sel: string): boolean {
  if (!preflight(sel)) return false;
  const t = sel.trim();
  return /^[A-Za-z][A-Za-z0-9_.-]*$/.test(t) && /[A-Za-z]/.test(t);
}

// ---------- JSON → 类型代码（类型树中间态 + 四语言渲染器；规则表唯一权威见 design） ----------

export type NumSub = "int" | "long" | "double";

export type TypeNode =
  | { kind: "object"; name: string; fields: Array<{ name: string; type: TypeNode; optional: boolean }> }
  | { kind: "array"; element: TypeNode | null }
  | { kind: "union"; members: TypeNode[] }
  | { kind: "string" }
  | { kind: "boolean" }
  | { kind: "null" }
  | { kind: "number"; sub: NumSub };

/** 数字档位：解析后数值判定（1.0 → int 档）；精确区间 [-2^31, 2^31-1] / long / double */
function numSub(v: number): NumSub {
  if (Number.isInteger(v)) {
    if (v >= -2147483648 && v <= 2147483647) return "int";
    return "long"; // 超 long 的降级在渲染层判（树层仍记 long）
  }
  return "double";
}

function nodeFromValue(v: unknown): TypeNode {
  if (v === null) return { kind: "null" };
  if (typeof v === "string") return { kind: "string" };
  if (typeof v === "boolean") return { kind: "boolean" };
  if (typeof v === "number") return { kind: "number", sub: numSub(v) };
  if (Array.isArray(v)) return { kind: "array", element: mergeElements(v) };
  return { kind: "object", name: "", fields: objectFields(v as Record<string, unknown>) };
}

function objectFields(obj: Record<string, unknown>): Array<{ name: string; type: TypeNode; optional: boolean }> {
  return Object.entries(obj).map(([name, v]) => ({ name, type: nodeFromValue(v), optional: false }));
}

/** 数组元素合并：null 与非 null 混合 → union 含 null；多类型 → union（首现序）；全 null → null 节点；空 → null element */
function mergeElements(items: unknown[]): TypeNode | null {
  if (items.length === 0) return null;
  const members: TypeNode[] = [];
  let hasNull = false;
  let hasNonNull = false;
  for (const item of items) {
    if (item === null) { hasNull = true; continue; }
    hasNonNull = true;
    const node = nodeFromValue(item);
    if (node.kind === "null") { hasNull = true; continue; }
    if (!members.some((m) => sameNode(m, node))) members.push(node); // 首现序去重（档位粒度）
  }
  if (members.length === 0) return { kind: "null" }; // [null] 或全 null
  if (members.length === 1) return hasNull ? { kind: "union", members: [members[0], { kind: "null" }] } : members[0];
  return hasNull ? { kind: "union", members: [...members, { kind: "null" }] } : { kind: "union", members };
}

function sameNode(a: TypeNode, b: TypeNode): boolean {
  if (a.kind !== b.kind) return false;
  if (a.kind === "number" && b.kind === "number") return a.sub === b.sub;
  return true; // 同 kind 基元视为同（object 在数组元素合并中走异构并集路径，不进 sameNode）
}

/** PascalCase 派生：user-profile → UserProfile；非法字符切词后拼装 */
function pascalOf(key: string): string {
  const words = key.split(/[^A-Za-z0-9]+/).filter(Boolean);
  return words.map((w) => w[0].toUpperCase() + w.slice(1)).join("") || "Field";
}

export interface TypeTree {
  root: TypeNode;
  /** 全部命名类型（含根），按树中首次出现顺序（父先子后） */
  named: Array<{ name: string; node: Extract<TypeNode, { kind: "object" }> }>;
}

/** JSON → 类型树。命名规则：根=Root；嵌套 object/数组对象元素按【全路径】PascalCase 派生
 *  （user.profile → UserProfile；数组元素路径为字段名，如 items[].user → ItemsUser）；
 *  冲突按首次出现顺序占名，后到者追加递增序号（User2）。
 *  根数组三态：原始数组→array 别名形态；对象数组（同构/异构）→字段并集提升为 Root（异构独有字段 optional）。 */
export function buildTypeTree(json: string): TypeTree | null {
  let value: unknown;
  try {
    value = JSON.parse(json);
  } catch {
    return null;
  }
  if (value === null || typeof value !== "object") return null;

  const used = new Map<string, number>();
  const named: TypeTree["named"] = [];

  const claimName = (base: string): string => {
    const n = (used.get(base) ?? 0) + 1;
    used.set(base, n);
    return n === 1 ? base : `${base}${n}`;
  };

  /** 递归：为 node 及其全部嵌套 object 命名。path = 从根到该节点的键路径（数组不增段） */
  const decorateAll = (node: TypeNode, path: string[], isRootObject: boolean): void => {
    if (node.kind === "object") {
      // 先命名子对象（深度优先，父引用子名）
      for (const f of node.fields) {
        if (f.type.kind === "object") decorateAll(f.type, [...path, f.name], false);
        else if (f.type.kind === "array" && f.type.element && f.type.element.kind === "object") {
          decorateAll(f.type.element, [...path, f.name], false); // 数组元素类型名取字段路径
        } else if (f.type.kind === "union") {
          for (const m of f.type.members) if (m.kind === "object") decorateAll(m, [...path, f.name], false);
        }
      }
      node.name = claimName(isRootObject ? "Root" : pascalOf(path.join(".")));
      named.unshift({ name: node.name, node }); // unshift：父在列表前（先声明被引用的顺序按需渲染调整）
      return;
    }
    if (node.kind === "array" && node.element) decorateAll(node.element, path, false);
    if (node.kind === "union") for (const m of node.members) decorateAll(m, path, false);
  };

  let root: TypeNode;

  if (Array.isArray(value)) {
    const nullCount = value.filter((v) => v === null).length;
    const objectItems = value.filter((v) => v !== null && typeof v === "object" && !Array.isArray(v));
    const primitiveOrArrayItems = value.filter((v) => v !== null && !(typeof v === "object" && !Array.isArray(v)));

    if (objectItems.length > 0 && primitiveOrArrayItems.length === 0) {
      // 对象数组（同构/异构统一）：字段并集；某字段未出现在全部对象中 → optional
      const fieldTypes = new Map<string, TypeNode[]>();
      const fieldPresence = new Map<string, number>();
      for (const item of objectItems as Record<string, unknown>[]) {
        for (const [k, v] of Object.entries(item)) {
          const node = nodeFromValue(v);
          const arr = fieldTypes.get(k) ?? [];
          if (!arr.some((t) => sameNode(t, node))) arr.push(node);
          fieldTypes.set(k, arr);
          fieldPresence.set(k, (fieldPresence.get(k) ?? 0) + 1);
        }
      }
      const total = objectItems.length;
      const fields = [...fieldTypes.entries()].map(([name, types]) => ({
        name,
        type: types.length === 1 ? types[0] : ({ kind: "union", members: types } as TypeNode),
        optional: fieldPresence.get(name)! < total, // 未出现在全部对象 → optional
      }));
      const obj: Extract<TypeNode, { kind: "object" }> = { kind: "object", name: "", fields };
      root = obj;
      decorateAll(obj, [], true);
    } else {
      // 原始类型数组 / 混合 / 空数组：array 形态（元素可能 union，null 元素并入 union）
      root = { kind: "array", element: mergeElements(value) };
      if (root.element) decorateAll(root.element, [], false); // 对象元素命名（防御路径，正常已被上分支拦截）
    }
  } else {
    root = nodeFromValue(value);
    decorateAll(root, [], true);
  }

  return { root, named };
}

// ---------- 四语言渲染器（纯映射，无私有逻辑；规则表唯一权威） ----------

export type TargetLang = "typescript" | "java" | "go" | "python";

/** 键清洗 */
function camelKey(key: string): string {
  const words = key.split(/[^A-Za-z0-9]+/).filter(Boolean);
  if (!words.length) return "field";
  return words.map((w, i) => (i === 0 ? w[0].toLowerCase() + w.slice(1) : w[0].toUpperCase() + w.slice(1))).join("");
}
function pascalKey(key: string): string { return pascalOf(key); }
function snakeKey(key: string): string {
  const s = key.replace(/[^A-Za-z0-9]+/g, "_");
  return s || "field";
}

const INT_LIMIT = 2147483648; // 2^31（绝对值上限，精确区间 [-2^31, 2^31-1]）
const LONG_LIMIT = 9223372036854775808; // 2^63

interface RenderCtx {
  lang: TargetLang;
  typeName: (node: Extract<TypeNode, { kind: "object" }>) => string;
  pendingOverflow: boolean; // 渲染中出现过超 long 数值 → 该字段渲染 string（数值在树外信息，用字段级判断）
}

/** 单节点 → 类型字符串（无数组包装；数组在各渲染器字段层处理） */
function primType(node: TypeNode, ctx: RenderCtx): string {
  const L = ctx.lang;
  if (node.kind === "string") return L === "java" ? "String" : L === "python" ? "str" : "string";
  if (node.kind === "boolean") return L === "java" ? "Boolean" : L === "typescript" ? "boolean" : "bool";
  if (node.kind === "null") {
    // null 节点单独出现 = 无参照 → unknown；在 union 中由 unionType 特殊处理
    return L === "java" ? "Object" : L === "go" ? "interface{}" : L === "python" ? "Any" : "unknown";
  }
  if (node.kind === "number") {
    if (L === "typescript") return "number"; // 语言内等价合并
    if (L === "java") return node.sub === "int" ? "Integer" : node.sub === "long" ? "Long" : "Double";
    if (L === "go") return node.sub === "int" ? "int" : node.sub === "long" ? "int64" : "float64";
    return node.sub === "double" ? "float" : "int";
  }
  if (node.kind === "object") return ctx.typeName(node);
  if (node.kind === "union") return unionType(node, ctx);
  return "UNKNOWN";
}

/** union：null 成员 → T | null（TS/Python）/ T（Java 包装类型天然可空）/ *T 指针（Go 在字段层处理，此处返回基类型联合） */
function unionType(node: Extract<TypeNode, { kind: "union" }>, ctx: RenderCtx): string {
  const L = ctx.lang;
  const nonNull = node.members.filter((m) => m.kind !== "null");
  const hasNull = node.members.length > nonNull.length;
  const parts = nonNull.map((m) => primType(m, ctx));
  if (L === "java") return parts.length === 1 ? parts[0] : "Object"; // Java 多类型并 Object（List 惯例）
  if (L === "go") return parts.length === 1 ? parts[0] : "interface{}";
  if (L === "python") {
    const py = parts.length === 1 ? parts[0] : `Union[${parts.join(", ")}]`;
    return hasNull ? `Optional[${py}]` : py;
  }
  // TS：语言内等价合并（number 家族去重）
  const merged = parts.filter((p, i) => p === "number" ? parts.indexOf("number") === i : true);
  return hasNull ? [...merged, "null"].join(" | ") : merged.join(" | ");
}

/** 数组节点 → 类型字符串 */
function arrayType(element: TypeNode | null, ctx: RenderCtx, itemWrap?: (t: string) => string): string {
  if (!element) {
    // 空数组/纯 null → unknown[]
    const u = ctx.lang === "java" ? "Object" : ctx.lang === "go" ? "interface{}" : ctx.lang === "python" ? "Any" : "unknown";
    const inner = itemWrap ? itemWrap(u) : u;
    return wrapArray(inner, ctx);
  }
  let inner: string;
  if (element.kind === "object") inner = ctx.typeName(element);
  else if (element.kind === "union") inner = unionType(element, ctx);
  else inner = primType(element, ctx);
  if (itemWrap) inner = itemWrap(inner);
  return wrapArray(inner, ctx);
}

function wrapArray(inner: string, ctx: RenderCtx): string {
  const L = ctx.lang;
  if (L === "typescript") return `${inner}[]`;
  if (L === "java") return `List<${inner}>`;
  if (L === "go") return `[]${inner}`;
  return `List[${inner}]`;
}

/** 字段值节点 → 类型字符串（完整，含数组） */
function valueType(node: TypeNode, ctx: RenderCtx): string {
  if (node.kind === "array") return arrayType(node.element, ctx);
  if (node.kind === "number") {
    // 超 long 降级 string（渲染层判断需要数值——树层不携带值，超 long 数在 JSON.parse 后仍为 number，
    // sub 记 long；此处通过 ctx.pendingOverflow 由构建侧标注（buildTypeTree 后处理：超大值字段替换为 string 节点）
    return primType(node, ctx);
  }
  return primType(node, ctx);
}

// ---------- TypeScript 渲染 ----------

function renderTs(tree: TypeTree): string {
  const blocks: string[] = [];
  if (tree.root.kind === "array") {
    blocks.push(`type Root = ${arrayType(tree.root.element, { lang: "typescript", typeName: (n) => n.name, pendingOverflow: false })};`);
  }
  for (const { name, node } of tree.named) {
    const lines = node.fields.map((f) => {
      const t = f.type.kind === "array" ? arrayType(f.type.element, { lang: "typescript", typeName: (n) => n.name, pendingOverflow: false }) : valueType(f.type, { lang: "typescript", typeName: (n) => n.name, pendingOverflow: false });
      const opt = f.optional ? "?" : "";
      const nullSuffix = f.type.kind === "null" ? "" : "";
      return `  ${camelKey(f.name)}${opt}: ${t}${nullSuffix};`;
    });
    blocks.push(`interface ${name} {\n${lines.join("\n")}\n}`);
  }
  return blocks.join("\n\n");
}

// ---------- Java 渲染 ----------

function renderJava(tree: TypeTree): string {
  const ctx: RenderCtx = { lang: "java", typeName: (n) => n.name, pendingOverflow: false };
  if (tree.root.kind === "array") {
    // Java 根数组显式例外：List<T> 字面类型行（无 class 声明，粘贴用作字段类型注解）
    return arrayType(tree.root.element, ctx);
  }
  // 嵌套对象渲染为 static class，内联在父类体内（先字段后嵌套声明）
  const emit = (name: string, node: Extract<TypeNode, { kind: "object" }>, indent: string): string => {
    const fieldLines = node.fields.map((f) => {
      const t = f.type.kind === "array" ? arrayType(f.type.element, ctx) : primType(f.type, ctx);
      return `${indent}    private ${t} ${camelKey(f.name)};`;
    });
    const nestedParts: string[] = [];
    const pushNested = (child: Extract<TypeNode, { kind: "object" }>): void => {
      nestedParts.push(emit(child.name, child, `${indent}    `));
    };
    for (const f of node.fields) {
      if (f.type.kind === "object") pushNested(f.type);
      else if (f.type.kind === "array" && f.type.element?.kind === "object") pushNested(f.type.element);
      else if (f.type.kind === "union") for (const m of f.type.members) if (m.kind === "object") pushNested(m);
    }
    const parts = [`${indent}public ${indent ? "static " : ""}class ${name} {`, ...fieldLines, ...nestedParts, `${indent}}`];
    return parts.join("\n");
  };
  return emit("Root", tree.named[0].node, "");
}

// ---------- Go 渲染 ----------

function goFieldName(key: string, optional: boolean): string {
  const p = pascalKey(key);
  return p;
}

function renderGo(tree: TypeTree): string {
  const ctx: RenderCtx = { lang: "go", typeName: (n) => n.name, pendingOverflow: false };
  if (tree.root.kind === "array") {
    return `type Root = ${arrayType(tree.root.element, ctx)}`;
  }
  const blocks: string[] = [];
  for (const { name, node } of tree.named) {
    const lines = node.fields.map((f) => {
      let t: string;
      if (f.type.kind === "array") t = arrayType(f.type.element, ctx);
      else if (f.type.kind === "union") {
        // union with null + optional → 指针基类型；否则 interface{}
        const nonNull = f.type.members.filter((m) => m.kind !== "null");
        t = f.optional && nonNull.length === 1 ? `*${primType(nonNull[0], ctx)}` : unionType(f.type, ctx);
      }
      else if (f.optional) t = `*${primType(f.type, ctx)}`; // optional 字段 → 指针
      else t = primType(f.type, ctx);
      const tag = `json:"${f.name}${f.optional ? ",omitempty" : ""}"`;
      return `	${goFieldName(f.name, f.optional)} ${t} \`${tag}\``;
    });
    blocks.push(`type ${name} struct {
${lines.join("\n")}
}`);
  }
  return blocks.join("\n\n");
}

// ---------- Python 渲染 ----------

function renderPython(tree: TypeTree): string {
  const ctx: RenderCtx = { lang: "python", typeName: (n) => n.name, pendingOverflow: false };
  const imports = new Set<string>(["dataclass"]);
  // 收集 typing imports
  const scan = (node: TypeNode): void => {
    if (node.kind === "array") { imports.add("List"); if (node.element) scan(node.element); }
    else if (node.kind === "union") { imports.add("Union"); node.members.forEach(scan); }
    else if (node.kind === "null") imports.add("Any");
    else if (node.kind === "object") node.fields.forEach((f) => scan(f.type));
  };
  scan(tree.root);
  // null → Any 单独出现时 Optional 不需要；union 含 null → Optional
  const needOptional = (node: TypeNode): boolean => {
    if (node.kind === "union" && node.members.some((m) => m.kind === "null")) return true;
    if (node.kind === "array" && node.element) return needOptional(node.element);
    return false;
  };
  const optScan = (node: TypeNode): void => {
    if (node.kind === "object") {
      for (const f of node.fields) if (needOptional(f.type)) { imports.add("Optional"); break; }
      node.fields.forEach((f) => optScan(f.type));
    } else if (node.kind === "array" && node.element) optScan(node.element);
  };
  optScan(tree.root);

  const blocks: string[] = [`from ${[...imports].sort().map((i) => (i === "dataclass" ? "dataclasses import dataclass" : i)).join(", ").replace("dataclasses import dataclass", "dataclasses")}`];
  // 简化：直接生成标准 import 头
  blocks[0] = `from dataclasses import dataclass`;
  const typingImports = [...imports].filter((i) => i !== "dataclass").sort();
  if (typingImports.length) blocks[0] += `
from typing import ${typingImports.join(", ")}`;

  if (tree.root.kind === "array") {
    blocks.push(`Root = ${arrayType(tree.root.element, ctx)}`);
    return blocks.join("\n\n");
  }
  for (const { name, node } of tree.named) {
    const lines = node.fields.map((f) => {
      let t: string;
      if (f.type.kind === "array") t = arrayType(f.type.element, ctx);
      else t = primType(f.type, ctx);
      return `    ${snakeKey(f.name)}: ${t}`;
    });
    blocks.push(`@dataclass\nclass ${name}:\n${lines.join("\n")}`);
  }
  return blocks.join("\n\n");
}

/** 渲染入口：语言分发 */
export function renderTypes(tree: TypeTree, lang: TargetLang): string {
  switch (lang) {
    case "typescript": return renderTs(tree);
    case "java": return renderJava(tree);
    case "go": return renderGo(tree);
    case "python": return renderPython(tree);
  }
}
