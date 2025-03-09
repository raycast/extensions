import { Form } from "@raycast/api";
import { secondsToTimestamp } from "../utils.js";
import { ItemProps } from "../types.js";

export const Clip = ({ itemProps, duration }: { itemProps: ItemProps; duration: number }) => {
  const startTimestamp = secondsToTimestamp(0);
  const endTimestamp = secondsToTimestamp(duration);

  return (
    <Form.TextField
      {...itemProps.clip}
      defaultValue=""
      value={undefined}
      title="Clip"
      placeholder={`${startTimestamp}-${endTimestamp}`}
    />
  );
};
