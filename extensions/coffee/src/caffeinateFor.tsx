import { Form, ActionPanel, Action, showToast, Toast, popToRoot } from "@raycast/api";
import { useForm } from "@raycast/utils";
import { CaffeinateFormValues } from "./interfaces";
import { startCaffeinate } from "./utils";

export default function Command() {
  const { handleSubmit, itemProps } = useForm<CaffeinateFormValues>({
    async onSubmit(values) {
      const hasValue = Object.keys(values).some((key) => values[key] !== "");

      if (!hasValue) {
        await showToast(Toast.Style.Failure, "No values set for caffeinate length");
        return;
      }

      let seconds = 0;
      let caffeinateString = "";
      const mapping = [
        { multiplier: 1, value: values.seconds, string: "s" },
        { multiplier: 60, value: values.minutes, string: "m" },
        { multiplier: 3600, value: values.hours, string: "h" },
      ];

      mapping.forEach((item) => {
        if (item.value) {
          seconds += parseInt(item.value) * item.multiplier;
          caffeinateString += item.value + item.string;
        }
      });

      await startCaffeinate(true, `Caffeinating your Mac for ${caffeinateString}`, `-t ${seconds}`);
      await popToRoot();
    },
    validation: {
      hours: (value) => {
        if (value && isNaN(parseInt(value, 10))) {
          return "Hours must be a number";
        }
      },
      minutes: (value) => {
        if (value && isNaN(parseInt(value, 10))) {
          return "Minutes must be a number";
        }
      },
      seconds: (value) => {
        if (value && isNaN(parseInt(value, 10))) {
          return "Seconds must be a number";
        }
      },
    },
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Caffeinate" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField title="Hours" {...itemProps.hours} />
      <Form.TextField title="Minutes" {...itemProps.minutes} />
      <Form.TextField title="Seconds" {...itemProps.seconds} />
    </Form>
  );
}
