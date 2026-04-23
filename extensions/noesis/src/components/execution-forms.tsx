import React, { useMemo, useState } from "react";
import {
  Action,
  Clipboard,
  Detail,
  Form,
  Icon,
  showToast,
  Toast,
} from "@raycast/api";
import { NoesisActionPanel } from "./noesis-actions";
import { calculateEngine, executeWorkflow } from "../lib/api";
import {
  formatAbsoluteTime,
  formatCalculationTime,
  truncate,
} from "../lib/formatters";
import { openCommand } from "../lib/navigation";
import { syncDashboardSnapshot } from "../lib/queries";
import {
  buildEngineResultMarkdown,
  buildWorkflowResultMarkdown,
  listStructuredKeys,
} from "../lib/execution-result-presenter";
import {
  DashboardSnapshot,
  EngineExecutionInput,
  EngineExecutionResult,
  EngineSummary,
  PrecisionLevel,
  WorkflowExecutionResult,
  WorkflowSummary,
} from "../lib/types";
import { getStoredConfig } from "../lib/settings";

interface ExecutionFormValues {
  name: string;
  birthDate: string;
  birthTime: string;
  locationName: string;
  latitude: string;
  longitude: string;
  timezone: string;
  currentTime: Date | null;
  precision: PrecisionLevel;
  optionsJson: string;
}

interface ExecutionFailureState {
  title: string;
  message: string;
  draft: ExecutionFormValues;
  occurredAt: string;
  requestJson?: string;
}

interface ExecutionSuccessState<T> {
  result: T;
  requestJson?: string;
}

export function EngineExecutionForm({
  engine,
  snapshot,
}: {
  engine: EngineSummary;
  snapshot: DashboardSnapshot | null;
}) {
  const initial = useMemo(() => buildInitialValues(snapshot), [snapshot]);
  const [draft, setDraft] = useState(initial);
  const [result, setResult] =
    useState<ExecutionSuccessState<EngineExecutionResult> | null>(null);
  const [failure, setFailure] = useState<ExecutionFailureState | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (values: ExecutionFormValues) => {
    const config = await getStoredConfig();
    if (!config) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No Selemene Engine API key",
        message: "Run API Key before executing readings.",
      });
      return;
    }

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `Running ${engine.name}`,
    });
    let requestPayload: EngineExecutionInput | undefined;

    setDraft(values);
    setResult(null);
    setFailure(null);
    setIsSubmitting(true);

    try {
      requestPayload = toExecutionInput(values);
      const requestJson = JSON.stringify(
        serializeExecutionInput(requestPayload),
        null,
        2,
      );
      const response = await calculateEngine(config, engine.id, requestPayload);
      await syncDashboardSnapshot({ force: true });
      setResult({ result: response, requestJson });
      toast.style = Toast.Style.Success;
      toast.title = `${engine.name} complete`;
      toast.message = response.witnessPrompt
        ? truncate(response.witnessPrompt, 80)
        : "Result ready";
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unknown engine execution error";
      setFailure({
        title: `${engine.name} failed`,
        message,
        draft: values,
        occurredAt: new Date().toISOString(),
        requestJson: requestPayload
          ? JSON.stringify(serializeExecutionInput(requestPayload), null, 2)
          : undefined,
      });
      toast.style = Toast.Style.Failure;
      toast.title = `${engine.name} failed`;
      toast.message = message;
    } finally {
      setIsSubmitting(false);
    }
  };

  if (result) {
    return (
      <ExecutionSuccessDetail
        title={`${engine.name} Result`}
        markdown={buildEngineResultMarkdown(engine.name, result.result, {
          requestPayload: parseOptionalJsonObject(result.requestJson),
        })}
        metadata={buildEngineResultMetadata(result.result)}
        rawJson={JSON.stringify(result.result.raw, null, 2)}
        requestJson={result.requestJson}
        onEdit={() => setResult(null)}
        onRetry={() => void handleSubmit(draft)}
      />
    );
  }

  if (failure) {
    return (
      <ExecutionFailureDetail
        failure={failure}
        onEdit={() => setFailure(null)}
        onRetry={() => void handleSubmit(failure.draft)}
      />
    );
  }

  return (
    <ExecutionForm
      title={`Run ${engine.name}`}
      description="Birth data and timezone are prefilled from your profile when available. Run is the primary action here; if the request fails, this flow keeps an editable recovery state instead of dropping you back to generic commands."
      initialValues={draft}
      submitTitle="Run Engine"
      isSubmitting={isSubmitting}
      onSubmit={handleSubmit}
    />
  );
}

export function WorkflowExecutionForm({
  workflow,
  snapshot,
}: {
  workflow: WorkflowSummary;
  snapshot: DashboardSnapshot | null;
}) {
  const initial = useMemo(() => buildInitialValues(snapshot), [snapshot]);
  const [draft, setDraft] = useState(initial);
  const [result, setResult] =
    useState<ExecutionSuccessState<WorkflowExecutionResult> | null>(null);
  const [failure, setFailure] = useState<ExecutionFailureState | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (values: ExecutionFormValues) => {
    const config = await getStoredConfig();
    if (!config) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No Selemene Engine API key",
        message: "Run API Key before executing workflows.",
      });
      return;
    }

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `Running ${workflow.name}`,
    });
    let requestPayload: EngineExecutionInput | undefined;

    setDraft(values);
    setResult(null);
    setFailure(null);
    setIsSubmitting(true);

    try {
      requestPayload = toExecutionInput(values);
      const requestJson = JSON.stringify(
        serializeExecutionInput(requestPayload),
        null,
        2,
      );
      const response = await executeWorkflow(
        config,
        workflow.id,
        requestPayload,
      );
      await syncDashboardSnapshot({ force: true });
      setResult({ result: response, requestJson });
      toast.style = Toast.Style.Success;
      toast.title = `${workflow.name} complete`;
      toast.message = `${Object.keys(response.engineOutputs).length} engine outputs returned`;
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unknown workflow execution error";
      setFailure({
        title: `${workflow.name} failed`,
        message,
        draft: values,
        occurredAt: new Date().toISOString(),
        requestJson: requestPayload
          ? JSON.stringify(serializeExecutionInput(requestPayload), null, 2)
          : undefined,
      });
      toast.style = Toast.Style.Failure;
      toast.title = `${workflow.name} failed`;
      toast.message = message;
    } finally {
      setIsSubmitting(false);
    }
  };

  if (result) {
    return (
      <ExecutionSuccessDetail
        title={`${workflow.name} Result`}
        markdown={buildWorkflowResultMarkdown(
          workflow.name,
          result.result,
          parseOptionalJsonObject(result.requestJson),
        )}
        metadata={buildWorkflowResultMetadata(result.result)}
        rawJson={JSON.stringify(result.result.raw, null, 2)}
        requestJson={result.requestJson}
        onEdit={() => setResult(null)}
        onRetry={() => void handleSubmit(draft)}
      />
    );
  }

  if (failure) {
    return (
      <ExecutionFailureDetail
        failure={failure}
        onEdit={() => setFailure(null)}
        onRetry={() => void handleSubmit(failure.draft)}
      />
    );
  }

  return (
    <ExecutionForm
      title={`Run ${workflow.name}`}
      description="Workflows can return partial engine outputs by design. This screen stays in a run-centric loop: submit, inspect the result, or edit and retry immediately if the request fails."
      initialValues={draft}
      submitTitle="Run Workflow"
      isSubmitting={isSubmitting}
      onSubmit={handleSubmit}
    />
  );
}

function ExecutionSuccessDetail({
  title,
  markdown,
  metadata,
  rawJson,
  requestJson,
  onEdit,
  onRetry,
}: {
  title: string;
  markdown: string;
  metadata: React.ReactNode;
  rawJson: string;
  requestJson?: string;
  onEdit: () => void;
  onRetry: () => void;
}) {
  return (
    <Detail
      navigationTitle={title}
      markdown={markdown}
      metadata={metadata}
      actions={
        <NoesisActionPanel>
          <Action title="Edit Inputs" icon={Icon.Pencil} onAction={onEdit} />
          <Action
            title="Run Again"
            icon={Icon.RotateClockwise}
            onAction={onRetry}
          />
          <Action
            title="Open Readings"
            icon={Icon.Book}
            onAction={() => openCommand("readings")}
          />
          {requestJson ? (
            <Action.CopyToClipboard
              title="Copy Request JSON"
              icon={Icon.Document}
              content={requestJson}
            />
          ) : null}
          <Action.CopyToClipboard
            title="Copy Result JSON"
            icon={Icon.Clipboard}
            content={rawJson}
          />
        </NoesisActionPanel>
      }
    />
  );
}

function ExecutionFailureDetail({
  failure,
  onEdit,
  onRetry,
}: {
  failure: ExecutionFailureState;
  onEdit: () => void;
  onRetry: () => void;
}) {
  return (
    <Detail
      navigationTitle={failure.title}
      markdown={buildFailureMarkdown(failure)}
      metadata={buildFailureMetadata(failure)}
      actions={
        <NoesisActionPanel>
          <Action title="Edit Inputs" icon={Icon.Pencil} onAction={onEdit} />
          <Action
            title="Retry Run"
            icon={Icon.RotateClockwise}
            onAction={onRetry}
          />
          <Action.CopyToClipboard
            title="Copy Error"
            icon={Icon.Clipboard}
            content={failure.message}
          />
          {failure.requestJson ? (
            <Action.CopyToClipboard
              title="Copy Request JSON"
              icon={Icon.Document}
              content={failure.requestJson}
            />
          ) : null}
        </NoesisActionPanel>
      }
    />
  );
}

function ExecutionForm({
  title,
  description,
  initialValues,
  submitTitle,
  isSubmitting,
  onSubmit,
}: {
  title: string;
  description: string;
  initialValues: ExecutionFormValues;
  submitTitle: string;
  isSubmitting: boolean;
  onSubmit: (values: ExecutionFormValues) => Promise<void>;
}) {
  const [name, setName] = useState(initialValues.name);
  const [birthDate, setBirthDate] = useState(initialValues.birthDate);
  const [birthTime, setBirthTime] = useState(initialValues.birthTime);
  const [locationName, setLocationName] = useState(initialValues.locationName);
  const [latitude, setLatitude] = useState(initialValues.latitude);
  const [longitude, setLongitude] = useState(initialValues.longitude);
  const [timezone, setTimezone] = useState(initialValues.timezone);
  const [currentTime, setCurrentTime] = useState<Date | null>(
    initialValues.currentTime,
  );
  const [precision, setPrecision] = useState<PrecisionLevel>(
    initialValues.precision,
  );
  const [optionsJson, setOptionsJson] = useState(initialValues.optionsJson);

  return (
    <Form
      isLoading={isSubmitting}
      navigationTitle={title}
      actions={
        <NoesisActionPanel>
          <Action.SubmitForm
            title={submitTitle}
            icon={Icon.Play}
            onSubmit={() =>
              onSubmit({
                name,
                birthDate,
                birthTime,
                locationName,
                latitude,
                longitude,
                timezone,
                currentTime,
                precision,
                optionsJson,
              })
            }
          />
          <Action
            title="Copy Current Options JSON"
            icon={Icon.Clipboard}
            onAction={() => Clipboard.copy(optionsJson)}
          />
        </NoesisActionPanel>
      }
    >
      <Form.Description title="Execution" text={description} />
      <Form.TextField
        id="name"
        title="Name"
        value={name}
        onChange={setName}
        placeholder="Optional, defaults to profile full name"
      />
      <Form.TextField
        id="birthDate"
        title="Birth Date"
        value={birthDate}
        onChange={setBirthDate}
        placeholder="YYYY-MM-DD"
      />
      <Form.TextField
        id="birthTime"
        title="Birth Time"
        value={birthTime}
        onChange={setBirthTime}
        placeholder="HH:MM or HH:MM:SS"
      />
      <Form.TextField
        id="locationName"
        title="Birth Location"
        value={locationName}
        onChange={setLocationName}
        placeholder="Optional place name"
      />
      <Form.TextField
        id="latitude"
        title="Latitude"
        value={latitude}
        onChange={setLatitude}
        placeholder="12.9716"
      />
      <Form.TextField
        id="longitude"
        title="Longitude"
        value={longitude}
        onChange={setLongitude}
        placeholder="77.5946"
      />
      <Form.TextField
        id="timezone"
        title="Timezone"
        value={timezone}
        onChange={setTimezone}
        placeholder="Asia/Kolkata"
      />
      <Form.DatePicker
        id="currentTime"
        title="Current Time"
        type={Form.DatePicker.Type.DateTime}
        value={currentTime ?? undefined}
        onChange={setCurrentTime}
      />
      <Form.Dropdown
        id="precision"
        title="Precision"
        value={precision}
        onChange={(value) => setPrecision(value as PrecisionLevel)}
      >
        <Form.Dropdown.Item value="Standard" title="Standard" />
        <Form.Dropdown.Item value="High" title="High" />
        <Form.Dropdown.Item value="Extreme" title="Extreme" />
      </Form.Dropdown>
      <Form.TextArea
        id="optionsJson"
        title="Options JSON"
        value={optionsJson}
        onChange={setOptionsJson}
        placeholder='{"question":"What should I focus on?"}'
      />
    </Form>
  );
}

function buildInitialValues(
  snapshot: DashboardSnapshot | null,
): ExecutionFormValues {
  const profile = snapshot?.profile;
  return {
    name: profile?.fullName ?? "",
    birthDate: profile?.birthDate ?? "",
    birthTime: normalizeBirthTime(profile?.birthTime),
    locationName: profile?.birthLocation?.name ?? "",
    latitude:
      profile?.birthLocation?.latitude !== undefined
        ? String(profile.birthLocation.latitude)
        : "",
    longitude:
      profile?.birthLocation?.longitude !== undefined
        ? String(profile.birthLocation.longitude)
        : "",
    timezone: profile?.timezone ?? "",
    currentTime: new Date(),
    precision: normalizePrecisionPreference(profile?.preferences.precision),
    optionsJson: "{}",
  };
}

function toExecutionInput(values: ExecutionFormValues): EngineExecutionInput {
  const latitude = parseOptionalNumber(values.latitude, "Latitude", -90, 90);
  const longitude = parseOptionalNumber(
    values.longitude,
    "Longitude",
    -180,
    180,
  );
  const options = parseJson(values.optionsJson, "Options JSON");

  if (
    (latitude !== undefined || longitude !== undefined) &&
    (latitude === undefined || longitude === undefined)
  ) {
    throw new Error(
      "Latitude and longitude must both be provided when setting a birth location.",
    );
  }

  if (values.birthDate && !/^\d{4}-\d{2}-\d{2}$/.test(values.birthDate)) {
    throw new Error("Birth date must use YYYY-MM-DD.");
  }

  if (values.birthTime && !/^\d{2}:\d{2}(:\d{2})?$/.test(values.birthTime)) {
    throw new Error("Birth time must use HH:MM or HH:MM:SS.");
  }

  return {
    birthData: {
      ...(values.name.trim() ? { name: values.name.trim() } : {}),
      ...(values.birthDate.trim() ? { date: values.birthDate.trim() } : {}),
      ...(values.birthTime.trim() ? { time: values.birthTime.trim() } : {}),
      ...(typeof latitude === "number" ? { latitude } : {}),
      ...(typeof longitude === "number" ? { longitude } : {}),
      ...(values.timezone.trim() ? { timezone: values.timezone.trim() } : {}),
    },
    currentTime: values.currentTime?.toISOString(),
    precision: values.precision,
    options,
  };
}

function buildEngineResultMetadata(result: EngineExecutionResult) {
  const resultKeys = listStructuredKeys(result.result);
  const metadataKeys = listStructuredKeys(result.metadata);

  return (
    <Detail.Metadata>
      <Detail.Metadata.Label title="Engine ID" text={result.engineId} />
      {result.timestamp ? (
        <Detail.Metadata.Label
          title="Timestamp"
          text={formatAbsoluteTime(result.timestamp)}
        />
      ) : null}
      {result.consciousnessLevel !== undefined ? (
        <Detail.Metadata.Label
          title="Consciousness"
          text={String(result.consciousnessLevel)}
        />
      ) : null}
      <Detail.Metadata.Label
        title="Calculation Time"
        text={formatCalculationTime(readMetadataTime(result.metadata))}
      />
      {resultKeys.length ? (
        <Detail.Metadata.Label
          title="Result Keys"
          text={resultKeys.join(", ")}
        />
      ) : null}
      {metadataKeys.length ? (
        <Detail.Metadata.Label
          title="Metadata Keys"
          text={metadataKeys.join(", ")}
        />
      ) : null}
    </Detail.Metadata>
  );
}

function buildWorkflowResultMetadata(result: WorkflowExecutionResult) {
  const outputEngines = Object.keys(result.engineOutputs)
    .map((engineId) => engineId)
    .slice(0, 6);
  const synthesisKeys = listStructuredKeys(result.synthesis);

  return (
    <Detail.Metadata>
      <Detail.Metadata.Label title="Workflow ID" text={result.workflowId} />
      <Detail.Metadata.Label
        title="Engine Outputs"
        text={String(Object.keys(result.engineOutputs).length)}
      />
      <Detail.Metadata.Label
        title="Total Time"
        text={formatCalculationTime(result.totalTimeMs)}
      />
      {result.timestamp ? (
        <Detail.Metadata.Label
          title="Timestamp"
          text={formatAbsoluteTime(result.timestamp)}
        />
      ) : null}
      {outputEngines.length ? (
        <Detail.Metadata.Label
          title="Output Engines"
          text={outputEngines.join(", ")}
        />
      ) : null}
      {synthesisKeys.length ? (
        <Detail.Metadata.Label
          title="Synthesis Keys"
          text={synthesisKeys.join(", ")}
        />
      ) : null}
    </Detail.Metadata>
  );
}

function buildFailureMarkdown(failure: ExecutionFailureState) {
  return [
    `# ${failure.title}`,
    "",
    failure.message,
    "",
    failure.requestJson
      ? ["## Request Payload", "", "```json", failure.requestJson, "```"].join(
          "\n",
        )
      : [
          "## Request Payload",
          "",
          "The request did not reach the API because local validation failed before submission.",
        ].join("\n"),
  ].join("\n");
}

function buildFailureMetadata(failure: ExecutionFailureState) {
  return (
    <Detail.Metadata>
      <Detail.Metadata.Label title="Status" text="Failed" />
      <Detail.Metadata.Label
        title="Occurred"
        text={formatAbsoluteTime(failure.occurredAt)}
      />
      <Detail.Metadata.Label title="Precision" text={failure.draft.precision} />
      {failure.draft.birthDate ? (
        <Detail.Metadata.Label
          title="Birth Date"
          text={failure.draft.birthDate}
        />
      ) : null}
      {failure.draft.birthTime ? (
        <Detail.Metadata.Label
          title="Birth Time"
          text={failure.draft.birthTime}
        />
      ) : null}
      {failure.draft.timezone ? (
        <Detail.Metadata.Label title="Timezone" text={failure.draft.timezone} />
      ) : null}
    </Detail.Metadata>
  );
}

function serializeExecutionInput(
  input: EngineExecutionInput,
): Record<string, unknown> {
  return {
    ...(input.birthData &&
    Object.values(input.birthData).some(
      (value) => value !== undefined && value !== "",
    )
      ? {
          birth_data: {
            ...(input.birthData.name ? { name: input.birthData.name } : {}),
            ...(input.birthData.date ? { date: input.birthData.date } : {}),
            ...(input.birthData.time ? { time: input.birthData.time } : {}),
            ...(typeof input.birthData.latitude === "number"
              ? { latitude: input.birthData.latitude }
              : {}),
            ...(typeof input.birthData.longitude === "number"
              ? { longitude: input.birthData.longitude }
              : {}),
            ...(input.birthData.timezone
              ? { timezone: input.birthData.timezone }
              : {}),
          },
        }
      : {}),
    ...(input.currentTime ? { current_time: input.currentTime } : {}),
    ...(input.precision ? { precision: input.precision } : {}),
    ...(input.options && Object.keys(input.options).length > 0
      ? { options: input.options }
      : {}),
  };
}

function normalizePrecisionPreference(value: unknown): PrecisionLevel {
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "standard") {
      return "Standard";
    }
    if (normalized === "high") {
      return "High";
    }
    if (normalized === "extreme") {
      return "Extreme";
    }
  }

  return "Standard";
}

function parseOptionalNumber(
  raw: string,
  label: string,
  min: number,
  max: number,
): number | undefined {
  const value = raw.trim();
  if (!value) {
    return undefined;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < min || parsed > max) {
    throw new Error(`${label} must be between ${min} and ${max}.`);
  }

  return parsed;
}

function parseJson(raw: string, label: string): Record<string, unknown> {
  const value = raw.trim();
  if (!value) {
    return {};
  }

  try {
    const parsed = JSON.parse(value) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error("Expected an object");
    }
    return parsed as Record<string, unknown>;
  } catch (error) {
    throw new Error(
      `${label} must be valid JSON object. ${error instanceof Error ? error.message : ""}`.trim(),
    );
  }
}

function normalizeBirthTime(value?: string) {
  if (!value) {
    return "";
  }

  return value.replace(/:00$/, "");
}

function readMetadataTime(metadata: Record<string, unknown>) {
  const direct = metadata.calculation_time_ms;
  return typeof direct === "number" ? direct : undefined;
}

function parseOptionalJsonObject(
  value?: string,
): Record<string, unknown> | undefined {
  if (!value) {
    return undefined;
  }

  try {
    const parsed = JSON.parse(value) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : undefined;
  } catch {
    return undefined;
  }
}
