import { nanoid } from "nanoid";
import { useEffect, useState } from "react";

import { Action, ActionPanel, Form, LocalStorage, showToast, Toast, useNavigation } from "@raycast/api";
import { FormValidation, useForm } from "@raycast/utils";

import { Easing, State } from "./utils/types";

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

  useEffect(() => {
    LocalStorage.setItem("easings", JSON.stringify(state.easings));
  }, [state.easings]);

  const { handleSubmit, itemProps } = useForm<{ title: string; type: string; value: string }>({
    onSubmit({ title, value, type }) {
      let parsedValue;

      if (value.includes("cubic-bezier(")) {
        parsedValue = value.replace("cubic-bezier(", "").replace(")", "").replace(";", "");
      } else if (value.includes("cubicBezier(")) {
        parsedValue = value.replace("cubicBezier(", "").replace(")", "").replace(";", "");
      } else {
        parsedValue = value;
      }

      const newEasings = [...state.easings, { id: nanoid(), title, type, value: parsedValue }];

      setState((previous) => ({ ...previous, easings: newEasings }));
      showToast({
        style: Toast.Style.Success,
        title: "Success",
        message: `Successfully saved: ${title}`,
      });

      pop();

      [(state.easings, setState)];
    },
    validation: {
      title: FormValidation.Required,
      type: FormValidation.Required,
      value: (value) => {
        if (value && value.length <= 6) {
          return "Invalid easing value";
        } else if (!value) {
          return "Easing value is required";
        }
      },
    },
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Add Custom Easing"
            onSubmit={(values: Easing) => {
              handleSubmit(values);
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField title="Title" placeholder="Enter a name" {...itemProps.title} />
      <Form.Dropdown title="Easing Type" {...itemProps.type}>
        <Form.Dropdown.Item value="in-out" title="Ease In Out" />
        <Form.Dropdown.Item value="in" title="Ease In" />
        <Form.Dropdown.Item value="out" title="Ease Out" />
      </Form.Dropdown>
      <Form.TextField
        title="Value"
        placeholder="1,0.25,0.25,0.5 or cubic-bezier(1,0.25,0.25,0.5)"
        {...itemProps.value}
      />
    </Form>
  );
}
