import { Action, ActionPanel, Detail, Form, Icon, useNavigation } from "@raycast/api";
import { FormValidation, useForm } from "@raycast/utils";
import { useState } from "react";
import { VerifyKeyRequest, VerifyKeyResponse } from "./utils/types";
import { verifyKey } from "./utils/api";
import ErrorComponent from "./components/ErrorComponent";

export default function VerifyKey() {
  const { push } = useNavigation();

  const [verifyKeyResponse, setVerifyKeyResponse] = useState<VerifyKeyResponse>();
  const [isLoading, setIsLoading] = useState(false);

  const { handleSubmit, itemProps } = useForm<VerifyKeyRequest>({
    async onSubmit(values) {
      setIsLoading(true);
      const response = await verifyKey(values.key);

      if (!("valid" in response)) push(<ErrorComponent errorResponse={response} />);
      else setVerifyKeyResponse(response);
      setIsLoading(false);
    },
    validation: {
      key: FormValidation.Required,
    },
  });

  return !verifyKeyResponse ? (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.Check} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField title="Key" info="The key you want to verify." placeholder="prefix_xx123abc" {...itemProps.key} />
    </Form>
  ) : (
    <Detail
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Key to Clipboard" content={itemProps.key.value || ""} />
        </ActionPanel>
      }
      markdown={`Key: ${itemProps.key.value}`}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Valid" icon={verifyKeyResponse.valid ? Icon.Check : Icon.Multiply} />
          <Detail.Metadata.Label
            title="Owner ID"
            text={verifyKeyResponse.ownerId || undefined}
            icon={!verifyKeyResponse.ownerId ? Icon.Minus : undefined}
          />
          <Detail.Metadata.Label
            title="Remaining"
            text={verifyKeyResponse.remaining?.toString() || undefined}
            icon={!("remaining" in verifyKeyResponse) ? Icon.Minus : undefined}
          />
          <Detail.Metadata.Separator />
          {!verifyKeyResponse.meta ? (
            <Detail.Metadata.Label title="Meta" icon={Icon.Minus} />
          ) : (
            <Detail.Metadata.TagList title="Meta">
              {Object.entries(verifyKeyResponse.meta).map(([key, val]) => (
                <Detail.Metadata.TagList.Item key={key} text={`${key}: ${val}`} />
              ))}
            </Detail.Metadata.TagList>
          )}
          <Detail.Metadata.Separator />
          {verifyKeyResponse.ratelimit ? (
            <Detail.Metadata.TagList title="Rate Limit">
              {Object.entries(verifyKeyResponse.ratelimit).map(([key, val]) => (
                <Detail.Metadata.TagList.Item key={key} text={`${key}: ${val}`} />
              ))}
            </Detail.Metadata.TagList>
          ) : (
            <Detail.Metadata.Label title="Rate Limit" icon={Icon.Minus} />
          )}
        </Detail.Metadata>
      }
    />
  );
}
