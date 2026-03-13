import { useCallback } from "react";
import { Form, Action, ActionPanel, useNavigation } from "@raycast/api";
import { useForm } from "@raycast/utils";
import { SelectChannelValues } from "../types";

function SelectChannelForm(props: { defaultChannel?: string; onCreate: (channel: string) => void }) {
  const { onCreate, defaultChannel = "" } = props;
  const { pop } = useNavigation();

  const handleReturn = useCallback(
    (values: { channel: string }) => {
      onCreate(values.channel);
      pop();
    },
    [onCreate, pop]
  );

  console.log("defaultChannel", defaultChannel);

  const { handleSubmit, itemProps } = useForm<SelectChannelValues>({
    onSubmit(values: any) {
      handleReturn({ channel: values.channel });
    },
    initialValues: {
      channel: defaultChannel,
    },
    validation: {
      channel: (value: string | undefined) => {
        if (value && value.length < 1) {
          return "Channel name is required";
        }
        if (value && value.length > 164) {
          return "Channel name must be 164 characters max";
        }
      },
    },
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Select Channel" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField title="Channel" {...itemProps.channel} />
    </Form>
  );
}

export default SelectChannelForm;
