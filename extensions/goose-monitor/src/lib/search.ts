import type { AppRow } from "./types";

/* Raycast 原生 filtering 会处理名称/路径的模糊匹配；这里的本地过滤只做两件原生做不到的事：
   端口查询（"8101" / ":8101" 精确命中）与 PID / Helper 名的匹配。
   ponytail: 没有移植 goose-monitor 的 fuzzy 打分与高亮（那是自绘列表的需求）。 */

/** `8101` / `:8101` → 端口号；非法或超范围返回 null。 */
export function parsePortQuery(query: string): number | null {
  const match = query.trim().match(/^:?(\d+)$/);
  if (!match) return null;
  const port = Number(match[1]);
  return Number.isInteger(port) && port >= 1 && port <= 65535 ? port : null;
}

/** 归一化：大小写不敏感，忽略常见分隔符，中英混排可跨分隔符命中。 */
const normalize = (text: string): string => text.toLowerCase().replace(/[\s._\-/:：\\]+/g, "");

export function searchHaystack(row: AppRow): string {
  const helperText = row.helpers.map((helper) => [helper.name, helper.role, helper.pid].join(" ")).join(" ");
  return [row.name, row.path, row.pid, row.commandLine ?? "", helperText].join(" ");
}

/** 提取命令行中声明的端口。 */
export function extractDeclaredPorts(commandLine: string | undefined): number[] {
  if (!commandLine) return [];
  const pattern = /(?:--server\.port=|-Dserver\.port=)(\d+)/g;
  const ports: number[] = [];
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(commandLine))) {
    const port = Number(match[1]);
    if (Number.isInteger(port) && port >= 1 && port <= 65535 && !ports.includes(port)) {
      ports.push(port);
    }
  }
  return ports;
}

/** 命令行声明端口也算命中（服务起来前也能搜到）。 */
export function declaresPort(commandLine: string | undefined, port: number): boolean {
  return extractDeclaredPorts(commandLine).includes(port);
}

/** 空 query 全通过；端口查询优先精确命中（组端口 / Helper 端口 / 命令行声明），
    数字也可能是 PID，端口没命中就继续按文本匹配；其余按词与 haystack 求交。 */
export function rowMatchesQuery(row: AppRow, query: string): boolean {
  const q = query.trim();
  if (!q) return true;
  const port = parsePortQuery(q);
  if (port != null) {
    if (row.ports.includes(port)) return true;
    if (row.helpers.some((helper) => (helper.ports ?? []).includes(port))) return true;
    if (declaresPort(row.commandLine, port)) return true;
  }
  const haystack = normalize(searchHaystack(row));
  return q.split(/\s+/).every((token) => haystack.includes(normalize(token)));
}

export function searchRows(rows: readonly AppRow[], query: string): AppRow[] {
  return rows.filter((row) => rowMatchesQuery(row, query));
}

/** 交给 Raycast List.Item 的 keywords：补齐标题/副标题之外的可搜字段。 */
export function keywordsForRow(row: AppRow): string[] {
  const declared = extractDeclaredPorts(row.commandLine);
  const ports = [...new Set([...row.ports, ...row.helpers.flatMap((helper) => helper.ports ?? []), ...declared])];
  const keywords = new Set<string>();

  for (const pid of row.allPids.length ? row.allPids : [row.pid]) keywords.add(String(pid));
  for (const port of ports) {
    keywords.add(String(port));
    keywords.add(`:${port}`);
  }
  if (row.path) keywords.add(row.path);
  if (row.iconPath) keywords.add(row.iconPath);
  for (const helper of row.helpers) {
    if (helper.name) keywords.add(helper.name);
    if (helper.role) keywords.add(helper.role);
    keywords.add(String(helper.pid));
  }
  return [...keywords];
}
