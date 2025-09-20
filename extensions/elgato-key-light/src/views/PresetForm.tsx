import { Form, ActionPanel, Action, showToast, useNavigation } from "@raycast/api";
import { Preset } from "../presets";
import { rangeValidator, DEFAULT_BRIGHTNESS, DEFAULT_TEMPERATURE } from "../utils";
import { showFailureToast } from "@raycast/utils";
import * as React from "react";
import { WARM_TEMPERATURE, COLD_TEMPERATURE } from "../elgato";

export type FormValues = {
  name: string;
  icon?: string;
  brightness: string;
  temperature: string;
};

// Simple form handler hook for Raycast
function useSimpleForm<T extends Record<string, string | number | boolean | undefined>>({
  initialValues,
  onSubmit,
  validation,
}: {
  initialValues: T;
  onSubmit: (values: T) => Promise<void>;
  validation?: Record<string, (value: string | undefined) => string | undefined>;
}) {
  const [values, setValues] = React.useState<T>(initialValues);
  const [errors, setErrors] = React.useState<Record<string, string | undefined>>({});

  const validate = (field: string, value: string | undefined) => {
    if (validation && validation[field]) {
      return validation[field](value);
    }
    return undefined;
  };

  const handleSubmit = async () => {
    const newErrors: Record<string, string | undefined> = {};
    let hasErrors = false;

    // Validate all fields
    Object.keys(values).forEach((key) => {
      const error = validate(key, values[key]?.toString());
      if (error) {
        newErrors[key] = error;
        hasErrors = true;
      }
    });

    if (hasErrors) {
      setErrors(newErrors);
      return;
    }

    await onSubmit(values);
  };

  const itemProps = Object.keys(initialValues).reduce(
    (acc, key) => {
      acc[key] = {
        value: values[key]?.toString() || "",
        error: errors[key],
        onChange: (value: string) => {
          setValues({ ...values, [key]: value });
          const error = validate(key, value);
          setErrors({ ...errors, [key]: error });
        },
      };
      return acc;
    },
    {} as Record<
      string,
      {
        value: string | undefined;
        error: string | undefined;
        onChange: (value: string) => void;
      }
    >,
  );

  return { handleSubmit, itemProps };
}

export default function PresetForm(props: {
  onSave: (values: FormValues & { id?: string }) => Promise<void>;
  preset?: Preset;
}) {
  const { pop } = useNavigation();
  const { handleSubmit, itemProps } = useSimpleForm<FormValues>({
    initialValues: {
      name: props.preset?.name ?? "",
      icon: props.preset?.icon,
      brightness: props.preset?.settings.brightness?.toString() ?? DEFAULT_BRIGHTNESS.toString(),
      temperature: props.preset?.settings.temperature?.toString() ?? DEFAULT_TEMPERATURE.toString(),
    },
    onSubmit: async (values) => {
      try {
        await props.onSave({ ...values, id: props.preset?.id });
        await showToast({ title: props.preset ? "Updated preset" : "Saved preset" });
        pop();
      } catch (error) {
        showFailureToast(error, { title: props.preset ? "Failed updating preset" : "Failed saving preset" });
      }
    },
    validation: {
      name: (value) => (value ? undefined : "Name is required"),
      brightness: rangeValidator(0, 100),
      temperature: rangeValidator(0, 100),
    },
  });

  // Default emoji options for our form
  const emojis = [
    { key: "☀️", title: "Sun" },
    { key: "🌙", title: "Moon" },
    { key: "🔥", title: "Fire" },
    { key: "❄️", title: "Snow" },
    { key: "✨", title: "Sparkles" },
    { key: "💡", title: "Light Bulb" },
    { key: "🎬", title: "Film Clapper" },
    { key: "🎥", title: "Video Camera" },
    { key: "📸", title: "Camera" },
    { key: "🎮", title: "Game Controller" },
    { key: "💻", title: "Laptop" },
    { key: "🖥️", title: "Desktop Computer" },
    { key: "📱", title: "Mobile Phone" },
  ];

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Dropdown id="icon" title="Icon" placeholder="Select an icon" {...itemProps.icon}>
        {emojis.map((emoji) => (
          <Form.Dropdown.Item key={emoji.key} value={emoji.key} icon={emoji.key} title={emoji.title} />
        ))}
      </Form.Dropdown>
      <Form.TextField id="name" title="Name" placeholder="Name of the preset" {...itemProps.name} />
      <Form.TextField
        id="brightness"
        title="Brightness (%)"
        placeholder="Brightness of the preset"
        {...itemProps.brightness}
        info="Brightness percentage (0-100)"
      />
      <Form.TextField
        id="temperature"
        title="Temperature (%)"
        placeholder="Temperature of the preset"
        {...itemProps.temperature}
        info={`Temperature percentage (0-100), 0 = ${COLD_TEMPERATURE}K, 100 = ${WARM_TEMPERATURE}K`}
      />
    </Form>
  );
}
