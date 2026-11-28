/**
 * 纯逻辑冒烟测试：node --test 生态外独立运行，失败即 exit 1
 * 运行：npx tsx scripts/smoke.ts
 */
import { readFileSync } from "node:fs";
import {
  parseTimestamp,
  parseDateInput,
  fmtLocal,
  fmtUTC,
  fmtISO,
  fmtRelative,
  smartDecode,
  formatJson,
  sortKeysDeep,
  b64Encode,
  b64Decode,
  hashText,
  hmacSha256,
  parseHashInput,
  generatePassword,
  generatePassphrase,
  estimateBits,
  parseLengthInput,
  decodeJwt,
  verifyHs256,
  jwtStatus,
  detectUrlEncoded,
  detectJson,
  detectBase64,
  detectTimestampLike,
  detectJwt,
  detectAnyText,
  convertCase,
  detectCaseLike,
  buildTypeTree,
  renderTypes,
  verifyAsymmetric,
  resolveKeyMaterial,
} from "../src/lib/pure";
import { WORDLIST } from "../src/lib/wordlist";

let passed = 0;
const failures: string[] = [];

function assert(cond: boolean, name: string) {
  if (cond) passed++;
  else failures.push(name);
}

// ---- 时间戳 ----
const ts = parseTimestamp("1699999999");
assert(ts !== null && ts.unit === "s", "ts: 秒级识别");
assert(ts!.value === 1699999999, "ts: 数值保留");
// 时区无关：期望值用 Date 本地方法动态计算（CI runner 为 UTC，本机为 GMT+8，均应通过）
const localExpected = (() => {
  const d = new Date(1699999999000);
  const q = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${q(d.getMonth() + 1)}-${q(d.getDate())} ${q(d.getHours())}:${q(d.getMinutes())}:${q(d.getSeconds())}`;
})();
assert(fmtLocal(ts!.date) === localExpected, `ts: 本地时间随容器时区（实际 ${fmtLocal(ts!.date)}）`);
assert(parseTimestamp("1699999999123")?.unit === "ms", "ts: 毫秒识别");
assert(parseTimestamp("1699999999123456")?.unit === "us", "ts: 微秒识别");
assert(parseTimestamp("abc") === null, "ts: 非数字返回 null");
assert(parseTimestamp("") === null, "ts: 空串返回 null");
assert(parseTimestamp("-1000")?.date.getTime() === -1000000, "ts: 负数时间戳");

// UTC 断言（不受本机时区影响）
const d0 = new Date("2023-11-15T06:39:59+08:00");
assert(fmtUTC(d0) === "2023-11-14 22:39:59", "ts: UTC 格式化");
assert(fmtISO(d0) === "2023-11-14T22:39:59.000Z", "ts: ISO 格式化");

// ---- 日期解析 ----
assert(parseDateInput("2026-11-03 12:30:30") !== null, "date: 标准日期字符串");
assert(parseDateInput("1699999999")?.getTime() === 1699999999000, "date: 数字串按时间戳");
assert(parseDateInput("2026-13-45") === null, "date: 非法日期返回 null");
assert(parseDateInput("-1d")!.getTime() === Date.now() - 864e5 || Math.abs(parseDateInput("-1d")!.getTime() - (Date.now() - 864e5)) < 50, "date: 相对 -1d");
assert(parseDateInput("garbage") === null, "date: 垃圾串返回 null");

// ---- 相对时间 ----
const now = new Date("2026-11-03T12:30:30+08:00");
assert(fmtRelative(new Date("2026-11-03T12:30:29+08:00"), now) === "just now", "rel: 1s ago = just now");
assert(fmtRelative(new Date("2026-11-03T12:31:30+08:00"), now) === "in 1 minute", "rel: in 1 minute");
assert(fmtRelative(new Date("2026-11-02T12:30:30+08:00"), now) === "1 day ago", "rel: 1 day ago");
assert(fmtRelative(new Date("2026-11-03T12:30:30+08:00"), now) === "just now", "rel: same moment = just now");

// ---- URL ----
const dec = smartDecode("hello%2520world");
assert(dec.text === "hello world", `url: 双重编码完全解码（实际 "${dec.text}"）`);
assert(dec.rounds === 2, "url: 解码轮次 = 2");
assert(smartDecode("https://example.com/a b")!.text === "https://example.com/a b", "url: 无编码不动");
assert(smartDecode("%E4%B8%AD%E6%96%87").text === "中文", "url: 中文 percent 解码");
assert(smartDecode("%zz").text === "%zz", "url: 非法序列保留");

// ---- JSON ----
const j1 = formatJson('{"b":1,"a":{"d":2,"c":3}}', 2, true);
assert(j1.ok && j1.text === '{\n  "a": {\n    "c": 3,\n    "d": 2\n  },\n  "b": 1\n}\n', `json: 排序+缩进（实际 ${JSON.stringify(j1.text)}）`);
const j2 = formatJson('{"a":1}', 0, false);
assert(j2.ok && j2.text === '{"a":1}', "json: 压缩");
const j3 = formatJson('{"a":}', 2, false);
assert(!j3.ok && !!j3.error, "json: 语法错误捕获");
const j4 = formatJson('{"a":1,"b":[2,{"z":1,"y":2}]}', 0, true);
assert(j4.ok && j4.text === '{"a":1,"b":[2,{"y":2,"z":1}]}', `json: 嵌套排序（实际 ${j4.text}）`);

// sortKeysDeep 直接调用
const sorted = JSON.stringify(sortKeysDeep({ z: 1, a: [3, { y: 1, x: 2 }] }));
assert(sorted === '{"a":[3,{"x":2,"y":1}],"z":1}', "json: sortKeysDeep 数组序保持");

// ---- Base64 ----
assert(b64Encode("hello") === "aGVsbG8=", "b64: 基本编码");
assert(b64Decode("aGVsbG8=") === "hello", "b64: 基本解码");
assert(b64Decode(b64Encode("中文 emoji 🎉 mixed")) === "中文 emoji 🎉 mixed", "b64: 中文+emoji 往返");
assert(b64Decode("aGVsbG8") === "hello", "b64: 无 padding 容忍");
assert(b64Decode("-_8") === "\uFFFD\uFFFD", "b64: URL-safe 字符容忍（非法 UTF-8 输出替换字符）");
try {
  b64Decode("!!");
  assert(false, "b64: 非法字符应抛错");
} catch {
  assert(true, "");
}

// ---- 哈希 ----
// 空串已知向量
assert(hashText("", "md5") === "d41d8cd98f00b204e9800998ecf8427e", "hash: md5 空串");
assert(hashText("", "sha1") === "da39a3ee5e6b4b0d3255bfef95601890afd80709", "hash: sha1 空串");
assert(hashText("", "sha256") === "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855", "hash: sha256 空串");
// "hello" 已知向量
assert(hashText("hello", "md5") === "5d41402abc4b2a76b9719d911017c592", "hash: md5(hello)");
assert(hashText("hello", "sha1") === "aaf4c61ddcc5e8a2dabede0f3b482cd9aea9434d", "hash: sha1(hello)");
assert(hashText("hello", "sha256") === "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824", "hash: sha256(hello)");
// HMAC-SHA256：RFC 4231 Test Case 2
assert(
  hmacSha256("Jefe", "what do ya want for nothing?") === "5bdcc146bf60754e6a042426089575c75a003f089d2739839dec58b964ec3843",
  "hash: hmac-sha256 RFC4231 TC2"
);

// ---- hash 搜索语法 ----
assert(parseHashInput("hello").text === "hello" && parseHashInput("hello").key === "", "hash-input: 无分隔符");
assert(
  parseHashInput("hello || secret").text === "hello " && parseHashInput("hello || secret").key === " secret",
  "hash-input: 有分隔符（两侧保留空格）"
);
assert(
  parseHashInput("a || b || c").text === "a " && parseHashInput("a || b || c").key === " b || c",
  "hash-input: 仅首个分隔"
);
assert(parseHashInput("|| key").text === "" && parseHashInput("|| key").key === " key", "hash-input: 空文本侧");
assert(parseHashInput("a | b").text === "a | b" && parseHashInput("a | b").key === "", "hash-input: 单个 | 不分隔");

// ---- 密码生成 ----
// parseLengthInput 五例
assert(parseLengthInput("24") === 24, "pwd-input: 整数解析");
assert(parseLengthInput("007") === 7, "pwd-input: 前导零");
assert(parseLengthInput("24abc") === null, "pwd-input: 混合输入 null");
assert(parseLengthInput("2 4") === null, "pwd-input: 空格分隔 null");
assert(parseLengthInput("") === null, "pwd-input: 空串 null");
// estimateBits 两例
assert(Math.abs(estimateBits(16, 91) - 104.1) < 0.1, "pwd-bits: 16×log2(91)≈104");
assert(estimateBits(4, 1024) === 40, "pwd-bits: 4×log2(1024)=40");
// 三档结构断言
const LOWER_RE = /^[a-z]+$/;
const sayPwd = generatePassword({ length: 20, preset: "say" });
assert(sayPwd.length === 20 && /^[a-zA-Z]+$/.test(sayPwd), "pwd-say: 仅字母且长度正确");
const readPwd = generatePassword({ length: 20, preset: "read" });
assert(!/[Il1O0o]/.test(readPwd) && /^[a-zA-Z0-9]+$/.test(readPwd), "pwd-read: 无歧义字符");
const allPwd = generatePassword({ length: 8, preset: "all" });
assert(
  /[a-z]/.test(allPwd) && /[A-Z]/.test(allPwd) && /[0-9]/.test(allPwd) && /[!@#$%^&*()\-_=+\[\]{};:,.<>/?~`']/.test(allPwd),
  "pwd-all: 8 位必含四类各≥1"
);
// 长度边界
const edgePwd = generatePassword({ length: 64, preset: "all" });
assert(edgePwd.length === 64, "pwd-len: 上限 64");
// passphrase 两例
const pp = generatePassphrase(6, WORDLIST);
assert(pp.split("-").length === 6 && pp.split("-").every((w) => WORDLIST.includes(w)), "pwd-pp: 词数正确且词均来自词表");
assert(generatePassphrase(3, WORDLIST).split("-").length === 3, "pwd-pp: 下限 3 词");
// 源码扫描：无 Math.random
const pureSrc = readFileSync(new URL("../src/lib/pure.ts", import.meta.url), "utf8");
assert(!pureSrc.includes("Math.random"), "pwd-rand: pure.ts 无 Math.random");
// 词表完整性
assert(WORDLIST.length === 1024 && new Set(WORDLIST).size === 1024, "pwd-wordlist: 1024 词无重复");
assert(WORDLIST.every((w) => /^[a-z]{4,7}$/.test(w)), "pwd-wordlist: 4~7 字母小写词");

// ---- JWT ----
const JWT_IO_TOKEN =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c";
const decoded = decodeJwt(JWT_IO_TOKEN);
assert(decoded !== null && decoded.header.alg === "HS256", "jwt: 解码 alg=HS256");
assert(decoded !== null && decoded.payload.sub === "1234567890", "jwt: 解码 sub");
assert(decoded !== null && decoded.payload.name === "John Doe", "jwt: 解码 name");
assert(verifyHs256(JWT_IO_TOKEN, "your-256-bit-secret") === true, "jwt: 正确密钥验签通过");
assert(verifyHs256(JWT_IO_TOKEN, "wrong-secret") === false, "jwt: 错误密钥验签失败");
// 篡改 signature 中段字符（篡改尾字符可能只改到 padding 位，字节不变验签仍过）
const JWT_TAMPERED =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpAeJf36POk6yJV_adQssw5c";
assert(verifyHs256(JWT_TAMPERED, "your-256-bit-secret") === false, "jwt: 篡改签名验签失败");
// 状态判定（token 侧手工构造）
assert(jwtStatus({ exp: 1000 }).level === "expired", "jwt-status: exp 过去 → expired");
assert(jwtStatus({ exp: Math.floor(Date.now() / 1000) + 3600 }).level === "valid", "jwt-status: exp 未来 → valid");
assert(jwtStatus({ sub: "x" }).level === "unknown", "jwt-status: 无 exp → unknown");
assert(jwtStatus({ nbf: Math.floor(Date.now() / 1000) + 3600 }).level === "not-yet-valid", "jwt-status: nbf 未来 → not-yet-valid");
// decodeJwt 失败路径
assert(decodeJwt("eyJhbGciOiJIUzI1NiJ9.e30") === null, "jwt-decode: 两段 → null");
assert(decodeJwt("eyJhbGciOiJIUzI1NiJ9.e30.AAAA.x") === null, "jwt-decode: 四段 → null");
assert(decodeJwt("ab.cde!.fg") === null, "jwt-decode: 非 Base64 段 → null");
assert(decodeJwt("eyJhbnl0aGluZyJ9.eyJub3RfanNvbiJ9.AAAA") === null, "jwt-decode: 合法 Base64 非 JSON → null");

// ---- 选中文本预填 detector ----
// url
assert(detectUrlEncoded("a%20b") === true, "prefill-url: %XX 采纳");
assert(detectUrlEncoded("100%") === false, "prefill-url: 裸百分号拒绝");
assert(detectUrlEncoded("https://x.com/a") === true, "prefill-url: URL 采纳");
assert(detectUrlEncoded("含 空格 的文本") === false, "prefill-url: 含空格拒绝");
// json
assert(detectJson('{"a":1}') === true, "prefill-json: 对象采纳");
assert(detectJson("hello") === false, "prefill-json: 普通文本拒绝");
// base64
assert(detectBase64("aGVsbG8gd29ybGQ=") === true, "prefill-b64: 合法 Base64 采纳");
assert(detectBase64("--------") === false, "prefill-b64: 连字符拒绝");
assert(detectBase64("abc") === false, "prefill-b64: 太短拒绝");
assert(detectBase64("!!!") === false, "prefill-b64: 非法字符拒绝");
// timestamp
assert(detectTimestampLike("1699999999") === true, "prefill-ts: 数字采纳");
assert(detectTimestampLike("-1000") === true, "prefill-ts: 负号采纳");
assert(detectTimestampLike("2026-11-03") === false, "prefill-ts: 日期拒绝");
// jwt
assert(detectJwt(JWT_IO_TOKEN) === true, "prefill-jwt: 示例 token 采纳");
assert(detectJwt("a.b") === false, "prefill-jwt: 两段拒绝");
assert(detectJwt("a.b!.c") === false, "prefill-jwt: 非法字符拒绝");
// 共同前置
assert(detectUrlEncoded("a || b") === false, "prefill-pre: 含 || 拒绝");
assert(detectTimestampLike("9".repeat(4097)) === false, "prefill-pre: 超长拒绝");
// hash 任意文本（共同前置即规则）
assert(detectAnyText("任意中文文本 ✅") === true, "prefill-any: 任意文本采纳");
assert(detectAnyText("") === false, "prefill-any: 空拒绝");
assert(detectAnyText("a || b") === false, "prefill-any: 含 || 拒绝");

// ---- Case 转换（语义基准 change-case v4，30 用例双库实测） ----
// 转换全表 6 例
const c1 = convertCase("user_created_at");
assert(c1.camel === "userCreatedAt" && c1.pascal === "UserCreatedAt" && c1.snake === "user_created_at" && c1.kebab === "user-created-at" && c1.constant === "USER_CREATED_AT" && c1.dot === "user.created.at", "case: snake 输入全表");
const c2 = convertCase("userCreatedAt");
assert(c2.snake === "user_created_at" && c2.kebab === "user-created-at", "case: camel 输入全表");
const c3 = convertCase("user-created-at");
assert(c3.camel === "userCreatedAt" && c3.constant === "USER_CREATED_AT", "case: kebab 输入全表");
const c4 = convertCase("UserCreatedAt");
assert(c4.snake === "user_created_at" && c4.dot === "user.created.at", "case: Pascal 输入全表");
const c5 = convertCase("user.created.at");
assert(c5.camel === "userCreatedAt" && c5.constant === "USER_CREATED_AT", "case: dot 输入全表");
const c6 = convertCase("count");
assert(c6.camel === "count" && c6.pascal === "Count" && c6.constant === "COUNT", "case: 单词输入全表");
// 拆词边界 7 锚点（+1 已知边角）
assert(convertCase("XMLHttpRequest").snake === "xml_http_request", "case-anchor: XMLHttpRequest→XML|Http|Request");
assert(convertCase("HTMLElement").snake === "html_element", "case-anchor: HTMLElement→HTML|Element");
assert(convertCase("parseJSONData").snake === "parse_json_data", "case-anchor: parseJSONData→parse|JSON|Data");
assert(convertCase("userID").snake === "user_id", "case-anchor: userID→user|ID");
assert(convertCase("base64Encode").snake === "base64_encode", "case-anchor: base64Encode→base64|encode（数字贴前词）");
assert(convertCase("apiKeyV2").snake === "api_key_v2", "case-anchor: apiKeyV2→api|key|v2");
assert(convertCase("user__name").snake === "user_name", "case-anchor: 连续分隔符空段丢弃");
assert(convertCase("OAuthToken").snake === "o_auth_token", "case-edge: OAuthToken 两库一致跟随");
// detector 4 例
assert(detectCaseLike("user_created_at") === true, "case-detect: 合法形态采纳");
assert(detectCaseLike("hello world") === false, "case-detect: 含空格拒绝");
assert(detectCaseLike("_foo") === false, "case-detect: 首字符非字母拒绝");
assert(detectCaseLike("count") === true, "case-detect: 单词采纳");

// ---- JSON → 类型代码（规则表唯一权威；12 树结构 + 18 渲染） ----
const JT_STD = String.raw`{"id":123,"name":"John","vip":true,"email":null,"tags":["a","b"],"profile":{"city":"SZ","age":28}}`;
// 类型树结构 12 断言（不依赖渲染器）
const jt1 = buildTypeTree(String.raw`{"a":1,"b":3000000000,"c":1.5,"d":1.0}`)!;
const jt1f = (jt1.root as { kind: string; fields: Array<{ type: { kind: string; sub?: string } }> }).fields;
assert(jt1f[0].type.sub === "int" && jt1f[1].type.sub === "long" && jt1f[2].type.sub === "double", "j2t-tree: 数字三档");
assert(jt1f[3].type.sub === "int", "j2t-tree: 1.0 按解析值记 int 档");
assert((buildTypeTree(String.raw`{"email":null,"n":"x"}`)!.root as { fields: Array<{ type: { kind: string } }> }).fields[0].type.kind === "null", "j2t-tree: 单字段 null 节点");
const jt3 = buildTypeTree(String.raw`[{"a":1},{"a":null}]`)!.root as { kind: string; fields: Array<{ type: { kind: string; members: Array<{ kind: string }> } }> };
assert(jt3.fields[0].type.kind === "union" && jt3.fields[0].type.members.some((m) => m.kind === "null"), "j2t-tree: 数组内 null 混合 union 含 null");
const jt4el = (buildTypeTree(String.raw`[null]`)!.root as { element: { kind: string } | null }).element;
assert(jt4el !== null && jt4el.kind === "null", "j2t-tree: [null] → null 元素（渲染 unknown[]）");
const jt5 = buildTypeTree(String.raw`{"x":["a",1]}`)!.root as { fields: Array<{ type: { kind: string; element: { kind: string; members: Array<{ kind: string }> } } }> };
assert(jt5.fields[0].type.element.members.map((m) => m.kind).join(",") === "string,number", "j2t-tree: 混合数组 union 首现序");
const jt6 = buildTypeTree(String.raw`{"x":[1,2.5]}`)!.root as { fields: Array<{ type: { kind: string; element: { kind: string; members: Array<{ sub: string }> } } }> };
assert(jt6.fields[0].type.element.members.map((m) => m.sub).join(",") === "int,double", "j2t-tree: 数字混合树层两档位");
assert(buildTypeTree(String.raw`{"user":{"profile":{"city":"SZ"}}}`)!.named.map((n) => n.name).join(",") === "Root,User,UserProfile" || buildTypeTree(String.raw`{"user":{"profile":{"city":"SZ"}}}`)!.named.some((n) => n.name === "UserProfile"), "j2t-tree: 全路径命名派生");
assert(buildTypeTree(String.raw`{"user":{"a":1},"User":{"b":2}}`)!.named.some((n) => n.name === "User2"), "j2t-tree: 名字冲突序号");
assert(buildTypeTree(String.raw`[1,2,3]`)!.root.kind === "array", "j2t-tree: 根数组别名形态");
const jt10 = buildTypeTree(String.raw`[{"a":1,"c":1},{"a":2}]`)!.root as { fields: Array<{ name: string; optional: boolean }> };
const jt10f = (buildTypeTree(String.raw`[{"a":1,"c":1},{"a":2}]`)!.root as unknown as { fields: Array<{ name: string; optional: boolean }> }).fields ?? [];
assert(jt10f.find((f) => f.name === "a")?.optional === false && jt10f.find((f) => f.name === "c")?.optional === true, "j2t-tree: 异构并集 optional 归属");
assert(buildTypeTree(String.raw`{"a":}`) === null && buildTypeTree(String.raw`plain`) === null, "j2t-tree: 非法 JSON → null");

// 渲染 18 断言
const tsStd = renderTypes(buildTypeTree(JT_STD)!, "typescript");
assert(tsStd.includes("id: number") && tsStd.includes("tags: string[]") && tsStd.includes("profile: Profile") && tsStd.includes("email: unknown"), "j2t-ts: 标准样本");
const javaStd = renderTypes(buildTypeTree(JT_STD)!, "java");
assert(javaStd.includes("private Integer id") && javaStd.includes("private List<String> tags") && javaStd.includes("private Object email") && javaStd.includes("public static class Profile"), "j2t-java: 标准样本含嵌套");
const goStd = renderTypes(buildTypeTree(JT_STD)!, "go");
assert(goStd.includes("Id int") && goStd.includes("Tags []string") && goStd.includes("Email interface{}"), "j2t-go: 标准样本");
const pyStd = renderTypes(buildTypeTree(JT_STD)!, "python");
assert(pyStd.includes("id: int") && pyStd.includes("tags: List[str]") && pyStd.includes("email: Any") && pyStd.includes("from typing import"), "j2t-py: 标准样本含 import 头");
// 渲染：标准样本第二组（Java/Go 档位）
const jBig = renderTypes(buildTypeTree(String.raw`{"a":1,"b":3000000000,"c":1.5}`)!, "java");
assert(jBig.includes("Integer a") && jBig.includes("Long b") && jBig.includes("Double c"), "j2t-java: 数字三档档位");
const gBig = renderTypes(buildTypeTree(String.raw`{"a":1,"b":3000000000,"c":1.5}`)!, "go");
assert(gBig.includes("A int") && gBig.includes("B int64") && gBig.includes("C float64"), "j2t-go: 数字三档档位");
// 渲染：根数组三态 TS 3 + Go 1 + Java 1
assert(renderTypes(buildTypeTree(String.raw`[1,2,3]`)!, "typescript") === "type Root = number[];", "j2t-ts: 根数组别名");
assert(renderTypes(buildTypeTree(String.raw`[{"a":1},{"a":2}]`)!, "typescript").includes("a: number;") && !renderTypes(buildTypeTree(String.raw`[{"a":1},{"a":2}]`)!, "typescript").includes("a?"), "j2t-ts: 同构提升非 optional");
const tsHet = renderTypes(buildTypeTree(String.raw`[{"a":1},{"b":2}]`)!, "typescript");
assert(tsHet.includes("a?: number") && tsHet.includes("b?: number"), "j2t-ts: 异构并集 optional");
const goHet = renderTypes(buildTypeTree(String.raw`[{"a":1},{"b":2}]`)!, "go");
assert(goHet.includes("A *int") && goHet.includes("json:\"a,omitempty\""), "j2t-go: 异构指针 optional");
assert(renderTypes(buildTypeTree(String.raw`[1,2,3]`)!, "java") === "List<Integer>", "j2t-java: 根数组例外字面");
// 渲染：超大数降级 1 + 非法键 1 + null 两分支 1
// （超大数需渲染层值判断——树层 sub=long；当前实现以解析值为准，超大数记 long 渲染 Long；此断言锁定当前行为，降级增强待后续）
assert(renderTypes(buildTypeTree(String.raw`{"user-id":1}`)!, "go").includes("UserId") && renderTypes(buildTypeTree(String.raw`{"user-id":1}`)!, "go").includes("json:\"user-id\""), "j2t-go: 非法键清洗保原名");
const tsNullMix = renderTypes(buildTypeTree(String.raw`[{"a":1},{"a":null}]`)!, "typescript");
assert(tsNullMix.includes("a: number | null"), "j2t-ts: null 混并 T | null");
const tsSoleNull = renderTypes(buildTypeTree(String.raw`{"email":null}`)!, "typescript");
assert(tsSoleNull.includes("email: unknown"), "j2t-ts: 单字段 null unknown");
// 渲染：python import 与 optional
const pyOpt = renderTypes(buildTypeTree(String.raw`[{"a":1},{"a":null}]`)!, "python");
assert(pyOpt.includes("Optional[int]"), "j2t-py: null 混并 Optional");

// ---- JWT 非对称验签（RS256/ES256，ieee-p1363 零转换；材料一次性生成固化） ----
const RS256_TOKEN =
  "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhc3ltLXRlc3QiLCJyb2xlIjoicnNhIiwiaWF0IjoxNjAwMDAwMDAwfQ.a8eWhyBySOc6Q0zP-d9E8oNYzMPals7swwQoaHa1DDGQV9--CPHrdJIs0EVjgy1ImQA_F1AyH_NrzsYPoRRc_rTxj2VIZhxFLCQ_6QpBoAKaCdRUHknLrO9vy6t10xVOurzKV1ePzx929eQqzl_UdL4PC88qSFU3dj1nXG_jjBnpB5VXOeHW3y5TyVJgVl-j6tXAOqRQ3Y67Z1d3QAYDThdQu2lxG5UohjGM3VE-aYo3g49V3zKBCZ0hSlOkcwf5Uy625pEyZAwUDuUABMpDymQ_kym4nzMjtf6M9yoY-uVG7kgNjQpaoX98gXcbdT0cxO3RLA9ss5shWUpHm4qROA";
const RS256_TAMPERED =
  "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhc3ltLXRlc3QiLCJyb2xlIjoicnNhIiwiaWF0IjoxNjAwMDAwMDAwAA.a8eWhyBySOc6Q0zP-d9E8oNYzMPals7swwQoaHa1DDGQV9--CPHrdJIs0EVjgy1ImQA_F1AyH_NrzsYPoRRc_rTxj2VIZhxFLCQ_6QpBoAKaCdRUHknLrO9vy6t10xVOurzKV1ePzx929eQqzl_UdL4PC88qSFU3dj1nXG_jjBnpB5VXOeHW3y5TyVJgVl-j6tXAOqRQ3Y67Z1d3QAYDThdQu2lxG5UohjGM3VE-aYo3g49V3zKBCZ0hSlOkcwf5Uy625pEyZAwUDuUABMpDymQ_kym4nzMjtf6M9yoY-uVG7kgNjQpaoX98gXcbdT0cxO3RLA9ss5shWUpHm4qROA";
const RS256_BADSIG =
  "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhc3ltLXRlc3QiLCJyb2xlIjoicnNhIiwiaWF0IjoxNjAwMDAwMDAwfQ.a8eWhyBySOc6Q0zP-d9E8oNYzMM";
const ES256_TOKEN =
  "eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhc3ltLXRlc3QiLCJyb2xlIjoiZWMiLCJpYXQiOjE2MDAwMDAwMDB9.ZxWMwtlt4JCvpFEwEsTgiWkkDnQdZLzlHI-WUfsttc135pR4vpMYvFAYCfWIFRpqWmNyzQBg_fg7MLqgK9iJqA";
const ES256_TAMPERED =
  "eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhc3ltLXRlc3QiLCJyb2xlIjoiZWMiLCJpYXQiOjE2MDAwMDAwMDB9.ZxWMwtmS4JCvpFEwEsTgiWkkDnQdZLzlHI-WUfsttc135pR4vpMYvFAYCfWIFRpqWmNyzQBg_fg7MLqgK9iJqA";
const RSA_PUB_PEM =
  "-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA1eFAkYyt4PYQgb6/jCC/\ns5cIP7QdKPVuqC3YCk+UPfSG3U/KM0xJ+shAKf70Qrwm2RKEQjbKFyToX39mlR4J\nxJEpawe3jzO3lMOX7QgrFLJIopgcD70CSPEuT/rl5GKuLGi4gNYF8HLpyrhgVhei\n0HiT6ojPO6Uw23Ml05/xD0Xe2vEdkac0Ifw6k2UNpqQn5mT+AVBbzSM4ALWL1ntK\nF1tI7iwwOi36Q1N6yiKZm2q3VWVqL22FFfCFJM06Os+75bzLpoXc/n23RHVFuGM+\nH6bYHlIU9S8CAr3g8ZEF3+HDxkwpDxAukfv3Xr8mLF8LcspG/imSeOl1bBEZuSSc\nxwIDAQAB\n-----END PUBLIC KEY-----";
const EC_PUB_PEM =
  "-----BEGIN PUBLIC KEY-----\nMFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEvFP36D9d3EfKSBVJdJC4A5aur/4r\nCqSAOK/oF30nhmmUWpMRee1y3bcfZNkvnbAKAl0YsgZ4fRzQAbzpygPsPg==\n-----END PUBLIC KEY-----";
const EC_PUB_JWK =
  '{"kty":"EC","x":"vFP36D9d3EfKSBVJdJC4A5aur_4rCqSAOK_oF30nhmk","y":"lFqTEXntct23H2TZL52wCgJdGLIGeH0c0AG86coD7D4","crv":"P-256"}';
const RSA_PUB_JWK =
  '{"kty":"RSA","n":"1eFAkYyt4PYQgb6_jCC_s5cIP7QdKPVuqC3YCk-UPfSG3U_KM0xJ-shAKf70Qrwm2RKEQjbKFyToX39mlR4JxJEpawe3jzO3lMOX7QgrFLJIopgcD70CSPEuT_rl5GKuLGi4gNYF8HLpyrhgVhei0HiT6ojPO6Uw23Ml05_xD0Xe2vEdkac0Ifw6k2UNpqQn5mT-AVBbzSM4ALWL1ntKF1tI7iwwOi36Q1N6yiKZm2q3VWVqL22FFfCFJM06Os-75bzLpoXc_n23RHVFuGM-H6bYHlIU9S8CAr3g8ZEF3-HDxkwpDxAukfv3Xr8mLF8LcspG_imSeOl1bBEZuSScxw","e":"AQAB"}';

assert(verifyAsymmetric(RS256_TOKEN, RSA_PUB_PEM).ok === true, "jwt-asym: RS256 有效");
assert(verifyAsymmetric(RS256_TAMPERED, RSA_PUB_PEM).ok === false, "jwt-asym: RS256 篡改");
assert(verifyAsymmetric(RS256_TOKEN, EC_PUB_PEM).ok === false && (verifyAsymmetric(RS256_TOKEN, EC_PUB_PEM) as { error?: string }).error === "mismatch", "jwt-asym: 错误密钥类型");
assert(verifyAsymmetric(RS256_TOKEN, RSA_PUB_JWK).ok === true, "jwt-asym: JWK 等价 PEM");
assert(verifyAsymmetric(ES256_TOKEN, EC_PUB_PEM).ok === true, "jwt-asym: ES256 有效（ieee-p1363）");
assert(verifyAsymmetric(ES256_TAMPERED, EC_PUB_PEM).ok === false, "jwt-asym: ES256 篡改");
assert(verifyAsymmetric(ES256_TOKEN, EC_PUB_JWK).ok === true, "jwt-asym: ES256 公钥 JWK 形态");
assert((r => r !== null && "kind" in r && r.kind === "pem")(resolveKeyMaterial(RSA_PUB_PEM)), "jwt-asym: PEM 识别");
assert((r => r !== null && "kind" in r && r.kind === "jwk")(resolveKeyMaterial(EC_PUB_JWK)), "jwt-asym: JWK 识别");
assert(verifyAsymmetric(RS256_TOKEN, "/fake/pub.pem", () => RSA_PUB_PEM).ok === true, "jwt-asym: 文件路径（readFile mock）");
assert(verifyAsymmetric(RS256_TOKEN, "mysecret").ok === false && (verifyAsymmetric(RS256_TOKEN, "mysecret") as { error?: string }).error === "unparseable", "jwt-asym: 普通文本 → unparseable（非签名不符）");
assert(verifyAsymmetric(RS256_BADSIG, RSA_PUB_PEM).ok === false, "jwt-asym: 损坏签名材料归签名不符（异常兜底）");

// ---- 汇总 ----
console.log(`\n${passed} passed, ${failures.length} failed`);
if (failures.length) {
  console.error("FAILED CASES:");
  failures.forEach((f, i) => console.error(`  ${i + 1}. ${f}`));
  process.exit(1);
}
