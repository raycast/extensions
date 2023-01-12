import { Form, ActionPanel, SubmitFormAction, showToast, ToastStyle, popToRoot } from "@raycast/api";
import Caffeinate from "./caffeinate";

const durationUnitMultiplierMap = {
  seconds: 1,
  minutes: 60,
  hours: 60 * 60,
};

interface FormValues {
  time: string;
  unit: keyof typeof durationUnitMultiplierMap;
}

const CaffeinateFor = () => {
  const onSubmit = async ({ time, unit }: FormValues) => {
    const timeAsNumber = Number.parseFloat(time);
    if (Number.isNaN(timeAsNumber)) {
      await showToast(ToastStyle.Failure, "Invalid time");
      return;
    }

    const multiplier = durationUnitMultiplierMap[unit] ?? 1;

    await Caffeinate(`-t ${timeAsNumber * multiplier}`);
    popToRoot();
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <SubmitFormAction title="Caffeinate" onSubmit={onSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="time" title="Duration" />
      <Form.Dropdown id="unit" title="Duration Unit" defaultValue="minutes">
        <Form.Dropdown.Item value="seconds" title="Seconds" />
        <Form.Dropdown.Item value="minutes" title="Minutes" />
        <Form.Dropdown.Item value="hours" title="Hours" />
      </Form.Dropdown>
    </Form>
  );
};

export default CaffeinateFor;
