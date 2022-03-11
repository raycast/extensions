import { Form, ActionPanel, SubmitFormAction, FormValues, showToast, ToastStyle, popToRoot } from "@raycast/api";
import Caffeinate from "./caffeinate";

const CaffeinateFor = () => {
  const onSubmit = async ({ time }: FormValues) => {
    if (!/^\d+$/.test(time)) {
      await showToast(ToastStyle.Failure, "Invalid time");
      return;
    }

    await Caffeinate(`-t ${time}`);
    popToRoot()
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <SubmitFormAction title="Caffeinate" onSubmit={onSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="time" title="Duration (in seconds)" />
    </Form>
  );
};

export default CaffeinateFor;
