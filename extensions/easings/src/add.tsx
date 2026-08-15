import { nanoid } from "nanoid";
import { useEffect, useState } from "react";

import { Action, ActionPanel, Form, LocalStorage, showToast, Toast, useNavigation } from "@raycast/api";
import { FormValidation, useForm } from "@raycast/utils";

import { SPRING_PRESETS } from "./utils/constants";
import { Easing, SpringValues, State } from "./utils/types";

interface FormValues {
  title: string;
  type: string;
  valueType: string;
  value: string;
  stiffness: string;
  damping: string;
  mass: string;
}

export default function Command() {
  const { pop } = useNavigation();

  const [state, setState] = useState<State>({
    isLoading: true,
    easings: [],
  });

  useEffect(() => {
    (async () => {
      const storedEasings = await LocalStorage.getItem<string>("easings");

      if (!storedEasings) {
        setState((previous) => ({ ...previous, isLoading: false }));
        return;
      }

      try {
        const easings: Easing[] = JSON.parse(storedEasings);
        setState((previous) => ({ ...previous, easings, isLoading: false }));
      } catch (e) {
        setState((previous) => ({ ...previous, easings: [], isLoading: false }));
      }
    })();
  }, []);

  const { handleSubmit, itemProps, values } = useForm<FormValues>({
    onSubmit({ title, value, type, valueType, stiffness, damping, mass }) {
      let parsedValue: string | SpringValues;

      if (type === "spring" && valueType === "raw" && stiffness && damping && mass) {
        parsedValue = {
          stiffness,
          damping,
          mass,
        };
      } else if (typeof value === "string" && value.includes("cubic-bezier(")) {
        parsedValue = value.replace("cubic-bezier(", "").replace(")", "").replace(";", "");
      } else if (typeof value === "string" && value.includes("cubicBezier(")) {
        parsedValue = value.replace("cubicBezier(", "").replace(")", "").replace(";", "");
      } else if (typeof value === "string" && value.includes("linear(")) {
        parsedValue = value.replace("linear(", "").replace(")", "").replace(";", "");
      } else {
        parsedValue = value;
      }

      const newEasing = { id: nanoid(), title, type, value: parsedValue, valueType: valueType || "custom" };
      const newEasings = [...state.easings, newEasing];

      LocalStorage.setItem("easings", JSON.stringify(newEasings));

      setState((previous) => ({ ...previous, easings: newEasings }));
      showToast({
        style: Toast.Style.Success,
        title: "Success",
        message: `Successfully saved: ${title}`,
      });

      pop();
    },
    validation: {
      title: FormValidation.Required,
      type: FormValidation.Required,
      valueType: (value) => {
        if (values.type === "spring" && !value) {
          return "Value type is required for spring animations";
        }
      },
      value: (value) => {
        if (values.type !== "spring" || values.valueType === "linear") {
          if (!value) return "Easing value is required";
          if (typeof value === "string" && value.length <= 6) {
            return "Invalid easing value";
          }
        }
      },
      stiffness: (value) => {
        if (values.type === "spring" && values.valueType === "raw") {
          if (!value) return "Stiffness is required for spring animations";
          if (isNaN(Number(value))) return "Stiffness must be a valid number";
          if (Number(value) <= 0) return "Stiffness must be greater than 0";
        }
      },
      damping: (value) => {
        if (values.type === "spring" && values.valueType === "raw") {
          if (!value) return "Damping is required for spring animations";
          if (isNaN(Number(value))) return "Damping must be a valid number";
          if (Number(value) <= 0) return "Damping must be greater than 0";
        }
      },
      mass: (value) => {
        if (values.type === "spring" && values.valueType === "raw") {
          if (!value) return "Mass is required for spring animations";
          if (isNaN(Number(value))) return "Mass must be a valid number";
          if (Number(value) <= 0) return "Mass must be greater than 0";
        }
      },
    },
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Add Custom Easing" onSubmit={handleSubmit} />
          <Action.OpenInBrowser title="Create Easings at easings.dev" url="https://easings.dev/create" />
        </ActionPanel>
      }
    >
      <Form.TextField title="Title" placeholder="Enter a name" {...itemProps.title} />
      <Form.Dropdown title="Easing Type" {...itemProps.type}>
        <Form.Dropdown.Item value="in-out" title="Ease In Out" />
        <Form.Dropdown.Item value="in" title="Ease In" />
        <Form.Dropdown.Item value="out" title="Ease Out" />
        <Form.Dropdown.Item value="spring" title="Spring" />
      </Form.Dropdown>
      {values.type === "spring" && (
        <>
          <Form.Dropdown title="Value Type" {...itemProps.valueType}>
            <Form.Dropdown.Item value="linear" title="Linear" />
            <Form.Dropdown.Item value="raw" title="Raw" />
          </Form.Dropdown>
          <Form.Description text="Spring animations use physics-based easing. Higher stiffness = faster, higher damping = less bouncy, higher mass = slower." />
        </>
      )}
      {values.type !== "spring" || values.valueType === "linear" ? (
        <Form.TextField
          title="Value"
          placeholder={
            values.type === "linear"
              ? "linear(0.5)"
              : values.type === "spring"
                ? "linear(0.5)"
                : "1,0.25,0.25,0.5 or cubic-bezier(1,0.25,0.25,0.5)"
          }
          {...itemProps.value}
        />
      ) : (
        <>
          <Form.TextField
            title="Stiffness"
            placeholder={`${SPRING_PRESETS.default.stiffness}`}
            {...itemProps.stiffness}
          />
          <Form.TextField title="Damping" placeholder={`${SPRING_PRESETS.default.damping}`} {...itemProps.damping} />
          <Form.TextField title="Mass" placeholder={`${SPRING_PRESETS.default.mass}`} {...itemProps.mass} />
        </>
      )}
    </Form>
  );
}
