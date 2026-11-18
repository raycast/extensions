import { Action, ActionPanel, Form, showToast, Toast } from "@raycast/api";
import { FormValidation, useForm } from "@raycast/utils";
import { randomUUID } from "node:crypto";
import { elevationUnit, fromDisplayElevation, toDisplayElevation } from "../lib/units";
import type { Resort } from "../types";

type Values = { name: string; lat: string; lon: string; baseElevation: string; topElevation: string };

type Props =
  /** Add a new custom resort, or edit an existing one. */
  | { mode: "custom"; resort?: Resort; onSave: (resort: Resort) => Promise<void>; afterSave: () => void }
  /** Override base and top for a bundled resort. */
  | {
      mode: "override";
      resort: Resort;
      onSave: (elevations: { baseElevation: number; topElevation: number }) => Promise<void>;
      afterSave: () => void;
    };

const numberIn = (min: number, max: number) => (value?: string) => {
  const n = Number(value);
  if (!value?.trim() || Number.isNaN(n)) return "Enter a number";
  if (n < min || n > max) return `Must be between ${min} and ${max}`;
};

export function ResortForm(props: Props) {
  const { mode, resort } = props;
  const unit = elevationUnit();
  const shown = (m?: number) => (m === undefined ? "" : String(toDisplayElevation(m)));

  const { handleSubmit, itemProps, setValidationError } = useForm<Values>({
    initialValues: {
      name: resort?.name ?? "",
      lat: resort ? String(resort.lat) : "",
      lon: resort ? String(resort.lon) : "",
      baseElevation: shown(resort?.baseElevation),
      topElevation: shown(resort?.topElevation),
    },
    validation: {
      name: mode === "custom" ? FormValidation.Required : undefined,
      lat: mode === "custom" ? numberIn(-90, 90) : undefined,
      lon: mode === "custom" ? numberIn(-180, 180) : undefined,
      baseElevation: numberIn(-500, 30000),
      topElevation: numberIn(-500, 30000),
    },
    async onSubmit(values) {
      const baseElevation = fromDisplayElevation(Number(values.baseElevation));
      const topElevation = fromDisplayElevation(Number(values.topElevation));
      if (topElevation <= baseElevation) {
        setValidationError("topElevation", "Must be higher than the base");
        return false;
      }
      if (props.mode === "override") {
        await props.onSave({ baseElevation, topElevation });
      } else {
        await props.onSave({
          id: props.resort?.id ?? `custom-${randomUUID()}`,
          name: values.name.trim(),
          country: "Custom",
          region: "",
          lat: Number(values.lat),
          lon: Number(values.lon),
          baseElevation,
          topElevation,
        });
      }
      await showToast({ style: Toast.Style.Success, title: "Saved", message: resort?.name ?? values.name });
      props.afterSave();
    },
  });

  // Editing always happens in a pushed view, so it gets a title. Adding is the Add Resort command's root
  // view, which Raycast names itself.
  const title = mode === "override" ? `Edit Elevations: ${resort.name}` : resort ? "Edit Resort" : undefined;

  return (
    <Form
      navigationTitle={title}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      {mode === "override" ? (
        <Form.Description
          title={resort.name}
          text="Override OpenSkiData's base and top elevations for this resort. Forecasts are downscaled to these heights."
        />
      ) : (
        <>
          <Form.TextField title="Name" placeholder="My Local Hill" {...itemProps.name} />
          <Form.TextField title="Latitude" placeholder="50.1163" {...itemProps.lat} />
          <Form.TextField title="Longitude" placeholder="-122.9574" {...itemProps.lon} />
        </>
      )}
      <Form.TextField title={`Base Elevation (${unit})`} placeholder="Lowest lift" {...itemProps.baseElevation} />
      <Form.TextField title={`Top Elevation (${unit})`} placeholder="Highest lift" {...itemProps.topElevation} />
    </Form>
  );
}
