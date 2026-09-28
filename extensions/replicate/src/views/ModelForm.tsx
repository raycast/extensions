import { useEffect, useState } from "react";
import { Action, ActionPanel, Form, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { useLocalStorage } from "@raycast/utils";
import { createPrediction, errorMessage, isAuthError, uploadFile } from "../lib/replicate";
import { Model } from "../types";
import { showAuthError } from "../utils/helpers";
import { Field, modelFields } from "../utils/schema";
import { useModel } from "../hooks/useModel";
import { ModelField } from "./ModelField";
import { PredictionDetail } from "./PredictionDetail";

export type FormValues = Record<string, string | string[] | boolean>;

const asNumber = (value: string, field: Field) =>
  field.schema.type === "integer" ? Number.parseInt(value, 10) : Number.parseFloat(value);

const splitList = (text: string) =>
  text
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean);

const parseJsonList = (text: string) => {
  try {
    const parsed: unknown = JSON.parse(text);
    return Array.isArray(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
};

const listValue = (text: string, field: Field) => {
  const items = parseJsonList(text) ?? splitList(text);
  const itemType = field.schema.items?.type;
  return itemType === "integer" || itemType === "number" ? items.map(Number) : items;
};

const isList = (field: Field) => field.schema.type === "array";

export const buildInput = async (fields: Field[], values: FormValues) => {
  const input: Record<string, unknown> = {};

  for (const field of fields) {
    const value = values[field.name];

    if (field.kind === "file") {
      const paths = Array.isArray(value) ? value : [];
      const typed = String(values[`${field.name}__url`] ?? "").trim();
      const urls = isList(field) ? splitList(typed) : [typed].filter(Boolean);
      const files = paths.length ? await Promise.all(paths.map(uploadFile)) : urls;
      if (files.length) input[field.name] = isList(field) ? files : files[0];
      continue;
    }
    if (field.kind === "boolean") {
      input[field.name] = Boolean(value);
      continue;
    }

    const text = String(value ?? "").trim();
    if (!text) continue;
    if (isList(field)) input[field.name] = listValue(text, field);
    else input[field.name] = field.kind === "number" ? asNumber(text, field) : text;
  }

  return input;
};

type Props = {
  model: Model;
  onOpen?: (model: Model) => void;
};
export const ModelForm = ({ model: listed, onOpen }: Props) => {
  const { push } = useNavigation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const id = `${listed.owner}/${listed.name}`;

  // A listed model carries no schema, so the inputs need the model's own endpoint.
  const { data: fetched, isLoading } = useModel(listed.latest_version ? undefined : id);
  const model = listed.latest_version ? listed : fetched;

  const { value: lastInputs, setValue: setLastInputs } = useLocalStorage<Record<string, Record<string, string>>>(
    "last-inputs",
    {},
  );

  useEffect(() => {
    onOpen?.(listed);
  }, []);

  const fields = modelFields(model);

  const handleSubmit = async (values: FormValues) => {
    if (!model) return;

    const provided = (field: Field) =>
      [values[field.name], values[`${field.name}__url`]].some((value) => String(value ?? "").trim());
    const missing = fields.filter((field) => field.required && field.kind !== "boolean" && !provided(field));
    if (missing.length) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Missing Required Input",
        message: missing.map((field) => field.title).join(", "),
      });
      return;
    }

    setIsSubmitting(true);
    const toast = await showToast(Toast.Style.Animated, "Starting the prediction...");
    try {
      const input = await buildInput(fields, values);
      const prediction = await createPrediction({
        owner: model.owner,
        name: model.name,
        version: model.latest_version?.id,
        official: model.is_official,
        input,
      });

      const remembered = Object.fromEntries(
        Object.entries(input).map(([key, value]) => [key, typeof value === "string" ? value : String(value)]),
      );
      await setLastInputs({ ...(lastInputs ?? {}), [id]: remembered });

      toast.hide();
      push(<PredictionDetail id={prediction.id} initial={prediction} />);
    } catch (error) {
      toast.hide();
      if (isAuthError(error)) {
        await showAuthError(undefined, errorMessage(error));
        return;
      }
      await showToast({
        style: Toast.Style.Failure,
        title: "Could Not Run the Model",
        message: errorMessage(error),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading || !model) {
    return <Form isLoading navigationTitle={id} />;
  }

  return (
    <Form
      isLoading={isSubmitting}
      navigationTitle={id}
      searchBarAccessory={<Form.LinkAccessory target={`https://replicate.com/${id}`} text="Open on Replicate" />}
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.Play} title="Run Model" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      {fields.map((field) => (
        <ModelField key={field.name} field={field} defaultValue={lastInputs?.[id]?.[field.name]} />
      ))}
      {!fields.length && <Form.Description text="This model exposes no inputs." />}
    </Form>
  );
};
