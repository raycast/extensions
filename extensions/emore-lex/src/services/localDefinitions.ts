const LOCAL_DEFINITIONS: Record<string, string[]> = {
  denied: ["被拒绝 / refused", "被驳回 / rejected", "不被允许 / not allowed", "访问被阻止 / blocked from access"],
  deny: [
    "否认某事为真 / to say something is not true",
    "拒绝允许 / to refuse to allow",
    "拒绝给予 / to refuse to give",
  ],
  maintain: ["保持运行 / to keep working", "维护或保留 / to preserve", "长期支撑 / to support over time"],
  composure: ["镇定 / calmness", "自控力 / self-control", "压力下的稳定状态 / steady behavior under pressure"],
  provision: ["预置或准备资源 / to prepare resources", "供应 / to supply", "条款或规定 / a condition or clause"],
  throughput: ["吞吐量 / processing rate", "单位时间处理量 / amount handled per unit of time"],
  latency: ["延迟 / delay", "响应时间 / response time", "结果返回前的等待时间 / time before a result is returned"],
  resilience: [
    "恢复能力 / ability to recover",
    "容错能力 / fault tolerance",
    "故障下的稳定性 / stability under failure",
  ],
  deprecated: [
    "已废弃 / no longer recommended",
    "暂时保留但未来可能移除 / kept temporarily but expected to be removed",
  ],
  permission: ["权限 / authorization", "允许访问 / allowed access"],
  access: ["访问入口 / entry", "权限 / permission", "触达资源的能力 / ability to reach a resource"],
  refuse: ["拒绝 / to decline", "驳回 / to reject"],
  reject: ["拒绝 / to refuse", "驳回或不采纳 / to dismiss", "拒绝接受 / to deny acceptance"],
  decline: ["下降 / to decrease", "礼貌拒绝 / to politely refuse"],
};

export function getLocalDefinitions(query: string): string[] {
  const normalizedQuery = query.trim().toLowerCase();
  return (
    LOCAL_DEFINITIONS[normalizedQuery] ?? [
      "暂无本地中文释义 / No local usage note is available. Use the English definitions as the primary source.",
    ]
  );
}
