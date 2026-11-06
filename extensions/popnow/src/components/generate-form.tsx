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
import { showFailureToast, useCachedPromise, usePromise } from "@raycast/utils";
import { useState } from "react";
import {
  BILLING_URL,
  createTask,
  formatPrice,
  getModel,
  listModels,
  Modality,
  modelTitle,
  PopNowError,
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

interface Props {
  modality: Modality;
  task: string;
  defaultModel: string;
  promptPlaceholder: string;
}

export function GenerateForm({ modality, task, defaultModel, promptPlaceholder }: Props) {
  const { push } = useNavigation();
  const [model, setModel] = useState<string>(defaultModel);
  const [prompt, setPrompt] = useState("");
  const [promptError, setPromptError] = useState<string | undefined>();
  const [options, setOptions] = useState<Record<string, string>>({});

  const { data: models, isLoading: loadingModels } = useCachedPromise(listModels, [{ modality, task }], {
    keepPreviousData: true,
    onError: (error) => {
      showFailureToast(error, { title: "Could not load models" });
    },
  });
  const { data: info, isLoading: loadingInfo } = usePromise(getModel, [model], {
    onData: () => setOptions({}),
  });

  const properties = info?.inputSchema?.properties ?? {};
  const optionFields = Object.keys(OPTION_FIELDS).filter((key) => (properties[key]?.enum?.length ?? 0) > 1);

  async function submit() {
    if (!prompt.trim()) {
      setPromptError("Describe what to create");
      return;
    }
    const input: Record<string, unknown> = { prompt: prompt.trim() };
    for (const key of optionFields) {
      const value = options[key] ?? String(properties[key]?.default ?? properties[key]?.enum?.[0]);
      const original = properties[key]?.enum?.find((item) => String(item) === value);
      input[key] = original ?? value;
    }

    const toast = await showToast({ style: Toast.Style.Animated, title: "Getting price" });
    try {
      const q = await quote(model, input);
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

      const started = await showToast({ style: Toast.Style.Animated, title: "Generating" });
      const record = await createTask(model, input, q);
      started.hide();
      push(<TaskResult initial={record} prompt={prompt.trim()} />);
    } catch (error) {
      if (error instanceof PopNowError && error.isBalance) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Not enough balance",
          message: error.message,
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
          <Action.SubmitForm title="Get Price and Generate" icon={Icon.Wand} onSubmit={submit} />
          <Action.OpenInBrowser title="Add Funds" url={BILLING_URL} />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="prompt"
        title="Prompt"
        placeholder={promptPlaceholder}
        value={prompt}
        error={promptError}
        onChange={(value) => {
          setPrompt(value);
          if (promptError) setPromptError(undefined);
        }}
      />
      <Form.Dropdown id="model" title="Model" value={model} onChange={setModel}>
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
