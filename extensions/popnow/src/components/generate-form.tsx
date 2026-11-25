import {
  Action,
  ActionPanel,
  Alert,
  confirmAlert,
  Form,
  Icon,
  open,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { showFailureToast, useCachedPromise, useForm, usePromise } from "@raycast/utils";
import { randomUUID } from "node:crypto";
import { useRef, useState } from "react";
import {
  BILLING_URL,
  createTask,
  formatPrice,
  getModel,
  listModels,
  Modality,
  modelTitle,
  PopNowError,
  Quote,
  quote,
} from "../api";
import { TaskResult } from "./task-result";

/** Optional fields shown as dropdowns when the selected model lists their allowed values. */
const OPTION_FIELDS: Record<string, string> = {
  aspect_ratio: "Aspect Ratio",
  resolution: "Resolution",
  duration: "Duration",
  quality: "Quality",
};

/** A confirmed request whose outcome is unknown. Retrying it reuses the quote and idempotency key. */
interface PendingRequest {
  fingerprint: string;
  quote: Quote;
  idempotencyKey: string;
}

interface FormValues {
  prompt: string;
  model: string;
}

interface Props {
  modality: Modality;
  task: string;
  defaultModel: string;
  promptPlaceholder: string;
}

export function GenerateForm({ modality, task, defaultModel, promptPlaceholder }: Props) {
  const { push } = useNavigation();
  const [options, setOptions] = useState<Record<string, string>>({});
  const pending = useRef<PendingRequest | undefined>(undefined);

  const { handleSubmit, itemProps, values } = useForm<FormValues>({
    initialValues: { prompt: "", model: defaultModel },
    validation: { prompt: (value) => (value?.trim() ? undefined : "Describe what to create") },
    onSubmit: submit,
  });
  const model = values.model;

  const { data: models, isLoading: loadingModels } = useCachedPromise(listModels, [{ modality, task }], {
    keepPreviousData: true,
    failureToastOptions: { title: "Could not load models" },
  });
  const { data: info, isLoading: loadingInfo } = usePromise(getModel, [model], {
    onData: () => setOptions({}),
    failureToastOptions: { title: "Could not load model options" },
  });

  const properties = info?.inputSchema?.properties ?? {};
  const optionFields = Object.keys(OPTION_FIELDS).filter((key) => (properties[key]?.enum?.length ?? 0) > 1);

  async function submit({ prompt, model }: FormValues) {
    const input: Record<string, unknown> = { prompt: prompt.trim() };
    for (const key of optionFields) {
      const value = options[key] ?? String(properties[key]?.default ?? properties[key]?.enum?.[0]);
      const original = properties[key]?.enum?.find((item) => String(item) === value);
      input[key] = original ?? value;
    }
    const fingerprint = JSON.stringify([model, input]);
    const retry = pending.current?.fingerprint === fingerprint ? pending.current : undefined;

    const toast = await showToast({ style: Toast.Style.Animated, title: "Getting price" });
    try {
      const q = retry?.quote ?? (await quote(model, input));
      toast.hide();
      const confirmed = await confirmAlert({
        title: `Generate for up to $${q.maxChargeUsd}?`,
        message:
          q.expectedChargeUsd && q.expectedChargeUsd !== q.maxChargeUsd
            ? `Usually $${q.expectedChargeUsd}.`
            : undefined,
        icon: Icon.Coins,
        primaryAction: { title: "Generate", style: Alert.ActionStyle.Default },
      });
      if (!confirmed) return;

      const request = retry ?? { fingerprint, quote: q, idempotencyKey: randomUUID() };
      pending.current = request;
      const started = await showToast({ style: Toast.Style.Animated, title: "Generating" });
      const record = await createTask(model, input, q, request.idempotencyKey);
      pending.current = undefined;
      started.hide();
      push(<TaskResult initial={record} prompt={prompt.trim()} />);
    } catch (error) {
      // A 4xx means the task was refused. Anything else may have started it, so keep the key for a retry.
      if (error instanceof PopNowError && error.status < 500) pending.current = undefined;
      if (error instanceof PopNowError && error.isBalance) {
        await showFailureToast(error, {
          title: "Not enough balance",
          primaryAction: { title: "Add Funds", onAction: () => open(BILLING_URL) },
        });
        return;
      }
      await showFailureToast(error, { title: "Generation failed" });
    }
  }

  return (
    <Form
      isLoading={loadingModels || loadingInfo}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Get Price and Generate" icon={Icon.Wand} onSubmit={handleSubmit} />
          <Action.OpenInBrowser title="Add Funds" url={BILLING_URL} />
        </ActionPanel>
      }
    >
      <Form.TextArea title="Prompt" placeholder={promptPlaceholder} {...itemProps.prompt} />
      <Form.Dropdown title="Model" {...itemProps.model}>
        {!models?.some((item) => item.model === model) && <Form.Dropdown.Item value={model} title={model} />}
        {models?.map((item) => (
          <Form.Dropdown.Item
            key={item.model}
            value={item.model}
            title={[modelTitle(item), formatPrice(item.usd)].filter(Boolean).join("  ·  ")}
          />
        ))}
      </Form.Dropdown>
      {optionFields.map((key) => {
        const property = properties[key];
        const fallback = String(property.default ?? property.enum?.[0]);
        return (
          <Form.Dropdown
            key={`${model}-${key}`}
            id={key}
            title={OPTION_FIELDS[key]}
            value={options[key] ?? fallback}
            onChange={(value) => setOptions((current) => ({ ...current, [key]: value }))}
          >
            {property.enum?.map((item) => (
              <Form.Dropdown.Item
                key={String(item)}
                value={String(item)}
                title={key === "duration" ? `${item}s` : String(item)}
              />
            ))}
          </Form.Dropdown>
        );
      })}
      <Form.Description text="You see the price before anything is charged. Failed jobs are refunded automatically." />
    </Form>
  );
}
