import {
  Action,
  ActionPanel,
  Alert,
  Clipboard,
  confirmAlert,
  Detail,
  Icon,
  showToast,
  Toast,
  Keyboard,
} from "@raycast/api";
import { useCallback, useEffect, useRef, useState } from "react";
import { logger } from "@chrismessina/raycast-logger";
import {
  composePullAndUp,
  DockerContainer,
  findContainersByPort,
  findDockerPath,
  isDockerRunning,
  imagesChanged,
  readProjectImageIds,
  waitForApi,
} from "./utils/docker";
import { classifyComposeFailure, composeCommandLine, summarizeComposeFailure } from "./utils/compose";
import { isApiReachable, isLocalHost, respondsAsKarakeep } from "./utils/connection";
import { useConfig } from "./hooks/useConfig";
import { useTranslation } from "./hooks/useTranslation";
import { toErrorMessage } from "./utils/toast";
import { ChangelogView } from "./components/ChangelogView";

const log = logger.child("[Update]");

type Phase = "checking" | "ready" | "updating" | "done" | "unavailable";

/** Keep the on-screen log bounded — a pull emits hundreds of progress lines. */
const MAX_LOG_LINES = 40;

export default function UpdateKarakeep() {
  const { t } = useTranslation();
  const { config } = useConfig();
  const { apiUrl } = config;

  const [phase, setPhase] = useState<Phase>("checking");
  const [container, setContainer] = useState<DockerContainer | undefined>();
  const [reason, setReason] = useState<string | undefined>();
  const [output, setOutput] = useState<string[]>([]);
  const [result, setResult] = useState<string | undefined>();
  const [succeeded, setSucceeded] = useState(false);
  // Whether we PROVED this container serves Karakeep, as opposed to inferring
  // it from a port match. Drives a confirmation before anything destructive.
  const [identityProven, setIdentityProven] = useState(false);
  // A double ↵ can fire onAction twice before `phase` commits, which would run
  // two concurrent pulls against the same project.
  const inFlight = useRef(false);

  const detect = useCallback(async () => {
    setPhase("checking");
    // Clear everything derived from the PREVIOUS detection before starting.
    // Only the success path assigns these, so without this an early return
    // leaves the last run's container and identity verdict in place. Nothing
    // can reach them today — the destructive action is gated on `phase` — but
    // that invariant lives thirty lines away, and the Copy Command action was
    // already rendering a stale project's invocation on a failed re-check.
    setContainer(undefined);
    setIdentityProven(false);
    // Every bail below is logged: "the command says it can't update" is the
    // most likely thing to need diagnosing, and until now all five reasons
    // reached the screen but none reached the log.
    log.info("Checking for a local Karakeep container", { apiUrl });
    try {
      const url = new URL(apiUrl);
      if (!isLocalHost(apiUrl)) {
        log.info("Update unavailable: server is not on this machine", { host: url.hostname });
        setReason(t("update.unavailable.notLocal", { host: url.hostname }));
        setPhase("unavailable");
        return;
      }
      if (!findDockerPath()) {
        log.info("Update unavailable: no Docker CLI in the standard locations");
        setReason(t("update.unavailable.noDocker"));
        setPhase("unavailable");
        return;
      }
      if (!(await isDockerRunning())) {
        log.info("Update unavailable: Docker daemon is not responding");
        setReason(t("update.unavailable.daemonDown"));
        setPhase("unavailable");
        return;
      }

      const port = url.port || (url.protocol === "https:" ? "443" : "80");
      const candidates = await findContainersByPort(port);
      if (candidates.length === 0) {
        log.info("Update unavailable: no container publishes this port", { port });
        setReason(t("update.unavailable.noContainer", { port }));
        setPhase("unavailable");
        return;
      }

      // Recreating a Compose project is destructive, so a guess is not good
      // enough. Two containers can declare the same host port — a stopped
      // leftover and someone else's running app — and picking either one on a
      // port match alone can update a project the user never asked about.
      const projects = [...new Set(candidates.map((c) => c.project ?? c.name))];
      if (projects.length > 1) {
        log.info("Update unavailable: several projects publish this port", { port, projects });
        setReason(t("update.unavailable.ambiguous", { port, projects: projects.join(", ") }));
        setPhase("unavailable");
        return;
      }

      const found = candidates.find((c) => c.running) ?? candidates[0];

      // Proving the API is Karakeep proves the APPLICATION, not the container —
      // the two only coincide when this container is the one serving the port.
      // So the check splits on that:
      let proven = false;
      if (found.running) {
        // It holds the port, so whatever answers there is this container. Make
        // it prove it is Karakeep before offering to recreate it.
        if (!(await respondsAsKarakeep())) {
          log.info("Update unavailable: the server on this port did not identify as Karakeep", {
            port,
            container: found.name,
          });
          setReason(t("update.unavailable.notKarakeep", { apiUrl }));
          setPhase("unavailable");
          return;
        }
        proven = true;
      } else if (await isApiReachable(apiUrl)) {
        // The candidate is stopped, yet something is answering — so the thing
        // serving your Karakeep URL is NOT this container (a native install, or
        // another app). Recreating it would update something unrelated while
        // leaving the real instance alone.
        log.info("Update unavailable: this port is served by something other than the stopped container", {
          port,
          container: found.name,
        });
        setReason(t("update.unavailable.servedByOther", { port, name: found.name }));
        setPhase("unavailable");
        return;
      }
      // Nothing is answering and only one project publishes the port, so this
      // stopped candidate is what WOULD serve the URL. That is an inference,
      // not proof — with the server down there is nothing to ask. `proven`
      // stays false and the update is gated behind a confirmation naming the
      // project, because the alternative is recreating a stranger's project on
      // a single keystroke.

      if (!found.configFiles?.length) {
        log.info("Update unavailable: container was not created by Compose", { name: found.name });
        setReason(t("update.unavailable.notCompose", { name: found.name }));
        setPhase("unavailable");
        return;
      }

      log.info("Local container found", {
        name: found.name,
        project: found.project,
        service: found.service,
        image: found.image,
        running: found.running,
        configFiles: found.configFiles,
      });
      setContainer(found);
      setIdentityProven(proven);
      setPhase("ready");
    } catch (error) {
      log.error("Detection failed", { error: toErrorMessage(error) });
      setReason(toErrorMessage(error));
      setPhase("unavailable");
    }
  }, [apiUrl, t]);

  useEffect(() => {
    detect();
  }, [detect]);

  const runUpdate = useCallback(async () => {
    if (!container || inFlight.current) return;

    // Identity could not be proven — the container is stopped, so there was
    // nothing to ask. Everything below RECREATES this project, so the last
    // check available is the user's own eyes on the name.
    if (!identityProven) {
      const confirmed = await confirmAlert({
        title: t("update.confirm.title"),
        message: t("update.confirm.message", {
          project: container.project ?? container.name,
          image: container.image ?? "—",
        }),
        icon: Icon.ExclamationMark,
        primaryAction: { title: t("update.confirm.proceed"), style: Alert.ActionStyle.Destructive },
      });
      if (!confirmed) {
        log.info("Update cancelled at the unverified-identity confirmation", { project: container.project });
        return;
      }
    }

    inFlight.current = true;
    setPhase("updating");
    setOutput([]);
    setResult(undefined);
    setSucceeded(false);

    // Fired BEFORE the work starts: the pull can run for minutes, and a screen
    // that says nothing for that long reads as a hang.
    const toast = await showToast({ style: Toast.Style.Animated, title: t("update.toast.updating") });

    const done = log.time("update");
    try {
      const before = await readProjectImageIds(container);
      log.info("Starting update", { container: container.name, project: container.project, image: container.image });
      log.debug("Images before update", { images: before && Object.fromEntries(before) });

      // Collected locally, not read back from `output`: this callback closes over
      // the state value from when it was memoized, so `output` here is whatever
      // it was BEFORE the run — always stale, usually empty.
      const collected: string[] = [];

      const composeDone = log.time("docker compose up --pull always");
      try {
        await composePullAndUp(container, (lines) => {
          collected.push(...lines);
          // Mirrored to the log at debug level: the on-screen view keeps only
          // the last 40 lines, but a bug report needs the whole transcript.
          for (const line of lines) log.debug(line);
          setOutput((previous) => [...previous, ...lines].slice(-MAX_LOG_LINES));
        });
      } finally {
        // In a finally so a failed pull still records how long it ran before
        // giving up — the timer leaked on exactly the path worth timing.
        composeDone();
      }

      // `docker compose up -d` returns once containers are created, not once
      // the web service binds — reporting success here would send the user
      // straight into a connection error.
      toast.title = t("update.toast.waiting");
      log.info("Compose finished, waiting for the API to answer", { apiUrl, timeoutMs: 120_000 });
      const apiDone = log.time("wait for API");
      const up = await waitForApi(apiUrl, 120_000);
      apiDone({ reachable: up });

      const after = await readProjectImageIds(container);
      // Undefined = we could not read one of the snapshots. Treated as "not a
      // confirmed upgrade" for the toast, but never reported as "already
      // current", which would be a claim we cannot support.
      const changed = imagesChanged(before, after);
      const upgraded = changed === true;
      log.debug("Images after update", { images: after && Object.fromEntries(after), changed });

      toast.style = up ? Toast.Style.Success : Toast.Style.Failure;
      toast.title = up
        ? changed === true
          ? t("update.toast.updated")
          : changed === false
            ? t("update.toast.alreadyCurrent")
            : t("update.toast.finished")
        : t("update.toast.startedButUnreachable");

      if (!up) {
        // House style: a Failure toast always leaves something to copy. There is
        // no exception here — compose succeeded and the API simply never
        // answered — so the copyable payload is the state needed to file the bug.
        const detail = [
          `Karakeep did not answer at ${apiUrl} within 120s of a successful compose run.`,
          `container: ${container.name}`,
          `project: ${container.project ?? "—"}`,
          `image: ${container.image ?? "—"}`,
          "",
          ...collected.slice(-MAX_LOG_LINES),
        ].join("\n");
        toast.primaryAction = { title: t("connection.copyError"), onAction: () => Clipboard.copy(detail) };
      }

      setResult(
        [
          changed === true
            ? t("update.result.updated")
            : changed === false
              ? t("update.result.alreadyCurrent")
              : t("update.result.unknownChange"),
          "",
          up ? t("update.result.reachable", { apiUrl }) : t("update.result.unreachable", { apiUrl }),
        ].join("\n"),
      );
      log.info("Update finished", { changed, reachable: up, image: container.image });
      done({ upgraded, reachable: up });
      setSucceeded(true);
      setPhase("done");
      // Deliberately NOT re-running detect() here. Nothing it reads changes
      // across an update — the container name, project, compose files and
      // image TAG are all stable — and its setPhase("checking") would flash
      // the detection screen over the result the user is trying to read.
    } catch (error) {
      const raw = toErrorMessage(error);
      const kind = classifyComposeFailure(raw);
      const summary = summarizeComposeFailure(raw);

      // The question the user actually has after a failed update is "is my
      // Karakeep still up?" — a wall of daemon output does not answer it, and
      // a pull that dies before recreating anything leaves the old containers
      // running. So check, and say so.
      const stillUp = await isApiReachable(apiUrl);

      log.error("Update failed", { kind, summary, stillUp, container: container.name });
      done({ failed: true, kind });
      toast.style = Toast.Style.Failure;
      toast.title = t(`update.failure.${kind}`);
      toast.message = stillUp ? t("update.failure.stillRunning") : t("update.failure.notRunning");
      toast.primaryAction = { title: t("connection.copyError"), onAction: () => Clipboard.copy(raw) };

      setResult(
        [
          `**${t(`update.failure.${kind}`)}**`,
          "",
          stillUp
            ? t("update.failure.stillRunningDetail", { apiUrl })
            : t("update.failure.notRunningDetail", { apiUrl }),
          "",
          "```",
          summary,
          "```",
        ].join("\n"),
      );
      setPhase("done");
    } finally {
      inFlight.current = false;
    }
  }, [container, apiUrl, identityProven, t]);

  const markdown = buildMarkdown({ t, phase, container, reason, output, result, apiUrl, identityProven });

  return (
    <Detail
      isLoading={phase === "checking" || phase === "updating"}
      markdown={markdown}
      actions={
        <ActionPanel>
          {(phase === "ready" || phase === "done") && container && (
            <Action title={t("update.actions.update")} icon={Icon.Download} onAction={runUpdate} />
          )}
          {succeeded && (
            <Action.Push
              title={t("update.actions.viewChangelog")}
              icon={Icon.Document}
              target={<ChangelogView image={container?.image} />}
              // Pushes a Detail view; it does not Quick Look a file. ToggleQuickLook
              // was `ray lint --fix` matching the old ⌘Y combo, not the meaning.
              // Open is the right constant and is otherwise unused in this panel.
              shortcut={Keyboard.Shortcut.Common.Open}
            />
          )}
          {phase === "unavailable" && (
            <Action title={t("update.actions.recheck")} icon={Icon.ArrowClockwise} onAction={detect} />
          )}
          {phase !== "unavailable" && container?.configFiles?.[0] && (
            <Action.CopyToClipboard title={t("update.actions.copyCommand")} content={composeCommandLine(container)} />
          )}
        </ActionPanel>
      }
    />
  );
}

function buildMarkdown({
  t,
  phase,
  container,
  reason,
  output,
  result,
  apiUrl,
  identityProven,
}: {
  t: ReturnType<typeof useTranslation>["t"];
  phase: Phase;
  container?: DockerContainer;
  reason?: string;
  output: string[];
  result?: string;
  apiUrl: string;
  identityProven: boolean;
}): string {
  const heading = `# ${t("update.title")}`;

  if (phase === "checking") return `${heading}\n\n${t("update.checking")}`;
  if (phase === "unavailable") return `${heading}\n\n${reason ?? ""}\n\n${t("update.unavailable.hint")}`;

  // The what-will-happen table answers a question you only have BEFORE running.
  // Once the command is doing or has done something, that output is the screen
  // — keeping the table up pushes the live log and the result below the fold.
  if (result || output.length) {
    const sections = [heading];
    if (result) sections.push("", result);
    if (output.length) sections.push("", `### ${t("update.progress")}`, "", "```", ...output, "```");
    return sections.join("\n");
  }

  const details = [
    `| | |`,
    `|-|-|`,
    `| ${t("update.field.container")} | \`${container?.name ?? "—"}\` |`,
    `| ${t("update.field.project")} | \`${container?.project ?? "—"}\` |`,
    `| ${t("update.field.image")} | \`${container?.image ?? "—"}\` |`,
    `| ${t("update.field.server")} | \`${apiUrl}\` |`,
  ].join("\n");

  const notes = [t("update.ready")];
  if (!identityProven) notes.push("", t("update.unverified"));
  return [heading, "", details, "", ...notes].join("\n");
}
