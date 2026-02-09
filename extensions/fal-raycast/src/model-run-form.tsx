import {
  Action,
  ActionPanel,
  Clipboard,
  Form,
  Icon,
  LocalStorage,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { showFailureToast, useCachedPromise } from "@raycast/utils";
import { useMemo, useState } from "react";
import { getModel, modelLabel, runModel, uploadImage } from "./fal";
import { getSelectedImagePath } from "./finder";
import {
  LAST_USED_IMAGE_MODEL_KEY,
  LAST_USED_MODEL_KEY,
} from "./model-defaults";
import { extractInputFields } from "./openapi";
import { RequestFinishedDetail } from "./request-finished-detail";
import { downloadResultFile, findBestFileUrl } from "./result-files";
import { OpenAPIObject } from "./types";

type Props = {
  endpointId: string;
};

type FormValues = Record<string, string | boolean>;

type ClipboardCopyResult = {
  copiedKind: "file" | "json";
  outputFilePath?: string;
  outputUrl?: string;
  responseJson: string;
};

const COPY_JSON_FIELD_ID = "copyJsonResponse";

function toStringValue(value: string | number | boolean | undefined) {
  if (value === undefined) return "";
  return String(value);
}

function isLocalPath(value: string) {
  return (
    value.startsWith("/") ||
    value.startsWith("~/") ||
    value.startsWith("file://")
  );
}

function normalizeLocalPath(value: string) {
  if (value.startsWith("file://")) {
    return decodeURIComponent(value.replace("file://", ""));
  }
  if (value.startsWith("~/")) {
    return `${process.env.HOME}${value.slice(1)}`;
  }
  return value;
}

export function ModelRunForm(props: Props) {
  const { push } = useNavigation();
  const {
    data: model,
    isLoading,
    error,
  } = useCachedPromise(getModel, [props.endpointId]);
  const { data: selectedImagePath, isLoading: isLoadingSelectedImagePath } =
    useCachedPromise(getSelectedImagePath, []);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const formKey = `${props.endpointId}:${selectedImagePath || "no-selected-image"}`;

  const fields = useMemo(() => {
    const openapi = (model?.openapi || {}) as OpenAPIObject;
    return extractInputFields(openapi);
  }, [model]);

  const supportsImageInput = useMemo(
    () =>
      fields.some(
        (field) => field.kind === "image" || field.kind === "image-array",
      ),
    [fields],
  );

  const initialValues = useMemo<FormValues>(() => {
    const values: FormValues = {};
    for (const field of fields) {
      if (field.kind === "boolean") {
        values[field.key] = Boolean(field.defaultValue ?? false);
        continue;
      }
      if (field.kind === "image" && selectedImagePath) {
        values[field.key] = selectedImagePath;
        continue;
      }
      if (field.kind === "image-array" && selectedImagePath) {
        values[field.key] = selectedImagePath;
        continue;
      }
      values[field.key] = toStringValue(field.defaultValue);
    }
    return values;
  }, [fields, selectedImagePath]);

  async function copyResultToClipboard(
    result: unknown,
    copyJsonResponse: boolean,
  ): Promise<ClipboardCopyResult> {
    const responseJson = JSON.stringify(result, null, 2);
    const outputUrl = findBestFileUrl(result);

    if (copyJsonResponse) {
      await Clipboard.copy(responseJson);
      return { copiedKind: "json", outputUrl, responseJson };
    }

    if (!outputUrl) {
      await Clipboard.copy(responseJson);
      return { copiedKind: "json", responseJson };
    }

    const downloadedFilePath = await downloadResultFile(outputUrl);
    await Clipboard.copy({ file: downloadedFilePath });
    return {
      copiedKind: "file",
      outputFilePath: downloadedFilePath,
      outputUrl,
      responseJson,
    };
  }

  async function persistLastUsedModel() {
    await LocalStorage.setItem(LAST_USED_MODEL_KEY, props.endpointId);
    if (supportsImageInput || selectedImagePath) {
      await LocalStorage.setItem(LAST_USED_IMAGE_MODEL_KEY, props.endpointId);
    }
  }

  async function onSubmit(values: FormValues) {
    setIsSubmitting(true);
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `Running ${props.endpointId}...`,
    });
    try {
      const payload: Record<string, unknown> = {};

      if (fields.length === 0) {
        const rawInput = String(values.input || "").trim();
        if (!rawInput) {
          throw new Error("Input JSON is required");
        }
        const parsed = JSON.parse(rawInput) as Record<string, unknown>;
        const result = await runModel(props.endpointId, parsed);
        const copyJsonResponse = Boolean(values[COPY_JSON_FIELD_ID]);
        const clipboardResult = await copyResultToClipboard(
          result,
          copyJsonResponse,
        );
        await persistLastUsedModel();

        toast.style = Toast.Style.Success;
        toast.title = "Done";
        push(
          <RequestFinishedDetail
            endpointId={props.endpointId}
            copiedKind={clipboardResult.copiedKind}
            outputFilePath={clipboardResult.outputFilePath}
            outputUrl={clipboardResult.outputUrl}
            responseJson={clipboardResult.responseJson}
          />,
        );
        return;
      }

      for (const field of fields) {
        const raw = values[field.key];

        if (field.kind === "boolean") {
          payload[field.key] = Boolean(raw);
          continue;
        }

        const text = String(raw || "").trim();
        if (!text) {
          if (field.required) {
            throw new Error(`Missing required input: ${field.key}`);
          }
          continue;
        }

        if (field.kind === "number") {
          const parsed = Number(text);
          if (!Number.isFinite(parsed)) {
            throw new Error(`Invalid number for ${field.key}`);
          }
          payload[field.key] = parsed;
          continue;
        }

        if (field.kind === "image") {
          if (isLocalPath(text)) {
            payload[field.key] = await uploadImage(normalizeLocalPath(text));
          } else {
            payload[field.key] = text;
          }
          continue;
        }

        if (field.kind === "image-array") {
          const parts = text
            .split(/\n|,/)
            .map((item) => item.trim())
            .filter(Boolean);

          const uploaded: string[] = [];
          for (const part of parts) {
            if (isLocalPath(part)) {
              uploaded.push(await uploadImage(normalizeLocalPath(part)));
            } else {
              uploaded.push(part);
            }
          }
          payload[field.key] = uploaded;
          continue;
        }

        payload[field.key] = text;
      }

      const result = await runModel(props.endpointId, payload);
      const copyJsonResponse = Boolean(values[COPY_JSON_FIELD_ID]);
      const clipboardResult = await copyResultToClipboard(
        result,
        copyJsonResponse,
      );
      await persistLastUsedModel();

      toast.style = Toast.Style.Success;
      toast.title = "Done";
      push(
        <RequestFinishedDetail
          endpointId={props.endpointId}
          copiedKind={clipboardResult.copiedKind}
          outputFilePath={clipboardResult.outputFilePath}
          outputUrl={clipboardResult.outputUrl}
          responseJson={clipboardResult.responseJson}
        />,
      );
    } catch (submitError) {
      toast.style = Toast.Style.Failure;
      toast.title = "Model run failed";
      toast.message =
        submitError instanceof Error
          ? submitError.message
          : String(submitError);
      await showFailureToast(submitError, { title: "Request failed" });
    } finally {
      setIsSubmitting(false);
    }
  }

  if (error) {
    return (
      <Form
        actions={
          <ActionPanel>
            <Action.CopyToClipboard
              title="Copy Endpoint Id"
              content={props.endpointId}
            />
          </ActionPanel>
        }
      >
        <Form.Description title="Error" text={String(error)} />
      </Form>
    );
  }

  return (
    <Form
      key={formKey}
      isLoading={isLoading || isLoadingSelectedImagePath}
      enableDrafts={false}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={`Run ${props.endpointId}`}
            icon={Icon.Play}
            onSubmit={onSubmit}
          />
          <Action.CopyToClipboard
            title="Copy Endpoint Id"
            content={props.endpointId}
          />
        </ActionPanel>
      }
    >
      <Form.Description
        title="Model"
        text={
          model
            ? `${modelLabel(model)} (${props.endpointId})`
            : props.endpointId
        }
      />
      {selectedImagePath ? (
        <Form.Description title="Finder Image" text={selectedImagePath} />
      ) : null}

      {fields.map((field) => {
        if (field.kind === "boolean") {
          return (
            <Form.Checkbox
              key={field.key}
              id={field.key}
              title={field.label}
              label={field.description || ""}
              defaultValue={Boolean(initialValues[field.key])}
            />
          );
        }

        if (field.kind === "enum") {
          return (
            <Form.Dropdown
              key={field.key}
              id={field.key}
              title={field.label}
              defaultValue={String(initialValues[field.key] || "")}
            >
              {(field.enumValues || []).map((value) => (
                <Form.Dropdown.Item key={value} value={value} title={value} />
              ))}
            </Form.Dropdown>
          );
        }

        if (field.kind === "image-array") {
          return (
            <Form.TextArea
              key={field.key}
              id={field.key}
              title={field.label}
              defaultValue={String(initialValues[field.key] || "")}
              placeholder="URLs or local paths, comma/newline separated"
              info={field.description}
            />
          );
        }

        if (
          field.kind === "text" &&
          field.key.toLowerCase().includes("prompt")
        ) {
          return (
            <Form.TextArea
              key={field.key}
              id={field.key}
              title={field.label}
              defaultValue={String(initialValues[field.key] || "")}
              placeholder={field.description || "Enter prompt"}
            />
          );
        }

        return (
          <Form.TextField
            key={field.key}
            id={field.key}
            title={field.label}
            defaultValue={String(initialValues[field.key] || "")}
            placeholder={field.description}
          />
        );
      })}

      {fields.length === 0 ? (
        <Form.TextArea
          id="input"
          title="Input JSON"
          placeholder='{"prompt":"A photo of a red fox"}'
          defaultValue='{"prompt":""}'
        />
      ) : null}

      <Form.Checkbox
        id={COPY_JSON_FIELD_ID}
        title="Copy JSON Response"
        label="If enabled, copy JSON instead of the generated file"
        defaultValue={false}
      />

      {isSubmitting ? (
        <Form.Description title="Status" text="Submitting request..." />
      ) : null}
    </Form>
  );
}
