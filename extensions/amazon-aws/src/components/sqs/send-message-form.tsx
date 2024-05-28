import { FormValidation, showFailureToast, useForm } from "@raycast/utils";
import { Action, ActionPanel, confirmAlert, Form, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { MessageAttributeValue, SendMessageCommand, SQSClient } from "@aws-sdk/client-sqs";
import { Queue } from "../../sqs";
import Style = Toast.Style;

interface SendMessageFormValues {
  msgBody: string;
  useDelaySeconds: boolean;
  delaySeconds: string;
  msgGroupId: string;
  useMsgDeduplicationId: boolean;
  msgDeduplicationId: string;
  useMsgAttributes: boolean;
  msgAttributes: string;
}

export const SendMessageForm = ({ queue, revalidate }: { queue: Queue; revalidate: () => void }) => {
  const isFifoQueue = queue.attributes?.FifoQueue === "true";
  const { pop } = useNavigation();
  const { handleSubmit, values, itemProps } = useForm<SendMessageFormValues>({
    onSubmit: async (values) =>
      confirmAlert({
        title: "Send Message",
        message: "Are you sure you want to send this message?",
        primaryAction: {
          title: "Send",
          onAction: async () => {
            await showToast({ style: Style.Animated, title: "🚧 Sending message..." });
            try {
              await new SQSClient({}).send(
                new SendMessageCommand({
                  QueueUrl: queue.queueUrl,
                  MessageBody: values.msgBody,
                  ...(values.useDelaySeconds && { DelaySeconds: Number(values.delaySeconds) }),
                  ...(isFifoQueue && { MessageGroupId: values.msgGroupId }),
                  ...((values.useMsgDeduplicationId || queue.attributes?.ContentBasedDeduplication === "false") && {
                    MessageDeduplicationId: values.msgDeduplicationId,
                  }),
                  ...(values.useMsgAttributes && {
                    MessageAttributes: JSON.parse(values.msgAttributes) as Record<string, MessageAttributeValue>,
                  }),
                }),
              );
              await showToast({ style: Style.Success, title: "✅ Message sent" });
            } catch (err) {
              await showFailureToast(err, { title: "❌ Failed to send message" });
            } finally {
              pop();
              revalidate();
            }
          },
        },
      }),
    initialValues: { useDelaySeconds: false, useMsgDeduplicationId: false, useMsgAttributes: false },
    validation: {
      msgDeduplicationId: (value) => {
        if (queue.attributes?.ContentBasedDeduplication === "false" && value!.length < 1) {
          return "Message Deduplication ID is required when content based deduplication is disabled";
        }
        if (values.useMsgDeduplicationId && value!.length < 1) {
          return "Message Deduplication ID is required (if checked)";
        }
      },
      msgGroupId: (value) =>
        isFifoQueue && (value!.length < 1 || value!.length > 128)
          ? "Message Group ID is required and must be between 1 and 128 characters"
          : undefined,
      msgBody: FormValidation.Required,
      delaySeconds: (value) => {
        if (values.useDelaySeconds && value!.length < 1) {
          return "Delay Seconds is required (if checked)";
        }
        if (values.useDelaySeconds && Number.isNaN(Number(value))) {
          return "Delay Seconds must be a number";
        }
      },
      msgAttributes: (value) => {
        if (values.useMsgAttributes) {
          if (value!.length < 2) {
            return "Message Attributes are required (if checked)";
          }
          try {
            JSON.parse(value!);
          } catch (err) {
            return "Message Attributes must be valid JSON";
          }
        }
      },
    },
  });

  return (
    <Form
      navigationTitle="Send Message"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Send Message" icon={Icon.Message} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text={queue.queueUrl} title="Queue URL" />
      <Form.TextArea title="Message" placeholder="Message XML, JSON, unstructured text..." {...itemProps.msgBody} />
      {!isFifoQueue && <Form.Checkbox label={"Add Delay Seconds"} {...itemProps.useDelaySeconds} />}
      {values.useDelaySeconds && (
        <Form.TextField title="Delay Seconds" placeholder="Delay Seconds" {...itemProps.delaySeconds} />
      )}
      {isFifoQueue && (
        <Form.TextField
          title="Message Group ID"
          placeholder="unique group id..."
          {...itemProps.msgGroupId}
          info="Message Group ID is required for FIFO queues"
        />
      )}
      {isFifoQueue && queue.attributes?.ContentBasedDeduplication === "true" && (
        <Form.Checkbox label={"Add Message Deduplication ID"} {...itemProps.useMsgDeduplicationId} />
      )}
      {(values.useMsgDeduplicationId || queue.attributes?.ContentBasedDeduplication === "false") && (
        <Form.TextField
          title="Message Deduplication ID"
          info={"Message Deduplication ID is required if the queue is not configured with content based deduplication"}
          placeholder="uuid..."
          {...itemProps.msgDeduplicationId}
        />
      )}
      <Form.Checkbox label={"Add Message Attributes"} {...itemProps.useMsgAttributes} />
      {values.useMsgAttributes && (
        <Form.TextArea
          title="Message Attributes"
          placeholder="JSON ..."
          info={`{ "string" : { "DataType": "String | Number", "StringListValues": [ "string" ], "StringValue": "string" } }`}
          {...itemProps.msgAttributes}
        />
      )}
    </Form>
  );
};
