import {
  Action,
  ActionPanel,
  Detail,
  Icon,
  Toast,
  confirmAlert,
  getPreferenceValues,
  showToast,
} from "@raycast/api";
import React, { useEffect, useMemo, useState } from "react";
import type { MakeClient } from "./make-api";
import { presentMakeApiError } from "./make-api";
import { toScenarioEditUrl } from "./make-browser-url";
import { ScenarioLogs } from "./scenario-logs";
import type {
  GetHookResponse,
  GetScenarioResponse,
  MakeHook,
  MakeScenario,
  StartStopScenarioResponse,
} from "./types";

type Props = {
  client: MakeClient;
  baseUrl: string;
  teamId: number;
  scenarioId: number;
  initialScenario?: MakeScenario;
  consumptionOperations?: number | null;
  lastReset?: string | null;
};

function statusLabel(s: MakeScenario): string {
  const base = s.isActive ? "Live" : "Disabled";
  const flags = [
    s.isPaused ? "Paused" : null,
    s.islocked ? "Locked" : null,
    s.isinvalid ? "Invalid" : null,
  ].filter(Boolean);
  return flags.length ? `${base} (${flags.join(", ")})` : base;
}

function fmtDate(iso?: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return iso;
  return d.toLocaleString();
}

function schedulingSummary(s: MakeScenario): string {
  const sch = s.scheduling;
  if (!sch) return "—";
  const parts: string[] = [];
  if (sch.type) parts.push(`${sch.type}`);
  if (typeof sch.interval === "number") parts.push(`interval=${sch.interval}`);
  if (sch.time) parts.push(`time=${sch.time}`);
  if (sch.date) parts.push(`date=${sch.date}`);
  return parts.length ? parts.join(", ") : JSON.stringify(sch);
}

export function ScenarioDetail(props: Props) {
  const prefs = getPreferenceValues<Preferences>();
  const [isLoading, setIsLoading] = useState(true);
  const [scenario, setScenario] = useState<MakeScenario | null>(
    props.initialScenario ?? null,
  );
  const [hook, setHook] = useState<MakeHook | null>(null);
  const consumptionOps =
    typeof props.consumptionOperations === "number"
      ? props.consumptionOperations
      : null;

  // Get webhook queue count from hook
  const webhookQueueCount = hook?.queueCount ?? 0;

  async function refreshScenario() {
    try {
      setIsLoading(true);
      const scenarioRes = await props.client.getJson<GetScenarioResponse>(
        `/api/v2/scenarios/${props.scenarioId}`,
      );

      setScenario(scenarioRes.scenario);

      // Fetch hook details if scenario has a webhook
      if (scenarioRes.scenario?.hookId) {
        try {
          const hookRes = await props.client.getJson<GetHookResponse>(
            `/api/v2/hooks/${scenarioRes.scenario.hookId}`,
          );
          setHook(hookRes.hook);
        } catch (err) {
          console.error("Failed to fetch hook:", err);
          setHook(null);
        }
      } else {
        setHook(null);
      }
    } catch (e) {
      await presentMakeApiError(e, "Failed to load scenario");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void refreshScenario();
  }, [props.scenarioId]);

  async function startScenario() {
    const ok = await confirmAlert({
      title: "Start scenario?",
      message: `Scenario ID: ${props.scenarioId}`,
      primaryAction: {
        title: "Start",
      },
    });
    if (!ok) return;

    try {
      await showToast({
        style: Toast.Style.Animated,
        title: "Starting scenario…",
      });
      await props.client.postJson<StartStopScenarioResponse>(
        `/api/v2/scenarios/${props.scenarioId}/start`,
      );
      await showToast({
        style: Toast.Style.Success,
        title: "Scenario started",
      });
      await refreshScenario();
    } catch (e) {
      await presentMakeApiError(e, "Failed to start scenario");
    }
  }

  async function stopScenario() {
    const ok = await confirmAlert({
      title: "Stop scenario?",
      message: `Scenario ID: ${props.scenarioId}`,
      primaryAction: {
        title: "Stop",
      },
    });
    if (!ok) return;

    try {
      await showToast({
        style: Toast.Style.Animated,
        title: "Stopping scenario…",
      });
      await props.client.postJson<StartStopScenarioResponse>(
        `/api/v2/scenarios/${props.scenarioId}/stop`,
      );
      await showToast({
        style: Toast.Style.Success,
        title: "Scenario stopped",
      });
      await refreshScenario();
    } catch (e) {
      await presentMakeApiError(e, "Failed to stop scenario");
    }
  }

  const s = scenario;

  const teamId = props.teamId;
  const browserUrl = useMemo(
    () =>
      teamId ? toScenarioEditUrl(props.baseUrl, teamId, props.scenarioId) : "",
    [props.baseUrl, props.scenarioId, teamId],
  );

  const lastResetText = props.lastReset ? fmtDate(props.lastReset) : "—";
  const opsText =
    typeof consumptionOps === "number" ? `${consumptionOps}` : "—";

  const uniquePackages = useMemo(() => {
    if (!s?.usedPackages?.length) return [] as string[];
    const seen = new Set<string>();
    const out: string[] = [];
    for (const p of s.usedPackages) {
      const key = String(p).trim();
      if (!key) continue;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(key);
    }
    return out;
  }, [s?.usedPackages]);

  const createdByText = useMemo(() => {
    if (!s?.createdByUser) return "—";
    const name = s.createdByUser.name ?? "";
    const email = s.createdByUser.email ?? "";
    if (prefs.showUserEmails && email) return `${name} <${email}>`;
    return name || "—";
  }, [prefs.showUserEmails, s?.createdByUser]);

  const updatedByText = useMemo(() => {
    if (!s?.updatedByUser) return "—";
    const name = s.updatedByUser.name ?? "";
    const email = s.updatedByUser.email ?? "";
    if (prefs.showUserEmails && email) return `${name} <${email}>`;
    return name || "—";
  }, [prefs.showUserEmails, s?.updatedByUser]);

  const markdown = s
    ? [
        `## ${s.name}`,
        ``,
        s.description ? s.description : "",
        ``,
        `---`,
        ``,
        `### IDs`,
        `- Scenario: \`${s.id}\``,
        `- Team: \`${s.teamId}\``,
        ``,
        `### Audit`,
        `- Last Edit: ${fmtDate(s.lastEdit)}`,
        `- Created: ${fmtDate(s.created)}`,
        ``,
        `### Packages`,
        uniquePackages.length
          ? uniquePackages.map((p) => `- ${p}`).join("\n")
          : `- —`,
        ``,
        `### Users`,
        `- Created By: ${createdByText}`,
        `- Updated By: ${updatedByText}`,
      ]
        .filter((line) => line !== "")
        .join("\n")
    : `Loading scenario ${props.scenarioId}…`;

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      metadata={
        s ? (
          <Detail.Metadata>
            <Detail.Metadata.Label title="Status" text={statusLabel(s)} />
            <Detail.Metadata.Label title="Ops Used" text={opsText} />
            <Detail.Metadata.Label title="Last reset" text={lastResetText} />
            <Detail.Metadata.Label
              title="Next Exec"
              text={s.nextExec ? fmtDate(s.nextExec) : "—"}
            />
            <Detail.Metadata.Label
              title="Scheduling"
              text={schedulingSummary(s)}
            />
            <Detail.Metadata.Separator />
            {typeof s.dlqCount === "number" && s.dlqCount > 0 ? (
              <Detail.Metadata.Label
                title="Incomplete Executions"
                text={`${s.dlqCount}`}
                icon={{ source: Icon.ExclamationMark, tintColor: "red" }}
              />
            ) : null}
            {webhookQueueCount > 0 ? (
              <Detail.Metadata.Label
                title="Webhook Queue"
                text={`${webhookQueueCount}`}
                icon={{ source: Icon.Clock, tintColor: "orange" }}
              />
            ) : null}
          </Detail.Metadata>
        ) : null
      }
      actions={
        <ActionPanel>
          <Action.Push
            title="View Executions"
            icon={Icon.List}
            target={
              <ScenarioLogs
                client={props.client}
                baseUrl={props.baseUrl}
                teamId={props.teamId}
                scenarioId={props.scenarioId}
                dlqCount={s?.dlqCount}
                hookId={s?.hookId}
                webhookQueueCount={webhookQueueCount}
              />
            }
          />

          {browserUrl ? (
            <Action.OpenInBrowser
              title="Open in Browser"
              url={browserUrl}
              icon={Icon.Globe}
            />
          ) : null}

          <ActionPanel.Section>
            <Action
              title="Refresh"
              icon={Icon.ArrowClockwise}
              onAction={() => void refreshScenario()}
            />
          </ActionPanel.Section>

          <ActionPanel.Section>
            <Action
              title="Start"
              icon={Icon.Play}
              onAction={() => void startScenario()}
            />
            <Action
              title="Stop"
              icon={Icon.Stop}
              style={Action.Style.Destructive}
              onAction={() => void stopScenario()}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
