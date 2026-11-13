import { Form, ActionPanel, Action, showToast, Toast, useNavigation } from "@raycast/api";
import { useState } from "react";
import { ArcVirtualKey } from "../types";
import { rotateArcVirtualKey } from "../api";
import { ArcKeyTokenDetail } from "./arc-key-token";
import { FormValidation, useForm } from "@raycast/utils";

interface ArcKeyRotateFormProps {
  keyRecord: ArcVirtualKey;
  onRotated?: () => void;
}

export function ArcKeyRotateForm({ keyRecord, onRotated }: ArcKeyRotateFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { push } = useNavigation();

  const { handleSubmit, itemProps } = useForm<{ expiresAt: Date | null }>({
    async onSubmit(values) {
      try {
        setIsLoading(true);
        const rotated = await rotateArcVirtualKey(keyRecord.id, values.expiresAt!.toISOString());
        await showToast({ style: Toast.Style.Success, title: "Virtual key rotated", message: keyRecord.name });
        onRotated?.();
        push(<ArcKeyTokenDetail keyRecord={rotated} />);
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to rotate virtual key",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      } finally {
        setIsLoading(false);
      }
    },
    initialValues: {
      expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
    },
    validation: {
      expiresAt: FormValidation.Required,
    },
  });

  return (
    <Form
      isLoading={isLoading}
      navigationTitle={`Rotate ${keyRecord.name}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Rotate Key" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description
        text={`Rotating "${keyRecord.name}" generates a new access token. The current token stops working immediately.`}
      />
      <Form.DatePicker
        title="New Expiration"
        info="Required. The rotated key stops working after this date."
        type={Form.DatePicker.Type.DateTime}
        {...itemProps.expiresAt}
      />
    </Form>
  );
}
