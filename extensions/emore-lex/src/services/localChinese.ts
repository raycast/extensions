const LOCAL_CHINESE_DEFINITIONS: Record<string, string[]> = {
  denied: ["否认了", "拒绝了", "拒绝给予", "禁止进入"],
  deny: ["否认", "拒绝承认", "拒绝给予", "禁止进入"],
  maintain: ["维护", "保持", "坚持认为"],
  composure: ["镇定", "沉着", "冷静"],
  provision: ["供应", "配置", "准备资源", "条款"],
  throughput: ["吞吐量", "处理能力"],
  latency: ["延迟", "响应耗时"],
  resilience: ["韧性", "恢复能力", "弹性"],
  deprecated: ["已弃用", "不推荐继续使用"],
  permission: ["权限", "许可"],
  access: ["访问", "入口", "权限"],
  refuse: ["拒绝"],
  reject: ["拒绝", "驳回"],
  decline: ["下降", "婉拒"],
};

export function getChineseDefinitions(query: string): string[] {
  const normalizedQuery = query.trim().toLowerCase();
  return LOCAL_CHINESE_DEFINITIONS[normalizedQuery] ?? ["暂无本地中文释义，可结合英文释义理解。"];
}
