import { Readable } from "node:stream";
import Chain from "stream-chain";
import { parser } from "stream-json";
import { pick } from "stream-json/filters/Pick";
import { streamArray } from "stream-json/streamers/StreamArray";
import {
  AuditReportRequest,
  CiJobStatus,
  CiRunStatus,
  DeploymentAuditResponse,
  DeploymentAuditDifference,
  DeploymentAuditEntry,
  OperationAccepted,
  OperationStatus,
  PipelineDeploymentResult,
  PipelineEnvironment,
  RunRequestResponse,
} from "./types";

const API_ORIGIN = "https://api.gearset.com";
const DEFAULT_TIMEOUT_MS = 30_000;
const REPORT_POLL_INTERVAL_MS = 5_000;
const REPORT_MAX_POLLS = 18;
const AUDIT_TIMEOUT_MS = 120_000;
const DEPLOYMENT_DIFFERENCE_PREVIEW_LIMIT = 10;

export class GearsetApiError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = "GearsetApiError";
  }
}

interface RequestOptions {
  method?: "GET" | "POST";
  apiVersion: "1" | "3";
  query?: Record<string, string | string[] | undefined>;
  body?: unknown;
  timeoutMs?: number;
  signal?: AbortSignal;
}

export function buildApiUrl(path: string, query?: RequestOptions["query"]): string {
  if (!path.startsWith("/public/")) throw new Error("Gearset API paths must use an approved public endpoint.");
  const url = new URL(path, API_ORIGIN);
  for (const [name, value] of Object.entries(query ?? {})) {
    if (Array.isArray(value)) value.forEach((item) => url.searchParams.append(name, item));
    else if (value !== undefined && value !== "") url.searchParams.set(name, value);
  }
  return url.toString();
}

function parseErrorPayload(payload: unknown, fallback: string): string {
  if (typeof payload === "string" && payload.trim()) return payload.trim();
  if (payload && typeof payload === "object") {
    for (const key of ["message", "Message", "error", "Error", "title"]) {
      const value = (payload as Record<string, unknown>)[key];
      if (typeof value === "string" && value.trim()) return value.trim();
    }
  }
  return fallback;
}

export function friendlyApiError(status: number, payload: unknown): string {
  const defaults: Record<number, string> = {
    400: "Gearset rejected the request. Check the configured job or pipeline ID.",
    401: "Gearset rejected the API token. Check its value and selected API scopes.",
    403: "This token or Gearset license does not permit the requested API operation.",
    404: "The requested Gearset resource was not found or is not shared with this token.",
    429: "The Gearset API request limit has been reached. Try again later.",
  };
  return parseErrorPayload(payload, defaults[status] ?? `Gearset returned HTTP ${status}.`);
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function nullableStringValue(value: unknown): string | null {
  return typeof value === "string" && value ? value : null;
}

function deploymentDifference(value: unknown): DeploymentAuditDifference | undefined {
  if (!value || typeof value !== "object") return undefined;
  const record = value as Record<string, unknown>;
  return {
    DifferenceType: stringValue(record.DifferenceType),
    ObjectType: stringValue(record.ObjectType),
    DisplayName: stringValue(record.DisplayName),
    ModifiedBy: stringValue(record.ModifiedBy),
    ModifiedOn: stringValue(record.ModifiedOn),
  };
}

export function compactDeploymentAuditEntry(value: unknown): DeploymentAuditEntry | undefined {
  if (!value || typeof value !== "object") return undefined;
  const record = value as Record<string, unknown>;
  const deploymentId = stringValue(record.DeploymentId);
  if (!deploymentId) return undefined;

  const rawDifferences = Array.isArray(record.DeploymentDifferences) ? record.DeploymentDifferences : [];
  const differences = rawDifferences
    .slice(0, DEPLOYMENT_DIFFERENCE_PREVIEW_LIMIT)
    .map(deploymentDifference)
    .filter((difference): difference is DeploymentAuditDifference => !!difference);
  const status = stringValue(record.Status);

  return {
    DeploymentId: deploymentId,
    Status: status === "Successful" || status === "Failed" || status === "PartiallySuccessful" ? status : "Failed",
    Name: stringValue(record.Name),
    Owner: stringValue(record.Owner),
    TriggeredBy: stringValue(record.TriggeredBy),
    Date: stringValue(record.Date),
    FriendlyName: stringValue(record.FriendlyName),
    SourceUsername: stringValue(record.SourceUsername),
    SourceMetadataLocationType: stringValue(record.SourceMetadataLocationType),
    TargetUsername: stringValue(record.TargetUsername),
    TargetMetadataLocationType: stringValue(record.TargetMetadataLocationType),
    DeploymentType: stringValue(record.DeploymentType),
    DeploymentDifferences: differences,
    DeploymentDifferenceCount: rawDifferences.length,
    SalesforceFinalDeploymentId: nullableStringValue(record.SalesforceFinalDeploymentId),
  };
}

export class GearsetClient {
  constructor(
    private readonly token: string,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  private async request<T>(path: string, options: RequestOptions): Promise<T> {
    const timeoutController = new AbortController();
    const timeout = setTimeout(() => timeoutController.abort(), options.timeoutMs ?? DEFAULT_TIMEOUT_MS);
    const signal = options.signal
      ? AbortSignal.any([options.signal, timeoutController.signal])
      : timeoutController.signal;

    try {
      const response = await this.fetchImpl(buildApiUrl(path, options.query), {
        method: options.method ?? "GET",
        headers: {
          Authorization: `token ${this.token}`,
          "api-version": options.apiVersion,
          Accept: "application/json",
          ...(options.body !== undefined ? { "Content-Type": "application/json" } : {}),
        },
        body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
        signal,
      });

      const raw = await response.text();
      let payload: unknown = undefined;
      if (raw.trim()) {
        try {
          payload = JSON.parse(raw);
        } catch {
          payload = raw;
        }
      }
      if (!response.ok) throw new GearsetApiError(friendlyApiError(response.status, payload), response.status);
      return payload as T;
    } catch (error) {
      if (error instanceof GearsetApiError) throw error;
      if (error instanceof Error && error.name === "AbortError") {
        throw new GearsetApiError("The Gearset request timed out or was cancelled.");
      }
      throw new GearsetApiError(error instanceof Error ? error.message : "The Gearset request failed.");
    } finally {
      clearTimeout(timeout);
    }
  }

  getCiJobStatus(jobId: string, signal?: AbortSignal): Promise<CiJobStatus> {
    return this.request(`/public/automation/continuous-integration-jobs/${encodeURIComponent(jobId)}/status`, {
      apiVersion: "1",
      signal,
    });
  }

  startCiJob(jobId: string, sourceGitCommitId?: string): Promise<RunRequestResponse> {
    return this.request(`/public/automation/continuous-integration-jobs/${encodeURIComponent(jobId)}/run-requests`, {
      method: "POST",
      apiVersion: "1",
      body: sourceGitCommitId ? { SourceGitCommitId: sourceGitCommitId } : {},
    });
  }

  cancelCiJob(jobId: string): Promise<void> {
    return this.request(`/public/automation/continuous-integration-jobs/${encodeURIComponent(jobId)}/cancel`, {
      method: "POST",
      apiVersion: "1",
      body: {},
    });
  }

  getCiRunStatus(jobId: string, runRequestId: string): Promise<CiRunStatus> {
    return this.request(
      `/public/automation/continuous-integration-jobs/${encodeURIComponent(jobId)}/run-requests/${encodeURIComponent(runRequestId)}`,
      { apiVersion: "1" },
    );
  }

  getPipelineEnvironments(pipelineId: string): Promise<PipelineEnvironment[]> {
    return this.request("/public/reporting/environments", {
      apiVersion: "3",
      query: { PipelineId: pipelineId },
    });
  }

  async getPipelineDeployments(
    pipelineId: string,
    startDate: Date,
    endDate: Date,
    environmentIds: string[] = [],
    signal?: AbortSignal,
  ): Promise<PipelineDeploymentResult> {
    const accepted = await this.request<OperationAccepted>("/public/reporting/deployments", {
      method: "POST",
      apiVersion: "3",
      query: {
        PipelineId: pipelineId,
        StartDate: startDate.toISOString(),
        EndDate: endDate.toISOString(),
        EnvironmentIds: environmentIds,
      },
      body: {},
      signal,
    });

    for (let attempt = 0; attempt < REPORT_MAX_POLLS; attempt += 1) {
      if (signal?.aborted) throw new GearsetApiError("The Gearset report was cancelled.");
      if (attempt > 0) await new Promise((resolve) => setTimeout(resolve, REPORT_POLL_INTERVAL_MS));
      const status = await this.request<OperationStatus>(
        `/public/operation/${encodeURIComponent(accepted.OperationStatusId)}/status`,
        { apiVersion: "3", signal },
      );
      if (status.Status === "Failed") throw new GearsetApiError(status.Error ?? "Gearset could not build the report.");
      if (status.Status === "Succeeded" && status.OperationResultId) {
        return this.request(`/public/operation/${encodeURIComponent(status.OperationResultId)}/result`, {
          apiVersion: "3",
          signal,
        });
      }
    }
    throw new GearsetApiError("The Gearset report is still running. Try a shorter date range and rerun it.");
  }

  getAuditReport(request: AuditReportRequest): Promise<unknown> {
    const dates = { StartDate: request.startDate.toISOString(), EndDate: request.endDate.toISOString() };
    const endpoints: Record<AuditReportRequest["kind"], { path: string; query?: Record<string, string> }> = {
      deployments: { path: "/public/audit/deployments", query: dates },
      "ci-runs": {
        path: `/public/audit/continuous-integration/job/${encodeURIComponent(request.jobId ?? "")}/runs`,
        query: dates,
      },
      "ci-edits": {
        path: `/public/audit/continuous-integration/job/${encodeURIComponent(request.jobId ?? "")}/edit-history`,
        query: dates,
      },
      "pipeline-edits": {
        path: `/public/audit/pipeline/${encodeURIComponent(request.pipelineId ?? "")}/edit-history`,
        query: dates,
      },
      "gearset-permissions": { path: "/public/audit/team/gearset-permissions", query: dates },
      "role-changes": { path: "/public/audit/team/team-member-role-changes", query: dates },
      delegations: { path: "/public/audit/team/delegations", query: dates },
      "delegated-org-usage": { path: "/public/audit/team/delegated-org-usage", query: dates },
      "pipeline-permissions": {
        path: "/public/audit/team/pipeline-permissions",
        query: { ...dates, PipelineId: request.pipelineId ?? "" },
      },
      "ci-job-permissions": {
        path: "/public/audit/team/ci-job-permissions",
        query: { ...dates, CiJobId: request.jobId ?? "" },
      },
      "connected-services": { path: "/public/audit/connected-services" },
    };
    const endpoint = endpoints[request.kind];
    return this.request(endpoint.path, { apiVersion: "1", query: endpoint.query });
  }

  getTeamDeployments(startDate: Date, endDate: Date, signal?: AbortSignal): Promise<DeploymentAuditResponse> {
    return this.streamTeamDeployments(startDate, endDate, signal);
  }

  private async streamTeamDeployments(
    startDate: Date,
    endDate: Date,
    externalSignal?: AbortSignal,
  ): Promise<DeploymentAuditResponse> {
    const timeoutController = new AbortController();
    const timeout = setTimeout(() => timeoutController.abort(), AUDIT_TIMEOUT_MS);
    const signal = externalSignal
      ? AbortSignal.any([externalSignal, timeoutController.signal])
      : timeoutController.signal;

    try {
      const response = await this.fetchImpl(
        buildApiUrl("/public/audit/deployments", {
          StartDate: startDate.toISOString(),
          EndDate: endDate.toISOString(),
        }),
        {
          headers: {
            Authorization: `token ${this.token}`,
            "api-version": "1",
            Accept: "application/json",
          },
          signal,
        },
      );

      if (!response.ok) {
        const raw = await response.text();
        let payload: unknown = raw;
        try {
          payload = raw.trim() ? JSON.parse(raw) : undefined;
        } catch {
          // Gearset sometimes returns a plain-text error message.
        }
        throw new GearsetApiError(friendlyApiError(response.status, payload), response.status);
      }
      if (!response.body) throw new GearsetApiError("Gearset returned an empty deployment history response.");

      const deployments: DeploymentAuditEntry[] = [];
      const pipeline = Chain.chain([
        Readable.fromWeb(response.body as import("node:stream/web").ReadableStream),
        parser(),
        pick({ filter: "Deployments" }),
        streamArray(),
      ]);
      for await (const item of pipeline as AsyncIterable<{ key: number; value: unknown }>) {
        const deployment = compactDeploymentAuditEntry(item.value);
        if (deployment) deployments.push(deployment);
      }
      return { Deployments: deployments };
    } catch (error) {
      if (error instanceof GearsetApiError) throw error;
      if (error instanceof Error && error.name === "AbortError") {
        throw new GearsetApiError("The Gearset deployment history request timed out or was cancelled.");
      }
      throw new GearsetApiError(error instanceof Error ? error.message : "The Gearset deployment history failed.");
    } finally {
      clearTimeout(timeout);
    }
  }
}
