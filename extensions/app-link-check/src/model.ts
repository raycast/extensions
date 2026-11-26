export type Status = "ok" | "warn" | "fail";

export interface CheckResult {
  id: string;
  platform: "iOS" | "Android";
  title: string;
  status: Status;
  detail: string;
  url: string;
}

export function summarize(items: CheckResult[]): string {
  const fails = items.filter((i) => i.status === "fail").length;
  const warns = items.filter((i) => i.status === "warn").length;
  if (fails) return `${fails} failing, ${warns} to review`;
  if (warns) return `${warns} to review`;
  return "Files fetched and match what you set (device verification not tested)";
}
