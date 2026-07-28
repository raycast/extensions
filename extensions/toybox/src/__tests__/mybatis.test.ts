import assert from "node:assert/strict";
import { test } from "node:test";

import type { ParsedMybatisLog } from "../mybatis";
import {
  countSubstitutablePlaceholders,
  formatParameter,
  parseMybatisLog,
  parseParameter,
  splitParameters,
  substitutePlaceholders,
} from "../mybatis";

/** 拼装一段最小可解析的 MyBatis 日志并解析；解析失败直接抛错以收窄类型。 */
function parse(preparing: string, parameters: string): ParsedMybatisLog {
  const r = parseMybatisLog(`==>  Preparing: ${preparing}\n==> Parameters: ${parameters}`);
  if (!r) throw new Error("未能解析 MyBatis 日志");
  return r;
}

test("splitParameters：独立 null token 视为完整参数（不并入下一个带类型参数）", () => {
  // WHEN Parameters 行含独立 null（MyBatis 对 null 不打印类型后缀）
  // THEN null 与后续带类型参数各自独立
  const tokens = splitParameters("a(String), null, b(String), null, c(Integer)");
  assert.deepEqual(tokens, ["a(String)", "null", "b(String)", "null", "c(Integer)"]);
});

test("splitParameters：值内含 ', ' 的字符串被合并为单个参数", () => {
  // WHEN 一个字符串值本身含 ', '（被逗号切分后缺少类型后缀）
  // THEN re-merge 把它合并回带 (Type) 后缀的完整 token
  const tokens = splitParameters("hello, world(String), null, foo, bar(String)");
  assert.deepEqual(tokens, ["hello, world(String)", "null", "foo, bar(String)"]);
});

test("parseMybatisLog：null 参数居中时对应占位符替换为 NULL", () => {
  // WHEN 第二个参数为独立 null
  // THEN 第二个 ? 被替换为字面量 NULL，其余参数不错位
  const r = parse("SELECT * FROM t WHERE a = ? AND b = ? AND c = ?", "1(Integer), null, x(String)");
  assert.equal(r.parameters.length, 3);
  assert.equal(r.sql, "SELECT * FROM t WHERE a = 1 AND b = NULL AND c = 'x'");
});

test("parseMybatisLog：连续多个 null 全部替换为 NULL", () => {
  const r = parse("SELECT * FROM t WHERE a = ? AND b = ? AND c = ?", "null, null, null");
  assert.equal(r.parameters.length, 3);
  assert.equal(r.sql, "SELECT * FROM t WHERE a = NULL AND b = NULL AND c = NULL");
});

test("parseMybatisLog：null + 数值 + 时间戳 + 含 '?' 的字符串 + 含逗号字符串 综合不偏移", () => {
  // WHEN 参数序列含 null、数值、时间戳、含 '?' 的 XML 字符串、含 ', ' 的字符串
  // THEN 参数数量与占位符一致，null 输出 NULL，其余按类型渲染，XML 内的 '?' 保留
  const xml = '<?xml version="1.0"?><root/>';
  const r = parse(
    "INSERT INTO t (a, b, c, d, e, f) VALUES (?, ?, ?, ?, ?, ?)",
    `1(Integer), null, 2026-07-20 22:00:55.412(Timestamp), ${xml}(String), hello, world(String), null`,
  );
  assert.equal(r.parameters.length, 6);
  assert.equal(
    r.sql,
    "INSERT INTO t (a, b, c, d, e, f) VALUES (1, NULL, '2026-07-20 22:00:55.412', '<?xml version=\"1.0\"?><root/>', 'hello, world', NULL)",
  );
});

test("parseMybatisLog：用户报告的真实日志（多个 null）不串行偏移", () => {
  // 来自 tmp/fix.md 的真实样本：null 参数曾导致 35 个参数错缩为 16
  const preparing =
    "INSERT INTO t_ob_manual_order ( `system`, plan_id, code, type_code, staff_id, staff_name, order_time, task_name, call_number, branch_company, orga_id, orga_name, product_name, product_id, scene_value, contact_name, card_id, contact_number, address, address_district, appointment_time, remark, chat_id, status, body, results, qualitylow_id, devcode, bucket, DEV_NAME, DEV_CODE, CHNL_NAME, CHNL_CODE, task_label, extra1, extra2 ) VALUES ( ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ? )";
  const parameters =
    "集约生产工作台(String), null, 20260720220054316(String), 03(String), 10000015(String), 张晓敏(String), 2026-07-20 22:00:55.412(Timestamp), null, 02205617994(String), 13163121661(String), null, null, null, null, null, null, 王(String), 120000000000000000(String), 13163121661(String), (String), null, null, 全任务-市场任务测试，请不要给用户联系(String), null, 1(String), null, null, null, null, null, null, null, null, [], null, null(String)";
  const r = parse(preparing, parameters);
  assert.equal(r.parameters.length, 35);
  assert.equal(countSubstitutablePlaceholders(r.template), 35);
  // 所有 SQL 上下文占位符均被替换；残留的 ? 只可能来自字符串字面量值内部。
  const placeholderLess = r.sql.replace(/'[^']*'/g, "''");
  assert.ok(!placeholderLess.includes("?"), `SQL 上下文仍残留 ?: ${r.sql}`);
  // 第二个参数（原被错误合并）应为 NULL
  assert.equal(formatParameter(r.parameters[1]), "NULL");
});

test("回归：字符串字面量内的 ? 不被替换", () => {
  const r = parse("SELECT * FROM docs WHERE title LIKE '%?%' AND id = ?", "7(Integer)");
  assert.equal(r.sql, "SELECT * FROM docs WHERE title LIKE '%?%' AND id = 7");
});

test("回归：行注释内的 ? 不被替换", () => {
  // 日志中换行以字面量 `\n` 编码，经 unescapeSqlText 还原为真实换行；注释内的 ? 不被替换。
  const r = parse("SELECT 1 -- pending ?\\nFROM dual", "");
  assert.equal(r.sql, "SELECT 1 -- pending ?\nFROM dual");
});

test("回归：数值类型原样输出、字符串单引号双写转义", () => {
  assert.equal(formatParameter(parseParameter("42(Integer)")), "42");
  assert.equal(formatParameter(parseParameter("O'Brien(String)")), "'O''Brien'");
  assert.equal(formatParameter(parseParameter("null")), "NULL");
  assert.equal(formatParameter(parseParameter("null(String)")), "NULL");
});

test("回归：substitutePlaceholders 不丢失 SQL 模板字符", () => {
  const sql = substitutePlaceholders("SELECT ... WHERE a = ? AND b like concat('%', ?, '%')", [
    parseParameter("1(Integer)"),
    parseParameter("x(String)"),
  ]);
  assert.equal(sql, "SELECT ... WHERE a = 1 AND b like concat('%', 'x', '%')");
});
