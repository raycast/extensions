import type { Quota, QuotaAccount, QuotaWindow } from "./quota";

export type QuotaClient = {
  call: (method: string, url: string, headers: Record<string, string>, body?: unknown) => Promise<unknown>;
  credential: () => Promise<unknown>;
  plugin: () => Promise<unknown | null>;
};
const HOUR = 3_600_000;
const AUTH = { Authorization: "Bearer $TOKEN$", "Content-Type": "application/json" };
const NONE: Quota = { plan: null, windows: [], reset: null, note: "CPA does not expose quota data for this provider." };

/** Read-only quota endpoints used by CPA's Management Center. Never sends an inference/health-test prompt. */
export async function fetchProviderQuota(file: QuotaAccount, client: QuotaClient): Promise<Quota> {
  if (file.quota_plugin_id || file.supports_quota) {
    const payload = await client.plugin();
    if (payload !== null) return parseGroups(payload);
  }
  switch (file.provider) {
    case "antigravity": {
      let project = file.project_id;
      if (!project && file.name && !file.runtime_only) {
        const data = record(await client.credential());
        project =
          string(
            data.project_id ?? data.projectId ?? record(data.installed).project_id ?? record(data.web).project_id,
          ) ?? undefined;
      }
      if (!project) throw new Error("Antigravity credential has no project ID. Reconnect it in CPA.");
      const domains = [
        "daily-cloudcode-pa.googleapis.com",
        "daily-cloudcode-pa.sandbox.googleapis.com",
        "cloudcode-pa.googleapis.com",
      ];
      let failure: unknown;
      for (const domain of domains) {
        try {
          return parseGroups(
            await client.call(
              "POST",
              `https://${domain}/v1internal:retrieveUserQuotaSummary`,
              { ...AUTH, "User-Agent": "antigravity/hub/2.23.0 darwin/arm64" },
              { project },
            ),
          );
        } catch (error) {
          failure = error;
        }
      }
      throw failure;
    }
    case "meta": {
      // $TOKEN$ is Meta's LLM key, not its DCA token. Keep the downloaded DCA token request-local.
      if (!file.name || file.runtime_only) throw new Error("Meta quota needs a file-backed OAuth credential.");
      try {
        const token = string(record(await client.credential()).dca_token);
        if (!token || !/^dca:[^\s]+$/.test(token)) throw new Error();
        return parseMeta(
          await client.call(
            "POST",
            "https://api.meta.ai/muse-code/key",
            { ...AUTH, Authorization: `Bearer ${token}`, Accept: "application/json", "x-api-version": "1.0.0" },
            {},
          ),
        );
      } catch {
        // Meta responses and download errors may contain api_key or PII. Never propagate their bodies.
        throw new Error("Meta quota could not be read. Check its DCA credential in CPA.");
      }
    }
    case "xai": {
      const headers = {
        ...AUTH,
        "x-xai-token-auth": "xai-grok-cli",
        "x-grok-client-version": "1.0.46",
        "User-Agent": "grok-pager/1.0.46 grok-shell/1.0.46 (macos; aarch64)",
      };
      const results = await Promise.allSettled([
        client.call("GET", "https://cli-chat-proxy.grok.com/v1/billing?format=credits", headers),
        client.call("GET", "https://cli-chat-proxy.grok.com/v1/billing", headers),
      ]);
      const quotas = results.flatMap((r) => (r.status === "fulfilled" ? [parseXai(r.value)] : []));
      const windows = [...new Map(quotas.flatMap((q) => q.windows).map((w) => [w.label, w])).values()];
      if (windows.length) return { plan: quotas.find((q) => q.plan)?.plan ?? null, windows, reset: null };
      // Paid API-key accounts need not expose subscription percentages. A profile read does not spend credits.
      const profile = record(await client.call("GET", "https://api.x.ai/v1/me", AUTH));
      return {
        ...NONE,
        plan: string(profile.subscription_tier ?? profile.plan),
        note: "xAI exposes this account, but no numeric quota. Usage stays unknown.",
      };
    }
    case "kimi":
    case "kimi-ai": {
      let data: Record<string, unknown> = {};
      if (file.name && !file.runtime_only) data = record(await client.credential());
      return parseKimi(await client.call("GET", kimiQuotaUrl(data, file), AUTH));
    }
    case "devin": {
      return parseDevin(
        await client.call(
          "POST",
          "https://server.codeium.com/exa.seat_management_pb.SeatManagementService/GetUserStatus",
          { "Content-Type": "application/json", "Connect-Protocol-Version": "1" },
          {
            metadata: {
              ideName: "chisel",
              ideVersion: "3000.10.21",
              apiKey: "$TOKEN$",
              locale: "en",
              os: "darwin",
              extensionVersion: "3000.10.21",
              clientName: "chisel",
            },
          },
        ),
      );
    }
    default: {
      const payload = file.quota_plugin_id || file.supports_quota ? null : await client.plugin();
      return payload === null ? { ...NONE } : parseGroups(payload);
    }
  }
}

/** Normalized plugin quota and Antigravity both use groups of fraction-based quota buckets. */
export function parseGroups(payload: unknown): Quota {
  const root = record(payload);
  const windows = array(root.groups).flatMap((raw, groupIndex) => {
    const group = record(raw);
    const groupName = string(group.displayName ?? group.display_name) ?? `Group ${groupIndex + 1}`;
    return array(group.buckets).flatMap((rawBucket, index): QuotaWindow[] => {
      const bucket = record(rawBucket);
      const left = number(bucket.remainingFraction ?? bucket.remaining_fraction);
      if (left === null || left < 0 || left > 1) return [];
      const window = string(bucket.window);
      const label =
        string(bucket.displayName ?? bucket.display_name ?? bucket.description) ??
        window ??
        string(bucket.bucketId ?? bucket.bucket_id) ??
        `Limit ${index + 1}`;
      const periodMs = fixedPeriod(window);
      return [
        {
          label: `${groupName} / ${label}`,
          usedPercent: 100 - left * 100,
          resetsAt: instant(bucket.resetTime ?? bucket.reset_time),
          periodMs,
        },
      ];
    });
  });
  const metrics = array(root.summary).flatMap((raw) => {
    const metric = record(raw),
      label = string(metric.label),
      value = number(metric.value);
    if (!label || value === null) return [];
    const unit = string(metric.unit) ?? (metric.format === "currency" ? string(metric.currency) : null);
    return [{ label, value: `${value.toLocaleString("en-US")}${unit ? ` ${unit}` : ""}` }];
  });
  const subscription = record(root.subscription);
  return {
    plan: string(subscription.plan ?? subscription.tierName),
    windows,
    metrics,
    reset: null,
    ...(windows.length ? {} : { note: "CPA returned no numeric quota windows." }),
  };
}

export function parseMeta(payload: unknown): Quota {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) throw new Error("Invalid Meta quota response");
  const root = record(payload);
  const usage = record(root.subs_usage);
  const short = record(usage.window);
  const minutes = number(short.window_duration_mins);
  const windows = [
    {
      label: minutes !== null && minutes > 0 ? durationLabel(minutes * 60_000) : "Window",
      data: short,
      periodMs: minutes && minutes > 0 ? minutes * 60_000 : null,
    },
    { label: "Weekly", data: record(usage.weekly), periodMs: 7 * 24 * HOUR },
  ].map(({ label, data, periodMs }) => ({
    label,
    usedPercent: percent(data.used_percent),
    resetsAt: instant(data.resets_at),
    periodMs,
  }));
  return { plan: string(root.subs_tier_name ?? usage.tier), windows, reset: null };
}

export function parseXai(payload: unknown): Quota {
  const config = record(record(payload).config);
  const current = record(config.currentPeriod ?? config.current_period);
  const type = string(current.type)?.toLowerCase();
  const credits = percent(config.creditUsagePercent ?? config.credit_usage_percent);
  const monthlyLimit = money(config.monthlyLimit ?? config.monthly_limit);
  const used = money(config.used);
  const windows: QuotaWindow[] = [];
  if (type?.includes("weekly") || (credits !== null && !type?.includes("monthly")))
    windows.push({
      label: "Weekly",
      usedPercent: credits,
      resetsAt: instant(current.end ?? config.billingPeriodEnd ?? config.billing_period_end),
      periodMs: 7 * 24 * HOUR,
    });
  if (monthlyLimit !== null && monthlyLimit > 0)
    windows.push({
      label: "Monthly",
      usedPercent: used === null ? null : Math.min(100, (used / monthlyLimit) * 100),
      resetsAt: instant(config.billingPeriodEnd ?? config.billing_period_end),
      periodMs: null,
    });
  if (!windows.length && type?.includes("monthly"))
    windows.push({ label: "Monthly", usedPercent: credits, resetsAt: instant(current.end), periodMs: null });
  return { plan: string(config.plan ?? config.subscriptionTier), windows, reset: null };
}

/** Resolve only two official Kimi hosts, matching CPA's credential precedence. */
export function kimiQuotaUrl(
  data: Record<string, unknown>,
  file: Pick<QuotaAccount, "provider" | "name" | "id">,
): string {
  const explicit = string(data.domain);
  let domain: "ai" | "com" | null = explicit ? (/(^|[.-])ai$/.test(explicit.toLowerCase()) ? "ai" : "com") : null;
  const base = Object.prototype.hasOwnProperty.call(data, "base_url") ? data.base_url : data["base-url"];
  if (!domain && typeof base === "string") {
    try {
      const host = new URL(base).hostname;
      if (host === "kimi.ai" || host.endsWith(".kimi.ai")) domain = "ai";
      else if (host === "kimi.com" || host.endsWith(".kimi.com")) domain = "com";
    } catch {
      /* Only official hosts can select a domain. */
    }
  }
  const providerDomain = (value: unknown): "ai" | "com" | null => {
    const key = string(value)?.toLowerCase().replace(/_/g, "-");
    return key === "kimi-ai" || key === "kimi.ai" ? "ai" : key === "kimi" || key === "kimi.com" ? "com" : null;
  };
  domain ??=
    providerDomain(data.type) ??
    providerDomain(file.provider) ??
    (/kimi-ai|kimi\.ai/i.test(`${file.id ?? ""} ${file.name ?? ""}`) ? "ai" : "com");
  return `https://api.kimi.${domain}/coding/v1/usages`;
}

export function parseKimi(payload: unknown, now = Date.now()): Quota {
  const root = record(payload);
  const windows: QuotaWindow[] = [];
  const append = (value: unknown, fallback: string, periodMs: number | null) => {
    const row = record(value);
    const limit = number(row.limit);
    const used =
      number(row.used) ?? (limit !== null && number(row.remaining) !== null ? limit - number(row.remaining)! : null);
    if (used === null && limit === null) return;
    const offset = number(row.reset_in ?? row.resetIn ?? row.ttl);
    windows.push({
      label: string(row.name ?? row.title) ?? fallback,
      usedPercent:
        limit !== null && limit > 0 && used !== null ? Math.max(0, Math.min(100, (used / limit) * 100)) : null,
      resetsAt:
        instant(row.reset_at ?? row.resetAt ?? row.reset_time ?? row.resetTime) ??
        (offset !== null && offset > 0 ? now + offset * 1000 : null),
      periodMs,
    });
  };
  array(root.limits).forEach((raw, index) => {
    const item = record(raw),
      detail = record(item.detail),
      window = record(item.window);
    const row = Object.keys(detail).length ? detail : item;
    const duration = number(window.duration ?? item.duration ?? row.duration);
    const unit =
      string(window.timeUnit ?? item.timeUnit ?? row.timeUnit)
        ?.toUpperCase()
        .replace(/^TIME_UNIT_/, "") ?? "MINUTE";
    const factor: Record<string, number> = {
      SECOND: 1000,
      SECONDS: 1000,
      MINUTE: 60_000,
      MINUTES: 60_000,
      HOUR,
      HOURS: HOUR,
      DAY: 24 * HOUR,
      DAYS: 24 * HOUR,
      WEEK: 168 * HOUR,
      WEEKS: 168 * HOUR,
    };
    const period = duration !== null && duration > 0 && factor[unit] ? duration * factor[unit] : null;
    append(
      row,
      string(item.name ?? item.title ?? item.scope) ?? (period ? durationLabel(period) : `Limit ${index + 1}`),
      period,
    );
  });
  append(root.usage, "Weekly", 7 * 24 * HOUR);
  const monthly = record(record(root.usages).limit_month_total);
  const ratio = number(monthly.used_ratio);
  if (ratio !== null)
    windows.push({
      label: "Monthly",
      usedPercent: Math.max(0, Math.min(100, ratio * 100)),
      resetsAt: instant(monthly.reset_time),
      periodMs: null,
    });
  return { plan: string(root.plan), windows, reset: null };
}

export function parseDevin(payload: unknown): Quota {
  const status = record(record(record(payload).userStatus).planStatus);
  return {
    plan: string(record(status.planInfo).planName),
    windows: ["daily", "weekly"].map((id) => {
      const left = percent(status[`${id}QuotaRemainingPercent`]);
      return {
        label: id === "daily" ? "Daily" : "Weekly",
        usedPercent: left === null ? null : 100 - left,
        resetsAt: instant(status[`${id}QuotaResetAtUnix`]),
        periodMs: (id === "daily" ? 24 : 168) * HOUR,
      };
    }),
    reset: null,
  };
}
function durationLabel(ms: number): string {
  return ms === 168 * HOUR
    ? "Weekly"
    : ms === 24 * HOUR
      ? "Daily"
      : ms === 5 * HOUR
        ? "5-Hour"
        : ms % HOUR === 0
          ? `${ms / HOUR}-Hour`
          : `${ms / 60000}-Minute`;
}
function fixedPeriod(raw: string | null): number | null {
  const value = raw?.toLowerCase();
  if (["5h", "five-hour", "five_hour"].includes(value ?? "")) return 5 * HOUR;
  if (["weekly", "week"].includes(value ?? "")) return 168 * HOUR;
  if (["daily", "day"].includes(value ?? "")) return 24 * HOUR;
  return null;
}
function record(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}
function array(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}
function string(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}
function number(value: unknown): number | null {
  if (value === null || value === undefined || typeof value === "boolean" || typeof value === "object" || value === "")
    return null;
  const n = typeof value === "number" ? value : typeof value === "string" && value.trim() ? Number(value) : NaN;
  return Number.isFinite(n) ? n : null;
}
function percent(value: unknown): number | null {
  const n = number(value);
  return n === null ? null : Math.max(0, Math.min(100, n));
}
function money(value: unknown): number | null {
  return number(typeof value === "object" && value !== null ? record(value).val : value);
}
function instant(value: unknown): number | null {
  const n = number(value);
  if (n !== null) return n > 0 ? (n < 1e12 ? n * 1000 : n) : null;
  const date = typeof value === "string" ? Date.parse(value) : NaN;
  return Number.isFinite(date) && date > 0 ? date : null;
}
