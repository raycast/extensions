import {
  Action,
  ActionPanel,
  Color,
  Detail,
  Icon,
  Keyboard,
  List,
  Toast,
  getPreferenceValues,
  openExtensionPreferences,
  showToast,
} from "@raycast/api";
import { useCallback, useEffect, useMemo, useState } from "react";

const RAYCAST_REQUESTS_PATH = "/api/raycast/requests";
const DEFAULT_BASE_URL = "https://panicly.lol";
const LEGACY_BASE_URL_HOST = "panicly.vercel.app";
const PAID_PLAN_REQUIRED_CODE = "paid_plan_required";
const PAID_PLAN_REQUIRED_DESCRIPTION =
  "To use the Panicly Raycast extension, upgrade this workspace to a paid Panicly plan.";

type Project = {
  id: string;
  name: string;
  sentry_mode?: boolean;
  environment?: string;
  rate_limit_rpm?: number;
  abuse_threshold?: number;
  max_tokens?: number;
  loop_sensitivity?: number;
  created_at?: string;
  updated_at?: string;
};

type DashboardStats = {
  total?: number;
  allowed?: number;
  blocked?: number;
  costSaved?: number;
  projects?: Project[];
};

type RequestLog = {
  id: string;
  user_id?: string;
  organization_id?: string;
  project_id: string;
  ip_address?: string;
  user_agent?: string;
  route: string;
  provider: string;
  model?: string | null;
  country_code?: string | null;
  country_name?: string | null;
  region?: string | null;
  decision: string;
  internal_reason?: string;
  timestamp: string;
  tokens?: number;
  cost_estimate?: number;
  project?: Project | null;
};

type Organization = {
  id: string;
  name?: string;
  plan_tier?: string;
  onboarding_complete?: boolean;
};

type OverviewResponse = {
  code?: string;
  error?: string;
  message?: string;
  stats?: DashboardStats | null;
  logs?: RequestLog[];
  organization?: Organization | null;
};

type RequestDetailResponse = {
  code?: string;
  error?: string;
  message?: string;
  request?: RequestLog | null;
  organization?: Organization | null;
};

type RequestState<T> = {
  data: T | null;
  error: string | null;
  errorCode: string | null;
  isLoading: boolean;
};

type RuntimeConfig = {
  baseUrl: string;
  apiKey: string;
  requestLimit: number;
};

export default function Command() {
  const config = getRuntimeConfig();
  const { data, error, errorCode, isLoading, reload } = useOverview(config);

  const projects = data?.stats?.projects ?? [];
  const projectNames = useMemo(
    () => new Map(projects.map((project) => [project.id, project.name])),
    [projects],
  );
  const logs = data?.logs ?? [];
  const title = projects[0]?.name ?? "Recent Requests";

  return (
    <List
      isLoading={isLoading}
      navigationTitle={title}
      searchBarPlaceholder="Search by model, route, provider, IP, or reason"
      actions={
        <ActionPanel>
          <Action
            title="Refresh"
            icon={Icon.ArrowClockwise}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
            onAction={() => reload({ notify: true })}
          />
          <Action.OpenInBrowser
            title="Open Panicly Dashboard"
            url={dashboardUrl(config.baseUrl)}
          />
          <Action
            title="Open Extension Preferences"
            icon={Icon.Gear}
            onAction={openExtensionPreferences}
          />
        </ActionPanel>
      }
    >
      {errorCode === PAID_PLAN_REQUIRED_CODE ? (
        <List.EmptyView
          icon={{ source: Icon.XMarkCircle, tintColor: Color.Red }}
          title="Paid plan required"
          description={PAID_PLAN_REQUIRED_DESCRIPTION}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser
                title="Open Billing"
                icon={Icon.CreditCard}
                url={billingUrl(config.baseUrl)}
              />
              <Action
                title="Refresh"
                icon={Icon.ArrowClockwise}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
                onAction={() => reload({ notify: true })}
              />
              <Action
                title="Open Extension Preferences"
                icon={Icon.Gear}
                onAction={openExtensionPreferences}
              />
            </ActionPanel>
          }
        />
      ) : error ? (
        <List.EmptyView
          icon={{ source: Icon.ExclamationMark, tintColor: Color.Red }}
          title="Could not load Panicly requests"
          description={error}
          actions={
            <ActionPanel>
              <Action
                title="Refresh"
                icon={Icon.ArrowClockwise}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
                onAction={() => reload({ notify: true })}
              />
              <Action
                title="Open Extension Preferences"
                icon={Icon.Gear}
                onAction={openExtensionPreferences}
              />
              <Action.OpenInBrowser
                title="Open Panicly Dashboard"
                url={dashboardUrl(config.baseUrl)}
              />
            </ActionPanel>
          }
        />
      ) : logs.length === 0 && !isLoading ? (
        <List.EmptyView
          icon={{ source: Icon.Shield, tintColor: Color.SecondaryText }}
          title="No recent requests"
          description="Send traffic through Panicly, then refresh this command."
          actions={
            <ActionPanel>
              <Action
                title="Refresh"
                icon={Icon.ArrowClockwise}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
                onAction={() => reload({ notify: true })}
              />
              <Action.OpenInBrowser
                title="Open Panicly Dashboard"
                url={dashboardUrl(config.baseUrl)}
              />
            </ActionPanel>
          }
        />
      ) : (
        <List.Section
          title={title}
          subtitle={formatStatsSubtitle(data?.stats, logs.length)}
        >
          {logs.map((log) => (
            <RequestListItem
              key={log.id}
              log={log}
              config={config}
              projectName={projectNames.get(log.project_id)}
              onReload={reload}
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}

function RequestListItem({
  log,
  config,
  projectName,
  onReload,
}: {
  log: RequestLog;
  config: RuntimeConfig;
  projectName?: string;
  onReload: (options?: { notify?: boolean }) => void;
}) {
  const allowed = isAllowed(log.decision);
  const title = log.model || log.route || "Unknown request";
  const subtitle = [
    projectName ?? "Unknown project",
    formatProvider(log.provider),
    log.route,
  ]
    .filter(Boolean)
    .join(" - ");
  const timestamp = parseDate(log.timestamp);
  const detailUrl = requestUrl(config.baseUrl, log.id);

  return (
    <List.Item
      title={title}
      subtitle={subtitle}
      icon={{
        source: allowed ? Icon.CheckCircle : Icon.XMarkCircle,
        tintColor: allowed ? Color.Green : Color.Red,
      }}
      keywords={[
        log.id,
        log.project_id,
        projectName ?? "",
        log.route,
        log.provider,
        log.model ?? "",
        log.ip_address ?? "",
        log.internal_reason ?? "",
        log.country_name ?? "",
        log.region ?? "",
      ]}
      accessories={[
        {
          tag: {
            value: allowed ? "Allowed" : "Blocked",
            color: allowed ? Color.Green : Color.Red,
          },
        },
        { text: formatTokens(log.tokens), icon: Icon.Terminal },
        { text: formatCost(log.cost_estimate) },
        timestamp ? { date: timestamp, icon: Icon.Clock } : { text: "No time" },
      ]}
      actions={
        <ActionPanel>
          <Action.Push
            title="Show Request Details"
            icon={Icon.Eye}
            target={<RequestDetail log={log} config={config} />}
          />
          <Action.OpenInBrowser
            title="Open in Panicly"
            icon={Icon.Globe}
            url={detailUrl}
          />
          <Action
            title="Refresh"
            icon={Icon.ArrowClockwise}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
            onAction={() => onReload({ notify: true })}
          />
          <ActionPanel.Section>
            <Action.CopyToClipboard
              title="Copy Request ID"
              icon={Icon.Fingerprint}
              content={log.id}
              shortcut={Keyboard.Shortcut.Common.Copy}
            />
            <Action.CopyToClipboard
              title="Copy Request URL"
              icon={Icon.Globe}
              content={detailUrl}
            />
            <Action.CopyToClipboard
              title="Copy Request JSON"
              icon={Icon.Code}
              content={JSON.stringify(log, null, 2)}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

function RequestDetail({
  log,
  config,
}: {
  log: RequestLog;
  config: RuntimeConfig;
}) {
  const { data, error, isLoading, reload } = useRequestDetail(config, log.id);
  const request = data?.request ?? log;
  const organization = data?.organization ?? null;
  const allowed = isAllowed(request.decision);
  const detailUrl = requestUrl(config.baseUrl, request.id);
  const rawJson = JSON.stringify({ request, organization }, null, 2);

  return (
    <Detail
      isLoading={isLoading}
      navigationTitle="Request Details"
      markdown={requestMarkdown(request, organization, error)}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.TagList title="Decision">
            <Detail.Metadata.TagList.Item
              text={allowed ? "Allowed" : "Blocked"}
              color={allowed ? Color.Green : Color.Red}
            />
          </Detail.Metadata.TagList>
          <Detail.Metadata.Label
            title="Project"
            text={request.project?.name ?? request.project_id}
            icon={Icon.Shield}
          />
          <Detail.Metadata.Label
            title="Workspace"
            text={organization?.name ?? request.organization_id ?? "Unknown"}
          />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label
            title="Provider"
            text={formatProvider(request.provider)}
          />
          <Detail.Metadata.Label
            title="Model"
            text={request.model ?? "Unknown"}
          />
          <Detail.Metadata.Label title="Route" text={request.route} />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label
            title="Tokens"
            text={formatTokens(request.tokens)}
            icon={Icon.Terminal}
          />
          <Detail.Metadata.Label
            title="Cost"
            text={formatCost(request.cost_estimate)}
          />
          <Detail.Metadata.Label
            title="IP"
            text={request.ip_address ?? "Unknown"}
            icon={Icon.Globe}
          />
          <Detail.Metadata.Label
            title="Time"
            text={formatAbsoluteTime(request.timestamp)}
            icon={Icon.Clock}
          />
          <Detail.Metadata.Link
            title="Dashboard"
            text="Open in Panicly"
            target={detailUrl}
          />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action.OpenInBrowser
            title="Open in Panicly"
            icon={Icon.Globe}
            url={detailUrl}
          />
          <Action
            title="Refresh"
            icon={Icon.ArrowClockwise}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
            onAction={() => reload({ notify: true })}
          />
          <ActionPanel.Section>
            <Action.CopyToClipboard
              title="Copy Request ID"
              icon={Icon.Fingerprint}
              content={request.id}
              shortcut={Keyboard.Shortcut.Common.Copy}
            />
            <Action.CopyToClipboard
              title="Copy Request URL"
              icon={Icon.Globe}
              content={detailUrl}
            />
            <Action.CopyToClipboard
              title="Copy Request JSON"
              icon={Icon.Code}
              content={rawJson}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

function useOverview({ baseUrl, apiKey, requestLimit }: RuntimeConfig) {
  const [state, setState] = useState<RequestState<OverviewResponse>>({
    data: null,
    error: null,
    errorCode: null,
    isLoading: true,
  });

  const load = useCallback(
    async (options: { notify?: boolean } = {}) => {
      setState((previous) => ({
        ...previous,
        isLoading: true,
        error: null,
        errorCode: null,
      }));
      try {
        const response = await fetchPaniclyJson<OverviewResponse>(
          { baseUrl, apiKey, requestLimit },
          RAYCAST_REQUESTS_PATH,
          { limit: String(requestLimit) },
        );
        setState({
          data: response,
          error: null,
          errorCode: null,
          isLoading: false,
        });
        if (options.notify) {
          await showToast({
            style: Toast.Style.Success,
            title: "Requests refreshed",
          });
        }
      } catch (error) {
        const message = getErrorMessage(error);
        const code = getErrorCode(error);
        setState((previous) => ({
          data: previous.data,
          error: message,
          errorCode: code,
          isLoading: false,
        }));
        if (options.notify) {
          await showToast({
            style: Toast.Style.Failure,
            title: "Refresh failed",
            message,
          });
        }
      }
    },
    [apiKey, baseUrl, requestLimit],
  );

  useEffect(() => {
    void load();
  }, [load]);

  return { ...state, reload: load };
}

function useRequestDetail(config: RuntimeConfig, requestId: string) {
  const [state, setState] = useState<RequestState<RequestDetailResponse>>({
    data: null,
    error: null,
    errorCode: null,
    isLoading: true,
  });

  const load = useCallback(
    async (options: { notify?: boolean } = {}) => {
      setState((previous) => ({
        ...previous,
        isLoading: true,
        error: null,
        errorCode: null,
      }));
      try {
        const response = await fetchPaniclyJson<RequestDetailResponse>(
          config,
          `${RAYCAST_REQUESTS_PATH}/${requestId}`,
        );
        setState({
          data: response,
          error: null,
          errorCode: null,
          isLoading: false,
        });
        if (options.notify) {
          await showToast({
            style: Toast.Style.Success,
            title: "Request refreshed",
          });
        }
      } catch (error) {
        const message = getErrorMessage(error);
        const code = getErrorCode(error);
        setState((previous) => ({
          data: previous.data,
          error: message,
          errorCode: code,
          isLoading: false,
        }));
        if (options.notify) {
          await showToast({
            style: Toast.Style.Failure,
            title: "Refresh failed",
            message,
          });
        }
      }
    },
    [config, requestId],
  );

  useEffect(() => {
    void load();
  }, [load]);

  return { ...state, reload: load };
}

async function fetchPaniclyJson<T>(
  config: RuntimeConfig,
  endpoint: string,
  params: Record<string, string | undefined> = {},
): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  const url = paniclyApiUrl(config.baseUrl, endpoint, params);

  try {
    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${normalizePaniclyApiKey(config.apiKey)}`,
      },
      signal: controller.signal,
    });
    const payload = (await response.json().catch(() => ({}))) as
      | (T & { code?: string; error?: string; message?: string })
      | { code?: string; error?: string; message?: string };

    if (!response.ok) {
      throw new PaniclyApiError(
        apiErrorMessage(response.status, payload),
        response.status,
        payload.code,
      );
    }

    return payload as T;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("Panicly did not respond within 15 seconds.");
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

function getRuntimeConfig(): RuntimeConfig {
  const preferences = getPreferenceValues<Preferences>();
  return {
    baseUrl: normalizeBaseUrl(preferences.baseUrl || DEFAULT_BASE_URL),
    apiKey: preferences.apiKey.trim(),
    requestLimit: parseLimit(preferences.requestLimit ?? "25"),
  };
}

function paniclyApiUrl(
  baseUrl: string,
  path: string,
  params: Record<string, string | undefined>,
) {
  const url = new URL(path, baseUrl);
  for (const [key, value] of Object.entries(params)) {
    if (value) url.searchParams.set(key, value);
  }
  return url.toString();
}

function dashboardUrl(baseUrl: string) {
  return new URL("/dashboard", webBaseUrl(baseUrl)).toString();
}

function billingUrl(baseUrl: string) {
  return new URL("/dashboard/settings/billing", webBaseUrl(baseUrl)).toString();
}

function requestUrl(baseUrl: string, id: string) {
  return new URL(
    `/dashboard/request/${encodeURIComponent(id)}`,
    webBaseUrl(baseUrl),
  ).toString();
}

function normalizeBaseUrl(value: string) {
  const trimmed = value.trim().replace(/\/+$/, "");
  return trimmed || DEFAULT_BASE_URL;
}

function webBaseUrl(baseUrl: string) {
  try {
    const url = new URL(normalizeBaseUrl(baseUrl));
    return url.hostname === LEGACY_BASE_URL_HOST
      ? DEFAULT_BASE_URL
      : url.toString();
  } catch {
    return DEFAULT_BASE_URL;
  }
}

function normalizePaniclyApiKey(value: string) {
  const trimmed = value.trim();
  return trimmed.startsWith("paniclypk_")
    ? trimmed.slice("panicly".length)
    : trimmed;
}

function parseLimit(value: string) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 25;
  return Math.min(Math.max(Math.floor(parsed), 1), 50);
}

function isAllowed(decision?: string) {
  const normalized = decision?.toLowerCase();
  return normalized === "allow" || normalized === "allowed";
}

function formatStatsSubtitle(
  stats: DashboardStats | null | undefined,
  visible: number,
) {
  if (!stats) return `${visible} visible`;

  const total = stats.total ?? visible;
  const allowed = stats.allowed ?? 0;
  const blocked = stats.blocked ?? 0;
  return `${total.toLocaleString()} total - ${allowed.toLocaleString()} allowed - ${blocked.toLocaleString()} blocked`;
}

function formatProvider(provider?: string) {
  if (!provider) return "Unknown provider";
  return provider
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(" ");
}

function formatTokens(value?: number) {
  const tokens = Number(value ?? 0);
  if (!Number.isFinite(tokens)) return "0 tokens";
  return `${tokens.toLocaleString()} tokens`;
}

function formatCost(value?: number) {
  const cost = Number(value ?? 0);
  if (!Number.isFinite(cost)) return "$0.0000";
  return `$${cost.toFixed(4)}`;
}

function parseDate(value?: string) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatAbsoluteTime(value?: string) {
  const date = parseDate(value);
  return date ? date.toLocaleString() : "Unknown";
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  return "Something went wrong while loading Panicly data.";
}

function getErrorCode(error: unknown) {
  return error instanceof PaniclyApiError ? error.code : null;
}

function apiErrorMessage(
  status: number,
  payload: { error?: string; message?: string },
) {
  const apiMessage = payload.message || payload.error;
  if (status === 401) {
    return "Panicly rejected the API key. Paste a valid project API key from Panicly Settings.";
  }
  if (status === 403) {
    return (
      apiMessage ||
      "Your workspace plan or role cannot access this Panicly data."
    );
  }
  if (status === 404)
    return apiMessage || "Panicly could not find this resource.";
  if (status >= 500) return apiMessage || "Panicly returned a server error.";
  return apiMessage || `Panicly request failed with HTTP ${status}.`;
}

class PaniclyApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
  ) {
    super(message);
    this.name = "PaniclyApiError";
  }
}

function requestMarkdown(
  request: RequestLog,
  organization: Organization | null,
  error: string | null,
) {
  const allowed = isAllowed(request.decision);
  const reason = displayPolicyReason(request.internal_reason);
  const location = [request.country_name, request.region, request.country_code]
    .filter(Boolean)
    .join(" - ");
  const lines = [
    `# ${request.model || request.route || "Request"}`,
    "",
    error ? `> ${error}` : "",
    "",
    `**Decision:** ${allowed ? "Allowed" : "Blocked"}`,
    `**Reason:** ${reason || "No reason recorded"}`,
    `**Route:** \`${request.route}\``,
    `**Provider:** ${formatProvider(request.provider)}`,
    `**Project:** ${request.project?.name ?? request.project_id}`,
    organization?.name ? `**Workspace:** ${organization.name}` : "",
    `**Timestamp:** ${formatAbsoluteTime(request.timestamp)}`,
    "",
    "## Traffic",
    "",
    `- IP: \`${request.ip_address ?? "Unknown"}\``,
    `- User agent: \`${request.user_agent || "Unknown"}\``,
    location ? `- Location: ${location}` : "",
    `- Tokens: ${formatTokens(request.tokens)}`,
    `- Cost estimate: ${formatCost(request.cost_estimate)}`,
    "",
    "## Raw Event",
    "",
    "```json",
    JSON.stringify(request, null, 2),
    "```",
  ];

  return lines.filter((line) => line !== "").join("\n");
}

function displayPolicyReason(reason: string | null | undefined) {
  return reason ? reason.replace(/\bpanic mode\b/gi, "Sentry Mode") : "";
}
