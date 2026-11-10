import { Detail, Icon, Toast, showToast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useEffect, useRef, useState } from "react";
import { DeapiError } from "../lib/api";
import { downloadResult, getClient, imageMarkdown } from "../lib/files";
import { addRecord, HistoryRecord, isImageKind, JobKind, KIND_TITLES, updateRecord } from "../lib/history";
import { transcriptionText } from "../lib/jobs";
import { ResultActions } from "./ResultActions";

interface Props {
  kind: JobKind;
  model: string;
  input: string;
  /** Starts the job and returns its request ID. Leave it out to follow a job that already exists. */
  submit?: () => Promise<string>;
  /** The job to follow, when it was started earlier. */
  record?: HistoryRecord;
  width?: number;
  height?: number;
}

type State =
  | { phase: "submitting" }
  | { phase: "running"; requestId: string; progress?: number }
  | { phase: "done"; record: HistoryRecord }
  | { phase: "failed"; message: string; record?: HistoryRecord };

export function JobView(props: Props) {
  const [state, setState] = useState<State>(
    props.record ? { phase: "running", requestId: props.record.requestId } : { phase: "submitting" },
  );
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const controller = new AbortController();
    run(props, setState, controller.signal);
    return () => controller.abort();
  }, []);

  const title = KIND_TITLES[props.kind];
  const record = state.phase === "done" || state.phase === "failed" ? state.record : undefined;

  return (
    <Detail
      navigationTitle={title}
      isLoading={state.phase === "submitting" || state.phase === "running"}
      markdown={markdown(props, state)}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Model" text={props.model} />
          {props.width && props.height ? (
            <Detail.Metadata.Label title="Size" text={`${props.width} × ${props.height}`} />
          ) : null}
          {props.kind !== "transcription" && props.input ? (
            <Detail.Metadata.Label title={inputTitle(props.kind)} text={truncate(props.input, 300)} />
          ) : null}
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label
            title="Status"
            text={statusText(state)}
            icon={state.phase === "done" ? Icon.CheckCircle : state.phase === "failed" ? Icon.XMarkCircle : Icon.Clock}
          />
          {record?.filePath ? <Detail.Metadata.Label title="Saved To" text={record.filePath} /> : null}
          {state.phase !== "submitting" ? (
            <Detail.Metadata.Label
              title="Request ID"
              text={record?.requestId ?? (state as { requestId: string }).requestId}
            />
          ) : null}
        </Detail.Metadata>
      }
      actions={record ? <ResultActions record={record} /> : undefined}
    />
  );
}

async function run(props: Props, setState: (state: State) => void, signal: AbortSignal) {
  const client = getClient();
  let requestId = props.record?.requestId;
  let record: HistoryRecord | undefined = props.record;
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: `Generating ${KIND_TITLES[props.kind].toLowerCase()}…`,
  });

  try {
    if (!requestId) {
      if (!props.submit) throw new Error("Nothing to run.");
      requestId = await props.submit();
      record = {
        requestId,
        kind: props.kind,
        model: props.model,
        input: props.input,
        createdAt: new Date().toISOString(),
        status: "pending",
        width: props.width,
        height: props.height,
      };
      await addRecord(record);
    }
    setState({ phase: "running", requestId });

    const job = await client.waitForJob(requestId, {
      signal,
      onUpdate: (update) => {
        const progress = Number(update.progress);
        if (Number.isFinite(progress) && progress > 0) {
          toast.message = `${Math.round(progress)}%`;
          setState({ phase: "running", requestId: requestId as string, progress });
        }
      },
    });

    const changes: Partial<HistoryRecord> = { status: "done", resultUrl: job.result_url ?? undefined };
    if (props.kind === "transcription") {
      changes.text = await transcriptionText(job);
    } else if (job.result_url) {
      toast.message = "Saving…";
      changes.filePath = await downloadResult(job.result_url, props.kind, requestId);
    }
    await updateRecord(requestId, changes);
    const finished = { ...(record as HistoryRecord), ...changes };
    setState({ phase: "done", record: finished });

    toast.style = Toast.Style.Success;
    toast.title = `${KIND_TITLES[props.kind]} ready`;
    toast.message = undefined;
  } catch (error) {
    if (signal.aborted) {
      // The user left the view. The job keeps running and can be picked up in Generation History.
      toast.hide();
      return;
    }
    const message = error instanceof Error ? error.message : String(error);
    const stillRunning = error instanceof DeapiError && message.startsWith("The job is still running");
    if (requestId && !stillRunning) await updateRecord(requestId, { status: "error", error: message });
    setState({
      phase: "failed",
      message,
      record: record && !stillRunning ? { ...record, status: "error", error: message } : undefined,
    });
    toast.hide();
    await showFailureToast(error, { title: `Could not create the ${KIND_TITLES[props.kind].toLowerCase()}` });
  }
}

function markdown(props: Props, state: State): string {
  switch (state.phase) {
    case "submitting":
      return `## Sending to deAPI…\n\n${quote(props.input)}`;
    case "running": {
      const progress = state.progress ? ` (${Math.round(state.progress)}%)` : "";
      const note =
        props.kind === "video"
          ? "Videos can take a few minutes. You can close this window and find the result in **Generation History**."
          : "You can close this window. The result will be in **Generation History**.";
      return `## Generating${progress}…\n\n${quote(props.input)}\n\n${note}`;
    }
    case "failed":
      return `## Something went wrong\n\n${state.message}`;
    case "done":
      return resultMarkdown(state.record);
  }
}

export function resultMarkdown(record: HistoryRecord): string {
  if (record.kind === "transcription") return record.text?.trim() || "_The transcript is empty._";
  const source = record.filePath ?? record.resultUrl;
  if (isImageKind(record.kind) && source) return imageMarkdown(source, record.input);
  if (record.kind === "video") return `## Video ready\n\nPress **Enter** to play it.\n\n${quote(record.input)}`;
  if (record.kind === "speech") return `## Speech ready\n\nPress **Enter** to play it.\n\n${quote(record.input)}`;
  return "Done.";
}

function inputTitle(kind: JobKind): string {
  if (kind === "speech") return "Text";
  if (kind === "background" || kind === "upscale") return "Image";
  return "Prompt";
}

function statusText(state: State): string {
  switch (state.phase) {
    case "submitting":
      return "Submitting";
    case "running":
      return state.progress ? `Running (${Math.round(state.progress)}%)` : "Running";
    case "done":
      return "Done";
    case "failed":
      return "Failed";
  }
}

function quote(text: string): string {
  return text
    ? truncate(text, 600)
        .split("\n")
        .map((line) => `> ${line}`)
        .join("\n")
    : "";
}

function truncate(text: string, length: number): string {
  return text.length > length ? `${text.slice(0, length - 1)}…` : text;
}
