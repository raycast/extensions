import { FormValidation, useForm } from "@raycast/utils";
import { Emoji } from "../../types/emoji.type";
import { Action, ActionPanel, Form, useNavigation } from "@raycast/api";
import { useState } from "react";
import { getExpirationTimestamp } from "../../utils/set-status/expiration.util";

type SlackStatusForm = {
  statusText: string;
  emoji: string;
  duration: string;
  customUntil: Date | null;
  expiration: number;
};

interface StatusFormProps {
  emojis: Emoji;
  formInitialValues: SlackStatusForm;
  onSubmit: (form: SlackStatusForm) => void;
}

const DURATION_OPTIONS = [
  { value: "0", title: "Don't clear" },
  { value: "30", title: "30 Minutes" },
  { value: "60", title: "1 Hour" },
  { value: "240", title: "4 Hours" },
  { value: "today", title: "Until Today" },
  { value: "week", title: "Until this week" },
  { value: "custom", title: "Choose" },
];

function StatusForm({ emojis, formInitialValues, onSubmit }: StatusFormProps) {
  const { pop } = useNavigation();
  const [showCustomDatePicker, setShowCustomDatePicker] = useState(formInitialValues.duration === "custom");

  const { handleSubmit, itemProps, setValidationError } = useForm<SlackStatusForm>({
    initialValues: formInitialValues,
    validation: {
      statusText: FormValidation.Required,
    },
    onSubmit: (form: SlackStatusForm) => {
      let finalTimestamp = 0;

      if (form.duration === "custom") {
        if (!form.customUntil) {
          setValidationError("customUntil", "Please select a date.");
          return;
        }
        finalTimestamp = Math.floor(form.customUntil.getTime() / 1000);
      } else {
        finalTimestamp = getExpirationTimestamp(form.duration);
      }

      const finalSubmitData: SlackStatusForm = {
        ...form,
        expiration: finalTimestamp,
      };

      onSubmit(finalSubmitData);
      pop();
    },
  });

  const { onChange: formOnChange, ...restDurationProps } = itemProps.duration;

  return (
    <Form
      navigationTitle={"Set Status"}
      actions={
        <ActionPanel>
          <Action.SubmitForm title={"Save Status"} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Dropdown {...itemProps.emoji} title={"Emoji"}>
        {Object.entries(emojis).map(([key, value]) => {
          return <Form.Dropdown.Item key={key} icon={value} title={key} value={key} />;
        })}
      </Form.Dropdown>

      <Form.TextField {...itemProps.statusText} title={"Status Text"} placeholder={"What are you working on?"} />

      <Form.Dropdown
        {...restDurationProps}
        title={"Duration"}
        onChange={(value) => {
          setShowCustomDatePicker(value === "custom");

          if (formOnChange) {
            formOnChange(value);
          }
        }}
      >
        {DURATION_OPTIONS.map((duration) => (
          <Form.Dropdown.Item key={duration.value} title={duration.title} value={duration.value} />
        ))}
      </Form.Dropdown>

      {showCustomDatePicker && (
        <Form.DatePicker {...itemProps.customUntil} title={"Until"} type={Form.DatePicker.Type.DateTime} />
      )}
    </Form>
  );
}

StatusForm.displayName = "StatusForm";

export { type SlackStatusForm, StatusForm };
