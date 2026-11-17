export function t(english: string, _chinese: string): string {
  return english;
}

export function syncStatus(status: string): string {
  const labels: Record<string, [string, string]> = {
    idle: ["Idle", "空闲"],
    loading: ["Loading", "载入中"],
    writing: ["Saving", "写入中"],
    success: ["Up to date", "已同步"],
    error: ["Error", "错误"],
    conflict: ["Conflict", "冲突"],
  };
  const label = labels[status];
  return label ? t(...label) : status;
}
