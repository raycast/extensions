/**
 * `Automações do Hermes` (UX-SPEC §1.2, fase 2).
 *
 * **Duas armadilhas provadas contra o servidor real, ambas em D-04.**
 *
 * 1. **`?include_disabled=true` é obrigatório.** O padrão do servidor é `false` e ele
 *    esconde as automações pausadas. Sem o parâmetro, uma máquina com um job pausado vê
 *    "nenhuma automação" com uma automação real no disco.
 * 2. **O portão é o HTTP, nunca `features.jobs_admin`.** Aquele campo é um literal `False`
 *    que nenhum handler lê; quem decide é `_CRON_AVAILABLE`, e ele se manifesta como `501`.
 *    A redação anterior da D-04 mandava esconder esta tela por causa da capability — teria
 *    escondido uma tela que funciona. Aqui: `200` lista, `501` explica, `401` cai no
 *    primeiro uso.
 *
 * O vocabulário é `automação`, nunca "job" nem "cron" (§10.2), e os quatro estados saem de
 * `JOB_STATE_LABEL` — que é um vocabulário próprio e **não** se mistura com os 7 de
 * execução. `state` já vem derivado do servidor: não recalcule a partir de `enabled`.
 */

import {
  Action,
  ActionPanel,
  Alert,
  Color,
  Icon,
  List,
  Toast,
  confirmAlert,
  openExtensionPreferences,
  showToast,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { type ReactElement } from "react";

import { NotConfigured } from "./components/first-run";
import { OpenPreferencesAction } from "./components/common";
import { statusImage } from "./components/run-progress";
import { SHORTCUTS } from "./components/shortcuts";
import { HermesNotConfiguredError, HermesNotSupportedError, toHermesError } from "./lib/errors";
import { listJobs, pauseJob, queueJobRun, resumeJob } from "./lib/hermes-api";
import { isConfigured } from "./lib/preferences";
import { NO_CONNECTION, jobStateLabel } from "./lib/status";
import type { Job, JobState } from "./lib/types";

const COMMAND_TITLE = "Hermes Automations";
const NO_NAME = "Unnamed";
const PROMPT_PREVIEW = 80;

/** Ícone e cor por estado. Vocabulário próprio dos jobs: nada aqui vem de `RunStatus`. */
const STATE_TONE: Record<JobState, { icon: Icon; color: Color.ColorLike }> = {
  scheduled: { icon: Icon.Clock, color: Color.Blue },
  paused: { icon: Icon.Pause, color: Color.SecondaryText },
  completed: { icon: Icon.CheckCircle, color: Color.Green },
  error: { icon: Icon.XMarkCircle, color: Color.Red },
};

function tone(job: Job): { icon: Icon; color: Color.ColorLike } {
  return job.state !== undefined && job.state in STATE_TONE ? STATE_TONE[job.state] : STATE_TONE.scheduled;
}

function shorten(text: string, max: number): string {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length <= max ? clean : `${clean.slice(0, max).trimEnd()}…`;
}

/** Datas do servidor vêm em ISO com offset, ou `null`. Nunca invente "nunca rodou". */
function moment(iso: string | null | undefined): string | undefined {
  if (iso === null || iso === undefined || iso === "") return undefined;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return undefined;
  return new Intl.DateTimeFormat("en-US", { dateStyle: "short", timeStyle: "short" }).format(date);
}

function detailMarkdown(job: Job): string {
  const blocks = [`# ${job.name ?? NO_NAME}`];

  if (job.prompt !== undefined && job.prompt.trim() !== "") {
    blocks.push("## What it asks Hermes", job.prompt);
  }
  if (job.script !== undefined && job.script !== null && job.script.trim() !== "") {
    blocks.push("## Script", `\`\`\`\n${job.script}\n\`\`\``);
  }
  if (job.last_error !== undefined && job.last_error !== null && job.last_error.trim() !== "") {
    blocks.push("## Last error", `> ${job.last_error}`);
  }
  if (job.paused_reason !== undefined && job.paused_reason !== null && job.paused_reason.trim() !== "") {
    blocks.push("## Why it is paused", `> ${job.paused_reason}`);
  }

  return blocks.join("\n\n");
}

export default function Command(): ReactElement {
  const { data: configured, isLoading: checking, revalidate: recheck } = usePromise(isConfigured);

  const {
    data: jobs,
    isLoading,
    error,
    // Sem cache nesta tela: a lista muda quando o usuário pausa, retoma ou roda algo, e uma
    // cópia velha faria o botão parecer que não funcionou. `revalidate` é o `Atualizar lista`.
    revalidate: refresh,
  } = usePromise(
    async (ready: boolean | undefined) => {
      if (ready !== true) return undefined;
      // `true` explícito, sempre: ver a armadilha 1 no cabeçalho.
      return (await listJobs(true)).jobs;
    },
    [configured],
  );

  async function act(
    verb: "pausing" | "resuming" | "running",
    job: Job,
    run: (id: string) => Promise<unknown>,
    success: string,
  ): Promise<void> {
    try {
      await run(job.id);
      await showToast({ style: Toast.Style.Success, title: success });
      refresh();
    } catch (err) {
      await showToast({
        style: Toast.Style.Failure,
        title: toHermesError(err, `${verb} automation ${job.id}`).userMessage,
      });
    }
  }

  async function runNow(job: Job): Promise<void> {
    // Enfileirar uma execução gasta tempo do agente e pode mexer no computador do usuário:
    // é o tipo de coisa que não se dispara por um `Enter` distraído.
    const confirmed = await confirmAlert({
      title: "Run this automation now?",
      message: `"${job.name ?? NO_NAME}" goes into the Hermes queue right away, on top of its normal schedule.`,
      primaryAction: { title: "Run Now" },
      dismissAction: { title: "Cancel", style: Alert.ActionStyle.Cancel },
      rememberUserChoice: false,
    });
    if (!confirmed) return;
    await act("running", job, queueJobRun, "Automation queued");
  }

  const authenticationMissing = error instanceof HermesNotConfiguredError;
  if (configured === false || authenticationMissing) {
    return (
      <NotConfigured
        commandTitle={COMMAND_TITLE}
        onRetry={() => {
          recheck();
          refresh();
        }}
      />
    );
  }

  const busy = checking || isLoading;
  const all = jobs ?? [];
  // §10.2: "automação". A ordem é a do servidor; só separamos o que está pausado, porque é
  // a única distinção que muda o que o usuário faz com o item.
  const active = all.filter((job) => job.state !== "paused");
  const paused = all.filter((job) => job.state === "paused");

  const refreshAction = (
    <Action title="Refresh the List" icon={Icon.ArrowClockwise} shortcut={SHORTCUTS.refresh} onAction={refresh} />
  );

  /** `501 Cron module not available`: o Hermes existe, as automações é que não (E19). */
  const notSupported = error instanceof HermesNotSupportedError;

  return (
    <List
      navigationTitle={COMMAND_TITLE}
      isLoading={busy}
      isShowingDetail={all.length > 0}
      searchBarPlaceholder="Search automations by name"
    >
      {notSupported ? (
        <List.EmptyView
          icon={{ source: "cmd-jobs.png" }}
          title="Automations Are Not Available in This Hermes"
          description="This Hermes started without the scheduler. Automations come back here once it is on — nothing of yours was lost."
          actions={
            <ActionPanel>
              {refreshAction}
              <OpenPreferencesAction />
            </ActionPanel>
          }
        />
      ) : null}

      {error !== undefined && !notSupported && !authenticationMissing && all.length === 0 ? (
        <List.EmptyView
          icon={statusImage(NO_CONNECTION)}
          title={toHermesError(error, "GET /api/jobs").userMessage}
          actions={
            <ActionPanel>
              {refreshAction}
              <OpenPreferencesAction />
            </ActionPanel>
          }
        />
      ) : null}

      {!busy && error === undefined && all.length === 0 ? (
        <List.EmptyView
          icon={{ source: "cmd-jobs.png" }}
          title="No Automation Around Here"
          description="Automations are tasks Hermes runs on its own, at the time you set. They are created in Hermes Desktop."
          actions={
            <ActionPanel>
              {refreshAction}
              <OpenPreferencesAction />
            </ActionPanel>
          }
        />
      ) : null}

      {[
        { title: "Active", items: active },
        { title: "Paused", items: paused },
      ]
        .filter((section) => section.items.length > 0)
        .map((section) => (
          <List.Section key={section.title} title={section.title} subtitle={`${section.items.length}`}>
            {section.items.map((job) => {
              const nextRun = moment(job.next_run_at);
              const lastRun = moment(job.last_run_at);
              const isPaused = job.state === "paused";

              return (
                <List.Item
                  key={job.id}
                  icon={{ source: tone(job).icon, tintColor: tone(job).color }}
                  title={job.name ?? NO_NAME}
                  subtitle={job.prompt === undefined ? undefined : shorten(job.prompt, PROMPT_PREVIEW)}
                  keywords={[job.id, job.schedule_display ?? ""]}
                  accessories={[{ tag: { value: jobStateLabel(job.state), color: tone(job).color } }]}
                  detail={
                    <List.Item.Detail
                      markdown={detailMarkdown(job)}
                      metadata={
                        <List.Item.Detail.Metadata>
                          <List.Item.Detail.Metadata.TagList title="State">
                            <List.Item.Detail.Metadata.TagList.Item text={jobStateLabel(job.state)} {...tone(job)} />
                          </List.Item.Detail.Metadata.TagList>
                          <List.Item.Detail.Metadata.Label
                            title="When It Runs"
                            // `schedule_display` já vem pronto do servidor; "?" quando nada
                            // resolve. Remontar a frase a partir de `schedule` daria outra.
                            text={job.schedule_display ?? "Not set"}
                          />
                          {nextRun !== undefined ? (
                            <List.Item.Detail.Metadata.Label title="Next Time" text={nextRun} />
                          ) : null}
                          {lastRun !== undefined ? (
                            <List.Item.Detail.Metadata.Label title="Last Time" text={lastRun} />
                          ) : null}
                          {job.model !== undefined && job.model !== null ? (
                            <List.Item.Detail.Metadata.Label title="Model" text={job.model} />
                          ) : null}
                          {job.failure_streak !== undefined && job.failure_streak > 0 ? (
                            <List.Item.Detail.Metadata.Label title="Failures in a Row" text={`${job.failure_streak}`} />
                          ) : null}
                        </List.Item.Detail.Metadata>
                      }
                    />
                  }
                  actions={
                    <ActionPanel>
                      <ActionPanel.Section>
                        {isPaused ? (
                          <Action
                            title="Resume the Automation"
                            icon={Icon.Play}
                            onAction={() => void act("resuming", job, resumeJob, "Automation resumed")}
                          />
                        ) : (
                          <Action
                            title="Pause the Automation"
                            icon={Icon.Pause}
                            onAction={() => void act("pausing", job, pauseJob, "Automation paused")}
                          />
                        )}
                        <Action title="Run Now" icon={Icon.Bolt} onAction={() => void runNow(job)} />
                        {refreshAction}
                      </ActionPanel.Section>
                      <ActionPanel.Section>
                        <Action.CopyToClipboard
                          title="Copy the Automation ID"
                          content={job.id}
                          shortcut={SHORTCUTS.copyTechnical}
                        />
                        <Action
                          title="Open Settings"
                          icon={Icon.Gear}
                          shortcut={SHORTCUTS.preferences}
                          onAction={openExtensionPreferences}
                        />
                      </ActionPanel.Section>
                    </ActionPanel>
                  }
                />
              );
            })}
          </List.Section>
        ))}
    </List>
  );
}
